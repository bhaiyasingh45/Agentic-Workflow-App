import { useState, useCallback } from 'react';
import { WorkflowSidebar, WorkflowToolbar } from '../components/workflows';
import { WorkflowCanvas, AgentLibrary } from '../components/canvas';
import { Modal, Input, Select, Button } from '../components/common';
import { useCanvasStore } from '../stores/canvasStore';
import { useWorkflowStore } from '../stores/workflowStore';
import type { Workflow, WorkflowType, Agent } from '../types';

const workflowTypeOptions = [
  { value: 'SEQUENCE', label: 'Prompt Chaining (Sequential)' },
  { value: 'ROUTING', label: 'Routing' },
  { value: 'PARALLEL', label: 'Parallelisation' },
  { value: 'HIERARCHY', label: 'Orchestrator-Worker' },
  { value: 'EVALUATOR', label: 'Evaluator-Optimiser' },
];

export function WorkflowsPage() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowType, setNewWorkflowType] = useState<WorkflowType>('SEQUENCE');

  const {
    clearCanvas,
    loadFromConfig,
    getGraphConfig,
    setWorkflowName,
    setWorkflowType,
    addNode,
  } = useCanvasStore();

  const { createWorkflow, updateWorkflow, isLoading } = useWorkflowStore();

  const handleSelectWorkflow = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    const config = workflow.graph_config;
    loadFromConfig(
      config.nodes,
      config.edges,
      config.workflow_type,
      workflow.name,
      config.settings
    );
  };

  const handleCreateNew = () => {
    setNewWorkflowName('');
    setNewWorkflowType('SEQUENCE');
    setShowCreateModal(true);
  };

  const handleConfirmCreate = async () => {
    clearCanvas();
    setWorkflowName(newWorkflowName);
    setWorkflowType(newWorkflowType);

    const graphConfig = getGraphConfig();
    const workflow = await createWorkflow({
      name: newWorkflowName,
      workflow_type: newWorkflowType,
      graph_config: {
        ...graphConfig,
        workflow_type: newWorkflowType,
      },
    });

    setSelectedWorkflow(workflow);
    setShowCreateModal(false);
  };

  const handleSave = async () => {
    const graphConfig = getGraphConfig();

    if (selectedWorkflow) {
      const updated = await updateWorkflow(selectedWorkflow.id, {
        name: useCanvasStore.getState().workflowName,
        workflow_type: graphConfig.workflow_type,
        graph_config: graphConfig,
      });
      setSelectedWorkflow(updated);
    } else {
      const workflow = await createWorkflow({
        name: useCanvasStore.getState().workflowName,
        workflow_type: graphConfig.workflow_type,
        graph_config: graphConfig,
      });
      setSelectedWorkflow(workflow);
    }
  };

  const handleClear = () => {
    clearCanvas();
    setSelectedWorkflow(null);
  };

  const handleDragStart = useCallback((event: React.DragEvent, agent: Agent) => {
    event.dataTransfer.setData('application/agent', JSON.stringify(agent));
    event.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleAddSpecialNode = useCallback((type: 'fork' | 'join') => {
    const id = `${type}-${Date.now()}`;
    addNode({
      id,
      type: `${type}Node`,
      position: { x: 450, y: 300 },
      data: { label: type.toUpperCase() },
    });
  }, [addNode]);

  return (
    <div className="h-screen bg-slate-900 flex">
      <WorkflowSidebar
        onSelect={handleSelectWorkflow}
        onCreate={handleCreateNew}
        selectedId={selectedWorkflow?.id}
      />

      <div className="flex-1 flex flex-col">
        <WorkflowToolbar
          workflowId={selectedWorkflow?.id}
          onSave={handleSave}
          onClear={handleClear}
          isSaving={isLoading}
        />

        <div className="flex-1 flex" style={{ height: 'calc(100vh - 56px)' }}>
          <div className="flex-1 relative">
            <WorkflowCanvas />
          </div>

          <AgentLibrary
            onDragStart={handleDragStart}
            onAddSpecialNode={handleAddSpecialNode}
          />
        </div>
      </div>

      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Workflow"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            label="Workflow Name"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            placeholder="e.g., Research Pipeline"
          />
          <Select
            label="Workflow Type"
            value={newWorkflowType}
            onChange={(e) => setNewWorkflowType(e.target.value as WorkflowType)}
            options={workflowTypeOptions}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmCreate}
              disabled={!newWorkflowName.trim() || isLoading}
            >
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
