import { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea } from '../common';
import type { Agent, AgentCreate } from '../../types';

interface AgentFormProps {
  agent?: Agent | null;
  onSubmit: (data: AgentCreate) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const LLM_MODELS = [
  { value: 'us.anthropic.claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { value: 'us.anthropic.claude-opus-4-5', label: 'Claude Opus 4.5' },
  { value: 'us.anthropic.claude-haiku-4-5', label: 'Claude Haiku 4.5' },
];

const AVAILABLE_TOOLS = [
  { id: 'web_search', name: 'Web Search' },
  { id: 'calculator', name: 'Calculator' },
  { id: 'code_executor', name: 'Code Executor' },
  { id: 'file_reader', name: 'File Reader' },
  { id: 'file_writer', name: 'File Writer' },
];

export function AgentForm({ agent, onSubmit, onCancel, isLoading }: AgentFormProps) {
  const [formData, setFormData] = useState<AgentCreate>({
    name: '',
    description: '',
    system_prompt: '',
    llm_provider: 'anthropic',
    llm_model: 'us.anthropic.claude-sonnet-4-6',
    temperature: 0.7,
    max_tokens: 4096,
    tools: [],
    tags: [],
  });

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        description: agent.description || '',
        system_prompt: agent.system_prompt,
        llm_provider: agent.llm_provider,
        llm_model: agent.llm_model,
        temperature: agent.temperature,
        max_tokens: agent.max_tokens,
        tools: agent.tools,
        tags: agent.tags,
      });
    }
  }, [agent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleToolToggle = (toolId: string) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools?.includes(toolId)
        ? prev.tools.filter((t) => t !== toolId)
        : [...(prev.tools || []), toolId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Agent Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        placeholder="e.g., Research Assistant"
        required
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        placeholder="Brief description of what this agent does..."
        rows={2}
      />

      <Textarea
        label="System Prompt"
        value={formData.system_prompt}
        onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
        placeholder="You are a helpful assistant that..."
        rows={4}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <Select
          label="LLM Model"
          value={formData.llm_model}
          onChange={(e) => setFormData({ ...formData, llm_model: e.target.value })}
          options={LLM_MODELS}
        />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Temperature: {formData.temperature}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-dark-bg rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <Input
        label="Max Tokens"
        type="number"
        value={formData.max_tokens}
        onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
        min={1}
        max={100000}
      />

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-2">Tools</label>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => handleToolToggle(tool.id)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                formData.tools?.includes(tool.id)
                  ? 'bg-accent-indigo text-white'
                  : 'bg-dark-bg text-slate-400 hover:bg-slate-700'
              }`}
            >
              {tool.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : agent ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
}
