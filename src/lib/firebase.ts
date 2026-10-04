import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkspaceData, Client, Project, Task, Invoice, UserProfile } from '../types';

// Initialize Firebase App instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth & Firestore
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use dedicated firestoreDatabaseId if configured, or default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Sign in using Firebase Google Auth popup
 */
export async function signInWithGoogleFirebase(): Promise<{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  idToken: string;
}> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    uid: user.uid,
    email: user.email || 'workingbynoor@gmail.com',
    displayName: user.displayName || 'Noor A.',
    photoURL:
      user.photoURL ||
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    idToken,
  };
}

/**
 * Sign out of Firebase Auth
 */
export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Save user profile and full workspace data to Firestore
 */
export async function saveWorkspaceToFirestore(
  userId: string,
  data: WorkspaceData,
  profile?: UserProfile
): Promise<boolean> {
  if (!userId) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        uid: userId,
        email: profile?.email || 'workingbynoor@gmail.com',
        displayName: profile?.name || 'Workspace Owner',
        companyName: profile?.companyName || 'Apex Strategic Studio',
        role: profile?.role || 'Founder & Principal Consultant',
        stats: data.stats || null,
        updatedAt: new Date().toISOString(),
        syncedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Save active clients batch/documents
    if (data.clients && data.clients.length > 0) {
      for (const client of data.clients) {
        if (client.id) {
          const clientRef = doc(db, 'users', userId, 'clients', client.id);
          await setDoc(clientRef, { ...client, userId, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    }

    // Save active projects
    if (data.projects && data.projects.length > 0) {
      for (const project of data.projects) {
        if (project.id) {
          const projectRef = doc(db, 'users', userId, 'projects', project.id);
          await setDoc(projectRef, { ...project, userId, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    }

    // Save active tasks
    if (data.tasks && data.tasks.length > 0) {
      for (const task of data.tasks) {
        if (task.id) {
          const taskRef = doc(db, 'users', userId, 'tasks', task.id);
          await setDoc(taskRef, { ...task, userId, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    }

    // Save invoices
    if (data.invoices && data.invoices.length > 0) {
      for (const inv of data.invoices) {
        if (inv.id) {
          const invRef = doc(db, 'users', userId, 'invoices', inv.id);
          await setDoc(invRef, { ...inv, userId, updatedAt: new Date().toISOString() }, { merge: true });
        }
      }
    }

    return true;
  } catch (err) {
    console.warn('Firestore persistence warning:', err);
    return false;
  }
}

/**
 * Load workspace records from Firestore
 */
export async function loadWorkspaceFromFirestore(
  userId: string
): Promise<Partial<WorkspaceData> | null> {
  if (!userId) return null;
  try {
    const clientsRef = collection(db, 'users', userId, 'clients');
    const projectsRef = collection(db, 'users', userId, 'projects');
    const tasksRef = collection(db, 'users', userId, 'tasks');
    const invoicesRef = collection(db, 'users', userId, 'invoices');

    const [clientsSnap, projectsSnap, tasksSnap, invoicesSnap] = await Promise.all([
      getDocs(clientsRef).catch(() => null),
      getDocs(projectsRef).catch(() => null),
      getDocs(tasksRef).catch(() => null),
      getDocs(invoicesRef).catch(() => null),
    ]);

    const clients: Client[] = [];
    if (clientsSnap) {
      clientsSnap.forEach((d) => clients.push(d.data() as Client));
    }

    const projects: Project[] = [];
    if (projectsSnap) {
      projectsSnap.forEach((d) => projects.push(d.data() as Project));
    }

    const tasks: Task[] = [];
    if (tasksSnap) {
      tasksSnap.forEach((d) => tasks.push(d.data() as Task));
    }

    const invoices: Invoice[] = [];
    if (invoicesSnap) {
      invoicesSnap.forEach((d) => invoices.push(d.data() as Invoice));
    }

    return {
      clients: clients.length > 0 ? clients : undefined,
      projects: projects.length > 0 ? projects : undefined,
      tasks: tasks.length > 0 ? tasks : undefined,
      invoices: invoices.length > 0 ? invoices : undefined,
    };
  } catch (err) {
    console.warn('Failed to load from Firestore:', err);
    return null;
  }
}

/**
 * Save chat message to Firestore chat collection
 */
export async function saveChatMessageToFirestore(
  userId: string,
  message: {
    id: string;
    role: 'user' | 'model';
    content: string;
    model?: string;
    timestamp?: string;
    groundingSources?: any[];
  }
): Promise<boolean> {
  if (!userId) return false;
  try {
    const chatDocRef = doc(db, 'users', userId, 'chats', message.id);
    await setDoc(chatDocRef, {
      ...message,
      userId,
      createdAt: serverTimestamp(),
      isoTime: message.timestamp || new Date().toISOString(),
    });
    return true;
  } catch (err) {
    console.warn('Could not save chat message to Firestore:', err);
    return false;
  }
}

/**
 * Load recent chat messages from Firestore
 */
export async function loadChatMessagesFromFirestore(userId: string): Promise<any[]> {
  if (!userId) return [];
  try {
    const chatsRef = collection(db, 'users', userId, 'chats');
    const q = query(chatsRef, limit(50));
    const snap = await getDocs(q);
    const messages: any[] = [];
    snap.forEach((d) => messages.push(d.data()));
    return messages.sort((a, b) => (a.isoTime || '').localeCompare(b.isoTime || ''));
  } catch (err) {
    console.warn('Could not load chat messages from Firestore:', err);
    return [];
  }
}

/**
 * Persist user voice speed and volume preferences to Firestore
 */
export async function saveVoicePreferencesToFirestore(
  userId: string,
  prefs: { speed: number; volume: number; isMuted: boolean; language?: string }
): Promise<boolean> {
  if (!userId) return false;
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(
      userDocRef,
      {
        voicePreferences: {
          speed: prefs.speed,
          volume: prefs.volume,
          isMuted: prefs.isMuted,
          language: prefs.language || 'en-US',
          updatedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.warn('Could not save voice preferences to Firestore:', err);
    return false;
  }
}

/**
 * Retrieve user voice speed and volume preferences from Firestore
 */
export async function loadVoicePreferencesFromFirestore(
  userId: string
): Promise<{ speed?: number; volume?: number; isMuted?: boolean; language?: string } | null> {
  if (!userId) return null;
  try {
    const userDocRef = doc(db, 'users', userId);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data()?.voicePreferences || null;
    }
    return null;
  } catch (err) {
    console.warn('Could not load voice preferences from Firestore:', err);
    return null;
  }
}

