import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  reconnectEdge,
} from '@xyflow/react';
import type { Edge, Connection } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { CustomEdge } from './CustomEdge';
import { EdgeContextMenu } from './EdgeContextMenu';
import { useCanvasStore } from '../../stores/canvasStore';
import type { Agent } from '../../types';

const edgeTypes = {
  custom: CustomEdge,
};

interface ContextMenuState {
  x: number;
  y: number;
  edgeId: string;
  label?: string;
}

function Flow() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateEdgeLabel,
    setEdges,
  } = useCanvasStore();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const agentData = event.dataTransfer.getData('application/agent');
      if (!agentData) return;

      const agent: Agent = JSON.parse(agentData);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: `agent-${agent.id}-${Date.now()}`,
        type: 'agentNode',
        position,
        data: {
          label: agent.name,
          agent_id: agent.id,
          agent_name: agent.name,
          model: agent.llm_model.split('.').pop(),
          tools_count: agent.tools.length,
        },
      };

      addNode(newNode);
    },
    [screenToFlowPosition, addNode]
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
        label: typeof edge.label === 'string' ? edge.label : undefined,
      });
    },
    []
  );

  const onEdgeDoubleClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      const label = prompt('Enter condition label (e.g., "if positive", "math query"):',
        typeof edge.label === 'string' ? edge.label : '');
      if (label !== null) {
        updateEdgeLabel(edge.id, label);
      }
    },
    [updateEdgeLabel]
  );

  const handleUpdateLabel = useCallback(
    (edgeId: string, label: string) => {
      updateEdgeLabel(edgeId, label);
      setContextMenu(null);
    },
    [updateEdgeLabel]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges(edges.filter((e) => e.id !== edgeId));
      setContextMenu(null);
    },
    [edges, setEdges]
  );

  // Handle edge reconnection (dragging edge endpoints)
  const edgeReconnectSuccessful = useRef(true);

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeReconnectSuccessful.current = true;
      setEdges(reconnectEdge(oldEdge, newConnection, edges));
    },
    [edges, setEdges]
  );

  const onReconnectEnd = useCallback(
    (_: MouseEvent | TouchEvent, edge: Edge) => {
      if (!edgeReconnectSuccessful.current) {
        // If reconnect failed (dropped in empty space), optionally delete the edge
        // setEdges(edges.filter((e) => e.id !== edge.id));
      }
      edgeReconnectSuccessful.current = true;
    },
    []
  );

  const styledEdges = edges.map((edge) => ({
    ...edge,
    type: 'custom',
    animated: true,
    reconnectable: true,
  }));

  return (
    <div ref={reactFlowWrapper} className="flex-1 h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={styledEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onEdgeContextMenu={onEdgeContextMenu}
        onEdgeDoubleClick={onEdgeDoubleClick}
        onReconnectStart={onReconnectStart}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        edgesReconnectable={true}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          style: { stroke: '#6366f1', strokeWidth: 2 },
          type: 'custom',
          animated: true,
        }}
        connectionLineStyle={{ stroke: '#6366f1', strokeWidth: 2 }}
        connectionLineType="bezier"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls className="bg-slate-800 border border-slate-700 rounded-lg [&>button]:bg-slate-800 [&>button]:border-slate-700 [&>button]:text-white [&>button:hover]:bg-slate-700" />
        <MiniMap
          className="bg-slate-800 border border-slate-700 rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'startNode') return '#10b981';
            if (node.type === 'endNode') return '#ef4444';
            if (node.type === 'forkNode' || node.type === 'joinNode') return '#8b5cf6';
            return '#6366f1';
          }}
          maskColor="rgba(15, 23, 42, 0.8)"
        />
      </ReactFlow>

      {contextMenu && (
        <EdgeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          edgeId={contextMenu.edgeId}
          currentLabel={contextMenu.label}
          onClose={() => setContextMenu(null)}
          onUpdateLabel={handleUpdateLabel}
          onDelete={handleDeleteEdge}
        />
      )}

      <div className="absolute bottom-4 left-4 bg-slate-800/90 border border-slate-700 rounded-lg p-3 text-xs text-slate-400">
        <div className="font-medium text-slate-300 mb-1">Tips:</div>
        <div>Drag from handles to connect nodes</div>
        <div>Drag edge endpoints to reconnect</div>
        <div>Double-click edge to add condition</div>
        <div>Right-click edge for more options</div>
        <div className="mt-1 text-slate-500">Conditions: ACCEPT, REJECT</div>
      </div>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <Flow />
    </ReactFlowProvider>
  );
}
