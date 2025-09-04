// src/lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCZSAw_Dr_XLD2cgpXdbnO0HSsgAh03gmc",
  authDomain: "lofu-9cefc.firebaseapp.com",
  databaseURL: "https://lofu-9cefc-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "lofu-9cefc",
  storageBucket: "lofu-9cefc.appspot.com",
  messagingSenderId: "66037454047",
  appId: "1:66037454047:web:5aaa8f18ed18222da5856a",
  measurementId: "G-PLWW8XYFDQ"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Ensure there is a signed-in user (anonymous is ok)
export async function ensureSignedIn() {
  return new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        await signInAnonymously(auth).catch(console.error);
      }
      unsub();
      resolve(auth.currentUser);
    });
  });
}
