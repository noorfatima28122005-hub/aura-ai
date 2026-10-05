```ts
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

import {
  WorkspaceData,
  Client,
  Project,
  Task,
  Invoice,
  UserProfile,
} from '../types';

/* =========================================================
   FIREBASE INITIALIZATION
   ========================================================= */

const app = !getApps().length
  ? initializeApp(firebaseConfig)
  : getApp();

/* =========================================================
   FIREBASE AUTHENTICATION
   ========================================================= */

export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: 'select_account',
});

/**
 * Sign in with Google using Firebase Authentication.
 *
 * Returns the Firebase user information and ID token.
 */
export async function signInWithGoogleFirebase(): Promise<{
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  idToken: string;
  refreshToken: string;
}> {
  try {
    const result = await signInWithPopup(auth, googleProvider);

    const user = result.user;

    const idToken = await user.getIdToken();

    return {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || 'Noor',
      photoURL: user.photoURL || '',
      idToken,
      refreshToken: user.refreshToken,
    };
  } catch (error: any) {
    console.error('Firebase Google sign-in failed:', error);

    throw new Error(
      error?.message || 'Google authentication failed. Please try again.'
    );
  }
}

/**
 * Sign out the current Firebase user.
 */
export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Firebase sign-out failed:', error);
    throw error;
  }
}

/**
 * Listen for Firebase authentication state changes.
 */
export function onFirebaseAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

/* =========================================================
   FIRESTORE
   ========================================================= */

/**
 * Use the configured Firestore database when a database ID
 * exists. Otherwise use the default Firestore database.
 */
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/* =========================================================
   USER PROFILE + WORKSPACE
   ========================================================= */

/**
 * Save user profile and workspace information.
 */
export async function saveWorkspaceToFirestore(
  userId: string,
  data: WorkspaceData,
  profile?: UserProfile
): Promise<boolean> {
  if (!userId) {
    console.warn('saveWorkspaceToFirestore: missing userId');
    return false;
  }

  try {
    const userDocRef = doc(db, 'users', userId);

    await setDoc(
      userDocRef,
      {
        uid: userId,
        email: profile?.email || '',
        displayName: profile?.name || 'Workspace Owner',
        companyName:
          profile?.companyName || 'AURA AI Workspace',
        role:
          profile?.role || 'Founder & Principal Consultant',

        stats: data.stats || null,

        updatedAt: new Date().toISOString(),
        syncedAt: serverTimestamp(),
      },
      {
        merge: true,
      }
    );

    /* -----------------------------------------------------
       CLIENTS
       ----------------------------------------------------- */

    if (data.clients?.length) {
      for (const client of data.clients) {
        if (!client.id) continue;

        const clientRef = doc(
          db,
          'users',
          userId,
          'clients',
          client.id
        );

        await setDoc(
          clientRef,
          {
            ...client,
            userId,
            updatedAt: new Date().toISOString(),
          },
          {
            merge: true,
          }
        );
      }
    }

    /* -----------------------------------------------------
       PROJECTS
       ----------------------------------------------------- */

    if (data.projects?.length) {
      for (const project of data.projects) {
        if (!project.id) continue;

        const projectRef = doc(
          db,
          'users',
          userId,
          'projects',
          project.id
        );

        await setDoc(
          projectRef,
          {
            ...project,
            userId,
            updatedAt: new Date().toISOString(),
          },
          {
            merge: true,
          }
        );
      }
    }

    /* -----------------------------------------------------
       TASKS
       ----------------------------------------------------- */

    if (data.tasks?.length) {
      for (const task of data.tasks) {
        if (!task.id) continue;

        const taskRef = doc(
          db,
          'users',
          userId,
          'tasks',
          task.id
        );

        await setDoc(
          taskRef,
          {
            ...task,
            userId,
            updatedAt: new Date().toISOString(),
          },
          {
            merge: true,
          }
        );
      }
    }

    /* -----------------------------------------------------
       INVOICES
       ----------------------------------------------------- */

    if (data.invoices?.length) {
      for (const invoice of data.invoices) {
        if (!invoice.id) continue;

        const invoiceRef = doc(
          db,
          'users',
          userId,
          'invoices',
          invoice.id
        );

        await setDoc(
          invoiceRef,
          {
            ...invoice,
            userId,
            updatedAt: new Date().toISOString(),
          },
          {
            merge: true,
          }
        );
      }
    }

    return true;
  } catch (error) {
    console.error(
      'Firestore workspace persistence failed:',
      error
    );

    return false;
  }
}

/* =========================================================
   LOAD WORKSPACE
   ========================================================= */

/**
 * Load workspace data for the authenticated user.
 */
export async function loadWorkspaceFromFirestore(
  userId: string
): Promise<Partial<WorkspaceData> | null> {
  if (!userId) {
    return null;
  }

  try {
    const clientsRef = collection(
      db,
      'users',
      userId,
      'clients'
    );

    const projectsRef = collection(
      db,
      'users',
      userId,
      'projects'
    );

    const tasksRef = collection(
      db,
      'users',
      userId,
      'tasks'
    );

    const invoicesRef = collection(
      db,
      'users',
      userId,
      'invoices'
    );

    const [
      clientsSnap,
      projectsSnap,
      tasksSnap,
      invoicesSnap,
    ] = await Promise.all([
      getDocs(clientsRef),
      getDocs(projectsRef),
      getDocs(tasksRef),
      getDocs(invoicesRef),
    ]);

    const clients: Client[] = [];

    clientsSnap.forEach((snapshot) => {
      clients.push(snapshot.data() as Client);
    });

    const projects: Project[] = [];

    projectsSnap.forEach((snapshot) => {
      projects.push(snapshot.data() as Project);
    });

    const tasks: Task[] = [];

    tasksSnap.forEach((snapshot) => {
      tasks.push(snapshot.data() as Task);
    });

    const invoices: Invoice[] = [];

    invoicesSnap.forEach((snapshot) => {
      invoices.push(snapshot.data() as Invoice);
    });

    return {
      clients: clients.length ? clients : undefined,
      projects: projects.length ? projects : undefined,
      tasks: tasks.length ? tasks : undefined,
      invoices: invoices.length ? invoices : undefined,
    };
  } catch (error) {
    console.error(
      'Failed to load workspace from Firestore:',
      error
    );

    return null;
  }
}

/* =========================================================
   CHAT
   ========================================================= */

/**
 * Save an AURA chat message.
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
  if (!userId || !message.id) {
    return false;
  }

  try {
    const chatDocRef = doc(
      db,
      'users',
      userId,
      'chats',
      message.id
    );

    await setDoc(chatDocRef, {
      ...message,

      userId,

      createdAt: serverTimestamp(),

      isoTime:
        message.timestamp ||
        new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error(
      'Could not save chat message:',
      error
    );

    return false;
  }
}

/**
 * Load recent AURA chat messages.
 */
export async function loadChatMessagesFromFirestore(
  userId: string
): Promise<any[]> {
  if (!userId) {
    return [];
  }

  try {
    const chatsRef = collection(
      db,
      'users',
      userId,
      'chats'
    );

    const chatsQuery = query(
      chatsRef,
      orderBy('isoTime', 'desc'),
      limit(50)
    );

    const snapshot = await getDocs(chatsQuery);

    const messages: any[] = [];

    snapshot.forEach((item) => {
      messages.push(item.data());
    });

    return messages.reverse();
  } catch (error) {
    console.error(
      'Could not load chat messages:',
      error
    );

    return [];
  }
}

/* =========================================================
   VOICE PREFERENCES
   ========================================================= */

/**
 * Save AURA voice preferences.
 */
export async function saveVoicePreferencesToFirestore(
  userId: string,
  prefs: {
    speed: number;
    volume: number;
    isMuted: boolean;
    language?: string;
  }
): Promise<boolean> {
  if (!userId) {
    return false;
  }

  try {
    const userDocRef = doc(
      db,
      'users',
      userId
    );

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
      {
        merge: true,
      }
    );

    return true;
  } catch (error) {
    console.error(
      'Could not save voice preferences:',
      error
    );

    return false;
  }
}

/**
 * Load AURA voice preferences.
 */
export async function loadVoicePreferencesFromFirestore(
  userId: string
): Promise<{
  speed?: number;
  volume?: number;
  isMuted?: boolean;
  language?: string;
} | null> {
  if (!userId) {
    return null;
  }

  try {
    const userDocRef = doc(
      db,
      'users',
      userId
    );

    const snapshot = await getDoc(userDocRef);

    if (!snapshot.exists()) {
      return null;
    }

    return (
      snapshot.data()?.voicePreferences || null
    );
  } catch (error) {
    console.error(
      'Could not load voice preferences:',
      error
    );

    return null;
  }
}
```

**Important:** is code mein maine tumhari original Firebase config ko preserve kiya hai aur Google authentication ko proper error handling ke saath rakha hai.

Ab file **Save** karo, phir PowerShell mein:

```powershell
git add src/lib/firebase.ts
git commit -m "Fix Firebase authentication and Firestore integration"
git push origin main
```

Phir Vercel automatically naya deployment karega.

**Lekin ek important baat:** agar deployment ke baad bhi `Authenticating with Google via Firebase Auth...` par stuck hota hai, to sirf `firebase.ts` change karne se problem solve nahi hogi. Phir humein **Firebase Console → Authentication → Sign-in method → Google** aur **Authorized domains** check karne honge.
