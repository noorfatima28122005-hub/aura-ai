import crypto from 'crypto';
import firebaseConfig from '../firebase-applet-config.json';
import type { AuthUser } from './auth';

interface FirebaseIdentity {
  localId: string;
  email?: string;
  displayName?: string;
  photoUrl?: string;
}

interface FirebaseAuthResponse extends FirebaseIdentity {
  idToken: string;
  refreshToken: string;
}

interface RefreshedFirebaseToken {
  idToken: string;
  refreshToken: string;
  userId: string;
}

interface ProfileInput {
  name?: string;
  companyName?: string;
  role?: string;
  businessDomain?: string;
  teamSize?: string;
  primaryServices?: string[];
  averageProjectValue?: string;
  aiAssistanceLevel?: string;
}

const identityToolkitUrl = 'https://identitytoolkit.googleapis.com/v1';
const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${encodeURIComponent(firebaseConfig.firestoreDatabaseId || '(default)')}/documents`;

export function getFirebaseGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || firebaseConfig.oAuthClientId || '';
}

function getApiKey(): string {
  if (!firebaseConfig.apiKey) {
    throw new Error('Firebase authentication is not configured.');
  }
  return firebaseConfig.apiKey;
}

async function firebaseRequest<T>(endpoint: string, body: unknown): Promise<T> {
  const response = await fetch(`${identityToolkitUrl}/${endpoint}?key=${encodeURIComponent(getApiKey())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const result = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) {
    const code = result.error?.message || 'AUTH_ERROR';
    const messages: Record<string, string> = {
      EMAIL_EXISTS: 'An account with this email address already exists.',
      EMAIL_NOT_FOUND: 'Invalid email or password.',
      INVALID_PASSWORD: 'Invalid email or password.',
      INVALID_LOGIN_CREDENTIALS: 'Invalid email or password.',
      WEAK_PASSWORD: 'Password must be at least 6 characters.',
      OPERATION_NOT_ALLOWED: 'This sign-in method is not enabled in Firebase Authentication.',
      USER_DISABLED: 'This account has been disabled.',
    };
    throw new Error(messages[code] || 'Firebase could not complete authentication. Check the Firebase Authentication configuration.');
  }

  return result;
}

function toPublicUser(identity: FirebaseIdentity, profile?: Record<string, any> | ProfileInput | null) {
  return {
    id: identity.localId,
    email: identity.email || String(profile && 'email' in profile ? profile.email || '' : ''),
    name: String(profile?.name || identity.displayName || identity.email?.split('@')[0] || 'Workspace Director'),
    companyName: String(profile?.companyName || 'Aura Studio Operations'),
    role: String(profile?.role || 'Managing Director'),
    businessDomain: profile?.businessDomain as string | undefined,
    teamSize: profile?.teamSize as string | undefined,
    primaryServices: profile?.primaryServices as string[] | undefined,
    averageProjectValue: profile?.averageProjectValue as string | undefined,
    aiAssistanceLevel: profile?.aiAssistanceLevel as string | undefined,
    isAuthenticated: true,
  };
}

function profileFields(profile: ProfileInput, identity: FirebaseIdentity) {
  const fields: Record<string, unknown> = {
    uid: { stringValue: identity.localId },
    email: { stringValue: identity.email || '' },
    name: { stringValue: profile.name || identity.displayName || identity.email?.split('@')[0] || 'Workspace Director' },
    companyName: { stringValue: profile.companyName || 'Aura Studio Operations' },
    role: { stringValue: profile.role || 'Managing Director' },
    updatedAt: { stringValue: new Date().toISOString() },
  };

  for (const key of ['businessDomain', 'teamSize', 'averageProjectValue', 'aiAssistanceLevel'] as const) {
    if (profile[key]) fields[key] = { stringValue: profile[key] };
  }
  if (profile.primaryServices) {
    fields.primaryServices = {
      arrayValue: { values: profile.primaryServices.map((value) => ({ stringValue: value })) },
    };
  }

  return fields;
}

function decodeFields(fields: Record<string, any> | undefined): Record<string, unknown> | null {
  if (!fields) return null;
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if ('stringValue' in value) result[key] = value.stringValue;
    else if ('arrayValue' in value) {
      result[key] = (value.arrayValue.values || []).map((item: any) => item.stringValue).filter(Boolean);
    }
  }
  return result;
}

async function firestoreRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T | null> {
  const response = await fetch(`${firestoreUrl}/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });

  if (response.status === 404) return null;
  const result = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) {
    throw new Error(result.error?.message || 'Could not access the Firebase user profile.');
  }
  return result;
}

async function saveProfile(identity: FirebaseIdentity, token: string, profile: ProfileInput): Promise<void> {
  const fields = profileFields(profile, identity);
  const query = new URLSearchParams();
  for (const field of Object.keys(fields)) query.append('updateMask.fieldPaths', field);
  await firestoreRequest(`users/${encodeURIComponent(identity.localId)}?${query.toString()}`, token, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  });
}

async function loadProfile(identity: FirebaseIdentity, token: string): Promise<Record<string, unknown> | null> {
  const document = await firestoreRequest<{ fields?: Record<string, any> }>(
    `users/${encodeURIComponent(identity.localId)}`,
    token,
  );
  return decodeFields(document?.fields);
}

async function lookupIdentity(token: string): Promise<FirebaseIdentity> {
  const result = await firebaseRequest<{ users?: FirebaseIdentity[] }>('accounts:lookup', { idToken: token });
  const identity = result.users?.[0];
  if (!identity) throw new Error('Session expired or invalid.');
  return identity;
}

async function refreshFirebaseToken(refreshToken: string): Promise<RefreshedFirebaseToken> {
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(getApiKey())}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const result = await response.json() as {
    id_token?: string;
    refresh_token?: string;
    user_id?: string;
  };
  if (!response.ok || !result.id_token || !result.user_id) {
    throw new Error('Session expired or invalid. Please sign in again.');
  }
  return {
    idToken: result.id_token,
    refreshToken: result.refresh_token || refreshToken,
    userId: result.user_id,
  };
}

async function isRevoked(identity: FirebaseIdentity, bearerToken: string, idToken: string): Promise<boolean> {
  const tokenHash = crypto.createHash('sha256').update(bearerToken).digest('hex');
  const document = await firestoreRequest(
    `users/${encodeURIComponent(identity.localId)}/revokedSessions/${tokenHash}`,
    idToken,
  );
  return Boolean(document);
}

async function resolveFirebaseBearer(bearerToken: string) {
  const refreshed = await refreshFirebaseToken(bearerToken);
  const identity: FirebaseIdentity = { localId: refreshed.userId };
  if (await isRevoked(identity, bearerToken, refreshed.idToken)) {
    throw new Error('Session expired or invalid.');
  }
  return { identity, idToken: refreshed.idToken, refreshToken: refreshed.refreshToken };
}

export async function registerFirebaseUser(params: ProfileInput & { email: string; password: string }) {
  const result = await firebaseRequest<FirebaseAuthResponse>('accounts:signUp', {
    email: params.email.trim(),
    password: params.password,
    returnSecureToken: true,
  });
  const displayName = params.name?.trim() || 'Workspace Director';
  const updated = await firebaseRequest<FirebaseAuthResponse>('accounts:update', {
    idToken: result.idToken,
    displayName,
    returnSecureToken: true,
  });
  await saveProfile(updated, updated.idToken, { ...params, name: displayName });
  return {
    user: toPublicUser(updated, { ...params, name: displayName }),
    token: updated.refreshToken,
  };
}

export async function authenticateFirebasePassword(email: string, password: string) {
  const result = await firebaseRequest<FirebaseAuthResponse>('accounts:signInWithPassword', {
    email: email.trim(),
    password,
    returnSecureToken: true,
  });
  let profile = await loadProfile(result, result.idToken);
  if (!profile) {
    const defaultProfile = {
      name: result.displayName || result.email?.split('@')[0] || 'Workspace Director',
      companyName: 'Aura Studio Operations',
      role: 'Managing Director',
    };
    await saveProfile(result, result.idToken, defaultProfile);
    profile = defaultProfile;
  }
  return { user: toPublicUser(result, profile), token: result.refreshToken };
}

export async function migrateLegacyFirebaseUser(user: AuthUser, password: string) {
  try {
    return await registerFirebaseUser({
      email: user.email,
      password,
      name: user.name,
      companyName: user.companyName,
      role: user.role,
      businessDomain: user.businessDomain,
      teamSize: user.teamSize,
      primaryServices: user.primaryServices,
      averageProjectValue: user.averageProjectValue,
      aiAssistanceLevel: user.aiAssistanceLevel,
    });
  } catch (err: any) {
    if (!err.message?.includes('already exists')) throw err;
    return authenticateFirebasePassword(user.email, password);
  }
}

export async function authenticateFirebaseGoogle(credential: string, requestUri: string) {
  const result = await firebaseRequest<FirebaseAuthResponse>('accounts:signInWithIdp', {
    postBody: `id_token=${encodeURIComponent(credential)}&providerId=google.com`,
    requestUri,
    returnIdpCredential: true,
    returnSecureToken: true,
  });
  let profile = await loadProfile(result, result.idToken);
  if (!profile) {
    const defaultProfile = {
      name: result.displayName || result.email?.split('@')[0] || 'Google User',
      companyName: `${(result.displayName || 'Workspace').split(' ')[0]}'s Operations`,
      role: 'Principal Executive',
    };
    await saveProfile(result, result.idToken, defaultProfile);
    profile = defaultProfile;
  }
  return { user: toPublicUser(result, profile), token: result.refreshToken };
}

export async function authenticateFirebaseIdToken(idToken: string, refreshToken: string) {
  const identity = await lookupIdentity(idToken);
  const resolved = await resolveFirebaseBearer(refreshToken);
  if (identity.localId !== resolved.identity.localId) throw new Error('Google credential does not match the Firebase session.');
  return authenticateFirebaseBearer(refreshToken, { ...resolved, identity });
}

export async function authenticateFirebaseBearer(token: string, resolution?: Awaited<ReturnType<typeof resolveFirebaseBearer>>) {
  const { identity, idToken, refreshToken } = resolution || await resolveFirebaseBearer(token);
  let profile = await loadProfile(identity, idToken);
  if (!profile) {
    const defaultProfile = {
      name: identity.displayName || identity.email?.split('@')[0] || 'Google User',
      companyName: 'Aura Studio Operations',
      role: 'Managing Director',
    };
    await saveProfile(identity, idToken, defaultProfile);
    profile = defaultProfile;
  }
  return { user: toPublicUser(identity, profile), token: refreshToken };
}

export async function revokeFirebaseToken(token: string): Promise<void> {
  const { identity, idToken } = await resolveFirebaseBearer(token);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  await firestoreRequest(
    `users/${encodeURIComponent(identity.localId)}/revokedSessions/${tokenHash}`,
    idToken,
    {
      method: 'PATCH',
      body: JSON.stringify({ fields: { revokedAt: { stringValue: new Date().toISOString() } } }),
    },
  );
}

export async function createFirebaseDemoSession() {
  const result = await firebaseRequest<FirebaseAuthResponse>('accounts:signUp', { returnSecureToken: true });
  const profile: ProfileInput = {
    name: 'AURA Demo',
    companyName: 'Aura Studio Operations',
    role: 'Managing Director',
  };
  await saveProfile(result, result.idToken, profile);
  return { user: toPublicUser(result, profile), token: result.refreshToken };
}

export async function getFirebaseUserId(token: string): Promise<string> {
  const { identity } = await resolveFirebaseBearer(token);
  return identity.localId;
}