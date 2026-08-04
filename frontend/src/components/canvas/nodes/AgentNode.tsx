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

const roleAccent: Record<string, string> = {
  supervisor: '#3b82f6',
  worker: '#64748b',
  router: '#f59e0b',
  generator: '#22c55e',
  evaluator: '#ef4444',
  default: '#6366f1',
};

const roleBadges: Record<string, string> = {
  supervisor: 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-500/40',
  worker: 'bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/40',
  router: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40',
  generator: 'bg-green-500/15 text-green-300 ring-1 ring-green-500/40',
  evaluator: 'bg-red-500/15 text-red-300 ring-1 ring-red-500/40',
  default: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/40',
};

export function AgentNode({ data, selected }: { data: AgentNodeData; selected?: boolean }) {
  const accent = roleAccent[data.role || 'default'] || roleAccent.default;
  const badge = data.role ? roleBadges[data.role] || roleBadges.default : null;

  return (
    <div
      className="min-w-[190px] rounded-xl bg-slate-800/90 backdrop-blur-sm border border-slate-700 shadow-lg transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5"
      style={{
        borderTopColor: accent,
        borderTopWidth: 3,
        boxShadow: selected
          ? `0 0 0 2px ${accent}, 0 8px 20px -6px ${accent}99`
          : undefined,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-200"
      />

      <div className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="flex items-center justify-center w-6 h-6 rounded-md shrink-0"
            style={{ backgroundColor: `${accent}26` }}
          >
            <Bot size={14} style={{ color: accent }} />
          </span>
          <span className="font-semibold text-white text-sm truncate">
            {data.agent_name || data.label}
          </span>
        </div>

        {data.role && (
          <span className={`inline-block px-2 py-0.5 text-[11px] font-medium rounded-full ${badge}`}>
            {data.role}
          </span>
        )}

        {(data.model || (data.tools_count ?? 0) > 0) && (
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/70 text-xs text-slate-400">
            {data.model && <span className="truncate">{data.model}</span>}
            {data.tools_count !== undefined && data.tools_count > 0 && (
              <span className="flex items-center gap-1 shrink-0">
                <Wrench size={10} />
                {data.tools_count}
              </span>
            )}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-200"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />

      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />
    </div>
  );
}
