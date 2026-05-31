import { api } from './client';
import type { LLMProvider } from '../types';

export { api } from './client';
export { agentsApi } from './agents';
export { workflowsApi } from './workflows';
export { chatApi } from './chat';

export const toolsApi = {
  list: async () => {
    const response = await api.get<{ tools: string[]; categories: Record<string, string[]> }>('/api/tools');
    return response.data;
  },
};

export const modelsApi = {
  list: async () => {
    const response = await api.get<{ providers: LLMProvider }>('/api/llm-models');
    return response.data;
  },
};
