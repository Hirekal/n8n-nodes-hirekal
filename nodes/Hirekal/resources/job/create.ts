import type { INodeProperties } from 'n8n-workflow';

const showOnlyForJobCreate = {
	resource: ['job'],
	operation: ['create'],
};

export const jobCreateDescription: INodeProperties[] = [
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description: 'Public job title',
		displayOptions: { show: showOnlyForJobCreate },
		routing: {
			send: {
				type: 'body',
				property: 'title',
			},
		},
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		required: true,
		default: '',
		description: 'Company name shown on the job',
		displayOptions: { show: showOnlyForJobCreate },
		routing: {
			send: {
				type: 'body',
				property: 'company',
			},
		},
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		description: 'Optional job settings. Omitted fields use Hirekal defaults, including pipeline stages and application fields.',
		displayOptions: { show: showOnlyForJobCreate },
		options: [
			{
				displayName: 'Company Website',
				name: 'companyWebsite',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'companyWebsite' },
				},
			},
			{
				displayName: 'Employment Type',
				name: 'employmentType',
				type: 'options',
				default: 'FULL_TIME',
				options: [
					{ name: 'Contract', value: 'CONTRACT' },
					{ name: 'Full Time', value: 'FULL_TIME' },
					{ name: 'Internship', value: 'INTERNSHIP' },
					{ name: 'Other', value: 'OTHER' },
					{ name: 'Part Time', value: 'PART_TIME' },
				],
				routing: {
					send: { type: 'body', property: 'employmentType' },
				},
			},
			{
				displayName: 'Internal Title',
				name: 'internalTitle',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'internalTitle' },
				},
			},
			{
				displayName: 'Location',
				name: 'location',
				type: 'string',
				default: '',
				routing: {
					send: { type: 'body', property: 'location' },
				},
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				default: 'ACTIVE',
				options: [
					{ name: 'Active', value: 'ACTIVE' },
					{ name: 'Archived', value: 'ARCHIVED' },
					{ name: 'Paused', value: 'PAUSED' },
				],
				routing: {
					send: { type: 'body', property: 'status' },
				},
			},
		],
	},
];
