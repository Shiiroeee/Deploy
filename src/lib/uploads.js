// src/lib/uploads.js
import { storage, db } from './firebase';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

/** Convert dataURL -> Blob for upload */
export function dataUrlToBlob(dataUrl) {
  const [header, base64str] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*);base64/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const binary = atob(base64str);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

/** Storage path helpers
 * IMPORTANT: These match your Storage rules:
 * match /users/{uid}/captures/{allPaths=**}
 */
function captureBasePath(uid, captureId) {
  return `users/${uid}/captures/${captureId}`;
}
function pathCapture(uid, captureId) {
  return `${captureBasePath(uid, captureId)}/capture.png`;
}
function pathLeft(uid, captureId) {
  return `${captureBasePath(uid, captureId)}/left.png`;
}
function pathRight(uid, captureId) {
  return `${captureBasePath(uid, captureId)}/right.png`;
}

/** Firestore collection path: users/{uid}/captures */
function capturesCol(uid) {
  return collection(db, 'users', uid, 'captures');
}

/** Create new capture doc + upload the raw capture image */
export async function createCapture({ uid, captureDataUrl }) {
  if (!uid || !captureDataUrl) throw new Error('uid and captureDataUrl required');

  const col = capturesCol(uid);
  const docRef = doc(col); // auto ID from Firestore
  const captureId = docRef.id;

  // Upload capture image to Storage
  const capPath = pathCapture(uid, captureId);
  const capRef = ref(storage, capPath);
  await uploadBytes(capRef, dataUrlToBlob(captureDataUrl));
  const capURL = await getDownloadURL(capRef);

  // Create Firestore doc
  const payload = {
    createdAt: serverTimestamp(),
    files: { capture: capPath },
    urls: { capture: capURL },
    classification: null,
  };
  await setDoc(docRef, payload);

  return {
    id: captureId,
    files: payload.files,
    urls: payload.urls,
  };
}

/** Attach left/right crops and update doc */
export async function attachCrops({ uid, captureId, leftDataUrl, rightDataUrl }) {
  if (!uid || !captureId) throw new Error('uid and captureId required');
  const updates = { files: {}, urls: {} };

  if (leftDataUrl) {
    const leftRef = ref(storage, pathLeft(uid, captureId));
    await uploadBytes(leftRef, dataUrlToBlob(leftDataUrl));
    updates.files.left = leftRef.fullPath;
    updates.urls.left = await getDownloadURL(leftRef);
  }
  if (rightDataUrl) {
    const rightRef = ref(storage, pathRight(uid, captureId));
    await uploadBytes(rightRef, dataUrlToBlob(rightDataUrl));
    updates.files.right = rightRef.fullPath;
    updates.urls.right = await getDownloadURL(rightRef);
  }

  const dref = doc(db, 'users', uid, 'captures', captureId);
  await updateDoc(dref, updates);
  return updates;
}

/** Attach classification array to doc */
export async function attachClassification({ uid, captureId, classification }) {
  if (!uid || !captureId) throw new Error('uid and captureId required');
  const dref = doc(db, 'users', uid, 'captures', captureId);
  await updateDoc(dref, { classification });
}

/** List captures with pagination */
export async function listCaptures({ uid, pageSize = 12, cursor = null }) {
  if (!uid) return { items: [], nextCursor: null };
  const col = capturesCol(uid);
  const q = cursor
    ? query(col, orderBy('createdAt', 'desc'), startAfter(cursor), limit(pageSize))
    : query(col, orderBy('createdAt', 'desc'), limit(pageSize));

  const snap = await getDocs(q);
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  return { items: docs, nextCursor };
}

/** Delete a capture (doc + storage files) */
export async function deleteCapture({ uid, captureId, files = {} }) {
  if (!uid || !captureId) throw new Error('uid and captureId required');

  // Best effort: delete files if present
  const paths = [files.capture, files.left, files.right].filter(Boolean);
  await Promise.all(
    paths.map(async (p) => {
      try {
        await deleteObject(ref(storage, p));
      } catch (e) {
        console.warn('deleteObject error for', p, e?.message || e);
      }
    })
  );

  // Delete Firestore doc
  await deleteDoc(doc(db, 'users', uid, 'captures', captureId));
}
