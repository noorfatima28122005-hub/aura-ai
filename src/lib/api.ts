import { Client, Project, Task, Invoice, InvoiceStatus, WorkspaceData } from '../types';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('aura_auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

// Workspace API
export async function apiFetchWorkspace(): Promise<WorkspaceData> {
  const res = await fetch('/api/workspace', {
    headers: getAuthHeader(),
  });
  const json = await handleResponse<{ success: boolean; data: WorkspaceData }>(res);
  return json.data;
}

export async function apiResetWorkspace(empty: boolean): Promise<WorkspaceData> {
  const res = await fetch('/api/workspace/reset', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ empty }),
  });
  const json = await handleResponse<{ success: boolean; data: WorkspaceData }>(res);
  return json.data;
}

// Clients API
export async function apiGetClients(): Promise<Client[]> {
  const res = await fetch('/api/clients', { headers: getAuthHeader() });
  return handleResponse<Client[]>(res);
}

export async function apiCreateClient(client: Omit<Client, 'id' | 'createdAt'>): Promise<Client> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(client),
  });
  const data = await handleResponse<{ success: boolean; client: Client }>(res);
  return data.client;
}

export async function apiUpdateClient(id: string, updates: Partial<Client>): Promise<Client> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(updates),
  });
  const data = await handleResponse<{ success: boolean; client: Client }>(res);
  return data.client;
}

export async function apiDeleteClient(id: string): Promise<{ deletedClient: Client; affectedProjectsCount: number; affectedInvoicesCount: number }> {
  const res = await fetch(`/api/clients/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  return handleResponse<{ success: boolean; deletedClient: Client; affectedProjectsCount: number; affectedInvoicesCount: number }>(res);
}

// Projects API
export async function apiGetProjects(): Promise<Project[]> {
  const res = await fetch('/api/projects', { headers: getAuthHeader() });
  return handleResponse<Project[]>(res);
}

export async function apiCreateProject(project: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(project),
  });
  const data = await handleResponse<{ success: boolean; project: Project }>(res);
  return data.project;
}

export async function apiUpdateProject(id: string, updates: Partial<Project>): Promise<Project> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(updates),
  });
  const data = await handleResponse<{ success: boolean; project: Project }>(res);
  return data.project;
}

export async function apiDeleteProject(id: string): Promise<{ deletedProject: Project; affectedTasksCount: number }> {
  const res = await fetch(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  return handleResponse<{ success: boolean; deletedProject: Project; affectedTasksCount: number }>(res);
}

// Tasks API
export async function apiGetTasks(): Promise<Task[]> {
  const res = await fetch('/api/tasks', { headers: getAuthHeader() });
  return handleResponse<Task[]>(res);
}

export async function apiCreateTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task> {
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(task),
  });
  const data = await handleResponse<{ success: boolean; task: Task }>(res);
  return data.task;
}

export async function apiUpdateTask(id: string, updates: Partial<Task>): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(updates),
  });
  const data = await handleResponse<{ success: boolean; task: Task }>(res);
  return data.task;
}

export async function apiDeleteTask(id: string): Promise<Task> {
  const res = await fetch(`/api/tasks/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await handleResponse<{ success: boolean; deletedTask: Task }>(res);
  return data.deletedTask;
}

// Invoices API
export async function apiGetInvoices(): Promise<Invoice[]> {
  const res = await fetch('/api/invoices', { headers: getAuthHeader() });
  return handleResponse<Invoice[]>(res);
}

export async function apiCreateInvoice(invoice: Omit<Invoice, 'id' | 'createdAt'>): Promise<Invoice> {
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(invoice),
  });
  const data = await handleResponse<{ success: boolean; invoice: Invoice }>(res);
  return data.invoice;
}

export async function apiUpdateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(updates),
  });
  const data = await handleResponse<{ success: boolean; invoice: Invoice }>(res);
  return data.invoice;
}

export async function apiDeleteInvoice(id: string): Promise<Invoice> {
  const res = await fetch(`/api/invoices/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await handleResponse<{ success: boolean; deletedInvoice: Invoice }>(res);
  return data.deletedInvoice;
}
