import { create } from 'zustand';
import type { Workflow, WorkflowCreate, WorkflowType, NodeOutput, Execution } from '../types';
import { workflowsApi } from '../api';

interface WorkflowState {
  workflows: Workflow[];
  selectedWorkflow: Workflow | null;
  executions: Execution[];
  currentExecution: NodeOutput[];
  isLoading: boolean;
  isRunning: boolean;
  error: string | null;
  fetchWorkflows: (params?: { workflow_type?: WorkflowType; search?: string }) => Promise<void>;
  getWorkflow: (id: string) => Promise<Workflow>;
  createWorkflow: (data: WorkflowCreate) => Promise<Workflow>;
  updateWorkflow: (id: string, data: Partial<WorkflowCreate>) => Promise<Workflow>;
  deleteWorkflow: (id: string) => Promise<void>;
  runWorkflow: (id: string, input: string, conversationId?: string, sessionId?: string, conversationContext?: { role: string; content: string }[]) => Promise<void>;
  fetchExecutions: (workflowId: string) => Promise<void>;
  setSelectedWorkflow: (workflow: Workflow | null) => void;
  clearCurrentExecution: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  workflows: [],
  selectedWorkflow: null,
  executions: [],
  currentExecution: [],
  isLoading: false,
  isRunning: false,
  error: null,

  fetchWorkflows: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const data = await workflowsApi.list(params);
      set({ workflows: data.workflows, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  getWorkflow: async (id) => {
    const workflow = await workflowsApi.get(id);
    set({ selectedWorkflow: workflow });
    return workflow;
  },

  createWorkflow: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const workflow = await workflowsApi.create(data);
      set((state) => ({
        workflows: [...state.workflows, workflow],
        isLoading: false,
      }));
      return workflow;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  updateWorkflow: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const workflow = await workflowsApi.update(id, data);
      set((state) => ({
        workflows: state.workflows.map((w) => (w.id === id ? workflow : w)),
        selectedWorkflow: state.selectedWorkflow?.id === id ? workflow : state.selectedWorkflow,
        isLoading: false,
      }));
      return workflow;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  deleteWorkflow: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await workflowsApi.delete(id);
      set((state) => ({
        workflows: state.workflows.filter((w) => w.id !== id),
        selectedWorkflow: state.selectedWorkflow?.id === id ? null : state.selectedWorkflow,
        isLoading: false,
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },

  runWorkflow: async (id, input, conversationId, sessionId, conversationContext) => {
    set({ isRunning: true, currentExecution: [], error: null });
    try {
      await workflowsApi.run(id, input, conversationId, (event) => {
        set((state) => ({
          currentExecution: [...state.currentExecution, event],
        }));
      }, sessionId, conversationContext);
      set({ isRunning: false });
    } catch (error) {
      set({ error: (error as Error).message, isRunning: false });
      throw error;
    }
  },

  fetchExecutions: async (workflowId) => {
    try {
      const data = await workflowsApi.getExecutions(workflowId);
      set({ executions: data.executions });
    } catch (error) {
      set({ error: (error as Error).message });
    }
  },

  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),

  clearCurrentExecution: () => set({ currentExecution: [] }),
}));
