import { Handle, Position } from '@xyflow/react';

export function EndNode() {
  return (
    <div className="px-4 py-2 bg-red-500 rounded-lg border-2 border-red-400 shadow-lg">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-red-500 border-2 border-red-400"
      />
      <div className="text-white font-semibold text-sm">END</div>
    </div>
  );
}
