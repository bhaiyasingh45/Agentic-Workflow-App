import { useState } from 'react';
import { X, Play, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button, Textarea } from '../common';
import { useWorkflowStore } from '../../stores/workflowStore';
import type { NodeOutput } from '../../types';

interface RunPanelProps {
  workflowId: string;
  onClose: () => void;
}

export function RunPanel({ workflowId, onClose }: RunPanelProps) {
  const { runWorkflow, currentExecution, isRunning, clearCurrentExecution } = useWorkflowStore();
  const [input, setInput] = useState('');

  const handleRun = async () => {
    if (!input.trim()) return;
    clearCurrentExecution();
    await runWorkflow(workflowId, input);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 size={14} className="animate-spin text-accent-indigo" />;
      case 'done':
        return <CheckCircle size={14} className="text-accent-green" />;
      case 'error':
        return <XCircle size={14} className="text-accent-red" />;
      default:
        return <Clock size={14} className="text-slate-400" />;
    }
  };

  const finalOutput = currentExecution.find((e) => e.node === '__complete__');

  return (
    <div className="w-96 bg-dark-card border-l border-dark-border h-full flex flex-col">
      <div className="p-4 border-b border-dark-border flex items-center justify-between">
        <h3 className="text-white font-semibold">Run Workflow</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="p-4 border-b border-dark-border">
        <Textarea
          label="Input"
          placeholder="Enter your query..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
        />
        <Button
          className="w-full mt-3"
          onClick={handleRun}
          disabled={isRunning || !input.trim()}
        >
          {isRunning ? (
            <>
              <Loader2 size={16} className="mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play size={16} className="mr-2" />
              Run
            </>
          )}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <h4 className="text-slate-400 text-xs font-medium uppercase mb-3">Execution Output</h4>

        {currentExecution.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-8">
            Run the workflow to see output
          </p>
        ) : (
          <div className="space-y-3">
            {currentExecution
              .filter((e) => e.node !== '__complete__' && e.node !== '__error__')
              .map((event, idx) => (
                <div
                  key={idx}
                  className="bg-dark-bg rounded-lg border border-dark-border p-3"
                >
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(event.status)}
                    <span className="text-white text-sm font-medium">{event.node}</span>
                  </div>
                  <p className="text-slate-300 text-sm whitespace-pre-wrap break-words">
                    {event.output.slice(0, 500)}
                    {event.output.length > 500 && '...'}
                  </p>
                </div>
              ))}

            {finalOutput && (
              <div className="bg-accent-green/10 border border-accent-green/30 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={16} className="text-accent-green" />
                  <span className="text-white font-semibold">Final Output</span>
                  {finalOutput.duration_ms && (
                    <span className="text-slate-400 text-xs ml-auto">
                      {finalOutput.duration_ms}ms
                    </span>
                  )}
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap">
                  {finalOutput.output}
                </p>
              </div>
            )}

            {currentExecution.find((e) => e.node === '__error__') && (
              <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <XCircle size={16} className="text-accent-red" />
                  <span className="text-white font-semibold">Error</span>
                </div>
                <p className="text-red-300 text-sm">
                  {currentExecution.find((e) => e.node === '__error__')?.output}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
