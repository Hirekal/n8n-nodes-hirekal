import type { IDataObject } from 'n8n-workflow';

/** Hirekal URL validation ping during PUT /integrations/n8n/webhook */
export function isHirekalConnectivityTest(body: IDataObject): boolean {
	return body.event === 'TEST';
}
