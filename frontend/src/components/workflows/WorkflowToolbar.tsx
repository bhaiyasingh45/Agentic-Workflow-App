import { Save, Trash2, Pencil, MessageSquare, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, Select } from '../common';
import { useCanvasStore } from '../../stores/canvasStore';
import type { WorkflowType } from '../../types';
import { useState } from 'react';

const workflowTypeOptions = [
  { value: 'SEQUENCE', label: 'Prompt Chaining (Sequential)' },
  { value: 'ROUTING', label: 'Routing' },
  { value: 'PARALLEL', label: 'Parallelisation' },
  { value: 'HIERARCHY', label: 'Orchestrator-Worker' },
  { value: 'EVALUATOR', label: 'Evaluator-Optimiser' },
];

interface WorkflowToolbarProps {
  workflowId?: string;
  onSave: () => void;
  onClear: () => void;
  isSaving?: boolean;
}

export function WorkflowToolbar({ workflowId, onSave, onClear, isSaving }: WorkflowToolbarProps) {
  const navigate = useNavigate();
  const { workflowName, workflowType, setWorkflowName, setWorkflowType } = useCanvasStore();
  const [isEditingName, setIsEditingName] = useState(false);

  const handleOpenChat = () => {
    if (!workflowId) {
      alert('Please save the workflow first before chatting');
      return;
    }
    window.open(`/chat/${workflowId}`, '_blank');
  };

  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        {isEditingName ? (
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            onBlur={() => setIsEditingName(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            autoFocus
            className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        ) : (
          <button
            onClick={() => setIsEditingName(true)}
            className="flex items-center gap-2 text-white font-semibold hover:text-indigo-400 transition-colors"
          >
            {workflowName}
            <Pencil size={14} className="text-slate-400" />
          </button>
        )}

        <Select
          value={workflowType}
          onChange={(e) => setWorkflowType(e.target.value as WorkflowType)}
          options={workflowTypeOptions}
          className="w-64 text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Trash2 size={16} className="mr-1" />
          Clear
        </Button>
        <Button variant="secondary" size="sm" onClick={onSave} disabled={isSaving}>
          <Save size={16} className="mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          size="sm"
          onClick={handleOpenChat}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <MessageSquare size={16} className="mr-1" />
          Chat
          <ExternalLink size={12} className="ml-1 opacity-70" />
        </Button>
      </div>
    </div>
  );
}
