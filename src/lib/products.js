// src/lib/products.js
import { db } from './firebase';
import {
  collection, doc, getDocs, getDoc,
  setDoc, updateDoc, deleteDoc, serverTimestamp, query, orderBy
} from 'firebase/firestore';

const colRef = collection(db, 'products');

export async function listProducts() {
  const snap = await getDocs(query(colRef, orderBy('name', 'asc')));
  return snap.docs.map(d => ({
    id: d.id,
    product_id: d.id,
    ...d.data(),
  }));
}

export async function getProduct(id) {
  const ref = doc(colRef, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, product_id: snap.id, ...snap.data() };
}

export async function createProduct(product) {
  // product.product_id is required
  const id = String(product.product_id).trim();
  if (!id) throw new Error('product_id is required');

  const payload = {
    name: product.name || '',
    brand: product.brand || '',
    url: product.url || '',
    arch_types: Array.isArray(product.arch_types) ? product.arch_types : [],
    country: Array.isArray(product.country) ? product.country : ['PH'],
    price: typeof product.price === 'number' ? product.price : null,
    currency: product.currency || 'PHP',
    materials: Array.isArray(product.materials) ? product.materials : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
    description: product.description || '',
    active: product.active !== false, // default true
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(doc(colRef, id), payload, { merge: true });
  return id;
}

export async function updateProduct(id, patch) {
  const ref = doc(colRef, id);
  const payload = {
    ...patch,
    updatedAt: serverTimestamp(),
  };
  await updateDoc(ref, payload);
}

export async function removeProduct(id) {
  await deleteDoc(doc(colRef, id));
}
