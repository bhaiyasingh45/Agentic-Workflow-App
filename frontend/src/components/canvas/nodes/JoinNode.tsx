import { Handle, Position } from '@xyflow/react';
import { GitMerge } from 'lucide-react';

export function JoinNode({ selected }: { selected?: boolean }) {
  return (
    <div
      className={`px-4 py-3 bg-slate-800 rounded-lg border-2 border-purple-500 shadow-lg ${
        selected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500 border-2 border-purple-400"
      />

      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-3 h-3 bg-purple-500 border-2 border-purple-400"
      />

      <Handle
        type="target"
        position={Position.Right}
        id="right"
        className="w-3 h-3 bg-purple-500 border-2 border-purple-400"
      />

      <div className="flex items-center gap-2">
        <GitMerge size={16} className="text-purple-400" />
        <span className="font-medium text-white text-sm">JOIN</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-purple-500 border-2 border-purple-400"
      />
    </div>
  );
}
