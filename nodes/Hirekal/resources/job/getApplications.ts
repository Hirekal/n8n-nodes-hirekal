import type { INodeProperties } from 'n8n-workflow';
import { limitProperty, returnAllProperty } from '../shared/list';

const showOnlyForJobApplications = {
	resource: ['job'],
	operation: ['getApplications'],
};

export const jobGetApplicationsDescription: INodeProperties[] = [
	{
		displayName: 'Job ID',
		name: 'jobId',
		type: 'string',
		required: true,
		default: '',
		description: 'UUID of the job whose applications to list',
		displayOptions: { show: showOnlyForJobApplications },
	},
	returnAllProperty({ show: showOnlyForJobApplications }),
	limitProperty({ show: showOnlyForJobApplications }),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showOnlyForJobApplications },
		options: [
			{
				displayName: 'Stage ID',
				name: 'stageId',
				type: 'string',
				default: '',
				description: 'Pipeline stage UUID',
				routing: {
					send: { type: 'query', property: 'stageId' },
				},
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search candidates',
				routing: {
					send: { type: 'query', property: 'search' },
				},
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'submitted',
				options: [
					{ name: 'Submitted', value: 'submitted' },
					{ name: 'Name', value: 'name' },
					{ name: 'Stage', value: 'stage' },
					{ name: 'Rating', value: 'rating' },
				],
				routing: {
					send: { type: 'query', property: 'sortBy' },
				},
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				default: 'desc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				routing: {
					send: { type: 'query', property: 'sortOrder' },
				},
			},
		],
	},
];
