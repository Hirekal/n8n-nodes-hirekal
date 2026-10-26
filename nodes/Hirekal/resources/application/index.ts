import type { INodeProperties } from 'n8n-workflow';
import { applicationGetDescription } from './get';

const showOnlyForApplications = {
	resource: ['application'],
};

export const applicationDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForApplications },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get an application',
				description: 'Get one application by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/integrations/n8n/applications/{{$parameter.applicationId}}',
					},
				},
			},
		],
		default: 'get',
	},
	...applicationGetDescription,
];
