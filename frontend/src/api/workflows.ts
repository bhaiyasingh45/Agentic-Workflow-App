import { api } from './client';
import type { Workflow, WorkflowCreate, WorkflowType, Execution, NodeOutput } from '../types';

export const workflowsApi = {
  list: async (params?: { workflow_type?: WorkflowType; search?: string }) => {
    const response = await api.get<{ workflows: Workflow[]; total: number }>('/api/workflows', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Workflow>(`/api/workflows/${id}`);
    return response.data;
  },

  create: async (data: WorkflowCreate) => {
    const response = await api.post<Workflow>('/api/workflows', data);
    return response.data;
  },

  update: async (id: string, data: Partial<WorkflowCreate>) => {
    const response = await api.put<Workflow>(`/api/workflows/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/workflows/${id}`);
  },

  run: async (
    id: string,
    input: string,
    conversationId?: string,
    onEvent: (event: NodeOutput) => void = () => {},
    sessionId?: string,
    conversationContext?: { role: string; content: string }[]
  ) => {
    const response = await fetch(`${api.defaults.baseURL}/api/workflows/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        conversation_id: conversationId,
        session_id: sessionId,
        conversation_context: conversationContext,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to run workflow');
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            onEvent(data);
          } catch (e) {
            console.error('Failed to parse SSE event:', e);
          }
        }
      }
    }
  },

  getExecutions: async (workflowId: string) => {
    const response = await api.get<{ executions: Execution[]; total: number }>(
      `/api/workflows/${workflowId}/executions`
    );
    return response.data;
  },

  getExecution: async (executionId: string) => {
    const response = await api.get<Execution>(`/api/executions/${executionId}`);
    return response.data;
  },
};
