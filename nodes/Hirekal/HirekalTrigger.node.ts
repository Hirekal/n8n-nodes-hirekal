import { randomBytes } from 'crypto';
import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type IHookFunctions,
	type INodeType,
	type INodeTypeDescription,
	type IWebhookFunctions,
	type IWebhookResponseData,
	type JsonObject,
} from 'n8n-workflow';
import { HIREKAL_API_BASE_URL } from './constants';
import { readN8nWorkflowId } from './n8nWorkflowMeta.util';
import {
	isTestTriggerRegistration,
	N8N_TEST_LISTENER_READY_DELAY_MS,
	shouldSkipN8nWorkflowEvents,
} from './n8nTestWebhook.util';
import { isHirekalConnectivityTest } from './postTriggerWebhook';

const CREDENTIAL = 'hirekalOAuth2Api';

export const HIREKAL_WEBHOOK_EVENTS = {
	NEW_APPLICATION: 'NEW_APPLICATION',
	STAGE_CHANGE: 'STAGE_CHANGE',
} as const;

export type HirekalWebhookEvent =
	(typeof HIREKAL_WEBHOOK_EVENTS)[keyof typeof HIREKAL_WEBHOOK_EVENTS];

type TriggerStaticData = {
	webhookUrl?: string;
	webhookSecret?: string;
	includePayloadDetails?: boolean;
	events?: HirekalWebhookEvent[];
};

export class HirekalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hirekal Trigger',
		name: 'hirekalTrigger',
		icon: { light: 'file:hirekal.png', dark: 'file:hirekal.png' },
		group: ['trigger'],
		version: 2,
		subtitle: '={{$parameter["events"].join(", ")}}',
		description: 'Handle Hirekal organization webhook events',
		defaults: {
			name: 'Hirekal Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: CREDENTIAL, required: true }],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName:
					'Activating registers this workflow URL with Hirekal for the selected events. Deactivating clears that subscription. Per-job webhook settings in Hirekal are not changed.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Events',
				name: 'events',
				type: 'multiOptions',
				required: true,
				default: [HIREKAL_WEBHOOK_EVENTS.NEW_APPLICATION],
				description: 'The Hirekal events to listen for',
				options: [
					{
						name: 'Application Received',
						value: HIREKAL_WEBHOOK_EVENTS.NEW_APPLICATION,
						description: 'When Hirekal receives an application',
					},
					{
						name: 'Stage Change',
						value: HIREKAL_WEBHOOK_EVENTS.STAGE_CHANGE,
						description: 'When an application moves to another pipeline stage',
					},
				],
			},
			{
				displayName: 'Include Payload Details',
				name: 'includePayloadDetails',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						events: [HIREKAL_WEBHOOK_EVENTS.NEW_APPLICATION],
					},
				},
				description:
					'For application received events: include answers, transcripts, and metrics. Hirekal may wait until AI processing finishes before sending.',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				if (this.getMode() === 'manual') {
					return false;
				}
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const events = readSelectedEvents(this);
				const includePayloadDetails = readIncludePayloadDetails(this, events);
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!staticData.webhookSecret || staticData.webhookUrl !== webhookUrl) {
					return false;
				}
				if (!sameEventList(staticData.events, events)) {
					return false;
				}
				if (staticData.includePayloadDetails !== includePayloadDetails) {
					return false;
				}

				let subscription: IDataObject;
				try {
					subscription = (await hirekalApiRequest(
						this,
						'GET',
						'/integrations/n8n/webhook',
						{ qs: { url: webhookUrl } },
					)) as IDataObject;
				} catch {
					return false;
				}

				const storedEvents = normalizeEventsList(subscription.webhookEvents);
				return (
					subscription.webhookSubscribed === true &&
					subscription.webhookUrl === webhookUrl &&
					subscription.includePayloadDetails === includePayloadDetails &&
					sameEventList(storedEvents, events)
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const events = readSelectedEvents(this);
				const includePayloadDetails = readIncludePayloadDetails(this, events);
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const testRegistration = isTestTriggerRegistration(this, webhookUrl);
				const workflowMeta = readN8nWorkflowId(this);

				staticData.webhookSecret = staticData.webhookSecret ?? randomBytes(32).toString('hex');
				staticData.webhookUrl = webhookUrl;
				staticData.events = events;
				staticData.includePayloadDetails = includePayloadDetails;

				try {
					await hirekalApiRequest(this, 'PUT', '/integrations/n8n/webhook', {
						body: {
							url: webhookUrl,
							secret: staticData.webhookSecret,
							includePayloadDetails,
							subscribed: !testRegistration,
							testRegistration,
							events,
							...workflowMeta,
						},
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				if (!shouldSkipN8nWorkflowEvents(webhookUrl)) {
					try {
						await hirekalApiRequest(this, 'POST', '/n8n/workflow-events', {
							body: {
								event: 'WORKFLOW_SUBSCRIBED',
								webhookUrl,
								...workflowMeta,
							},
						});
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}

				if (testRegistration) {
					scheduleTestSampleDelivery(this, {
						webhookUrl,
						secret: staticData.webhookSecret as string,
						includePayloadDetails,
						events,
					});
				}

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const webhookUrl =
					staticData.webhookUrl ?? (this.getNodeWebhookUrl('default') as string);
				const workflowMeta = readN8nWorkflowId(this);

				if (!shouldSkipN8nWorkflowEvents(webhookUrl)) {
					try {
						await hirekalApiRequest(this, 'POST', '/n8n/workflow-events', {
							body: {
								event: 'WORKFLOW_UNPUBLISHED',
								webhookUrl,
								...workflowMeta,
							},
						});
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}

				try {
					await hirekalApiRequest(this, 'DELETE', '/integrations/n8n/webhook', {
						body: { url: webhookUrl },
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				delete staticData.webhookUrl;
				delete staticData.webhookSecret;
				delete staticData.includePayloadDetails;
				delete staticData.events;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
		const headers = this.getHeaderData();
		const signature = headerValue(headers, 'x-hirekal-signature');

		if (staticData.webhookSecret && signature !== staticData.webhookSecret) {
			return {};
		}

		const body = this.getBodyData() as IDataObject;
		if (isHirekalConnectivityTest(body)) {
			return {};
		}

		const events = readSelectedEvents(this);
		const eventName = body.event === undefined ? '' : String(body.event);
		if (eventName && !events.includes(eventName as HirekalWebhookEvent)) {
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}

function readSelectedEvents(
	context: IHookFunctions | IWebhookFunctions,
): HirekalWebhookEvent[] {
	const raw = context.getNodeParameter('events', 0) as string[] | string;
	return normalizeEventsList(raw);
}

function normalizeEventsList(raw: unknown): HirekalWebhookEvent[] {
	const list = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
	const allowed = new Set<string>(Object.values(HIREKAL_WEBHOOK_EVENTS));
	const unique = [
		...new Set(
			list
				.map((item) => String(item))
				.filter((item): item is HirekalWebhookEvent => allowed.has(item)),
		),
	];
	return unique.length > 0 ? unique : [HIREKAL_WEBHOOK_EVENTS.NEW_APPLICATION];
}

function sameEventList(a: unknown, b: HirekalWebhookEvent[]): boolean {
	const left = [...normalizeEventsList(a)].sort();
	const right = [...b].sort();
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

function readIncludePayloadDetails(
	context: IHookFunctions,
	events: HirekalWebhookEvent[],
): boolean {
	if (!events.includes(HIREKAL_WEBHOOK_EVENTS.NEW_APPLICATION)) {
		return false;
	}
	return context.getNodeParameter('includePayloadDetails', 0) as boolean;
}

async function hirekalApiRequest(
	context: IHookFunctions,
	method: 'GET' | 'PUT' | 'POST' | 'DELETE',
	path: string,
	options?: { body?: IDataObject; qs?: IDataObject },
): Promise<unknown> {
	return await context.helpers.httpRequestWithAuthentication.call(context, CREDENTIAL, {
		method,
		url: `${HIREKAL_API_BASE_URL}${path}`,
		qs: options?.qs,
		body: options?.body,
		json: true,
	});
}

function scheduleTestSampleDelivery(
	context: IHookFunctions,
	params: {
		webhookUrl: string;
		secret: string;
		includePayloadDetails: boolean;
		events: HirekalWebhookEvent[];
	},
): void {
	const { webhookUrl, secret, includePayloadDetails, events } = params;
	void (async () => {
		await new Promise((resolve) => setTimeout(resolve, N8N_TEST_LISTENER_READY_DELAY_MS));
		for (let index = 0; index < events.length; index++) {
			if (index > 0) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
			try {
				await hirekalApiRequest(context, 'POST', '/integrations/n8n/webhook/test-sample', {
					body: {
						url: webhookUrl,
						secret,
						includePayloadDetails,
						events: [events[index]],
					},
				});
			} catch {
				// Slow hosts: user can run test trigger again.
			}
		}
	})();
}

function headerValue(headers: IDataObject, name: string): string {
	const value = headers[name] ?? headers[name.toLowerCase()];
	if (Array.isArray(value)) {
		return String(value[0] ?? '');
	}
	return value === undefined || value === null ? '' : String(value);
}
