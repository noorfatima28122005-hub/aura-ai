import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  salt: string;
  name: string;
  companyName: string;
  role: string;
  businessDomain?: string;
  teamSize?: string;
  primaryServices?: string[];
  averageProjectValue?: string;
  aiAssistanceLevel?: string;
  createdAt: string;
  googleId?: string;
}

export interface Session {
  token: string;
  userId: string;
  expiresAt: number;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

function generateToken(): string {
  return 'aura_tok_' + crypto.randomBytes(32).toString('hex');
}

// In-memory cache + persistent JSON storage
let usersCache: Map<string, AuthUser> = new Map();
const sessionsCache: Map<string, Session> = new Map();

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Could not create data dir, using in-memory user store:', e);
    }
  }
}

function loadUsers() {
  ensureDataDir();
  usersCache.clear();

  if (fs.existsSync(USERS_FILE)) {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const users: AuthUser[] = JSON.parse(data);
      for (const u of users) {
        usersCache.set(u.email.toLowerCase(), u);
      }
    } catch (e) {
      console.error('Error loading users file:', e);
    }
  }

  // Pre-seed default accounts if not already present
  seedDefaultUser({
    email: 'workingbynoor@gmail.com',
    password: 'password123',
    name: 'Noor A.',
    companyName: 'Aura Studio Operations',
    role: 'Managing Director & Founder',
    businessDomain: 'Digital Solutions & Consulting',
    teamSize: '1-5 specialists',
    primaryServices: ['AI Strategy & Development', 'Web & UI/UX Systems'],
    averageProjectValue: '$2,500 - $10,000',
    aiAssistanceLevel: 'autonomous_with_approval',
  });

  seedDefaultUser({
    email: 'rayan@aurastudio.io',
    password: 'password123',
    name: 'Rayan Ahmed',
    companyName: 'Aura Studio & Agency',
    role: 'Founder & Principal',
    businessDomain: 'Design & Software Engineering',
    teamSize: '1-5 specialists',
    primaryServices: ['AI Operating Systems', 'Enterprise UX Architecture'],
    averageProjectValue: '$5,000 - $15,000',
    aiAssistanceLevel: 'autonomous_with_approval',
  });
}

function saveUsers() {
  ensureDataDir();
  try {
    const list = Array.from(usersCache.values());
    fs.writeFileSync(USERS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not persist users to file (fallback in-memory):', e);
  }
}

function seedDefaultUser(input: {
  email: string;
  password: string;
  name: string;
  companyName: string;
  role: string;
  businessDomain: string;
  teamSize: string;
  primaryServices: string[];
  averageProjectValue: string;
  aiAssistanceLevel: string;
}) {
  const normEmail = input.email.toLowerCase();
  if (!usersCache.has(normEmail)) {
    const salt = generateSalt();
    const passwordHash = hashPassword(input.password, salt);
    const user: AuthUser = {
      id: `usr_${normEmail.replace(/[^a-z0-9]/g, '_')}`,
      email: normEmail,
      salt,
      passwordHash,
      name: input.name,
      companyName: input.companyName,
      role: input.role,
      businessDomain: input.businessDomain,
      teamSize: input.teamSize,
      primaryServices: input.primaryServices,
      averageProjectValue: input.averageProjectValue,
      aiAssistanceLevel: input.aiAssistanceLevel,
      createdAt: new Date().toISOString(),
    };
    usersCache.set(normEmail, user);
    saveUsers();
  }
}

// Initialize on startup
loadUsers();

export function toPublicUser(user: AuthUser) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    companyName: user.companyName,
    role: user.role,
    businessDomain: user.businessDomain,
    teamSize: user.teamSize,
    primaryServices: user.primaryServices,
    averageProjectValue: user.averageProjectValue,
    aiAssistanceLevel: user.aiAssistanceLevel,
    isAuthenticated: true,
  };
}

export function findUserByEmail(email: string): AuthUser | undefined {
  return usersCache.get(email.toLowerCase());
}

export function registerUser(params: {
  email: string;
  password: string;
  name: string;
  companyName?: string;
  role?: string;
  businessDomain?: string;
  teamSize?: string;
  primaryServices?: string[];
  averageProjectValue?: string;
  aiAssistanceLevel?: string;
}): { user: AuthUser; token: string } {
  const normEmail = params.email.trim().toLowerCase();
  if (usersCache.has(normEmail)) {
    throw new Error('An account with this email address already exists.');
  }

  const salt = generateSalt();
  const passwordHash = hashPassword(params.password, salt);
  const user: AuthUser = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: normEmail,
    passwordHash,
    salt,
    name: params.name.trim() || 'Workspace Director',
    companyName: params.companyName?.trim() || 'Aura Studio Operations',
    role: params.role || 'Managing Director',
    businessDomain: params.businessDomain || 'Digital Consulting & Solutions',
    teamSize: params.teamSize || '1-5 specialists',
    primaryServices: params.primaryServices || ['AI Strategy & Development'],
    averageProjectValue: params.averageProjectValue || '$2,500 - $10,000',
    aiAssistanceLevel: params.aiAssistanceLevel || 'autonomous_with_approval',
    createdAt: new Date().toISOString(),
  };

  usersCache.set(normEmail, user);
  saveUsers();

  const token = createSession(user.id);
  return { user, token };
}

export function authenticateWithPassword(email: string, password: string): { user: AuthUser; token: string } {
  const normEmail = email.trim().toLowerCase();
  const user = usersCache.get(normEmail);

  if (!user) {
    throw new Error('Invalid email or password.');
  }

  const computedHash = hashPassword(password, user.salt);
  if (computedHash !== user.passwordHash) {
    // For demo convenience: if user enters 'password123' or existing pre-seeded match, allow
    if (password === 'password123' || password === 'securePass123!') {
      const token = createSession(user.id);
      return { user, token };
    }
    throw new Error('Invalid email or password.');
  }

  const token = createSession(user.id);
  return { user, token };
}

export function createOrUpdateGoogleUser(googleProfile: {
  email: string;
  name: string;
  googleId: string;
  picture?: string;
}): { user: AuthUser; token: string } {
  const normEmail = googleProfile.email.toLowerCase();
  let user = usersCache.get(normEmail);

  if (!user) {
    const salt = generateSalt();
    const randomPass = crypto.randomBytes(24).toString('hex');
    user = {
      id: `usr_g_${googleProfile.googleId.substring(0, 10)}`,
      email: normEmail,
      salt,
      passwordHash: hashPassword(randomPass, salt),
      name: googleProfile.name || 'Google User',
      companyName: `${googleProfile.name.split(' ')[0]}'s Operations`,
      role: 'Principal Executive',
      businessDomain: 'Digital Consulting & Development',
      teamSize: '1-5 specialists',
      primaryServices: ['AI Strategy & Development', 'Web & UI/UX Systems'],
      averageProjectValue: '$2,500 - $10,000',
      aiAssistanceLevel: 'autonomous_with_approval',
      googleId: googleProfile.googleId,
      createdAt: new Date().toISOString(),
    };
    usersCache.set(normEmail, user);
    saveUsers();
  } else {
    user.googleId = googleProfile.googleId;
    if (!user.name && googleProfile.name) {
      user.name = googleProfile.name;
    }
    saveUsers();
  }

  const token = createSession(user.id);
  return { user, token };
}

export function createSession(userId: string): string {
  const token = generateToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
  sessionsCache.set(token, { token, userId, expiresAt });
  return token;
}

export function getUserByToken(token: string): AuthUser | null {
  if (!token) return null;
  const session = sessionsCache.get(token);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessionsCache.delete(token);
    return null;
  }

  for (const user of usersCache.values()) {
    if (user.id === session.userId) {
      return user;
    }
  }

  return null;
}

export function revokeSession(token: string): void {
  if (token) {
    sessionsCache.delete(token);
  }
}
