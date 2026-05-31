import { StartNode } from './StartNode';
import { EndNode } from './EndNode';
import { AgentNode } from './AgentNode';
import { ForkNode } from './ForkNode';
import { JoinNode } from './JoinNode';

export const nodeTypes = {
  startNode: StartNode,
  endNode: EndNode,
  agentNode: AgentNode,
  forkNode: ForkNode,
  joinNode: JoinNode,
};

export { StartNode, EndNode, AgentNode, ForkNode, JoinNode };
