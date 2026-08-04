import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';

type StartNodeProps = { data: { label: string } };

export function StartNode({ data }: { data: StartNodeProps['data'] }) {
  return (
    <div className="group flex items-center gap-2 pl-3 pr-4 py-2 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full border border-emerald-300/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_8px_20px_-6px_rgba(16,185,129,0.55)] transition-transform duration-150 hover:scale-[1.03]">
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
        <Play size={11} className="text-white fill-white" />
      </span>
      <span className="text-white font-semibold text-sm tracking-wide">START</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-emerald-500 !border-2 !border-white/80"
      />
    </div>
  );
}
