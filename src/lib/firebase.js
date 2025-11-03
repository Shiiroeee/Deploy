import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCZSAw_Dr_XLD2cgpXdbnO0HSsgAh03gmc",
  authDomain: "lofu-9cefc.firebaseapp.com",
  projectId: "lofu-9cefc",
  storageBucket: "lofu-9cefc.appspot.com",        // ✅ FIXED
  messagingSenderId: "66037454047",
  appId: "1:66037454047:web:5aaa8f18ed18222da5856a",
  measurementId: "G-PLWW8XYFDQ"
};

// Prevent duplicate initialization in dev
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://lofu-9cefc.appspot.com"); // ✅ FIXED

export async function ensureSignedIn() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}
