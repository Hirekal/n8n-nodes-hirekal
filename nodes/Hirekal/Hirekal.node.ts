import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { HIREKAL_API_BASE_URL } from './constants';
import { applicationDescription } from './resources/application';
import { jobDescription } from './resources/job';

export class Hirekal implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hirekal',
		name: 'hirekal',
		icon: { light: 'file:hirekal.svg', dark: 'file:hirekal.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create and look up Hirekal jobs and applications',
		defaults: {
			name: 'Hirekal',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [{ name: 'hirekalOAuth2Api', required: true }],
		requestDefaults: {
			baseURL: HIREKAL_API_BASE_URL,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				'X-N8n-Workflow-Id': '={{ $workflow.id }}',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Job',
						value: 'job',
					},
					{
						name: 'Application',
						value: 'application',
					},
				],
				default: 'job',
			},
			...jobDescription,
			...applicationDescription,
		],
	};
}
