import { create } from 'zustand';
import { applyNodeChanges, applyEdgeChanges, addEdge } from '@xyflow/react';
import type { Node, Edge, OnNodesChange, OnEdgesChange, OnConnect, Connection } from '@xyflow/react';
import type { WorkflowType, NodeConfig, EdgeConfig, WorkflowSettings } from '../types';

interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  workflowType: WorkflowType;
  workflowName: string;
  settings: WorkflowSettings;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeConfig>) => void;
  updateEdgeLabel: (edgeId: string, label: string) => void;
  setWorkflowType: (type: WorkflowType) => void;
  setWorkflowName: (name: string) => void;
  setSettings: (settings: Partial<WorkflowSettings>) => void;
  clearCanvas: () => void;
  loadFromConfig: (nodes: NodeConfig[], edges: EdgeConfig[], type: WorkflowType, name: string, settings: WorkflowSettings) => void;
  getGraphConfig: () => { nodes: NodeConfig[]; edges: EdgeConfig[]; settings: WorkflowSettings; workflow_type: WorkflowType };
}

const defaultNodes: Node[] = [
  {
    id: 'start',
    type: 'startNode',
    position: { x: 400, y: 50 },
    data: { label: 'START' },
  },
  {
    id: 'end',
    type: 'endNode',
    position: { x: 400, y: 600 },
    data: { label: 'END' },
  },
];

export const useCanvasStore = create<CanvasState>((set, get) => ({
  nodes: [...defaultNodes],
  edges: [],
  workflowType: 'SEQUENCE',
  workflowName: 'New Workflow',
  settings: { max_retries: 3 },

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) => {
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes),
    }));
  },

  onEdgesChange: (changes) => {
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges),
    }));
  },

  onConnect: (connection: Connection) => {
    if (!connection.source || !connection.target) return;

    const newEdge: Edge = {
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'custom',
      animated: true,
      reconnectable: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    };

    set((state) => ({
      edges: addEdge(newEdge, state.edges),
    }));
  },

  addNode: (node) => {
    set((state) => ({
      nodes: [...state.nodes, node],
    }));
  },

  removeNode: (nodeId) => {
    if (nodeId === 'start' || nodeId === 'end') return;
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      edges: state.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    }));
  },

  updateNodeData: (nodeId, data) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
      ),
    }));
  },

  updateEdgeLabel: (edgeId, label) => {
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, label } : e
      ),
    }));
  },

  setWorkflowType: (type) => set({ workflowType: type }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),

  clearCanvas: () => set({
    nodes: [...defaultNodes],
    edges: [],
    workflowName: 'New Workflow',
    settings: { max_retries: 3 },
  }),

  loadFromConfig: (nodeConfigs, edgeConfigs, type, name, settings) => {
    const nodes: Node[] = nodeConfigs.map((nc) => ({
      id: nc.id,
      type: nc.type === 'agent' ? 'agentNode' : nc.type === 'fork' ? 'forkNode' : nc.type === 'join' ? 'joinNode' : `${nc.type}Node`,
      position: nc.position,
      data: {
        agent_id: nc.agent_id,
        agent_name: nc.agent_name,
        role: nc.role,
        label: nc.agent_name || nc.type?.toUpperCase(),
      },
      draggable: true,
    }));

    const edges: Edge[] = edgeConfigs.map((ec) => ({
      id: ec.id,
      source: ec.source,
      target: ec.target,
      label: ec.condition,
      type: 'custom',
      animated: true,
      reconnectable: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
    }));

    set({ nodes, edges, workflowType: type, workflowName: name, settings });
  },

  getGraphConfig: () => {
    const { nodes, edges, workflowType, settings } = get();

    const nodeConfigs: NodeConfig[] = nodes
      .filter((n) => n.type !== 'startNode' && n.type !== 'endNode')
      .map((n) => ({
        id: n.id,
        type: n.data.agent_id ? 'agent' : (n.type?.replace('Node', '') as NodeConfig['type']),
        agent_id: n.data.agent_id,
        agent_name: n.data.agent_name || n.data.label,
        role: n.data.role,
        position: n.position,
      }));

    nodeConfigs.unshift({ id: 'start', type: 'start', position: { x: 400, y: 50 } });
    nodeConfigs.push({ id: 'end', type: 'end', position: { x: 400, y: 600 } });

    const edgeConfigs: EdgeConfig[] = edges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      condition: typeof e.label === 'string' ? e.label : undefined,
    }));

    return { nodes: nodeConfigs, edges: edgeConfigs, settings, workflow_type: workflowType };
  },
}));
