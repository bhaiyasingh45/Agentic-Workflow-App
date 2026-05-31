import { Handle, Position } from '@xyflow/react';
import type { Node } from '@xyflow/react';

type StartNodeProps = { data: { label: string } };

export function StartNode({ data }: { data: StartNodeProps['data'] }) {
  return (
    <div className="px-4 py-2 bg-green-500 rounded-lg border-2 border-green-400 shadow-lg">
      <div className="text-white font-semibold text-sm">START</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-green-400"
      />
    </div>
  );
}
