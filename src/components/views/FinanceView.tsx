import React, { useState } from 'react';
import { Invoice, Client, InvoiceStatus } from '../../types';
import {
  DollarSign,
  Plus,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  CreditCard,
  TrendingUp,
  Edit2,
  Trash2,
  Loader2,
  X,
} from 'lucide-react';
import { DeleteConfirmModal } from '../common/DeleteConfirmModal';

interface FinanceViewProps {
  invoices: Invoice[];
  clients: Client[];
  onAddInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => Promise<void> | void;
  onEditInvoice: (invoice: Invoice) => Promise<void> | void;
  onDeleteInvoice: (invoiceId: string) => Promise<void> | void;
  onUpdateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void> | void;
}

export const FinanceView: React.FC<FinanceViewProps> = ({
  invoices,
  clients,
  onAddInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onUpdateInvoiceStatus,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  // Deletion state
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form inputs
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [clientId, setClientId] = useState('');
  const [amount, setAmount] = useState(3000);
  const [dueDate, setDueDate] = useState('2026-10-15');
  const [status, setStatus] = useState<InvoiceStatus>('Sent');
  const [itemsStr, setItemsStr] = useState('Full Stack AI Implementation, 1, 3000');
  const [notes, setNotes] = useState('');

  const safeInvoices = Array.isArray(invoices) ? invoices : [];
  const safeClients = Array.isArray(clients) ? clients : [];

  const totalInvoiced = safeInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalPaid = safeInvoices
    .filter((inv) => inv && inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalPending = safeInvoices
    .filter((inv) => inv && (inv.status === 'Sent' || inv.status === 'Overdue'))
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const filteredInvoices = safeInvoices.filter((inv) => {
    if (!inv) return false;
    const matchesSearch =
      (inv.invoiceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
      (inv.clientName || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' ? true : inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenCreate = () => {
    setEditingInvoice(null);
    setFormError(null);
    setInvoiceNumber(`INV-2026-${Math.floor(100 + Math.random() * 900)}`);
    setClientId(safeClients[0]?.id || '');
    setAmount(3500);
    setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
    setStatus('Sent');
    setItemsStr('Sprint Deliverables & Architecture Setup, 1, 3500');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv: Invoice) => {
    setEditingInvoice(inv);
    setFormError(null);
    setInvoiceNumber(inv.invoiceNumber);
    setClientId(inv.clientId);
    setAmount(inv.amount);
    setDueDate(inv.dueDate);
    setStatus(inv.status);
    setNotes(inv.notes || '');

    if (inv.items && inv.items.length > 0) {
      setItemsStr(
        inv.items
          .map(
            (it) =>
              `${it.description}, ${it.quantity || 1}, ${it.unitPrice ?? it.amount ?? inv.amount}`
          )
          .join('\n')
      );
    } else {
      setItemsStr(`Services Rendered, 1, ${inv.amount}`);
    }

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!dueDate) {
      setFormError('Please choose a valid payment due date.');
      return;
    }

    if (amount <= 0 || isNaN(amount)) {
      setFormError('Invoice amount must be greater than $0.');
      return;
    }

    const client = clients.find((c) => c.id === clientId);
    const clientName = client ? client.name : editingInvoice?.clientName || 'Client';

    const items = itemsStr
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',');
        return {
          description: parts[0]?.trim() || 'Service Deliverable',
          quantity: Number(parts[1]?.trim()) || 1,
          unitPrice: Number(parts[2]?.trim()) || amount,
        };
      });

    setIsSaving(true);
    try {
      if (editingInvoice) {
        await onEditInvoice({
          ...editingInvoice,
          invoiceNumber: invoiceNumber.trim() || editingInvoice.invoiceNumber,
          clientId,
          clientName,
          amount: Number(amount),
          dueDate,
          status,
          items: items.length > 0 ? items : [{ description: 'Deliverable', quantity: 1, unitPrice: amount }],
          notes: notes.trim(),
        });
      } else {
        await onAddInvoice({
          invoiceNumber: invoiceNumber.trim() || `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
          clientId,
          clientName,
          amount: Number(amount),
          status,
          issueDate: new Date().toISOString().split('T')[0],
          dueDate,
          items: items.length > 0 ? items : [{ description: 'Deliverable', quantity: 1, unitPrice: amount }],
          notes: notes.trim(),
        });
      }
      setIsModalOpen(false);
      setEditingInvoice(null);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save invoice.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingInvoice) return;
    setIsDeleting(true);
    try {
      await onDeleteInvoice(deletingInvoice.id);
      setDeletingInvoice(null);
    } catch (err: any) {
      console.error('Delete invoice failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div id="view-finance" className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-white tracking-tight">
            Financial Ledger & Invoices
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Real receipts, verified accounts receivable, and cashflow ledger with persistent backend storage.
          </p>
        </div>

        <button
          id="btn-new-invoice"
          onClick={handleOpenCreate}
          className="aura-gradient-btn px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center space-x-1.5 shadow-sm shadow-indigo-600/30 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="aura-card p-5 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Total Invoiced
          </span>
          <p className="text-2xl font-display font-extrabold text-white">
            ${totalInvoiced.toLocaleString()}
          </p>
          <span className="text-[10px] text-gray-400">
            Across {invoices.length} total invoice(s)
          </span>
        </div>

        <div className="aura-card p-5 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Verified Collected
          </span>
          <p className="text-2xl font-display font-extrabold text-emerald-400">
            ${totalPaid.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-500/90 font-medium">
            Settled in bank account
          </span>
        </div>

        <div className="aura-card p-5 rounded-2xl border border-white/5 space-y-1">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
            Outstanding Receivable
          </span>
          <p className="text-2xl font-display font-extrabold text-amber-400">
            ${totalPending.toLocaleString()}
          </p>
          <span className="text-[10px] text-amber-500/90 font-medium">
            Pending client clearing
          </span>
        </div>
      </div>

      {/* Invoice Filter & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice number or client..."
            className="w-full bg-[#0D1220] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['All', 'Paid', 'Sent', 'Overdue', 'Draft'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-950/70 border border-indigo-500/50 text-cyan-300 font-semibold'
                  : 'bg-[#0D1220] border border-white/5 text-gray-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Table / Cards */}
      {filteredInvoices.length === 0 ? (
        <div className="aura-card py-16 text-center rounded-2xl border border-dashed border-white/10 p-6 space-y-3">
          <FileText className="w-10 h-10 text-gray-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No invoices found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {search || statusFilter !== 'All'
              ? 'No billing records match your current filter settings.'
              : 'Issue your first invoice to initialize financial analytics and cashflow velocity.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-2 px-4 py-2 rounded-xl aura-gradient-btn text-xs font-semibold text-white"
          >
            + Create First Invoice
          </button>
        </div>
      ) : (
        <div className="aura-card rounded-2xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#0D1220]/50 transition-all group"
            >
              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#080B14] border border-white/10 flex items-center justify-center text-indigo-400 flex-shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-white">
                      {inv.invoiceNumber}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        inv.status === 'Paid'
                          ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                          : inv.status === 'Overdue'
                          ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                          : inv.status === 'Draft'
                          ? 'bg-gray-800 text-gray-300 border border-gray-700'
                          : 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5 font-medium">
                    {inv.clientName}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Issued: {inv.issueDate} · Due: {inv.dueDate}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end space-x-3">
                <div className="text-right">
                  <span className="text-sm font-display font-bold text-white block">
                    ${inv.amount.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {inv.items?.length || 1} line item(s)
                  </span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {inv.status !== 'Paid' ? (
                    <button
                      onClick={() => onUpdateInvoiceStatus(inv.id, 'Paid')}
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Mark Paid
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateInvoiceStatus(inv.id, 'Sent')}
                      className="px-2.5 py-1.5 rounded-xl bg-[#080B14] border border-white/10 text-gray-400 hover:text-white text-xs cursor-pointer transition-colors"
                    >
                      Mark Unpaid
                    </button>
                  )}

                  {/* EDIT BUTTON */}
                  <button
                    id={`btn-edit-invoice-${inv.id}`}
                    onClick={() => handleOpenEdit(inv)}
                    title="Edit Invoice"
                    className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* DELETE BUTTON */}
                  <button
                    id={`btn-delete-invoice-${inv.id}`}
                    onClick={() => setDeletingInvoice(inv)}
                    title="Delete Invoice"
                    className="p-1.5 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Invoice Creation / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="aura-card max-w-md w-full p-6 rounded-2xl border border-indigo-500/30 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingInvoice ? `Edit Invoice (${editingInvoice.invoiceNumber})` : 'Create New Invoice'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingInvoice(null);
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Invoice #
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as InvoiceStatus)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent (Pending)</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Recipient Client
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {safeClients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.company})
                    </option>
                  ))}
                  {safeClients.length === 0 && (
                    <option value="">No clients registered</option>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Total Amount ($)
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Line Items (Description, Qty, Unit Price)
                </label>
                <textarea
                  rows={2}
                  value={itemsStr}
                  onChange={(e) => setItemsStr(e.target.value)}
                  placeholder="Design Sprint, 1, 3000"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  Payment Notes / Terms (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Net 14 days, wire transfer preferred"
                  className="w-full bg-[#080B14] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-white/5">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingInvoice(null);
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
                    <span>{editingInvoice ? 'Save Changes' : 'Issue Invoice'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingInvoice)}
        title="Delete Invoice"
        itemName={deletingInvoice?.invoiceNumber || 'Invoice'}
        itemType="Invoice"
        warningMessage="This invoice and its line items will be removed from your accounts receivable."
        relatedNotice={
          deletingInvoice?.status === 'Paid'
            ? '⚠️ Note: This invoice is currently marked Paid ($' +
              deletingInvoice.amount.toLocaleString() +
              '). Deleting it will adjust the client total collected revenue accordingly.'
            : undefined
        }
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingInvoice(null)}
      />
    </div>
  );
};
