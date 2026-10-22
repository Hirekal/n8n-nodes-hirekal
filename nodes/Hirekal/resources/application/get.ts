import type { INodeProperties } from 'n8n-workflow';

const showOnlyForApplicationGet = {
	resource: ['application'],
	operation: ['get'],
};

export const applicationGetDescription: INodeProperties[] = [
	{
		displayName: 'Application ID',
		name: 'applicationId',
		type: 'string',
		required: true,
		default: '',
		description: 'UUID of the application',
		displayOptions: { show: showOnlyForApplicationGet },
	},
];
