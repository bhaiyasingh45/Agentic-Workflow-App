import { useState, useRef, useEffect } from 'react';
import { X, Send, Loader2, Bot, User, ChevronDown, ChevronRight } from 'lucide-react';
import { Button, Textarea } from '../common';
import { useWorkflowStore } from '../../stores/workflowStore';
import type { NodeOutput } from '../../types';

interface ChatPanelProps {
  workflowId: string;
  workflowName: string;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'agent';
  content: string;
  agentName?: string;
  timestamp: Date;
  isIntermediate?: boolean;
}

export function ChatPanel({ workflowId, workflowName, onClose }: ChatPanelProps) {
  const { runWorkflow, currentExecution, isRunning, clearCurrentExecution } = useWorkflowStore();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showIntermediates, setShowIntermediates] = useState<Record<string, boolean>>({});
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentExecution]);

  useEffect(() => {
    if (currentExecution.length > 0) {
      const lastEvent = currentExecution[currentExecution.length - 1];

      if (lastEvent.node === '__complete__') {
        const intermediateAgents = currentExecution
          .filter(e => e.node !== '__complete__' && e.node !== '__error__')
          .map(e => ({
            id: `agent-${e.node}-${Date.now()}`,
            role: 'agent' as const,
            content: e.output,
            agentName: e.node,
            timestamp: new Date(e.timestamp),
            isIntermediate: true,
          }));

        const finalMessage: ChatMessage = {
          id: `final-${Date.now()}`,
          role: 'assistant',
          content: lastEvent.output,
          timestamp: new Date(lastEvent.timestamp),
        };

        setMessages(prev => {
          const withoutPending = prev.filter(m => m.id !== 'pending');
          return [...withoutPending, ...intermediateAgents, finalMessage];
        });
      } else if (lastEvent.node === '__error__') {
        setMessages(prev => {
          const withoutPending = prev.filter(m => m.id !== 'pending');
          return [...withoutPending, {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `Error: ${lastEvent.output}`,
            timestamp: new Date(lastEvent.timestamp),
          }];
        });
      }
    }
  }, [currentExecution]);

  const handleSend = async () => {
    if (!input.trim() || isRunning) return;

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

    const currentInput = input;
    setInput('');
    clearCurrentExecution();

    try {
      await runWorkflow(workflowId, currentInput, conversationId);
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
    }
  };

  const toggleIntermediate = (msgId: string) => {
    setShowIntermediates(prev => ({ ...prev, [msgId]: !prev[msgId] }));
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

  return (
    <div className="w-[450px] bg-slate-900 border-l border-slate-700 h-full flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800">
        <div>
          <h3 className="text-white font-semibold">Chat</h3>
          <p className="text-xs text-slate-400">{workflowName}</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Start a conversation with your workflow</p>
            <p className="text-slate-500 text-xs mt-1">You'll see each agent's output as it runs</p>
          </div>
        ) : (
          groupedMessages.map((item) => {
            if (item.type === 'intermediates') {
              const isExpanded = showIntermediates[item.id];
              return (
                <div key={item.id} className="border border-slate-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleIntermediate(item.id)}
                    className="w-full flex items-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 text-left"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="text-sm text-slate-300">
                      Agent Steps ({item.messages.length})
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="p-3 space-y-3 bg-slate-850">
                      {item.messages.map((msg) => (
                        <div key={msg.id} className="bg-slate-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                              <Bot size={12} className="text-white" />
                            </div>
                            <span className="text-xs font-medium text-indigo-400">
                              {msg.agentName}
                            </span>
                          </div>
                          <p className="text-sm text-slate-300 whitespace-pre-wrap">
                            {msg.content.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content}
                          </p>
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
                <div key="pending" className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex-1 bg-slate-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={14} className="animate-spin text-indigo-400" />
                      <span className="text-sm text-slate-400">Processing...</span>
                    </div>
                    {currentExecution.length > 0 && (
                      <div className="mt-2 text-xs text-slate-500">
                        Running: {currentExecution[currentExecution.length - 1]?.node}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === 'user' ? 'bg-green-600' : 'bg-indigo-600'
                }`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`flex-1 max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user' ? 'bg-green-900/50 ml-auto' : 'bg-slate-800'
                }`}>
                  <p className="text-sm text-slate-200 whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-800">
        <div className="flex gap-2">
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
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
            rows={2}
            disabled={isRunning}
          />
          <Button
            onClick={handleSend}
            disabled={isRunning || !input.trim()}
            className="self-end"
          >
            {isRunning ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
