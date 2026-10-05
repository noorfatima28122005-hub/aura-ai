import React, { useState, useEffect } from 'react';
import {
  UserProfile,
  WorkspaceData,
  NavigationTab,
  Client,
  Project,
  Task,
  Invoice,
  AiApprovalItem,
  InvoiceStatus,
} from './types';
import { emptyWorkspace, sampleBusinessWorkspace } from './data/initialData';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { ToastNotification, ToastMessage } from './components/common/ToastNotification';
import { Mic, Sparkles } from 'lucide-react';

// Views
import { OverviewView } from './components/views/OverviewView';
import { ClientsView } from './components/views/ClientsView';
import { ProjectsView } from './components/views/ProjectsView';
import { TasksView } from './components/views/TasksView';
import { AskAuraView } from './components/views/AskAuraView';
import { VoiceConversation } from './components/VoiceConversation';
import { ApprovalCenterView } from './components/views/ApprovalCenterView';
import { ConnectedAccountsView } from './components/views/ConnectedAccountsView';
import { FinanceView } from './components/views/FinanceView';
import { AutomationsView } from './components/views/AutomationsView';
import { AiInsightsView } from './components/views/AiInsightsView';
import { CalendarView } from './components/views/CalendarView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { SettingsView } from './components/views/SettingsView';

// Backend API
import {
  apiFetchWorkspace,
  apiResetWorkspace,
  apiCreateClient,
  apiUpdateClient,
  apiDeleteClient,
  apiCreateProject,
  apiUpdateProject,
  apiDeleteProject,
  apiCreateTask,
  apiUpdateTask,
  apiDeleteTask,
  apiCreateInvoice,
  apiUpdateInvoice,
  apiDeleteInvoice,
} from './lib/api';

import {
  saveWorkspaceToFirestore,
  loadWorkspaceFromFirestore,
} from './lib/firebase';

const STORAGE_KEY_USER = 'aura_user_profile';
const STORAGE_KEY_DATA = 'aura_workspace_data';
const STORAGE_KEY_IS_SAMPLE = 'aura_is_sample_dataset';

export default function App() {
  // 1. User State - starts unauthenticated if no verified session token
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_USER);
    const token = localStorage.getItem('aura_auth_token');
    if (saved && token) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // 2. Is Sample Dataset state
  const [isSampleData, setIsSampleData] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_IS_SAMPLE);
    return saved !== null ? JSON.parse(saved) : true;
  });

  // 3. Workspace Data State
  const [workspaceData, setWorkspaceData] = useState<WorkspaceData>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_DATA);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...sampleBusinessWorkspace,
          ...parsed,
          clients: Array.isArray(parsed.clients) ? parsed.clients : sampleBusinessWorkspace.clients,
          projects: Array.isArray(parsed.projects) ? parsed.projects : sampleBusinessWorkspace.projects,
          tasks: Array.isArray(parsed.tasks) ? parsed.tasks : sampleBusinessWorkspace.tasks,
          invoices: Array.isArray(parsed.invoices) ? parsed.invoices : sampleBusinessWorkspace.invoices,
          approvals: Array.isArray(parsed.approvals) ? parsed.approvals : sampleBusinessWorkspace.approvals,
          connectedAccounts: Array.isArray(parsed.connectedAccounts) ? parsed.connectedAccounts : sampleBusinessWorkspace.connectedAccounts,
          automations: Array.isArray(parsed.automations) ? parsed.automations : sampleBusinessWorkspace.automations,
          activityLogs: Array.isArray(parsed.activityLogs) ? parsed.activityLogs : sampleBusinessWorkspace.activityLogs,
        };
      } catch (e) {
        // fallback
      }
    }
    return sampleBusinessWorkspace;
  });

  // 4. Navigation & UI state
  const [currentTab, setCurrentTab] = useState<NavigationTab>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // 5. Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const newToast: ToastMessage = {
      id: `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title,
      message,
      type,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Global Keyboard Shortcut: Cmd/Ctrl + Shift + K to activate VoiceConversation modal from anywhere
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrl = e.metaKey || e.ctrlKey;
      const isShift = e.shiftKey;
      const isKeyK = e.key === 'k' || e.key === 'K' || e.code === 'KeyK';

      if (isCmdOrCtrl && isShift && isKeyK) {
        e.preventDefault();
        e.stopPropagation();
        setIsVoiceModalOpen((prev) => !prev);
        return;
      }

      // Close modal on Escape
      if (e.key === 'Escape' && isVoiceModalOpen) {
        setIsVoiceModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
    };
  }, [isVoiceModalOpen]);

  // Verify and refresh session with backend on load
  useEffect(() => {
    const token = localStorage.getItem('aura_auth_token');
    if (token) {
      fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Session invalid');
        })
        .then((data) => {
          if (data?.user) {
            setUser(data.user);
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(data.user));
            if (data.token) localStorage.setItem('aura_auth_token', data.token);
          }
        })
        .catch(() => {
          localStorage.removeItem('aura_auth_token');
          localStorage.removeItem(STORAGE_KEY_USER);
          setUser(null);
        });
    }
  }, []);

  // Fetch persistent workspace from backend and Firestore when authenticated
  useEffect(() => {
    if (user) {
      const userId = user.id || 'workingbynoor@gmail.com';
      // Load from Firestore
      loadWorkspaceFromFirestore(userId).then((cloudData) => {
        if (cloudData && (cloudData.clients?.length || cloudData.projects?.length)) {
          setWorkspaceData((prev) => ({
            ...prev,
            ...cloudData,
          }));
        }
      }).catch((err) => console.warn('Firestore load notice:', err));

      apiFetchWorkspace()
        .then((data) => {
          if (data) {
            setWorkspaceData((prev) => ({
              ...prev,
              ...data,
              clients: Array.isArray(data.clients) ? data.clients : (prev.clients || []),
              projects: Array.isArray(data.projects) ? data.projects : (prev.projects || []),
              tasks: Array.isArray(data.tasks) ? data.tasks : (prev.tasks || []),
              invoices: Array.isArray(data.invoices) ? data.invoices : (prev.invoices || []),
              approvals: Array.isArray(data.approvals) ? data.approvals : (prev.approvals || []),
              connectedAccounts: Array.isArray(data.connectedAccounts) ? data.connectedAccounts : (prev.connectedAccounts || []),
              automations: Array.isArray(data.automations) ? data.automations : (prev.automations || []),
              activityLogs: Array.isArray(data.activityLogs) ? data.activityLogs : (prev.activityLogs || []),
            }));
          }
        })
        .catch((err) => {
          console.warn('Could not sync workspace from server:', err);
        });
    }
  }, [user]);

  // Sign out handler
  const handleSignOut = async () => {
    const token = localStorage.getItem('aura_auth_token');
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // ignore network error
      }
    }
    localStorage.removeItem('aura_auth_token');
    localStorage.removeItem(STORAGE_KEY_USER);
    setUser(null);
  };

  // Persist user
  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  }, [user]);

  // Persist workspace data to localStorage as offline cache and Firestore
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(workspaceData));
    if (user) {
      const userId = user.id || 'workingbynoor@gmail.com';
      const debounceTimer = setTimeout(() => {
        saveWorkspaceToFirestore(userId, workspaceData, user);
      }, 1200);
      return () => clearTimeout(debounceTimer);
    }
  }, [workspaceData, user]);

  // Persist dataset mode
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_IS_SAMPLE, JSON.stringify(isSampleData));
  }, [isSampleData]);

  // Toggle Dataset between Pure 0 Data and Active Business
  const handleToggleSampleData = async () => {
    try {
      const nextEmpty = isSampleData;
      const refreshed = await apiResetWorkspace(nextEmpty);
      setWorkspaceData(refreshed);
      setIsSampleData(!nextEmpty);
      addToast(
        nextEmpty ? 'Clean Workspace Activated' : 'Sample Business Pipeline Loaded',
        nextEmpty ? 'Switched to clean zero-data state.' : 'Populated active client pipelines and financials.'
      );
    } catch (e) {
      if (isSampleData) {
        setWorkspaceData(emptyWorkspace);
        setIsSampleData(false);
      } else {
        setWorkspaceData(sampleBusinessWorkspace);
        setIsSampleData(true);
      }
    }
  };

  const handleResetWorkspace = async () => {
    try {
      const refreshed = await apiResetWorkspace(true);
      setWorkspaceData(refreshed);
      setIsSampleData(false);
      addToast('Workspace Cleared', 'All workspace records have been cleared.');
    } catch (e) {
      setWorkspaceData(emptyWorkspace);
      setIsSampleData(false);
    }
  };

  // Quick Action Navigator
  const handleQuickAction = (action: 'client' | 'project' | 'task' | 'invoice') => {
    switch (action) {
      case 'client':
        setCurrentTab('clients');
        break;
      case 'project':
        setCurrentTab('projects');
        break;
      case 'task':
        setCurrentTab('tasks');
        break;
      case 'invoice':
        setCurrentTab('finance');
        break;
    }
  };

  // ================= TASK HANDLERS =================
  const handleAddTask = async (newTask: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      const created = await apiCreateTask(newTask);
      setWorkspaceData((prev) => ({
        ...prev,
        tasks: [created, ...prev.tasks],
      }));
      addToast('Task Created', `"${created.title}" added to your deliverables.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create task', 'error');
      throw err;
    }
  };

  const handleEditTask = async (updatedTask: Task) => {
    try {
      const saved = await apiUpdateTask(updatedTask.id, updatedTask);
      setWorkspaceData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === saved.id ? saved : t)),
      }));
      addToast('Task Updated', `Task "${saved.title}" was saved.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update task', 'error');
      throw err;
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const deleted = await apiDeleteTask(taskId);
      setWorkspaceData((prev) => ({
        ...prev,
        tasks: (prev.tasks || []).filter((t) => t.id !== taskId),
      }));
      addToast('Task Deleted', `"${deleted?.title || 'Task'}" was removed.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete task', 'error');
      throw err;
    }
  };

  const handleToggleTaskComplete = async (taskId: string) => {
    const existing = workspaceData.tasks.find((t) => t.id === taskId);
    if (!existing) return;
    const nextStatus = existing.status === 'Completed' ? 'To Do' : 'Completed';
    try {
      const updated = await apiUpdateTask(taskId, { status: nextStatus });
      setWorkspaceData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? updated : t)),
      }));
      addToast('Task Status', `Task marked as ${nextStatus}.`);
    } catch (err: any) {
      // Local fallback
      setWorkspaceData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: nextStatus }
            : t
        ),
      }));
    }
  };

  // ================= CLIENT HANDLERS =================
  const handleAddClient = async (newClient: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      const created = await apiCreateClient(newClient);
      setWorkspaceData((prev) => ({
        ...prev,
        clients: [created, ...prev.clients],
      }));
      addToast('Client Added', `${created.name} (${created.company}) registered successfully.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create client', 'error');
      throw err;
    }
  };

  const handleEditClient = async (updatedClient: Client) => {
    try {
      const saved = await apiUpdateClient(updatedClient.id, updatedClient);
      setWorkspaceData((prev) => ({
        ...prev,
        clients: prev.clients.map((c) => (c.id === saved.id ? saved : c)),
        projects: prev.projects.map((p) =>
          p.clientId === saved.id ? { ...p, clientName: saved.name } : p
        ),
        invoices: prev.invoices.map((i) =>
          i.clientId === saved.id ? { ...i, clientName: saved.name } : i
        ),
      }));
      addToast('Client Updated', `Changes to ${saved.name} have been saved.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update client', 'error');
      throw err;
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      const res = await apiDeleteClient(clientId);
      setWorkspaceData((prev) => ({
        ...prev,
        clients: (prev.clients || []).filter((c) => c.id !== clientId),
      }));
      addToast('Client Removed', `${res.deletedClient?.name || 'Client'} was deleted.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete client', 'error');
      throw err;
    }
  };

  // ================= PROJECT HANDLERS =================
  const handleAddProject = async (newProject: Omit<Project, 'id' | 'createdAt'>) => {
    try {
      const created = await apiCreateProject(newProject);
      setWorkspaceData((prev) => ({
        ...prev,
        projects: [created, ...(prev.projects || [])],
      }));
      addToast('Project Created', `Project "${created.name}" created.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create project', 'error');
      throw err;
    }
  };

  const handleEditProject = async (updatedProject: Project) => {
    try {
      const saved = await apiUpdateProject(updatedProject.id, updatedProject);
      setWorkspaceData((prev) => ({
        ...prev,
        projects: (prev.projects || []).map((p) => (p.id === saved.id ? saved : p)),
        tasks: (prev.tasks || []).map((t) =>
          t.projectId === saved.id ? { ...t, projectName: saved.name } : t
        ),
      }));
      addToast('Project Updated', `Project "${saved.name}" updated successfully.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update project', 'error');
      throw err;
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const res = await apiDeleteProject(projectId);
      setWorkspaceData((prev) => ({
        ...prev,
        projects: (prev.projects || []).filter((p) => p.id !== projectId),
      }));
      addToast('Project Deleted', `Project "${res.deletedProject?.name || 'Project'}" was removed.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete project', 'error');
      throw err;
    }
  };

  // ================= INVOICE HANDLERS =================
  const handleAddInvoice = async (newInvoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    try {
      const created = await apiCreateInvoice(newInvoice);
      setWorkspaceData((prev) => ({
        ...prev,
        invoices: [created, ...(prev.invoices || [])],
      }));
      addToast('Invoice Issued', `Invoice ${created.invoiceNumber} ($${created.amount.toLocaleString()}) created.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to create invoice', 'error');
      throw err;
    }
  };

  const handleEditInvoice = async (updatedInvoice: Invoice) => {
    try {
      const saved = await apiUpdateInvoice(updatedInvoice.id, updatedInvoice);
      setWorkspaceData((prev) => ({
        ...prev,
        invoices: (prev.invoices || []).map((inv) =>
          inv.id === saved.id ? saved : inv
        ),
      }));
      addToast('Invoice Saved', `Invoice ${saved.invoiceNumber} updated successfully.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to update invoice', 'error');
      throw err;
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const deleted = await apiDeleteInvoice(invoiceId);
      setWorkspaceData((prev) => ({
        ...prev,
        invoices: (prev.invoices || []).filter((inv) => inv.id !== invoiceId),
      }));
      addToast('Invoice Removed', `Invoice ${deleted?.invoiceNumber || 'Invoice'} was deleted.`);
    } catch (err: any) {
      addToast('Error', err.message || 'Failed to delete invoice', 'error');
      throw err;
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus) => {
    try {
      const updated = await apiUpdateInvoice(invoiceId, { status });
      setWorkspaceData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === invoiceId ? updated : inv
        ),
      }));
      addToast('Invoice Status', `Invoice ${updated.invoiceNumber} marked as ${status}.`);
    } catch (err: any) {
      setWorkspaceData((prev) => ({
        ...prev,
        invoices: prev.invoices.map((inv) =>
          inv.id === invoiceId ? { ...inv, status } : inv
        ),
      }));
    }
  };

  // ================= AI APPROVALS HANDLERS =================
  const handleApproveAiItem = (item: AiApprovalItem) => {
    setWorkspaceData((prev) => {
      const updatedApprovals = prev.approvals.map((a) =>
        a.id === item.id ? { ...a, status: 'Approved' as const } : a
      );

      // Execute action based on item type
      let updatedClients = prev.clients;
      let updatedProjects = prev.projects;
      let updatedInvoices = prev.invoices;

      if (item.source === 'invoice') {
        const newInv: Invoice = {
          id: `inv_ai_${Date.now()}`,
          invoiceNumber: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
          clientId: prev.clients[0]?.id || 'client_1',
          clientName: prev.clients[0]?.name || 'Horizon Media Dynamics',
          amount: 4200,
          status: 'Sent',
          issueDate: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          items: [{ description: 'AI Automated Milestone Completion', quantity: 1, unitPrice: 4200 }],
          createdAt: new Date().toISOString(),
        };
        updatedInvoices = [newInv, ...updatedInvoices];
      }

      return {
        ...prev,
        approvals: updatedApprovals,
        clients: updatedClients,
        projects: updatedProjects,
        invoices: updatedInvoices,
      };
    });
    addToast('Action Approved', `Autonomous action "${item.title}" executed.`);
  };

  const handleRejectAiItem = (itemId: string) => {
    setWorkspaceData((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a) =>
        a.id === itemId ? { ...a, status: 'Rejected' as const } : a
      ),
    }));
    addToast('Action Dismissed', 'Action proposal rejected.', 'info');
  };

  const handleEditAndApproveAiItem = (item: AiApprovalItem, updatedProposal: string) => {
    setWorkspaceData((prev) => ({
      ...prev,
      approvals: prev.approvals.map((a) =>
        a.id === item.id
          ? {
              ...a,
              whatAuraWantsToDo: updatedProposal,
              status: 'Approved' as const,
            }
          : a
      ),
    }));
    addToast('Modified & Approved', `Updated proposal approved.`);
  };

  // ================= CONNECTED ACCOUNTS HANDLERS =================
  const handleToggleConnectAccount = (accountId: string) => {
    setWorkspaceData((prev) => ({
      ...prev,
      connectedAccounts: prev.connectedAccounts.map((acc) => {
        if (acc.id === accountId) {
          const isNowConnected = acc.status !== 'connected';
          return {
            ...acc,
            status: isNowConnected ? 'connected' : 'disconnected',
            lastSync: isNowConnected ? 'Just now' : acc.lastSync,
          };
        }
        return acc;
      }),
    }));
  };

  const handleSyncAccount = (accountId: string) => {
    setWorkspaceData((prev) => ({
      ...prev,
      connectedAccounts: prev.connectedAccounts.map((acc) =>
        acc.id === accountId ? { ...acc, lastSync: 'Just now' } : acc
      ),
    }));
    addToast('Account Synced', 'Connection synced successfully.');
  };

  // ================= AUTOMATION RULES =================
  const handleToggleAutomation = (ruleId: string) => {
    setWorkspaceData((prev) => ({
      ...prev,
      automations: prev.automations.map((r) =>
        r.id === ruleId
          ? {
              ...r,
              enabled: !r.enabled,
              status: r.status === 'Active' ? 'Paused' : 'Active',
            }
          : r
      ),
    }));
  };

  const handleAddAutomation = (rule: any) => {
    setWorkspaceData((prev) => ({
      ...prev,
      automations: [
        ...prev.automations,
        {
          ...rule,
          id: `rule_${Date.now()}`,
          triggerCount: 0,
        },
      ],
    }));
    addToast('Automation Created', 'New workflow rule enabled.');
  };

  // If user is not authenticated, show AuthScreen
  if (!user) {
    return (
      <AuthScreen
        onAuthenticate={(authenticatedUser) => {
          setUser(authenticatedUser);
          setCurrentTab('overview');
        }}
        onCompleteAuth={(authenticatedUser) => {
          setUser(authenticatedUser);
          setCurrentTab('overview');
        }}
        onExploreDemo={() => {
          const demoUser: UserProfile = {
            id: 'usr_demo',
            name: 'Noor A.',
            email: 'workingbynoor@gmail.com',
            companyName: 'Aura Studio Operations',
            role: 'Managing Director & Founder',
            businessDomain: 'Digital Solutions & Consulting',
            teamSize: '1-5 specialists',
            primaryServices: ['AI Strategy & Development', 'Web & UI/UX Systems'],
            averageProjectValue: '$2,500 - $10,000',
            aiAssistanceLevel: 'autonomous_with_approval',
            currency: 'USD',
            isAuthenticated: true,
          };
          setUser(demoUser);
          localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(demoUser));
          setCurrentTab('overview');
        }}
      />
    );
  }

  const pendingApprovalsCount = (workspaceData?.approvals || []).filter(
    (a) => a && a.status === 'Pending'
  ).length;

  return (
    <div className="min-h-screen bg-[#05070D] text-gray-100 flex flex-col selection:bg-cyan-500 selection:text-black">
      {/* Toast Notifications */}
      <ToastNotification toasts={toasts} onDismiss={dismissToast} />

      {/* Sidebar navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        user={user}
        onSignOut={handleSignOut}
        pendingApprovalsCount={pendingApprovalsCount}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="lg:pl-64 flex-1 flex flex-col">
        {/* Sticky TopBar */}
        <TopBar
          currentTab={currentTab}
          onOpenMobile={() => setMobileOpen(true)}
          onQuickAction={handleQuickAction}
          onToggleSampleData={handleToggleSampleData}
          isSampleData={isSampleData}
          onAskAuraQuick={() => setCurrentTab('ask-aura')}
          onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* View Router */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentTab === 'overview' && (
            <OverviewView
              data={workspaceData}
              user={user}
              onNavigate={setCurrentTab}
              onQuickAction={handleQuickAction}
              onToggleTaskComplete={handleToggleTaskComplete}
            />
          )}

          {currentTab === 'clients' && (
            <ClientsView
              clients={workspaceData.clients}
              projects={workspaceData.projects}
              tasks={workspaceData.tasks}
              invoices={workspaceData.invoices}
              onAddClient={handleAddClient}
              onEditClient={handleEditClient}
              onDeleteClient={handleDeleteClient}
            />
          )}

          {currentTab === 'projects' && (
            <ProjectsView
              projects={workspaceData.projects}
              clients={workspaceData.clients}
              tasks={workspaceData.tasks}
              onAddProject={handleAddProject}
              onEditProject={handleEditProject}
              onDeleteProject={handleDeleteProject}
            />
          )}

          {currentTab === 'tasks' && (
            <TasksView
              tasks={workspaceData.tasks}
              projects={workspaceData.projects}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleComplete={handleToggleTaskComplete}
            />
          )}

          {currentTab === 'ask-aura' && (
            <AskAuraView
              data={workspaceData}
              user={user}
              onAddTaskFromAi={(title, desc) =>
                handleAddTask({
                  title,
                  description: desc || '',
                  status: 'To Do',
                  priority: 'Medium',
                  deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                })
              }
            />
          )}

          {currentTab === 'approvals' && (
            <ApprovalCenterView
              approvals={workspaceData.approvals}
              onApprove={handleApproveAiItem}
              onReject={handleRejectAiItem}
              onEditAndApprove={handleEditAndApproveAiItem}
            />
          )}

          {currentTab === 'connected-accounts' && (
            <ConnectedAccountsView
              accounts={workspaceData.connectedAccounts}
              onToggleConnect={handleToggleConnectAccount}
              onSyncAccount={handleSyncAccount}
            />
          )}

          {currentTab === 'finance' && (
            <FinanceView
              invoices={workspaceData.invoices}
              clients={workspaceData.clients}
              onAddInvoice={handleAddInvoice}
              onEditInvoice={handleEditInvoice}
              onDeleteInvoice={handleDeleteInvoice}
              onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
            />
          )}

          {currentTab === 'automations' && (
            <AutomationsView
              rules={workspaceData.automations}
              onToggleRule={handleToggleAutomation}
              onAddRule={handleAddAutomation}
            />
          )}

          {currentTab === 'ai-insights' && (
            <AiInsightsView data={workspaceData} user={user} />
          )}

          {currentTab === 'calendar' && (
            <CalendarView data={workspaceData} />
          )}

          {currentTab === 'analytics' && (
            <AnalyticsView data={workspaceData} />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              user={user}
              onUpdateUser={setUser}
              onResetWorkspace={handleResetWorkspace}
            />
          )}
        </main>
      </div>

      {/* Floating Voice Companion Orb (Quick launch from any view) */}
      {currentTab !== 'ask-aura' && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            id="btn-floating-voice-orb"
            onClick={() => setIsVoiceModalOpen(true)}
            title="Talk to AURA (Cmd/Ctrl + Shift + K)"
            className="group relative flex items-center justify-center p-3.5 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 text-white shadow-xl shadow-cyan-950/60 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full blur opacity-40 group-hover:opacity-75 transition-opacity" />
            <div className="relative flex items-center space-x-2">
              <Mic className="w-5 h-5 text-white" />
              <span className="hidden group-hover:inline text-xs font-semibold pr-1">Talk to AURA</span>
              <kbd className="hidden group-hover:inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-medium text-cyan-200 bg-black/40 border border-white/20 rounded">
                ⌘⇧K
              </kbd>
            </div>
          </button>
        </div>
      )}

      {/* Global Voice Modal */}
      <VoiceConversation
        mode="modal"
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        data={workspaceData}
        user={user}
        onAddTask={(title, desc) =>
          handleAddTask({
            title,
            description: desc || '',
            status: 'To Do',
            priority: 'Medium',
            deadline: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          })
        }
      />
    </div>
  );
}
