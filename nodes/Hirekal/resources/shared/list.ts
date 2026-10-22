import type { INodeProperties } from 'n8n-workflow';

const show = (displayOptions: INodeProperties['displayOptions']): INodeProperties['displayOptions'] =>
	displayOptions;

export const listItemsOutput = {
	postReceive: [
		{
			type: 'rootProperty' as const,
			properties: {
				property: 'items',
			},
		},
	],
};

export function returnAllProperty(
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties {
	return {
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
		displayOptions: show(displayOptions),
		routing: {
			send: {
				paginate: '={{ $value }}',
			},
			operations: {
				pagination: {
					type: 'generic',
					properties: {
						continue:
							'={{ $response.body.page * $response.body.limit < $response.body.total }}',
						request: {
							qs: {
								page: '={{ $pageCount + 1 }}',
								limit: 100,
							},
						},
					},
				},
			},
		},
	};
}

export function limitProperty(displayOptions: INodeProperties['displayOptions']): INodeProperties {
	return {
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 50,
		description: 'Max number of results to return',
		displayOptions: {
			show: {
				...displayOptions?.show,
				returnAll: [false],
			},
		},
		routing: {
			send: {
				type: 'query',
				property: 'limit',
			},
			output: {
				maxResults: '={{ $value }}',
			},
		},
	};
}
