import type { IExecuteSingleFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';

const showOnlyForJobGetByName = {
	resource: ['job'],
	operation: ['getByName'],
};

export const jobGetByNameDescription: INodeProperties[] = [
	{
		displayName: 'Job Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		description:
			'Title to look up. Hirekal has no exact-name endpoint, so this searches jobs and keeps matches from the first 50 results.',
		displayOptions: { show: showOnlyForJobGetByName },
	},
	{
		displayName: 'Match',
		name: 'match',
		type: 'options',
		default: 'exact',
		options: [
			{ name: 'Exact', value: 'exact' },
			{ name: 'Contains', value: 'contains' },
		],
		description: 'Exact compares the full title. Contains keeps titles that include the text.',
		displayOptions: { show: showOnlyForJobGetByName },
	},
];

export async function filterJobsByTitle(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
): Promise<INodeExecutionData[]> {
	const title = String(this.getNodeParameter('title')).trim();
	const match = this.getNodeParameter('match') as string;
	const needle = title.toLowerCase();

	return items.filter((item) => {
		const jobTitle = String(item.json.title ?? '');
		if (match === 'contains') {
			return jobTitle.toLowerCase().includes(needle);
		}
		return jobTitle === title;
	});
}
