import { Handle, Position } from '@xyflow/react';
import { Bot, Wrench } from 'lucide-react';

interface AgentNodeData {
  label: string;
  agent_name?: string;
  agent_id?: string;
  role?: 'supervisor' | 'worker' | 'router' | 'generator' | 'evaluator';
  tools_count?: number;
  model?: string;
}

const roleColors: Record<string, string> = {
  supervisor: 'border-blue-500',
  worker: 'border-slate-500',
  router: 'border-amber-500',
  generator: 'border-green-500',
  evaluator: 'border-red-500',
  default: 'border-indigo-500',
};

const roleBadges: Record<string, string> = {
  supervisor: 'bg-blue-500',
  worker: 'bg-slate-600',
  router: 'bg-amber-500',
  generator: 'bg-green-500',
  evaluator: 'bg-red-500',
};

export function AgentNode({ data, selected }: { data: AgentNodeData; selected?: boolean }) {
  const borderColor = data.role ? roleColors[data.role] : roleColors.default;

  return (
    <div
      className={`min-w-[180px] bg-slate-800 rounded-lg border-2 ${borderColor} shadow-lg ${
        selected ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-slate-400 border-2 border-slate-300"
      />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Bot size={16} className="text-indigo-400" />
          <span className="font-medium text-white text-sm truncate">
            {data.agent_name || data.label}
          </span>
        </div>

        {data.role && (
          <span
            className={`inline-block px-2 py-0.5 text-xs rounded text-white ${
              roleBadges[data.role] || 'bg-slate-600'
            }`}
          >
            {data.role}
          </span>
        )}

        {data.model && (
          <div className="text-xs text-slate-400 mt-1">{data.model}</div>
        )}

        {data.tools_count !== undefined && data.tools_count > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <Wrench size={10} />
            <span>{data.tools_count} tools</span>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-slate-400 border-2 border-slate-300"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 bg-purple-500 border-2 border-purple-400"
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-3 h-3 bg-purple-500 border-2 border-purple-400"
      />
    </div>
  );
}
