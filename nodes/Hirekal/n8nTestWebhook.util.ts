import type { IHookFunctions } from 'n8n-workflow';

/** n8n test listener URLs contain this path segment (e.g. …/webhook-test/{id}/webhook). */
const WEBHOOK_TEST_PATH = 'webhook-test';

/**
 * True when the registered URL is n8n's test trigger listener (not production webhook).
 */
export function isN8nTestWebhookUrl(webhookUrl: string): boolean {
	return webhookUrl.includes(WEBHOOK_TEST_PATH);
}

/**
 * True when hook registration is "Test this trigger" (editor), not workflow publish.
 * Requires `webhook-test` in the URL; n8n also uses manual hook mode for that path.
 */
export function isTestTriggerRegistration(
	context: IHookFunctions,
	webhookUrl: string,
): boolean {
	if (!isN8nTestWebhookUrl(webhookUrl)) {
		return false;
	}
	return context.getMode() === 'manual';
}

/** Never treat editor test URLs as publish/unpublish. */
export function shouldSkipN8nWorkflowEvents(webhookUrl: string): boolean {
	return isN8nTestWebhookUrl(webhookUrl);
}

/** Delay after hook create so n8n opens the webhook-test listener first. */
export const N8N_TEST_LISTENER_READY_DELAY_MS = 2000;
