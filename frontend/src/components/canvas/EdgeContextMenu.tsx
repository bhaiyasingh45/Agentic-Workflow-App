import { useState } from 'react';
import { X, Tag, Trash2, ArrowRight } from 'lucide-react';
import { Button, Input } from '../common';

interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  currentLabel?: string;
  onClose: () => void;
  onUpdateLabel: (edgeId: string, label: string) => void;
  onDelete: (edgeId: string) => void;
}

export function EdgeContextMenu({
  x,
  y,
  edgeId,
  currentLabel,
  onClose,
  onUpdateLabel,
  onDelete,
}: EdgeContextMenuProps) {
  const [label, setLabel] = useState(currentLabel || '');
  const [isEditingLabel, setIsEditingLabel] = useState(false);

  const handleSaveLabel = () => {
    onUpdateLabel(edgeId, label);
    setIsEditingLabel(false);
  };

  const handleDelete = () => {
    onDelete(edgeId);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 min-w-[200px]"
        style={{ left: x, top: y }}
      >
        <div className="flex items-center justify-between px-2 py-1 mb-1 border-b border-slate-700">
          <span className="text-xs text-slate-400 font-medium">Edge Options</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>

        {isEditingLabel ? (
          <div className="p-2 space-y-2">
            <Input
              placeholder="e.g., if sentiment = positive"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveLabel} className="flex-1">
                Save
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsEditingLabel(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <button
              onClick={() => setIsEditingLabel(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded"
            >
              <Tag size={14} />
              <span>{currentLabel ? 'Edit Condition' : 'Add Condition'}</span>
            </button>

            {currentLabel && (
              <div className="px-3 py-1">
                <span className="text-xs text-slate-500">Current: </span>
                <span className="text-xs text-indigo-400">{currentLabel}</span>
              </div>
            )}

            <button
              onClick={handleDelete}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 rounded"
            >
              <Trash2 size={14} />
              <span>Delete Edge</span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
