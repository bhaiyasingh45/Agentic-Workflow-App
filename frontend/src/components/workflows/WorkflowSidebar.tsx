import { useEffect, useState } from 'react';
import { Plus, GitBranch, Search } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { Button, Input } from '../common';
import type { Workflow, WorkflowType } from '../../types';

const workflowTypeBadges: Record<WorkflowType, { color: string; label: string }> = {
  SEQUENCE: { color: 'bg-accent-indigo', label: 'Sequence' },
  ROUTING: { color: 'bg-accent-amber', label: 'Routing' },
  PARALLEL: { color: 'bg-accent-purple', label: 'Parallel' },
  HIERARCHY: { color: 'bg-accent-blue', label: 'Hierarchy' },
  EVALUATOR: { color: 'bg-accent-red', label: 'Evaluator' },
};

interface WorkflowSidebarProps {
  onSelect: (workflow: Workflow) => void;
  onCreate: () => void;
  selectedId?: string;
}

export function WorkflowSidebar({ onSelect, onCreate, selectedId }: WorkflowSidebarProps) {
  const { workflows, fetchWorkflows, isLoading } = useWorkflowStore();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const filteredWorkflows = workflows.filter((w) =>
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-64 bg-dark-card border-r border-dark-border h-full flex flex-col">
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">My Workflows</h3>
          <Button size="sm" onClick={onCreate}>
            <Plus size={14} />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm py-1.5"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent-indigo"></div>
          </div>
        ) : filteredWorkflows.length === 0 ? (
          <div className="text-center py-8">
            <GitBranch className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No workflows yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredWorkflows.map((workflow) => (
              <button
                key={workflow.id}
                onClick={() => onSelect(workflow)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedId === workflow.id
                    ? 'bg-accent-indigo/20 border border-accent-indigo'
                    : 'bg-dark-bg hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white text-sm font-medium truncate">
                    {workflow.name}
                  </span>
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded text-white ${
                      workflowTypeBadges[workflow.workflow_type].color
                    }`}
                  >
                    {workflowTypeBadges[workflow.workflow_type].label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>{workflow.graph_config.nodes.length - 2} agents</span>
                  <span>|</span>
                  <span>{new Date(workflow.updated_at).toLocaleDateString()}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
