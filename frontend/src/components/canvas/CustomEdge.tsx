import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

interface CustomEdgeData {
  condition?: string;
  edgeType?: 'bezier' | 'smoothstep' | 'step';
}

export function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  selected,
}: EdgeProps) {
  const edgeData = data as CustomEdgeData | undefined;
  const edgeType = edgeData?.edgeType || 'bezier';

  // Use bezier for more flexible curves
  const [edgePath, labelX, labelY] = edgeType === 'smoothstep'
    ? getSmoothStepPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      })
    : getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
      });

  const displayLabel = label || edgeData?.condition;

  // Color based on condition
  const getEdgeColor = () => {
    const condition = (edgeData?.condition || '').toUpperCase();
    if (condition.includes('REJECT')) return '#ef4444'; // red
    if (condition.includes('ACCEPT')) return '#22c55e'; // green
    return selected ? '#818cf8' : '#6366f1'; // default indigo
  };

  const edgeColor = getEdgeColor();

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: edgeData?.condition ? '5,5' : undefined,
        }}
      />
      <circle r="4" fill={edgeColor}>
        <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
      </circle>
      {displayLabel && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`px-2 py-1 border rounded text-xs font-medium shadow-lg cursor-pointer transition-colors ${
              displayLabel.toString().toUpperCase().includes('REJECT')
                ? 'bg-red-900/80 border-red-500 text-red-200 hover:bg-red-800'
                : displayLabel.toString().toUpperCase().includes('ACCEPT')
                ? 'bg-green-900/80 border-green-500 text-green-200 hover:bg-green-800'
                : 'bg-slate-800 border-slate-600 text-indigo-300 hover:bg-slate-700 hover:border-indigo-500'
            }`}
          >
            {displayLabel}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
