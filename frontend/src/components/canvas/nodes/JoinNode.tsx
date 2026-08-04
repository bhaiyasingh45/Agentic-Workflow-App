import { Handle, Position } from '@xyflow/react';
import { GitMerge } from 'lucide-react';

export function JoinNode({ selected }: { selected?: boolean }) {
  return (
    <div
      className={`px-4 py-3 rounded-xl bg-slate-800/90 backdrop-blur-sm border border-purple-500/50 border-t-[3px] border-t-purple-500 shadow-lg transition-all duration-150 hover:shadow-xl hover:-translate-y-0.5 ${
        selected ? 'shadow-[0_0_0_2px_#a855f7,0_8px_20px_-6px_rgba(168,85,247,0.6)]' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />

      <div className="flex items-center gap-2">
        <span className="flex items-center justify-center w-6 h-6 rounded-md bg-purple-500/15 shrink-0">
          <GitMerge size={14} className="text-purple-400" />
        </span>
        <span className="font-semibold text-white text-sm tracking-wide">JOIN</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-purple-500 !border-2 !border-purple-300"
      />
    </div>
  );
}
