import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HirekalOAuth2Api implements ICredentialType {
	name = 'hirekalOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Hirekal OAuth2 API';

	icon = {
		light: 'file:../nodes/Hirekal/hirekal.png',
		dark: 'file:../nodes/Hirekal/hirekal.png',
	} as const;

	documentationUrl = 'https://github.com/Hirekal/n8n-nodes-hirekal#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: 'https://api.hirekal.com/api/v1/n8n/oauth/authorize',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://api.hirekal.com/api/v1/n8n/oauth/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'users:read users:write companies:read',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'header',
		},
	];
}
