import type { INodeProperties } from 'n8n-workflow';
import { limitProperty, returnAllProperty } from '../shared/list';

const showOnlyForJobGetAll = {
	resource: ['job'],
	operation: ['getAll'],
};

export const jobGetAllDescription: INodeProperties[] = [
	returnAllProperty({ show: showOnlyForJobGetAll }),
	limitProperty({ show: showOnlyForJobGetAll }),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showOnlyForJobGetAll },
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'ALL',
				options: [
					{ name: 'All', value: 'ALL' },
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Paused', value: 'PAUSED' },
					{ name: 'Archived', value: 'ARCHIVED' },
				],
				routing: {
					send: { type: 'query', property: 'status' },
				},
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Free-text search, including job title',
				routing: {
					send: { type: 'query', property: 'search' },
				},
			},
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				default: 'updatedAt',
				options: [
					{ name: 'Updated At', value: 'updatedAt' },
					{ name: 'Created At', value: 'createdAt' },
					{ name: 'Title', value: 'title' },
					{ name: 'Application Count', value: 'applicationCount' },
				],
				routing: {
					send: { type: 'query', property: 'sortBy' },
				},
			},
			{
				displayName: 'Order',
				name: 'order',
				type: 'options',
				default: 'desc',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				routing: {
					send: { type: 'query', property: 'order' },
				},
			},
		],
	},
];
