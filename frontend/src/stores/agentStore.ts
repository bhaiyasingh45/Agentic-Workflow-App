import { create } from 'zustand';
import type { Agent, AgentCreate } from '../types';
import { agentsApi } from '../api';

interface AgentState {
  agents: Agent[];
  selectedAgent: Agent | null;
  isLoading: boolean;
  error: string | null;
  fetchAgents: (params?: { search?: string; llm_provider?: string }) => Promise<void>;
  getAgent: (id: string) => Promise<Agent>;
  createAgent: (data: AgentCreate) => Promise<Agent>;
  updateAgent: (id: string, data: Partial<AgentCreate>) => Promise<Agent>;
  deleteAgent: (id: string) => Promise<void>;
  setSelectedAgent: (agent: Agent | null) => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  selectedAgent: null,
  isLoading: false,
  error: null,

  fetchAgents: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await agentsApi.list(params);
      set({ agents: data.agents, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getAgent: async (id) => {
    const agent = await agentsApi.get(id);
    set({ selectedAgent: agent });
    return agent;
  },

  createAgent: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const agent = await agentsApi.create(data);
      set((state) => ({
        agents: [...state.agents, agent],
        isLoading: false,
      }));
      return agent;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateAgent: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const agent = await agentsApi.update(id, data);
      set((state) => ({
        agents: state.agents.map((a) => (a.id === id ? agent : a)),
        selectedAgent: state.selectedAgent?.id === id ? agent : state.selectedAgent,
        isLoading: false,
      }));
      return agent;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteAgent: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await agentsApi.delete(id);
      set((state) => ({
        agents: state.agents.filter((a) => a.id !== id),
        selectedAgent: state.selectedAgent?.id === id ? null : state.selectedAgent,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
}));
