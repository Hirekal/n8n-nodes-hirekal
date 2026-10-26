import type { INodeProperties } from 'n8n-workflow';
import { jobCreateDescription } from './create';
import { jobGetDescription } from './get';
import { jobGetAllDescription } from './getAll';
import { jobGetApplicationsDescription } from './getApplications';
import { filterJobsByTitle, jobGetByNameDescription } from './getByName';
import { listItemsOutput } from '../shared/list';

const showOnlyForJobs = {
	resource: ['job'],
};

export const jobDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: showOnlyForJobs },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a job',
				description: 'Create a job and its default questions, fields, and stages',
				routing: {
					request: {
						method: 'POST',
						url: '/integrations/n8n/jobs',
					},
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many jobs',
				description: 'List or search jobs',
				routing: {
					request: {
						method: 'GET',
						url: '/integrations/n8n/jobs',
					},
					output: listItemsOutput,
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a job',
				description: 'Get a job by ID',
				routing: {
					request: {
						method: 'GET',
						url: '=/integrations/n8n/jobs/{{$parameter.jobId}}',
					},
				},
			},
			{
				name: 'Get by Name',
				value: 'getByName',
				action: 'Get a job by name',
				description: 'Find jobs by title using search, then keep exact or partial title matches',
				routing: {
					request: {
						method: 'GET',
						url: '/integrations/n8n/jobs',
						qs: {
							search: '={{ $parameter.title }}',
							limit: 50,
						},
					},
					output: {
						postReceive: [
							{
								type: 'rootProperty',
								properties: {
									property: 'items',
								},
							},
							filterJobsByTitle,
						],
					},
				},
			},
			{
				name: 'Get Applications',
				value: 'getApplications',
				action: 'Get job applications',
				description: 'List applications for a job',
				routing: {
					request: {
						method: 'GET',
						url: '=/integrations/n8n/jobs/{{$parameter.jobId}}/applications',
					},
					output: listItemsOutput,
				},
			},
		],
		default: 'getAll',
	},
	...jobCreateDescription,
	...jobGetAllDescription,
	...jobGetDescription,
	...jobGetByNameDescription,
	...jobGetApplicationsDescription,
];
