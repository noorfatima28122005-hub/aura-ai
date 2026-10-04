import React, { useState } from 'react';
import { ConnectedAccount } from '../../types';
import {
  ShieldCheck,
  RefreshCw,
  Link,
  Unlink,
  CheckCircle2,
  Lock,
  Mail,
  ShoppingCart,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';

interface ConnectedAccountsViewProps {
  accounts: ConnectedAccount[];
  onToggleConnect: (accountId: string) => void;
  onSyncAccount: (accountId: string) => void;
}

export const ConnectedAccountsView: React.FC<ConnectedAccountsViewProps> = ({
  accounts,
  onToggleConnect,
  onSyncAccount,
}) => {
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const handleSync = (id: string) => {
    setSyncingId(id);
    setTimeout(() => {
      onSyncAccount(id);
      setSyncingId(null);
    }, 1200);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'fiverr':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-extrabold text-sm">
            Fi
          </div>
        );
      case 'gmail':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
        );
      case 'outlook':
        return (
          <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Mail className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300">
            <Link className="w-5 h-5" />
          </div>
        );
    }
  };

  return (
    <div id="view-connected-accounts" className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#0D1220] via-[#111827] to-[#080B14] border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>ENCRYPTED INTEGRATIONS PROTOCOL</span>
          </div>
          <h2 className="text-2xl font-display font-extrabold text-white">
            Connected Accounts
          </h2>
          <p className="text-xs text-gray-400 mt-1 max-w-xl">
            Authorize official API links to your sales channels and client
            inboxes. AURA parses context and prepares recommendations while
            maintaining strict credential hygiene.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-3.5 py-2 rounded-xl">
          <Lock className="w-4 h-4" />
          <span>Zero-Password OAuth Storage</span>
        </div>
      </div>

      {/* Security notice per Section 22, 23, 29 */}
      <div className="aura-card p-4 rounded-xl border border-white/5 flex items-start space-x-3 text-xs text-gray-400">
        <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Security & Privacy Guarantee:</strong>{' '}
          AURA connects exclusively via official developer tokens or OAuth 2.0
          handshakes. We never ask for or store your Fiverr or Email account
          passwords. All telemetry data is processed under zero-retention
          isolation.
        </div>
      </div>

      {/* Accounts List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {accounts.map((acc) => {
          const isConnected = acc.status === 'connected';
          const isSyncing = syncingId === acc.id;

          return (
            <div
              key={acc.id}
              id={`card-account-${acc.id}`}
              className="aura-card p-6 rounded-2xl border border-white/5 hover:border-white/15 transition-all space-y-5"
            >
              {/* Top row */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  {getProviderIcon(acc.provider)}
                  <div>
                    <h3 className="text-sm font-bold text-white">{acc.name}</h3>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {acc.accountIdentifier}
                    </p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 ${
                    isConnected
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isConnected ? 'bg-emerald-400' : 'bg-gray-500'
                    }`}
                  />
                  <span className="capitalize">{acc.status}</span>
                </span>
              </div>

              {/* Permissions & Data telemetry */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Authorized Permissions:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {acc.permissions.map((perm) => (
                    <span
                      key={perm}
                      className="px-2 py-0.5 rounded-md bg-[#080B14] border border-white/5 text-[11px] text-gray-300"
                    >
                      ✓ {perm}
                    </span>
                  ))}
                </div>
              </div>

              {/* Live Telemetry metrics if connected */}
              {isConnected && acc.dataStats && (
                <div className="p-3 rounded-xl bg-[#080B14] border border-white/5 text-[11px] flex items-center justify-between text-gray-300">
                  <span>
                    Last Sync:{' '}
                    <strong className="text-white">{acc.lastSync}</strong>
                  </span>
                  {acc.dataStats.activeOrders !== undefined && (
                    <span className="text-cyan-300 font-semibold">
                      {acc.dataStats.activeOrders} active orders
                    </span>
                  )}
                  {acc.dataStats.analyzedEmails !== undefined && (
                    <span className="text-indigo-300 font-semibold">
                      {acc.dataStats.analyzedEmails} messages analyzed
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleSync(acc.id)}
                      disabled={isSyncing}
                      className="px-3 py-1.5 rounded-xl bg-[#0D1220] border border-white/10 text-xs font-medium text-gray-300 hover:text-white flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isSyncing ? 'animate-spin text-cyan-400' : ''
                        }`}
                      />
                      <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
                    </button>

                    <button
                      onClick={() => onToggleConnect(acc.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 cursor-pointer"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onToggleConnect(acc.id)}
                    className="w-full aura-gradient-btn text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer shadow-sm"
                  >
                    <Link className="w-3.5 h-3.5" />
                    <span>Authorize & Connect</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
