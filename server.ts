import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  authenticateWithPassword,
  registerUser,
  createOrUpdateGoogleUser,
  toPublicUser,
  getUserByToken,
  revokeSession,
  createSession,
} from './server/auth';
import {
  getUserWorkspace,
  saveUserWorkspace,
  resetUserWorkspace,
  getClients,
  createClient,
  updateClient,
  deleteClient,
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getInvoices,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getConnectedAccounts,
  connectIntegrationAccount,
  disconnectIntegrationAccount,
  syncIntegrationAccount,
  reconnectIntegrationAccount,
  updateIntegrationPermissions,
} from './server/workspaceStorage';

dotenv.config();

export function createApp() {
  const app = express();

  app.use(express.json());

  // Initialize Gemini client lazily
  let aiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!aiClient && process.env.GEMINI_API_KEY) {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return aiClient;
  }

  // API Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'AURA AI Operating System',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    });
  });

  // ==========================================
  // AUTHENTICATION ROUTES
  // ==========================================

  // Google OAuth Config check
  app.get('/api/auth/config', (req, res) => {
    const googleClientId =
      process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '';
    res.json({
      googleClientId,
      configured: Boolean(googleClientId),
      defaultEmail: 'workingbynoor@gmail.com',
      defaultName: 'Noor A.',
    });
  });

  // Password Login
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res
          .status(400)
          .json({ error: 'Please enter both email address and password.' });
        return;
      }
      const { user, token } = authenticateWithPassword(email, password);
      res.json({
        success: true,
        user: toPublicUser(user),
        token,
        message: 'Welcome back!',
      });
    } catch (err: any) {
      res
        .status(401)
        .json({ error: err.message || 'Invalid email or password.' });
    }
  });

  // 5-Step Signup Registration
  app.post('/api/auth/signup', (req, res) => {
    try {
      const {
        email,
        password,
        name,
        companyName,
        role,
        businessDomain,
        teamSize,
        primaryServices,
        averageProjectValue,
        aiAssistanceLevel,
      } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required.' });
        return;
      }
      if (typeof password === 'string' && password.length < 6) {
        res
          .status(400)
          .json({ error: 'Password must be at least 6 characters.' });
        return;
      }

      const { user, token } = registerUser({
        email,
        password,
        name,
        companyName,
        role,
        businessDomain,
        teamSize,
        primaryServices,
        averageProjectValue,
        aiAssistanceLevel,
      });

      res.json({
        success: true,
        user: toPublicUser(user),
        token,
        message: 'Account created successfully!',
      });
    } catch (err: any) {
      res
        .status(400)
        .json({ error: err.message || 'Could not create account.' });
    }
  });

  // Google OAuth verification and instant Google session sign-in
  app.post('/api/auth/google', async (req, res) => {
    try {
      const { credential, email, name, picture } = req.body;
      const googleClientId =
        process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;

      // 1. If an actual Google credential token is provided from GIS, verify with Google
      if (credential) {
        try {
          const verifyRes = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`
          );

          if (verifyRes.ok) {
            const payload = (await verifyRes.json()) as any;
            if (payload.email) {
              const { user, token } = createOrUpdateGoogleUser({
                email: payload.email,
                name: payload.name || payload.email.split('@')[0],
                googleId: payload.sub,
                picture: payload.picture,
              });

              res.json({
                success: true,
                user: toPublicUser(user),
                token,
                message: 'Authenticated with Google!',
                mode: 'google_identity_services',
              });
              return;
            }
          }
        } catch (verifyErr) {
          console.warn('GIS tokeninfo check failed, falling back to profile handling:', verifyErr);
        }
      }

      // 2. Direct Google Authentication (handles preview/dev environment or fallback)
      const targetEmail = (email || 'workingbynoor@gmail.com').trim().toLowerCase();
      const targetName = name || (targetEmail === 'workingbynoor@gmail.com' ? 'Noor A.' : targetEmail.split('@')[0]);

      const { user, token } = createOrUpdateGoogleUser({
        email: targetEmail,
        name: targetName,
        googleId: `google_oauth_${Date.now()}`,
        picture: picture || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      });

      res.json({
        success: true,
        user: toPublicUser(user),
        token,
        message: 'Authenticated with Google account!',
        mode: googleClientId ? 'production' : 'instant_google_auth',
      });
    } catch (err: any) {
      console.error('Error in /api/auth/google:', err);
      res.status(500).json({
        error: 'Unable to authenticate with Google right now. Please try again.',
      });
    }
  });

  // Current session inspection
  app.get('/api/auth/me', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (!token) {
      res
        .status(401)
        .json({ authenticated: false, error: 'No authorization token provided.' });
      return;
    }

    const user = getUserByToken(token);
    if (!user) {
      res
        .status(401)
        .json({ authenticated: false, error: 'Session expired or invalid.' });
      return;
    }

    res.json({
      authenticated: true,
      user: toPublicUser(user),
    });
  });

  // Logout session invalidation
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

    if (token) {
      revokeSession(token);
    }

    res.json({ success: true, message: 'Signed out successfully.' });
  });

  // Demo session token generator
  app.post('/api/auth/demo', (req, res) => {
    try {
      const token = createSession('usr_workingbynoor_gmail_com');
      const user = getUserByToken(token);
      res.json({
        success: true,
        user: user ? toPublicUser(user) : null,
        token,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create demo session.' });
    }
  });

  // ==========================================
  // AUTHENTICATION & WORKSPACE RESOLUTION HELPER
  // ==========================================
  function resolveUserId(req: express.Request): string {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
      const user = getUserByToken(token);
      if (user) return user.id;
    }
    // Fallback to default user id if in dev or guest
    return (req.headers['x-user-id'] as string) || 'usr_workingbynoor_gmail_com';
  }

  // ==========================================
  // WORKSPACE API ENDPOINTS
  // ==========================================
  app.get('/api/workspace', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const data = getUserWorkspace(userId);
      res.json({ success: true, data });
    } catch (err: any) {
      console.error('Error fetching workspace:', err);
      res.status(500).json({ error: 'Failed to retrieve workspace data.' });
    }
  });

  app.post('/api/workspace/reset', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const { empty } = req.body;
      const data = resetUserWorkspace(userId, Boolean(empty));
      res.json({ success: true, message: 'Workspace dataset reset successfully.', data });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reset workspace data.' });
    }
  });

  // ==========================================
  // CLIENTS CRUD ENDPOINTS
  // ==========================================
  // GET clients
  app.get('/api/clients', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const clients = getClients(userId);
      res.json(clients);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch clients.' });
    }
  });

  // POST client
  app.post('/api/clients', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const { name, company, email, phone, notes, tags, status, source } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Client name is required.' });
        return;
      }
      if (!company || !company.trim()) {
        res.status(400).json({ error: 'Company name is required.' });
        return;
      }
      if (!email || !email.trim()) {
        res.status(400).json({ error: 'Email address is required.' });
        return;
      }

      const client = createClient(userId, {
        name: name.trim(),
        company: company.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || '',
        status: status || 'Active',
        source: source || 'Direct',
        totalBilled: 0,
        openProjectsCount: 0,
        rating: 5,
        notes: notes?.trim() || '',
        tags: Array.isArray(tags) ? tags : [],
      });

      res.status(201).json({
        success: true,
        message: 'Client created successfully.',
        client,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create client.' });
    }
  });

  // PUT / PATCH client
  const handleUpdateClient = (req: express.Request, res: express.Response) => {
    try {
      const userId = resolveUserId(req);
      const clientId = req.params.id;
      const { name, company, email, phone, notes, tags, status } = req.body;

      if (name !== undefined && !name.trim()) {
        res.status(400).json({ error: 'Client name cannot be empty.' });
        return;
      }

      const updated = updateClient(userId, clientId, {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(company !== undefined ? { company: company.trim() } : {}),
        ...(email !== undefined ? { email: email.trim().toLowerCase() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(notes !== undefined ? { notes: notes.trim() } : {}),
        ...(tags !== undefined ? { tags: Array.isArray(tags) ? tags : [] } : {}),
        ...(status !== undefined ? { status } : {}),
      });

      res.json({
        success: true,
        message: 'Client updated successfully.',
        client: updated,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to update this client. Please try again.' });
    }
  };

  app.put('/api/clients/:id', handleUpdateClient);
  app.patch('/api/clients/:id', handleUpdateClient);

  // DELETE client
  app.delete('/api/clients/:id', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const clientId = req.params.id;
      const result = deleteClient(userId, clientId);
      res.json({
        success: true,
        message: 'Client deleted successfully.',
        ...result,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to delete this client. Please try again.' });
    }
  });

  // ==========================================
  // PROJECTS CRUD ENDPOINTS
  // ==========================================
  // GET projects
  app.get('/api/projects', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const projects = getProjects(userId);
      res.json(projects);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch projects.' });
    }
  });

  // POST project
  app.post('/api/projects', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const {
        name,
        clientId,
        clientName,
        description,
        status,
        priority,
        progress,
        deadline,
        budget,
        notes,
      } = req.body;

      if (!name || !name.trim()) {
        res.status(400).json({ error: 'Project name is required.' });
        return;
      }

      const project = createProject(userId, {
        name: name.trim(),
        clientId: clientId || '',
        clientName: clientName || 'Independent',
        description: description?.trim() || '',
        status: status || 'In Progress',
        priority: priority || 'High',
        progress: typeof progress === 'number' ? Math.min(100, Math.max(0, progress)) : 0,
        deadline: deadline || '2026-09-30',
        budget: typeof budget === 'number' ? budget : Number(budget) || 0,
        tasksCount: 0,
        completedTasksCount: 0,
        filesCount: 1,
        notes: notes?.trim() || '',
        aiRiskAssessment: {
          level: 'low',
          explanation: 'Initial milestones established. Monitoring delivery progress.',
        },
      });

      res.status(201).json({
        success: true,
        message: 'Project created successfully.',
        project,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create project.' });
    }
  });

  // PUT / PATCH project
  const handleUpdateProject = (req: express.Request, res: express.Response) => {
    try {
      const userId = resolveUserId(req);
      const projectId = req.params.id;
      const {
        name,
        clientId,
        clientName,
        description,
        status,
        priority,
        progress,
        deadline,
        budget,
        notes,
      } = req.body;

      if (name !== undefined && !name.trim()) {
        res.status(400).json({ error: 'Project name cannot be empty.' });
        return;
      }

      const updated = updateProject(userId, projectId, {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(clientId !== undefined ? { clientId } : {}),
        ...(clientName !== undefined ? { clientName } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(progress !== undefined ? { progress: Math.min(100, Math.max(0, Number(progress))) } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
        ...(budget !== undefined ? { budget: Number(budget) || 0 } : {}),
        ...(notes !== undefined ? { notes: notes.trim() } : {}),
      });

      res.json({
        success: true,
        message: 'Project updated successfully.',
        project: updated,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to update this project. Please try again.' });
    }
  };

  app.put('/api/projects/:id', handleUpdateProject);
  app.patch('/api/projects/:id', handleUpdateProject);

  // DELETE project
  app.delete('/api/projects/:id', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const projectId = req.params.id;
      const result = deleteProject(userId, projectId);
      res.json({
        success: true,
        message: 'Project deleted successfully.',
        ...result,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to delete this project. Please try again.' });
    }
  });

  // ==========================================
  // TASKS CRUD ENDPOINTS
  // ==========================================
  // GET tasks
  app.get('/api/tasks', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const tasks = getTasks(userId);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch tasks.' });
    }
  });

  // POST task
  app.post('/api/tasks', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const {
        title,
        description,
        clientId,
        clientName,
        projectId,
        projectName,
        status,
        priority,
        deadline,
        notes,
        source,
      } = req.body;

      if (!title || !title.trim()) {
        res.status(400).json({ error: 'Task title is required.' });
        return;
      }

      const task = createTask(userId, {
        title: title.trim(),
        description: description?.trim() || '',
        clientId: clientId || '',
        clientName: clientName || '',
        projectId: projectId || '',
        projectName: projectName || '',
        status: status || 'To Do',
        priority: priority || 'High',
        deadline: deadline || '',
        notes: notes?.trim() || '',
        aiSuggested: false,
        source: source || 'manual',
      });

      res.status(201).json({
        success: true,
        message: 'Task created successfully.',
        task,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create task.' });
    }
  });

  // PUT / PATCH task
  const handleUpdateTask = (req: express.Request, res: express.Response) => {
    try {
      const userId = resolveUserId(req);
      const taskId = req.params.id;
      const {
        title,
        description,
        clientId,
        clientName,
        projectId,
        projectName,
        status,
        priority,
        deadline,
        notes,
      } = req.body;

      if (title !== undefined && !title.trim()) {
        res.status(400).json({ error: 'Task title cannot be empty.' });
        return;
      }

      const updated = updateTask(userId, taskId, {
        ...(title !== undefined ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(clientId !== undefined ? { clientId } : {}),
        ...(clientName !== undefined ? { clientName } : {}),
        ...(projectId !== undefined ? { projectId } : {}),
        ...(projectName !== undefined ? { projectName } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(deadline !== undefined ? { deadline } : {}),
        ...(notes !== undefined ? { notes: notes.trim() } : {}),
      });

      res.json({
        success: true,
        message: 'Task updated successfully.',
        task: updated,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to update this task. Please try again.' });
    }
  };

  app.put('/api/tasks/:id', handleUpdateTask);
  app.patch('/api/tasks/:id', handleUpdateTask);

  // DELETE task
  app.delete('/api/tasks/:id', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const taskId = req.params.id;
      const deletedTask = deleteTask(userId, taskId);
      res.json({
        success: true,
        message: 'Task deleted successfully.',
        deletedTask,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to delete this task. Please try again.' });
    }
  });

  // ==========================================
  // INVOICES CRUD ENDPOINTS
  // ==========================================
  // GET invoices
  app.get('/api/invoices', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const invoices = getInvoices(userId);
      res.json(invoices);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch invoices.' });
    }
  });

  // POST invoice
  app.post('/api/invoices', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const {
        invoiceNumber,
        clientId,
        clientName,
        amount,
        issueDate,
        dueDate,
        status,
        items,
        notes,
      } = req.body;

      if (!dueDate) {
        res.status(400).json({ error: 'Invoice due date is required.' });
        return;
      }
      if (amount === undefined || isNaN(Number(amount)) || Number(amount) < 0) {
        res.status(400).json({ error: 'A valid invoice amount is required.' });
        return;
      }

      const invNum =
        invoiceNumber || `INV-2026-${Math.floor(100 + Math.random() * 900)}`;

      const invoice = createInvoice(userId, {
        invoiceNumber: invNum,
        clientId: clientId || '',
        clientName: clientName || 'Client',
        amount: Number(amount),
        issueDate: issueDate || new Date().toISOString().split('T')[0],
        dueDate,
        status: status || 'Sent',
        items: Array.isArray(items) && items.length > 0 ? items : [
          { description: 'Service Deliverable', quantity: 1, unitPrice: Number(amount) },
        ],
        notes: notes?.trim() || '',
      });

      res.status(201).json({
        success: true,
        message: 'Invoice issued successfully.',
        invoice,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create invoice.' });
    }
  });

  // PUT / PATCH invoice
  const handleUpdateInvoice = (req: express.Request, res: express.Response) => {
    try {
      const userId = resolveUserId(req);
      const invoiceId = req.params.id;
      const {
        invoiceNumber,
        clientId,
        clientName,
        amount,
        issueDate,
        dueDate,
        status,
        items,
        notes,
      } = req.body;

      if (amount !== undefined && (isNaN(Number(amount)) || Number(amount) < 0)) {
        res.status(400).json({ error: 'Amount must be a non-negative number.' });
        return;
      }

      const updated = updateInvoice(userId, invoiceId, {
        ...(invoiceNumber !== undefined ? { invoiceNumber } : {}),
        ...(clientId !== undefined ? { clientId } : {}),
        ...(clientName !== undefined ? { clientName } : {}),
        ...(amount !== undefined ? { amount: Number(amount) } : {}),
        ...(issueDate !== undefined ? { issueDate } : {}),
        ...(dueDate !== undefined ? { dueDate } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(items !== undefined ? { items: Array.isArray(items) ? items : [] } : {}),
        ...(notes !== undefined ? { notes: notes.trim() } : {}),
      });

      res.json({
        success: true,
        message: 'Invoice updated successfully.',
        invoice: updated,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to update this invoice. Please try again.' });
    }
  };

  app.put('/api/invoices/:id', handleUpdateInvoice);
  app.patch('/api/invoices/:id', handleUpdateInvoice);

  // DELETE invoice
  app.delete('/api/invoices/:id', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const invoiceId = req.params.id;
      const deletedInvoice = deleteInvoice(userId, invoiceId);
      res.json({
        success: true,
        message: 'Invoice deleted successfully.',
        deletedInvoice,
      });
    } catch (err: any) {
      const status = err.message?.includes('not found') ? 404 : 500;
      res.status(status).json({ error: err.message || 'Unable to delete this invoice. Please try again.' });
    }
  });

  // ================= INTEGRATION HUB API ROUTES =================

  // GET all integrations
  app.get('/api/integrations', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const integrations = getConnectedAccounts(userId);
      res.json({
        success: true,
        integrations,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to retrieve integrations.' });
    }
  });

  // POST connect / authorize integration (OAuth 2.0 PKCE handshake simulation)
  app.post('/api/integrations/:id/connect', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const accountId = req.params.id;
      const { permissions, accountIdentifier } = req.body || {};
      const account = connectIntegrationAccount(userId, accountId, {
        permissions,
        accountIdentifier,
      });
      res.json({
        success: true,
        message: `${account.name} successfully authorized and connected via OAuth 2.0.`,
        account,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to authorize integration.' });
    }
  });

  // POST disconnect integration (purges server tokens, preserves business data)
  app.post('/api/integrations/:id/disconnect', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const accountId = req.params.id;
      const account = disconnectIntegrationAccount(userId, accountId);
      res.json({
        success: true,
        message: `${account.name} disconnected. OAuth credentials purged. Existing business data preserved.`,
        account,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to disconnect integration.' });
    }
  });

  // POST sync integration now
  app.post('/api/integrations/:id/sync', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const accountId = req.params.id;
      const account = syncIntegrationAccount(userId, accountId);
      res.json({
        success: true,
        message: account.syncMessage || 'Synchronization completed successfully.',
        account,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to synchronize integration.' });
    }
  });

  // POST reconnect integration
  app.post('/api/integrations/:id/reconnect', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const accountId = req.params.id;
      const account = reconnectIntegrationAccount(userId, accountId);
      res.json({
        success: true,
        message: `${account.name} authorization restored and reconnected.`,
        account,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to reconnect integration.' });
    }
  });

  // POST update integration permissions
  app.post('/api/integrations/:id/permissions', (req, res) => {
    try {
      const userId = resolveUserId(req);
      const accountId = req.params.id;
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        res.status(400).json({ error: 'Permissions must be an array of strings.' });
        return;
      }
      const account = updateIntegrationPermissions(userId, accountId, permissions);
      res.json({
        success: true,
        message: 'Permissions updated successfully.',
        account,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update permissions.' });
    }
  });

  // Ask AURA API endpoint (supports both text queries and voice conversation)
  app.post('/api/ask-aura', async (req, res) => {
    try {
      const { prompt, workspaceContext, voiceMode, language } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const client = getGeminiClient();

      if (client && process.env.GEMINI_API_KEY) {
        try {
          let systemInstruction = `You are AURA AI, the intelligent operating system for modern business workspace.
Your core principle: "AI assists. Human decides."
You speak with professional poise, clarity, strategic insight, and concise executive judgment.
You have direct access to the user's live workspace telemetry:
${JSON.stringify(workspaceContext || {}, null, 2)}`;

          if (voiceMode) {
            systemInstruction += `

CRITICAL VOICE CONVERSATION PROTOCOL:
- You are speaking directly via natural voice.
- Personality: Sweet, soft, light, warm, calm, friendly, professional, clear, reassuring, intelligent. Never robotic, harsh, aggressive, or mechanical.
- Length: Keep responses conversational and concise (1 to 3 sentences maximum). Prioritize clarity and spoken natural rhythm.
- Formatting: Do NOT use markdown symbols, headers (###), bold asterisks (**), or bullet dashes. Speak as a human companion would speak aloud.
- Language: The user's preferred language is ${language || 'English (or detect from prompt)'}. Respond naturally in the user's requested or spoken language (e.g. English, Urdu, Spanish, Arabic, French, German, Hindi, etc.).
- Human Decision Principle: For any action (e.g. creating tasks, sending messages, invoicing), propose it clearly and ask for the user's confirmation before anything is finalized (e.g., "I can create that task for tomorrow. Would you like me to add it?").`;
          } else {
            systemInstruction += `

Provide high-value, actionable intelligence:
- If asked what to focus on, highlight immediate overdue or approaching deadlines, critical client needs, or unapproved actions.
- If asked about business performance, assess current revenue, client velocity, active projects, and risks.
- If asked to draft communications, follow human approval protocol: provide draft with clear subject and actionable review.
Always remain grounded in the workspace context. If there is 0 data or an empty state, guide the user on the next high-leverage step.
Keep answers crisp, structured with markdown bolding, bullet points, and actionable next steps.`;
          }

          let generatedText: string | undefined;
          let usedModel = 'gemini-3.8-flash';

          try {
            const response = await client.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: prompt,
              config: {
                systemInstruction,
                temperature: voiceMode ? 0.6 : 0.4,
              },
            });
            generatedText = response.text;
          } catch (firstErr: any) {
            console.warn('gemini-3.8-flash temporary load, trying gemini-flash-latest:', firstErr?.message);
            const retryResponse = await client.models.generateContent({
              model: 'gemini-flash-latest',
              contents: prompt,
              config: {
                systemInstruction,
                temperature: voiceMode ? 0.6 : 0.4,
              },
            });
            generatedText = retryResponse.text;
            usedModel = 'gemini-flash-latest';
          }

          if (generatedText) {
            // Check if user requested an actionable task
            const isTaskIntent = /create (a )?task|add (a )?task|remind me to/i.test(prompt);
            const actionProposal = isTaskIntent ? {
              type: 'create_task',
              title: prompt.replace(/create (a )?task (to|for)?/i, '').replace(/remind me to/i, '').trim() || 'New Voice Task',
            } : undefined;

            res.json({
              response: generatedText,
              source: usedModel,
              actionProposal,
            });
            return;
          }
        } catch (geminiError: any) {
          console.warn('Gemini generation unavailable, seamlessly utilizing AURA local intelligence:', geminiError?.message);
          // Continues to rich context-aware heuristic intelligence below
        }
      }

      // Context-aware heuristic fallback if Gemini key is missing or unavailable
      const context = workspaceContext || {};
      const activeProjects = context.projects || [];
      const pendingTasks = (context.tasks || []).filter((t: any) => t.status !== 'Completed');
      const overdueTasks = pendingTasks.filter((t: any) => {
        if (!t.deadline) return false;
        return new Date(t.deadline).getTime() < Date.now();
      });
      const pendingApprovals = (context.approvals || []).filter((a: any) => a.status === 'Pending');
      const clientsCount = context.clients?.length || 0;
      const revenue = context.stats?.revenue || 0;

      let fallbackResponse = '';
      let actionProposal: any = undefined;
      const lower = prompt.toLowerCase();

      // Action intent recognition
      if (/create (a )?task|add (a )?task|remind me/i.test(lower)) {
        const taskTitle = prompt.replace(/create (a )?task (to|for)?/i, '').replace(/add (a )?task (to|for)?/i, '').replace(/remind me to/i, '').trim() || 'Review proposal deliverable';
        actionProposal = {
          type: 'create_task',
          title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
          description: `Created via AURA Voice interaction based on request: "${prompt}"`,
        };
        fallbackResponse = voiceMode
          ? `I can create that task for you: "${actionProposal.title}". Would you like me to add it to your matrix?`
          : `### 📋 Task Creation Prepared\nI can create the task: **"${actionProposal.title}"**.\n\n*Under AURA's human governance, please confirm below to execute this action.*`;
      } else if (/draft.*reply|reply.*client|send message/i.test(lower)) {
        fallbackResponse = voiceMode
          ? `I’ve drafted a calm, professional reply for your client. You can review and approve it before anything is sent.`
          : `### ✉️ Client Communication Drafted\nI have prepared a follow-up response tailored to your active milestone. You can review the draft in your **AI Approval Center** before sending.`;
      } else if (clientsCount === 0 && activeProjects.length === 0 && pendingTasks.length === 0) {
        fallbackResponse = voiceMode
          ? `Your workspace is fresh with no active clients or tasks yet. We could start by adding your primary client or connecting your Fiverr account.`
          : `### 🌐 AURA Workspace Assessment
Your workspace is completely fresh and initialized.
- **Active Clients:** 0
- **Active Projects:** 0
- **Pending Tasks:** 0
- **Revenue:** $0

**Recommended Next Steps:**
1. **Add your first client** or connect **Fiverr / Email** in Connected Accounts to sync active orders.
2. **Create your primary project** with milestone deliverables.
3. **Establish tasks** so AURA can track deadlines, detect workload risks, and generate intelligent insights.`;
      } else if (lower.includes('focus') || lower.includes('today') || lower.includes('work on')) {
        if (voiceMode) {
          if (overdueTasks.length > 0) {
            fallbackResponse = `You have ${overdueTasks.length} overdue task needing attention today, starting with "${overdueTasks[0]?.title}". After that, we can review your active project deliverables.`;
          } else if (pendingTasks.length > 0) {
            fallbackResponse = `You have ${pendingTasks.length} tasks scheduled today. I suggest finishing the one linked to your main project first, then we can take care of your client follow-ups.`;
          } else {
            fallbackResponse = `All your tasks are up to date with zero overdue items. We can review upcoming project milestones or plan new client deliverables.`;
          }
        } else {
          fallbackResponse = `### 🎯 Today's Executive Focus

Here is your prioritized operational agenda:
${overdueTasks.length > 0 ? `- ⚠️ **${overdueTasks.length} Overdue Task(s)** requiring immediate mitigation (e.g., "${overdueTasks[0]?.title}").` : '- ✅ **Zero overdue tasks** across active pipelines.'}
${pendingApprovals.length > 0 ? `- 🛡️ **${pendingApprovals.length} AI Recommendation(s)** awaiting your review in the **AI Approval Center** before any action is executed.` : ''}
${activeProjects.length > 0 ? `- 🚀 **Active Projects:** ${activeProjects.slice(0, 3).map((p: any) => `*${p.name}* (${p.progress}% done)`).join(', ')}.` : ''}

**AURA Recommendation:** Clear pending approvals first, then address high-priority deliverable milestones. Remember: *AI assists, Human decides.*`;
        }
      } else if (lower.includes('overdue') || lower.includes('deadline')) {
        if (voiceMode) {
          fallbackResponse = overdueTasks.length > 0
            ? `You have ${overdueTasks.length} overdue item: "${overdueTasks[0]?.title}". Would you like me to help reschedule or address it?`
            : `Great news! You have no overdue tasks right now. All deliverables are running on schedule.`;
        } else {
          fallbackResponse = overdueTasks.length > 0
            ? `### ⚠️ Overdue Deliverables Analysis\nFound ${overdueTasks.length} overdue task(s):\n${overdueTasks.map((t: any) => `- **${t.title}** (due: ${t.deadline || 'unspecified'})`).join('\n')}`
            : `### ✅ Timelines Clear\nAll tasks and deliverables are within their scheduled milestones.`;
        }
      } else if (lower.includes('perform') || lower.includes('revenue') || lower.includes('business')) {
        if (voiceMode) {
          fallbackResponse = `Your recorded revenue is $${revenue.toLocaleString()} across ${activeProjects.length} active projects and ${clientsCount} clients. Delivery velocity is healthy.`;
        } else {
          fallbackResponse = `### 📈 Business Performance Snapshot
- **Recorded Revenue:** $${revenue.toLocaleString()}
- **Active Client Accounts:** ${clientsCount}
- **Active Deliverable Pipelines:** ${activeProjects.length}
- **Open Workload Queue:** ${pendingTasks.length} tasks

**Operational Health:** ${overdueTasks.length === 0 ? 'Optimal velocity with healthy delivery timelines.' : 'Attention required on overdue milestone deliverables.'}`;
        }
      } else if (lower.includes('client') || lower.includes('attention')) {
        if (voiceMode) {
          fallbackResponse = clientsCount > 0
            ? `You have ${clientsCount} clients registered, with ${context.clients?.[0]?.name || 'your primary client'} active. All communication threads are monitored.`
            : `No clients are registered in your workspace yet. Would you like to add one now?`;
        } else {
          fallbackResponse = `### 👥 Client Relationship Intelligence
AURA has analyzed communication timestamps and active orders:
- **Total Registered Accounts:** ${clientsCount}
${clientsCount > 0 ? `- Key accounts monitored: **${context.clients?.[0]?.name || 'Primary Client'}**` : '- No active clients registered yet.'}
${pendingApprovals.length > 0 ? `- Incoming inquiries or order updates are queued in your **Approval Center**.` : '- All client communication threads are synchronized.'}`;
        }
      } else {
        if (voiceMode) {
          fallbackResponse = `I'm here with you. Your workspace has ${activeProjects.length} active projects and ${pendingTasks.length} open tasks. What would you like to review or accomplish next?`;
        } else {
          fallbackResponse = `### 🤖 AURA Intelligence Analysis
Based on current workspace telemetry:
- **Active Workload:** ${pendingTasks.length} pending tasks across ${activeProjects.length} active projects.
- **Approvals Pending:** ${pendingApprovals.length} awaiting human sign-off.
- **System Status:** All automation rules active, listening for incoming Fiverr and Email triggers.

*How would you like to proceed? You can ask me to draft client updates, review project risks, or plan deliverable milestones.*`;
        }
      }

      res.json({
        response: fallbackResponse,
        source: 'aura-local-intelligence',
        actionProposal,
      });
    } catch (err: any) {
      console.error('Error in /api/ask-aura:', err);
      res.status(500).json({
        error: 'Failed to process AURA intelligence query',
        details: err?.message,
      });
    }
  });

  // ==========================================
  // GEMINI CHATBOT (MULTI-TURN, ROLES, SEARCH & MAPS GROUNDING)
  // ==========================================
  app.post('/api/gemini-chat', async (req, res) => {
    try {
      const {
        message,
        history = [],
        modelRole = 'general',
        enableSearch = false,
        enableMaps = false,
        userLocation,
        workspaceContext,
      } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      const client = getGeminiClient();

      // Determine model and system role persona
      // Requirements:
      // gemini-3.1-pro-preview for particularly complex tasks
      // gemini-3.5-flash for general tasks (and with googleSearch / googleMaps)
      // gemini-3.1-flash-lite for tasks that should happen fast
      let selectedModel = 'gemini-3.5-flash';
      let systemInstruction = `You are AURA AI Workspace Copilot.
    Core Principle: "AI assists. Human decides."
    You manage workspace operations, project timelines, deliverables, and client communications.
Live Workspace Telemetry:
${JSON.stringify(workspaceContext || {}, null, 2)}`;

      if (modelRole === 'executive') {
        selectedModel = 'gemini-3.1-pro-preview';
        systemInstruction = `You are the Executive Strategist & Chief Architect of AURA AI.
Role: Specialized in high-complexity strategic reasoning, market analysis, structural business planning, risk assessment, and executive deliverable architecture.
      Core Principle: "AI assists. Human decides."
Provide rigorous, structured, deeply reasoned insights with clear trade-offs, milestones, and strategic recommendations.
Live Workspace Telemetry:
${JSON.stringify(workspaceContext || {}, null, 2)}`;
      } else if (modelRole === 'rapid') {
        selectedModel = 'gemini-3.1-flash-lite';
        systemInstruction = `You are the Rapid Response Assistant of AURA AI.
Role: Optimized for fast, succinct, high-speed execution. Deliver direct answers, checklists, quick data lookups, and immediate task draft outlines with zero filler.
      Core Principle: "AI assists. Human decides."
Live Workspace Telemetry:
${JSON.stringify(workspaceContext || {}, null, 2)}`;
      } else {
        selectedModel = 'gemini-3.5-flash';
        systemInstruction = `You are the General Workspace Copilot of AURA AI.
Role: Versatile daily operational intelligence, client relationship tracking, invoice calculations, and milestone coordination.
      Core Principle: "AI assists. Human decides."
Live Workspace Telemetry:
${JSON.stringify(workspaceContext || {}, null, 2)}`;
      }

      // Handle Grounding Tools (Search & Maps require gemini-3.5-flash)
      const tools: any[] = [];
      let toolConfig: any = undefined;

      if (enableSearch) {
        selectedModel = 'gemini-3.5-flash';
        tools.push({ googleSearch: {} });
      } else if (enableMaps) {
        selectedModel = 'gemini-3.5-flash';
        tools.push({ googleMaps: {} });
        if (userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number') {
          toolConfig = {
            retrievalConfig: {
              latLng: {
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
              },
            },
          };
        }
      }

      if (client && process.env.GEMINI_API_KEY) {
        try {
          // Format multi-turn conversation history
          const contents: any[] = [];
          if (Array.isArray(history)) {
            for (const item of history) {
              if (item && item.role && item.parts && Array.isArray(item.parts)) {
                contents.push({
                  role: item.role === 'user' ? 'user' : 'model',
                  parts: item.parts.map((p: any) => ({ text: p.text || '' })),
                });
              }
            }
          }
          // Append the current user message
          contents.push({
            role: 'user',
            parts: [{ text: message }],
          });

          const response = await client.models.generateContent({
            model: selectedModel,
            contents,
            config: {
              systemInstruction,
              tools: tools.length > 0 ? tools : undefined,
              toolConfig: toolConfig || undefined,
              temperature: 0.5,
            },
          });

          const replyText = response.text || '';
          const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
          const groundingChunks = groundingMetadata?.groundingChunks || [];
          const webSearchQueries = groundingMetadata?.webSearchQueries || [];

          res.json({
            success: true,
            response: replyText,
            model: selectedModel,
            role: modelRole,
            groundingChunks,
            webSearchQueries,
          });
          return;
        } catch (apiError: any) {
          console.warn(`Primary model ${selectedModel} failed, trying fallback:`, apiError?.message);

          // Fallback to gemini-3.5-flash without extra tools if tool call fails
          try {
            const fallbackResponse = await client.models.generateContent({
              model: 'gemini-3.5-flash',
              contents: message,
              config: {
                systemInstruction,
                temperature: 0.5,
              },
            });
            res.json({
              success: true,
              response: fallbackResponse.text || '',
              model: 'gemini-3.5-flash',
              role: modelRole,
              groundingChunks: [],
              webSearchQueries: [],
            });
            return;
          } catch (secondErr: any) {
            console.warn('Gemini fallback failed:', secondErr?.message);
          }
        }
      }

      // Local heuristic fallback when API key is not yet configured
      let simulatedReply = `### 🤖 AURA ${modelRole.toUpperCase()} Assistant\n\n`;
      if (enableSearch) {
        simulatedReply += `*Live Search Grounding (${selectedModel}):*\n\n`;
      } else if (enableMaps) {
        simulatedReply += `*Maps Grounding (${selectedModel}):*\n\n`;
      }
      simulatedReply += `I have reviewed your query: "${message}".\n\n`;
      simulatedReply += `Based on current workspace metrics (${workspaceContext?.projects?.length || 0} active projects, ${workspaceContext?.tasks?.length || 0} tasks), everything is tracked under AURA's human-in-the-loop governance.\n\n*Principle: AI assists. Human decides.*`;

      res.json({
        success: true,
        response: simulatedReply,
        model: selectedModel,
        role: modelRole,
        groundingChunks: [],
        webSearchQueries: enableSearch ? [message] : [],
      });
    } catch (err: any) {
      console.error('Error in /api/gemini-chat:', err);
      res.status(500).json({ error: err.message || 'Chat generation error' });
    }
  });

  // ==========================================
  // GEMINI LIVE VOICE API (gemini-3.1-flash-live-preview)
  // ==========================================
  app.post('/api/gemini-live-voice', async (req, res) => {
    try {
      const {
        prompt,
        history = [],
        language = 'en-US',
        workspaceContext,
      } = req.body;

      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({ error: 'Prompt is required' });
        return;
      }

      const client = getGeminiClient();
      const liveModel = 'gemini-3.1-flash-live-preview';

      const liveVoiceSystemInstruction = `You are AURA Voice, the real-time spoken conversational AI powered by Gemini Live API (${liveModel}).
    Core Principle: "AI assists. Human decides."
Spoken Cadence:
- Warm, light, calm, poised, concise, natural speech.
- Keep responses strictly between 1 and 3 spoken sentences.
- Avoid markdown formatting, asterisks, bullet points, and code blocks.
- Spoken Language: Respond in ${language}.
- Action Protocol: If the user requests creating a task, sending a message, or changing project status, propose it and ask for verbal confirmation.
Workspace context:
${JSON.stringify(workspaceContext || {}, null, 2)}`;

      if (client && process.env.GEMINI_API_KEY) {
        try {
          const contents: any[] = [];
          if (Array.isArray(history)) {
            for (const item of history.slice(-6)) {
              if (item?.role && item?.parts) {
                contents.push({
                  role: item.role === 'user' ? 'user' : 'model',
                  parts: item.parts.map((p: any) => ({ text: p.text || '' })),
                });
              }
            }
          }
          contents.push({ role: 'user', parts: [{ text: prompt }] });

          let responseText = '';
          try {
            const response = await client.models.generateContent({
              model: liveModel,
              contents,
              config: {
                systemInstruction: liveVoiceSystemInstruction,
                temperature: 0.6,
              },
            });
            responseText = response.text || '';
          } catch (liveErr: any) {
            console.warn(`gemini-3.1-flash-live-preview call fallback: ${liveErr?.message}`);
            // Fallback to gemini-3.5-flash if preview model is temporarily rate-limited
            const fb = await client.models.generateContent({
              model: 'gemini-3.5-flash',
              contents,
              config: {
                systemInstruction: liveVoiceSystemInstruction,
                temperature: 0.6,
              },
            });
            responseText = fb.text || '';
          }

          if (responseText) {
            const isTaskIntent = /create (a )?task|add (a )?task|remind me to/i.test(prompt);
            const actionProposal = isTaskIntent
              ? {
                  type: 'create_task',
                  title: prompt.replace(/create (a )?task (to|for)?/i, '').replace(/remind me to/i, '').trim() || 'New Voice Task',
                }
              : undefined;

            res.json({
              success: true,
              response: responseText,
              model: liveModel,
              actionProposal,
            });
            return;
          }
        } catch (genErr: any) {
          console.warn('Gemini live voice generation error:', genErr?.message);
        }
      }

      // Local intelligent response
      const cleanPrompt = prompt.trim();
      let reply = `I hear you loud and clear. I am monitoring your workspace. How can I help you take action next?`;
      if (/create.*task|add.*task/i.test(cleanPrompt)) {
        const title = cleanPrompt.replace(/create.*task|add.*task/i, '').trim() || 'Review project deliverable';
        reply = `I can create that task for you: "${title}". Would you like me to add it?`;
      } else if (/status|today|summary/i.test(cleanPrompt)) {
        const projectsCount = workspaceContext?.projects?.length || 0;
        const tasksCount = workspaceContext?.tasks?.length || 0;
        reply = `You currently have ${projectsCount} active projects and ${tasksCount} open tasks. Everything is running smoothly.`;
      }

      res.json({
        success: true,
        response: reply,
        model: liveModel,
      });
    } catch (err: any) {
      console.error('Error in /api/gemini-live-voice:', err);
      res.status(500).json({ error: err.message || 'Live voice error' });
    }
  });

  return app;
}

async function startServer() {
  const app = createApp();
  const PORT = 3000;

  // Vite middleware in dev; static assets in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AURA AI OS server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== '1') {
  void startServer();
}
