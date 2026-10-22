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

const CREDENTIAL = 'hirekalOAuth2Api';

type TriggerStaticData = {
	jobId?: string;
	jobIds?: string[];
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
					'Activating this workflow subscribes every current job to this trigger. Deactivating unsubscribes them. Jobs created later are included the next time you activate the workflow. This replaces any webhook URL already saved on those jobs.',
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
				// "Test this trigger" must call create so Hirekal posts the subscribe event.
				if (this.getMode() === 'manual') {
					return false;
				}
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const includePayloadDetails = this.getNodeParameter('includePayloadDetails') as boolean;
				const webhookUrl = this.getNodeWebhookUrl('default');
				const jobIds = await listAllJobIds(this);

				return (
					sameIds(staticData.jobIds, jobIds) &&
					staticData.webhookUrl === webhookUrl &&
					staticData.includePayloadDetails === includePayloadDetails &&
					Boolean(staticData.webhookSecret)
				);
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const includePayloadDetails = this.getNodeParameter('includePayloadDetails') as boolean;
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const jobIds = await listAllJobIds(this);
				const previousJobIds = subscribedJobIds(staticData);

				for (const jobId of previousJobIds) {
					if (!jobIds.includes(jobId)) {
						await disableJobWebhook(this, jobId);
					}
				}

				staticData.webhookSecret = staticData.webhookSecret ?? randomBytes(32).toString('hex');
				staticData.webhookUrl = webhookUrl;
				staticData.includePayloadDetails = includePayloadDetails;
				staticData.jobIds = [];

				for (const jobId of jobIds) {
					try {
						await hirekalApiRequest(this, 'PATCH', `/jobs/${jobId}/webhook`, {
							body: {
								url: webhookUrl,
								secret: staticData.webhookSecret,
								enabled: true,
								triggers: { newApplication: true },
								includePayloadDetails,
							},
						});
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
					staticData.jobIds.push(jobId);
				}

				if (this.getMode() !== 'manual') {
					try {
						await hirekalApiRequest(this, 'POST', '/n8n/workflow-events', {
							body: {
								event: 'WORKFLOW_SUBSCRIBED',
								webhookUrl,
								jobIds,
							},
						});
					} catch (error) {
						throw new NodeApiError(this.getNode(), error as JsonObject);
					}
				}

				delete staticData.jobId;
				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const staticData = this.getWorkflowStaticData('node') as TriggerStaticData;
				const jobIds = subscribedJobIds(staticData);

				try {
					await hirekalApiRequest(this, 'POST', '/n8n/workflow-events', {
						body: {
							event: 'WORKFLOW_UNPUBLISHED',
							webhookUrl: staticData.webhookUrl,
							jobIds,
						},
					});
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				for (const jobId of jobIds) {
					await disableJobWebhook(this, jobId);
				}

				delete staticData.jobId;
				delete staticData.jobIds;
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

		const body = this.getBodyData();
		if (body.event === 'TEST') {
			return {};
		}

		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}

async function listAllJobIds(context: IHookFunctions): Promise<string[]> {
	const ids: string[] = [];
	const limit = 100;
	let page = 1;
	let total = Number.POSITIVE_INFINITY;

	while (ids.length < total) {
		let response: IDataObject;
		try {
			response = (await hirekalApiRequest(context, 'GET', '/jobs', {
				qs: { status: 'ALL', page, limit },
			})) as IDataObject;
		} catch (error) {
			throw new NodeApiError(context.getNode(), error as JsonObject);
		}

		const items = Array.isArray(response.items) ? response.items : [];
		total = typeof response.total === 'number' ? response.total : items.length;

		for (const item of items) {
			if (item && typeof item === 'object' && 'id' in item && typeof item.id === 'string') {
				ids.push(item.id);
			}
		}

		if (items.length === 0) {
			break;
		}
		page += 1;
	}

	return ids;
}

async function hirekalApiRequest(
	context: IHookFunctions,
	method: 'GET' | 'PATCH' | 'POST',
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

function subscribedJobIds(staticData: TriggerStaticData): string[] {
	const ids = [...(staticData.jobIds ?? [])];
	if (staticData.jobId && !ids.includes(staticData.jobId)) {
		ids.push(staticData.jobId);
	}
	return ids;
}

function sameIds(stored: string[] | undefined, current: string[]): boolean {
	if (!stored || stored.length !== current.length) {
		return false;
	}
	const left = [...stored].sort();
	const right = [...current].sort();
	return left.every((id, index) => id === right[index]);
}

async function disableJobWebhook(context: IHookFunctions, jobId: string): Promise<void> {
	try {
		await hirekalApiRequest(context, 'POST', `/jobs/${jobId}/webhook/disable`);
	} catch (error) {
		const statusCode = errorStatusCode(error);
		if (statusCode === 404) {
			return;
		}
		throw new NodeApiError(context.getNode(), error as JsonObject);
	}
}

function headerValue(headers: IDataObject, name: string): string {
	const value = headers[name] ?? headers[name.toLowerCase()];
	if (Array.isArray(value)) {
		return String(value[0] ?? '');
	}
	return value === undefined || value === null ? '' : String(value);
}

function errorStatusCode(error: unknown): number | undefined {
	if (!error || typeof error !== 'object') {
		return undefined;
	}
	const candidate = error as {
		statusCode?: number;
		httpCode?: number | string;
		response?: { status?: number };
	};
	if (typeof candidate.statusCode === 'number') {
		return candidate.statusCode;
	}
	if (typeof candidate.response?.status === 'number') {
		return candidate.response.status;
	}
	if (typeof candidate.httpCode === 'number') {
		return candidate.httpCode;
	}
	return undefined;
}
