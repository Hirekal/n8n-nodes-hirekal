import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobGet = {
	resource: ['job'],
	operation: ['get'],
};

export const jobGetDescription: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		description: 'UUID of the job',
		displayOptions: { show: showOnlyForJobGet },
	},
];
