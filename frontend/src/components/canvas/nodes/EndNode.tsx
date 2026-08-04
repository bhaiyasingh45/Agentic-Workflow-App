import { Handle, Position } from '@xyflow/react';
import { Square } from 'lucide-react';

export function EndNode() {
  return (
    <div className="group flex items-center gap-2 pl-3 pr-4 py-2 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full border border-rose-300/60 shadow-[0_0_0_1px_rgba(244,63,94,0.15),0_8px_20px_-6px_rgba(244,63,94,0.55)] transition-transform duration-150 hover:scale-[1.03]">
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white/80"
      />
      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-white/20">
        <Square size={9} className="text-white fill-white" />
      </span>
      <span className="text-white font-semibold text-sm tracking-wide">END</span>
    </div>
  );
}
