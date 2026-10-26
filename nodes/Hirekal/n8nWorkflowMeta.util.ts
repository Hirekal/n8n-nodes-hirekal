import type { IHookFunctions } from 'n8n-workflow';

export function readN8nWorkflowId(context: IHookFunctions): {
	n8nWorkflowId?: string;
} {
	const workflow = context.getWorkflow();
	const id = workflow.id != null ? String(workflow.id).trim() : '';
	return id ? { n8nWorkflowId: id } : {};
}
