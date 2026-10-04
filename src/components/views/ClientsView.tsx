import React, { useState } from 'react';
import { Client, Project, Task, Invoice } from '../../types';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  DollarSign,
  Briefcase,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
  Tag,
  Star,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface ClientsViewProps {
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  invoices: Invoice[];
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void> | void;
  onEditClient: (client: Client) => Promise<void> | void;
  onDeleteClient: (clientId: string) => Promise<void> | void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  projects,
  tasks,
  invoices,
  onAddClient,
  onEditClient,
  onDeleteClient,
}) => {
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Deletion modal state
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'Active' | 'Lead' | 'Archived'>('Active');
  const [formNotes, setFormNotes] = useState('');
  const [formTags, setFormTags] = useState('Enterprise, Retainer');

  const safeClients = Array.isArray(clients) ? clients : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  const filteredClients = safeClients.filter(
    (c) =>
      c &&
      ((c.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email || '').toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenCreate = () => {
    setEditingClient(null);
    setFormError(null);
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('Active');
    setFormNotes('');
    setFormTags('Enterprise, High Priority');
    setIsCreateModalOpen(true);
  };

  const handleOpenEdit = (c: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingClient(c);
    setFormError(null);
    setFormName(c.name);
    setFormCompany(c.company);
    setFormEmail(c.email);
    setFormPhone(c.phone || '');
    setFormStatus(c.status || 'Active');
    setFormNotes(c.notes || '');
    setFormTags(c.tags?.join(', ') || '');
    setIsCreateModalOpen(false);
  };

  const handleOpenDelete = (c: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingClient(c);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim()) {
      setFormError('Please enter a valid client or contact name.');
      return;
    }
    if (!formCompany.trim()) {
      setFormError('Please enter a company name.');
      return;
    }
    if (!formEmail.trim() || !formEmail.includes('@')) {
      setFormError('Please enter a valid work email address.');
      return;
    }

    const tagsArray = formTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      if (editingClient) {
        await onEditClient({
          ...editingClient,
          name: formName.trim(),
          company: formCompany.trim(),
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          status: formStatus,
          notes: formNotes.trim(),
          tags: tagsArray,
        });

        // Update selectedClient if currently opened
        if (selectedClient && selectedClient.id === editingClient.id) {
          setSelectedClient({
            ...selectedClient,
            name: formName.trim(),
            company: formCompany.trim(),
            email: formEmail.trim().toLowerCase(),
            phone: formPhone.trim(),
            status: formStatus,
            notes: formNotes.trim(),
            tags: tagsArray,
          });
        }

        setEditingClient(null);
      } else {
        await onAddClient({
          name: formName.trim(),
          company: formCompany.trim(),
          email: formEmail.trim().toLowerCase(),
          phone: formPhone.trim(),
          status: formStatus,
          totalBilled: 0,
          openProjectsCount: 0,
          rating: 5,
          notes: formNotes.trim(),
          tags: tagsArray,
        });
        setIsCreateModalOpen(false);
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to save client profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClient) return;
    setIsDeleting(true);
    try {
      await onDeleteClient(deletingClient.id);
      if (selectedClient && selectedClient.id === deletingClient.id) {
        setSelectedClient(null);
      }
      setDeletingClient(null);
    } catch (err: any) {
      console.error('Delete client failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Associated records for deletion notice
  const linkedProjectsCount = deletingClient
    ? safeProjects.filter((p) => p && p.clientId === deletingClient.id).length
    : 0;
  const linkedInvoicesCount = deletingClient
    ? safeInvoices.filter((i) => i && i.clientId === deletingClient.id).length
    : 0;

  return (
    <div id="view-clients" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Client Directory
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Manage client profiles, ongoing deliverables, billed invoices, and relationship intelligence with persistent backend storage.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            id="btn-add-client-modal"
            onClick={handleOpenCreate}
            className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Client</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center space-x-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by client name, organization, or email..."
            className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {filteredClients.length === 0 ? (
        <div className="aura-card py-16 text-center rounded-2xl border border-dashed border-white/10 p-6 space-y-3">
          <Users className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No clients found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search
              ? 'No client accounts match your search filters.'
              : 'Add your first client to link projects, track billable invoices, and receive AI context insights.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-4 py-2 rounded-xl aura-gradient-btn text-xs font-semibold text-white"
          >
            + Add First Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredClients.map((client) => {
            const clientProjects = safeProjects.filter(
              (p) => p && p.clientId === client.id
            );
            const clientInvoices = safeInvoices.filter(
              (inv) => inv && inv.clientId === client.id
            );
            const billedAmount = clientInvoices
              .filter((i) => i && i.status === 'Paid')
              .reduce((sum, i) => sum + (i.amount || 0), client.totalBilled || 0);

            return (
              <div
                key={client.id}
                onClick={() => setSelectedClient(client)}
                className="aura-card-interactive p-5 rounded-2xl border border-white/5 space-y-4 cursor-pointer relative group transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {client.name}
                      </h4>
                      <p className="text-[11px] text-gray-400">
                        {client.company}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100">
                    <button
                      id={`btn-edit-client-${client.id}`}
                      onClick={(e) => handleOpenEdit(client, e)}
                      title="Edit Client"
                      className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id={`btn-delete-client-${client.id}`}
                      onClick={(e) => handleOpenDelete(client, e)}
                      title="Delete Client"
                      className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-300">
                  <div className="flex items-center space-x-2 text-[11px] text-gray-400">
                    <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2 text-[11px] text-gray-400">
                      <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>

                {/* Metrics */}
                <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-[#080B14]">
                    <span className="text-[10px] text-gray-400 block">
                      Active Projects
                    </span>
                    <span className="font-bold text-white">
                      {clientProjects.length}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#080B14]">
                    <span className="text-[10px] text-gray-400 block">
                      Paid Billed
                    </span>
                    <span className="font-bold text-emerald-400">
                      ${billedAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {client.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-2 py-0.5 rounded bg-indigo-950/40 text-indigo-300 border border-indigo-500/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Client Detail Drawer / Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-2xl w-full p-6 rounded-2xl border border-indigo-500/30 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-white/5 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedClient.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {selectedClient.company} · {selectedClient.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleOpenEdit(selectedClient)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-900/50 text-xs font-semibold flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleOpenDelete(selectedClient)}
                  className="px-3 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/30 text-rose-300 hover:bg-rose-900/50 text-xs font-semibold flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="p-1.5 text-gray-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AI Context Analysis for this client */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-2">
              <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400">
                <Sparkles className="w-4 h-4" />
                <span>AURA Client Relationship Intelligence</span>
              </div>
              <p className="text-xs text-gray-200 leading-relaxed">
                {selectedClient.notes ||
                  'No specialized historical notes logged. AURA is monitoring this account for incoming contract revisions and payment milestone reminders.'}
              </p>
            </div>

            {/* Associated Projects */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Associated Projects (
                {safeProjects.filter((p) => p && p.clientId === selectedClient.id).length}
                )
              </h4>
              <div className="space-y-2">
                {safeProjects.filter((p) => p && p.clientId === selectedClient.id)
                  .length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No active projects linked to this client.
                  </p>
                ) : (
                  safeProjects
                    .filter((p) => p && p.clientId === selectedClient.id)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-3 rounded-xl bg-[#080B14] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{p.name}</p>
                          <span className="text-[10px] text-gray-400">
                            Due {p.deadline} · {p.progress}% completed
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-cyan-950/50 text-cyan-300 border border-cyan-500/30 text-[10px]">
                          {p.status}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Invoices */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Billing Invoices (
                {safeInvoices.filter((i) => i && i.clientId === selectedClient.id).length}
                )
              </h4>
              <div className="space-y-1.5">
                {safeInvoices.filter((i) => i && i.clientId === selectedClient.id)
                  .length === 0 ? (
                  <p className="text-xs text-gray-400 italic">
                    No billing invoices generated yet.
                  </p>
                ) : (
                  safeInvoices
                    .filter((i) => i && i.clientId === selectedClient.id)
                    .map((inv) => (
                      <div
                        key={inv.id}
                        className="p-2.5 rounded-lg bg-[#080B14] border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-mono text-gray-300">
                            {inv.invoiceNumber}
                          </span>
                          <span className="text-gray-500 text-[10px] ml-2">
                            Due {inv.dueDate}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white">
                            ${inv.amount.toLocaleString()}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded ${
                              inv.status === 'Paid'
                                ? 'bg-emerald-950/50 text-emerald-300'
                                : 'bg-amber-950/50 text-amber-300'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedClient(null)}
                className="px-4 py-2 rounded-xl bg-[#0D1220] border border-white/10 text-xs font-semibold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Client Modal */}
      {(isCreateModalOpen || editingClient) && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingClient ? `Edit Client: ${editingClient.name}` : 'Add New Client'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setEditingClient(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Full Name / Contact Person
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Alex Vance"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Company / Organization
                </label>
                <input
                  type="text"
                  required
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="e.g. Nexus Dynamics Corp"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Work Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="alex@nexus.io"
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+1 555 123 4567"
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Relationship Status
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Active">Active Client</option>
                  <option value="Lead">Prospective Lead</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Client Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  placeholder="Enterprise, High Priority, Retainer"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Notes & Context for AURA
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Any preferences, deliverables, or relationship nuances..."
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    setEditingClient(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-sm flex items-center space-x-1.5 disabled:opacity-60 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>{editingClient ? 'Save Changes' : 'Create Client'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingClient)}
        title="Delete Client"
        itemName={deletingClient?.name || 'Client'}
        itemType="Client"
        warningMessage="Are you sure you want to delete this client? This will remove their record from your workspace."
        relatedNotice={
          linkedProjectsCount > 0 || linkedInvoicesCount > 0
            ? `⚠️ Warning: This client currently has ${linkedProjectsCount} associated project(s) and ${linkedInvoicesCount} invoice(s). Deleting will archive the client and unlink these records.`
            : undefined
        }
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingClient(null)}
      />
    </div>
  );
};
