import { useEffect } from 'react';
import { Bot, GitFork, GitMerge, Search } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { Input } from '../common';
import type { Agent } from '../../types';
import { useState } from 'react';

interface AgentLibraryProps {
  onDragStart: (event: React.DragEvent, agent: Agent) => void;
  onAddSpecialNode: (type: 'fork' | 'join') => void;
}

export function AgentLibrary({ onDragStart, onAddSpecialNode }: AgentLibraryProps) {
  const { agents, fetchAgents } = useAgentStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-64 bg-dark-card border-l border-dark-border h-full flex flex-col">
      <div className="p-4 border-b border-dark-border">
        <h3 className="text-white font-semibold mb-3">Agent Library</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <Input
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm py-1.5"
          />
        </div>
      </div>

      <div className="p-4 border-b border-dark-border">
        <h4 className="text-slate-400 text-xs font-medium uppercase mb-2">Special Nodes</h4>
        <div className="flex gap-2">
          <button
            onClick={() => onAddSpecialNode('fork')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-bg rounded-lg border border-dark-border hover:border-accent-purple transition-colors"
          >
            <GitFork size={14} className="text-accent-purple" />
            <span className="text-sm text-white">Fork</span>
          </button>
          <button
            onClick={() => onAddSpecialNode('join')}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-dark-bg rounded-lg border border-dark-border hover:border-accent-purple transition-colors"
          >
            <GitMerge size={14} className="text-accent-purple" />
            <span className="text-sm text-white">Join</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-slate-400 text-xs font-medium uppercase mb-2">Agents</h4>
        {filteredAgents.length === 0 ? (
          <p className="text-slate-500 text-sm">No agents found</p>
        ) : (
          <div className="space-y-2">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                draggable
                onDragStart={(e) => onDragStart(e, agent)}
                className="p-3 bg-dark-bg rounded-lg border border-dark-border cursor-grab hover:border-accent-indigo transition-colors active:cursor-grabbing"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Bot size={14} className="text-accent-indigo" />
                  <span className="text-white text-sm font-medium truncate">{agent.name}</span>
                </div>
                <p className="text-slate-400 text-xs truncate">{agent.description || 'No description'}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">{agent.llm_model.split('.').pop()}</span>
                  {agent.tools.length > 0 && (
                    <span className="text-xs text-slate-500">{agent.tools.length} tools</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
