export interface Agent {
  id: string;
  name: string;
  description: string | null;
  system_prompt: string;
  llm_provider: string;
  llm_model: string;
  temperature: number;
  max_tokens: number;
  tools: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  system_prompt: string;
  llm_provider?: string;
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
  tools?: string[];
  tags?: string[];
}

export type WorkflowType = 'SEQUENCE' | 'ROUTING' | 'PARALLEL' | 'HIERARCHY' | 'EVALUATOR';

export interface NodeConfig {
  id: string;
  type: 'agent' | 'fork' | 'join' | 'start' | 'end';
  agent_id?: string;
  agent_name?: string;
  role?: 'supervisor' | 'worker' | 'router' | 'generator' | 'evaluator';
  position: { x: number; y: number };
}

export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  condition?: string;
}

export interface WorkflowSettings {
  max_retries?: number;
  evaluator_node_id?: string;
  generator_node_id?: string;
  quality_threshold_prompt?: string;
}

export interface GraphConfig {
  workflow_type: WorkflowType;
  root_node?: string;
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  settings: WorkflowSettings;
}

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  workflow_type: WorkflowType;
  graph_config: GraphConfig;
  created_at: string;
  updated_at: string;
}

export interface WorkflowCreate {
  name: string;
  description?: string;
  workflow_type: WorkflowType;
  graph_config: GraphConfig;
}

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';

export interface Execution {
  id: string;
  workflow_id: string;
  conversation_id: string;
  input_text: string;
  output_text: string | null;
  status: ExecutionStatus;
  node_outputs: Record<string, string>;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface NodeOutput {
  node: string;
  output: string;
  status: 'running' | 'done' | 'error';
  timestamp: string;
  duration_ms?: number;
}

export interface LLMModel {
  id: string;
  name: string;
}

export interface LLMProvider {
  [provider: string]: LLMModel[];
}
