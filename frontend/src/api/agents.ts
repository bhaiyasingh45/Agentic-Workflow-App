import { api } from './client';
import type { Agent, AgentCreate } from '../types';

export const agentsApi = {
  list: async (params?: { search?: string; llm_provider?: string }) => {
    const response = await api.get<{ agents: Agent[]; total: number }>('/api/agents', { params });
    return response.data;
  },

  get: async (id: string) => {
    const response = await api.get<Agent>(`/api/agents/${id}`);
    return response.data;
  },

  create: async (data: AgentCreate) => {
    const response = await api.post<Agent>('/api/agents', data);
    return response.data;
  },

  update: async (id: string, data: Partial<AgentCreate>) => {
    const response = await api.put<Agent>(`/api/agents/${id}`, data);
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/api/agents/${id}`);
  },
};
