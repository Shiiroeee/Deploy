// src/lib/uploads.js
import { db } from './firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  query, orderBy, limit, startAfter, getDocs, serverTimestamp,
} from 'firebase/firestore';

const capturesCol = (uid) => collection(db, 'users', uid, 'captures');

/**
 * Save ONLY classification results, but also persist Storage URLs.
 * storage = { folder, original:{path,url}|null, crops:[{side,path,url}, ...] }
 */
export async function saveClassification({ uid, classification, storage }) {
  if (!uid) throw new Error('uid required');
  const col = capturesCol(uid);
  const docRef = doc(col);

  const urls = {};
  if (storage?.original?.url) urls.capture = storage.original.url;
  const left  = storage?.crops?.find(c => (c.side || '').toLowerCase() === 'left');
  const right = storage?.crops?.find(c => (c.side || '').toLowerCase() === 'right');
  if (left?.url)  urls.left  = left.url;
  if (right?.url) urls.right = right.url;

  const payload = {
    uid,
    createdAt: serverTimestamp(),
    classification: Array.isArray(classification) ? classification : [],
    urls,
    storage: storage || null,
  };

  await setDoc(docRef, payload);
  return { id: docRef.id };
}

export async function updateClassification({ uid, captureId, classification }) {
  if (!uid || !captureId) throw new Error('uid and captureId required');
  await updateDoc(doc(db, 'users', uid, 'captures', captureId), {
    classification: Array.isArray(classification) ? classification : [],
    updatedAt: serverTimestamp(),
  });
}

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

export async function deleteCapture({ uid, captureId }) {
  if (!uid || !captureId) throw new Error('uid and captureId required');
  await deleteDoc(doc(db, 'users', uid, 'captures', captureId));
}
