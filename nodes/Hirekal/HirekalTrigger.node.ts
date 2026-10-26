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

type TriggerStaticData = {
	webhookUrl?: string;
	webhookSecret?: string;
	includePayloadDetails?: boolean;
};

export class HirekalTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hirekal Trigger',
		name: 'hirekalTrigger',
		icon: { light: 'file:hirekal.svg', dark: 'file:hirekal.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: 'On any application submit',
		description:
			'Fires when a candidate submits an application for any job in the organization. The payload includes the job, the candidate, and optionally answers and transcripts after AI processing finishes.',
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
					'Activating this workflow registers one organization webhook URL with Hirekal. New applications for any job in the org are delivered to this trigger. Deactivating clears that subscription. Per-job webhook settings in Hirekal are not changed.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Include Payload Details',
				name: 'includePayloadDetails',
				type: 'boolean',
				default: true,
				description:
					'Whether Hirekal includes answers, transcripts, and metrics. Hirekal may wait until AI processing finishes before sending.',
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
				const includePayloadDetails = this.getNodeParameter('includePayloadDetails') as boolean;
				const webhookUrl = this.getNodeWebhookUrl('default');

				if (!staticData.webhookSecret || staticData.webhookUrl !== webhookUrl) {
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

				return (
					subscription.webhookSubscribed === true &&
					subscription.webhookUrl === webhookUrl &&
					subscription.includePayloadDetails === includePayloadDetails
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const includePayloadDetails = this.getNodeParameter('includePayloadDetails') as boolean;
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const testRegistration = isTestTriggerRegistration(this, webhookUrl);
				const workflowMeta = readN8nWorkflowId(this);

				staticData.webhookSecret = staticData.webhookSecret ?? randomBytes(32).toString('hex');
				staticData.webhookUrl = webhookUrl;
				staticData.includePayloadDetails = includePayloadDetails;

				try {
					await hirekalApiRequest(this, 'PUT', '/integrations/n8n/webhook', {
						body: {
							url: webhookUrl,
							secret: staticData.webhookSecret,
							includePayloadDetails,
							subscribed: !testRegistration,
							testRegistration,
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

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
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
	},
): void {
	const { webhookUrl, secret, includePayloadDetails } = params;
	void (async () => {
		await new Promise((resolve) => setTimeout(resolve, N8N_TEST_LISTENER_READY_DELAY_MS));
		try {
			await hirekalApiRequest(context, 'POST', '/integrations/n8n/webhook/test-sample', {
				body: {
					url: webhookUrl,
					secret,
					includePayloadDetails,
				},
			});
		} catch {
			// Slow hosts: user can run test trigger again.
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
