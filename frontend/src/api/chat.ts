import { api } from './client';

export interface ChatSession {
  id: string;
  workflow_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  agent_name?: string;
  is_intermediate: boolean;
  created_at: string;
}

export interface ConversationContext {
  role: string;
  content: string;
}

export const chatApi = {
  createSession: async (workflowId: string, name?: string): Promise<ChatSession> => {
    const response = await api.post<ChatSession>('/api/chat/sessions', {
      workflow_id: workflowId,
      name: name || 'New Chat',
    });
    return response.data;
  },

  listSessions: async (workflowId: string): Promise<ChatSession[]> => {
    const response = await api.get<{ sessions: ChatSession[] }>(
      `/api/chat/sessions/workflow/${workflowId}`
    );
    return response.data.sessions;
  },

  getSession: async (sessionId: string): Promise<{ session: ChatSession; messages: ChatMessage[] }> => {
    const response = await api.get(`/api/chat/sessions/${sessionId}`);
    return response.data;
  },

  addMessage: async (
    sessionId: string,
    role: string,
    content: string,
    agentName?: string,
    isIntermediate: boolean = false
  ): Promise<ChatMessage> => {
    const response = await api.post<ChatMessage>(`/api/chat/sessions/${sessionId}/messages`, {
      role,
      content,
      agent_name: agentName,
      is_intermediate: isIntermediate,
    });
    return response.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/api/chat/sessions/${sessionId}`);
  },

  getConversationContext: async (sessionId: string, limit: number = 2): Promise<ConversationContext[]> => {
    const response = await api.get<{ context: ConversationContext[] }>(
      `/api/chat/sessions/${sessionId}/context?limit=${limit}`
    );
    return response.data.context;
  },

  updateSessionName: async (sessionId: string, name: string): Promise<void> => {
    await api.put(`/api/chat/sessions/${sessionId}/name?name=${encodeURIComponent(name)}`);
  },
};
