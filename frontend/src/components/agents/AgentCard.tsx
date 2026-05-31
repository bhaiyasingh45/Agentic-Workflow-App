import { Bot, Pencil, Trash2, Eye, Wrench } from 'lucide-react';
import type { Agent } from '../../types';
import { Button } from '../common';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onDelete: (agent: Agent) => void;
  onView: (agent: Agent) => void;
}

export function AgentCard({ agent, onEdit, onDelete, onView }: AgentCardProps) {
  return (
    <div className="bg-dark-card border border-dark-border rounded-xl p-5 hover:border-accent-indigo/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-indigo/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent-indigo" />
          </div>
          <div>
            <h3 className="font-semibold text-white">{agent.name}</h3>
            <p className="text-xs text-slate-400">{agent.llm_model.split('.').pop()}</p>
          </div>
        </div>
      </div>

      {agent.description && (
        <p className="text-sm text-slate-400 mb-4 line-clamp-2">{agent.description}</p>
      )}

      <div className="flex items-center gap-2 mb-4">
        {agent.tools.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-dark-bg px-2 py-1 rounded">
            <Wrench size={12} />
            <span>{agent.tools.length} tools</span>
          </div>
        )}
        <div className="text-xs text-slate-500">
          {new Date(agent.created_at).toLocaleDateString()}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onView(agent)}>
          <Eye size={16} className="mr-1" />
          View
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onEdit(agent)}>
          <Pencil size={16} className="mr-1" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(agent)} className="text-accent-red hover:text-red-400">
          <Trash2 size={16} className="mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}
