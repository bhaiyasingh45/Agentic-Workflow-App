import { useEffect, useState } from 'react';
import { Plus, Search, Bot } from 'lucide-react';
import { useAgentStore } from '../stores/agentStore';
import { AgentCard, AgentForm } from '../components/agents';
import { Button, Modal, Input } from '../components/common';
import type { Agent, AgentCreate } from '../types';

export function AgentsPage() {
  const { agents, isLoading, fetchAgents, createAgent, updateAgent, deleteAgent } = useAgentStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Agent | null>(null);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleCreate = () => {
    setEditingAgent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleDelete = async (agent: Agent) => {
    setDeleteConfirm(agent);
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      await deleteAgent(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleView = (agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: AgentCreate) => {
    if (editingAgent) {
      await updateAgent(editingAgent.id, data);
    } else {
      await createAgent(data);
    }
    setIsModalOpen(false);
    setEditingAgent(null);
  };

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <Bot className="w-8 h-8 text-accent-indigo" />
              My Agents
            </h1>
            <p className="text-slate-400 mt-1">Create and manage your AI agents</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus size={18} className="mr-2" />
            Create Agent
          </Button>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-indigo"></div>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="text-center py-20">
            <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No agents yet</h3>
            <p className="text-slate-400 mb-6">Create your first agent to get started</p>
            <Button onClick={handleCreate}>
              <Plus size={18} className="mr-2" />
              Create Agent
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onView={handleView}
              />
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingAgent(null);
          }}
          title={editingAgent ? 'Edit Agent' : 'Create Agent'}
          size="lg"
        >
          <AgentForm
            agent={editingAgent}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsModalOpen(false);
              setEditingAgent(null);
            }}
            isLoading={isLoading}
          />
        </Modal>

        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Agent"
          size="sm"
        >
          <p className="text-slate-300 mb-6">
            Are you sure you want to delete "{deleteConfirm?.name}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
