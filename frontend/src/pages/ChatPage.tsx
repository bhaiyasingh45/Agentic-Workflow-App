import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Send, Loader2, Bot, User, ChevronDown, ChevronRight, ArrowLeft, Sparkles,
  CheckCircle2, MessageSquare, Plus, Trash2, Clock, PanelLeftClose, PanelLeft
} from 'lucide-react';
import { Button, Markdown } from '../components/common';
import { useWorkflowStore } from '../stores/workflowStore';
import { chatApi, type ChatSession } from '../api/chat';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  agentName?: string;
  timestamp: Date;
  isIntermediate?: boolean;
  isStreaming?: boolean;
}

export function ChatPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { runWorkflow, currentExecution, isRunning, clearCurrentExecution, getWorkflow } = useWorkflowStore();

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [workflowName, setWorkflowName] = useState('Workflow');
  const [streamingAgents, setStreamingAgents] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedNodesRef = useRef<Set<string>>(new Set());

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (workflowId) {
      getWorkflow(workflowId).then((wf) => {
        setWorkflowName(wf.name);
      }).catch(() => {
        navigate('/workflows');
      });

      loadSessions();
    }
  }, [workflowId, getWorkflow, navigate]);

  const loadSessions = async () => {
    if (!workflowId) return;
    setLoadingSessions(true);
    try {
      const sessionList = await chatApi.listSessions(workflowId);
      setSessions(sessionList);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    }
    setLoadingSessions(false);
  };

  const createNewSession = async () => {
    if (!workflowId) return;
    try {
      const session = await chatApi.createSession(workflowId, `Chat ${sessions.length + 1}`);
      setSessions(prev => [session, ...prev]);
      setCurrentSessionId(session.id);
      setMessages([]);
      clearCurrentExecution();
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const { messages: apiMessages } = await chatApi.getSession(sessionId);
      setCurrentSessionId(sessionId);
      setMessages(apiMessages.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant' | 'agent',
        content: m.content,
        agentName: m.agent_name || undefined,
        timestamp: new Date(m.created_at),
        isIntermediate: m.is_intermediate,
      })));
      clearCurrentExecution();
      setStreamingAgents([]);
      processedNodesRef.current.clear();
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await chatApi.deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingAgents]);

  const completedRef = useRef(false);

  useEffect(() => {
    if (currentExecution.length === 0 || completedRef.current) return;

    const lastEvent = currentExecution[currentExecution.length - 1];

    // Check for completion first
    if (lastEvent.node === '__complete__') {
      completedRef.current = true;

      // Collect all intermediate agents that haven't been added yet
      const allIntermediates: ChatMessage[] = [];
      for (const event of currentExecution) {
        if (event.node === '__complete__' || event.node === '__error__') continue;
        const nodeKey = `${event.node}-${event.timestamp}`;
        if (!processedNodesRef.current.has(nodeKey)) {
          processedNodesRef.current.add(nodeKey);
          allIntermediates.push({
            id: `agent-${event.node}-${Date.now()}-${Math.random()}`,
            role: 'agent',
            content: event.output,
            agentName: event.node,
            timestamp: new Date(event.timestamp),
            isIntermediate: true,
            isStreaming: false,
          });
        }
      }

      const finalMessage: ChatMessage = {
        id: `final-${Date.now()}`,
        role: 'assistant',
        content: lastEvent.output,
        timestamp: new Date(lastEvent.timestamp),
      };

      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== 'pending');
        const existingIntermediates = streamingAgents.map(a => ({ ...a, isStreaming: false }));
        return [...withoutPending, ...existingIntermediates, ...allIntermediates, finalMessage];
      });

      if (currentSessionId) {
        const allAgents = [...streamingAgents, ...allIntermediates];
        for (const agent of allAgents) {
          chatApi.addMessage(currentSessionId, 'agent', agent.content, agent.agentName, true).catch(console.error);
        }
        chatApi.addMessage(currentSessionId, 'assistant', lastEvent.output).catch(console.error);
      }

      setStreamingAgents([]);
      processedNodesRef.current.clear();
      return;
    }

    if (lastEvent.node === '__error__') {
      completedRef.current = true;
      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== 'pending');
        const intermediateAgents = streamingAgents.map(a => ({ ...a, isStreaming: false }));
        return [...withoutPending, ...intermediateAgents, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${lastEvent.output}`,
          timestamp: new Date(lastEvent.timestamp),
        }];
      });
      setStreamingAgents([]);
      processedNodesRef.current.clear();
      return;
    }

    // For in-progress events, add new agents to streaming list
    const newAgents: ChatMessage[] = [];
    for (const event of currentExecution) {
      if (event.node === '__complete__' || event.node === '__error__') continue;
      const nodeKey = `${event.node}-${event.timestamp}`;
      if (!processedNodesRef.current.has(nodeKey)) {
        processedNodesRef.current.add(nodeKey);
        newAgents.push({
          id: `agent-${event.node}-${Date.now()}-${Math.random()}`,
          role: 'agent',
          content: event.output,
          agentName: event.node,
          timestamp: new Date(event.timestamp),
          isIntermediate: true,
          isStreaming: true,
        });
      }
    }

    if (newAgents.length > 0) {
      setStreamingAgents(prev => [...prev, ...newAgents]);
    }
  }, [currentExecution, streamingAgents, currentSessionId]);

  const handleSend = async () => {
    if (!input.trim() || isRunning || !workflowId) return;

    let sessionId = currentSessionId;
    if (!sessionId) {
      try {
        const session = await chatApi.createSession(workflowId, `Chat ${sessions.length + 1}`);
        setSessions(prev => [session, ...prev]);
        setCurrentSessionId(session.id);
        sessionId = session.id;
      } catch (error) {
        console.error('Failed to create session:', error);
        return;
      }
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage, {
      id: 'pending',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    }]);

    if (sessionId) {
      chatApi.addMessage(sessionId, 'user', input).catch(console.error);
    }

    const currentInput = input;
    setInput('');
    clearCurrentExecution();
    setStreamingAgents([]);
    processedNodesRef.current.clear();
    completedRef.current = false;

    try {
      let context: { role: string; content: string }[] = [];
      if (sessionId) {
        context = await chatApi.getConversationContext(sessionId, 2);
      }

      await runWorkflow(workflowId, currentInput, `session-${sessionId}`, sessionId, context);
    } catch (error) {
      setMessages(prev => {
        const withoutPending = prev.filter(m => m.id !== 'pending');
        return [...withoutPending, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `Failed to run workflow: ${error}`,
          timestamp: new Date(),
        }];
      });
      setStreamingAgents([]);
    }
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const groupedMessages = messages.reduce((acc, msg, idx) => {
    if (msg.isIntermediate) {
      const lastGroup = acc[acc.length - 1];
      if (lastGroup && lastGroup.type === 'intermediates') {
        lastGroup.messages.push(msg);
      } else {
        acc.push({ type: 'intermediates', messages: [msg], id: `group-${idx}` });
      }
    } else {
      acc.push({ type: 'message', message: msg, id: msg.id });
    }
    return acc;
  }, [] as Array<{ type: 'intermediates'; messages: ChatMessage[]; id: string } | { type: 'message'; message: ChatMessage; id: string }>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} transition-all duration-300 border-r border-slate-800 bg-slate-900/50 flex flex-col overflow-hidden`}>
        <div className="p-4 border-b border-slate-800">
          <Button
            onClick={createNewSession}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2"
          >
            <Plus size={18} />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-slate-500" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 px-4">
              <MessageSquare size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-500">No chat history yet</p>
              <p className="text-xs text-slate-600 mt-1">Start a conversation to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`group flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-all ${
                    currentSessionId === session.id
                      ? 'bg-indigo-600/20 border border-indigo-500/30'
                      : 'hover:bg-slate-800/50 border border-transparent'
                  }`}
                  onClick={() => loadSession(session.id)}
                >
                  <MessageSquare size={16} className={currentSessionId === session.id ? 'text-indigo-400' : 'text-slate-500'} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${currentSessionId === session.id ? 'text-white' : 'text-slate-300'}`}>
                      {session.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock size={10} />
                      <span>{formatDate(session.updated_at)}</span>
                      {session.message_count > 0 && (
                        <span className="text-slate-600">• {session.message_count} msgs</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-800 text-xs text-slate-600 text-center">
          Short-term memory: Last 2 conversations
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              {sidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeft size={20} />}
            </button>
            <Link
              to="/workflows"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-white font-semibold">{workflowName}</h1>
                <p className="text-xs text-slate-500">
                  {currentSessionId
                    ? sessions.find(s => s.id === currentSessionId)?.name || 'AI Workflow Chat'
                    : 'New Conversation'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {messages.length === 0 && streamingAgents.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center mx-auto mb-6 border border-indigo-500/30">
                  <Bot size={40} className="text-indigo-400" />
                </div>
                <h2 className="text-2xl font-semibold text-white mb-2">Start a Conversation</h2>
                <p className="text-slate-400 max-w-md mx-auto">
                  Send a message to run your workflow. You'll see each agent's output as it processes your request.
                </p>
                <p className="text-sm text-slate-500 mt-4">
                  Chat history is saved automatically • Last 2 conversations used for context
                </p>
              </div>
            ) : (
              <>
                {groupedMessages.map((item) => {
                  if (item.type === 'intermediates') {
                    const isExpanded = expandedGroups[item.id] ?? true;
                    return (
                      <div key={item.id} className="mx-12">
                        <button
                          onClick={() => toggleGroup(item.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                            {isExpanded ? <ChevronDown size={16} className="text-indigo-400" /> : <ChevronRight size={16} className="text-indigo-400" />}
                          </div>
                          <span className="text-sm text-slate-300 font-medium">
                            {item.messages.length} Agent Step{item.messages.length > 1 ? 's' : ''} Completed
                          </span>
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        </button>

                        {isExpanded && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-indigo-500/30">
                            {item.messages.map((msg) => (
                              <div key={msg.id} className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
                                <div className="flex items-center gap-2 mb-3">
                                  <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Bot size={12} className="text-white" />
                                  </div>
                                  <span className="text-sm font-medium text-indigo-400">
                                    {msg.agentName}
                                  </span>
                                  <CheckCircle2 size={12} className="text-emerald-500" />
                                  <span className="text-xs text-slate-500">
                                    {msg.timestamp.toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="text-sm">
                                  <Markdown content={msg.content} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  const msg = item.message;

                  if (msg.id === 'pending') {
                    return (
                      <div key="pending" className="space-y-4">
                        {streamingAgents.map((agent) => (
                          <div key={agent.id} className="flex gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20 animate-pulse">
                              <Bot size={20} className="text-white" />
                            </div>
                            <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-md p-5 border border-indigo-500/30 shadow-xl">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-sm font-medium text-indigo-400">{agent.agentName}</span>
                                <div className="flex gap-1 ml-2">
                                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                </div>
                                <span className="text-xs text-slate-500">Just now</span>
                              </div>
                              <div className="text-sm">
                                <Markdown content={agent.content} />
                              </div>
                            </div>
                          </div>
                        ))}

                        <div className="flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                            <Bot size={20} className="text-white" />
                          </div>
                          <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-md p-5 border border-slate-700/50">
                            <div className="flex items-center gap-3">
                              <div className="flex gap-1">
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                              <span className="text-sm text-slate-400">
                                {streamingAgents.length > 0 ? 'Running next agent...' : 'Processing your request...'}
                              </span>
                            </div>
                            {currentExecution.length > 0 && (
                              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                                <Loader2 size={12} className="animate-spin" />
                                <span>Current: <span className="text-indigo-400">{currentExecution[currentExecution.length - 1]?.node}</span></span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (msg.role === 'user') {
                    return (
                      <div key={msg.id} className="flex gap-4 justify-end">
                        <div className="max-w-[80%] bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl rounded-tr-md p-5 shadow-lg shadow-indigo-500/10">
                          <p className="text-white whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                          <p className="text-xs text-indigo-300/70 mt-2 text-right">
                            {msg.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
                          <User size={20} className="text-white" />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={msg.id} className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-indigo-500/20">
                        <Bot size={20} className="text-white" />
                      </div>
                      <div className="flex-1 bg-slate-800/50 rounded-2xl rounded-tl-md p-5 border border-slate-700/50 shadow-xl">
                        {msg.content.startsWith('Error:') ? (
                          <div className="text-red-400">
                            <Markdown content={msg.content} />
                          </div>
                        ) : (
                          <Markdown content={msg.content} />
                        )}
                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700/50">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          <span className="text-xs text-slate-500">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="border-t border-slate-800 bg-slate-900/80 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type your message..."
                  className="w-full px-5 py-4 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-base transition-all"
                  rows={1}
                  disabled={isRunning}
                  style={{ minHeight: '56px', maxHeight: '200px' }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={isRunning || !input.trim()}
                className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/30 transition-all disabled:opacity-50 disabled:shadow-none"
              >
                {isRunning ? (
                  <Loader2 size={22} className="animate-spin" />
                ) : (
                  <Send size={22} />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-600 text-center mt-3">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
