// src/lib/storage.js
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function dataURLtoBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const contentType = (head.match(/data:(.*?);base64/) || [])[1] || 'image/png';
  const byteChars = atob(b64);
  const bytes = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

/**
 * Upload a single base64 dataURL to: users/{uid}/captures/{captureId}/{name}
 * @returns {Promise<{path:string, url:string}>}
 */
export async function uploadDataURLForCapture({ uid, captureId, name, dataUrl }) {
  const blob = dataURLtoBlob(dataUrl);
  const path = `users/${uid}/captures/${captureId}/${name}`;
  const sref = ref(storage, path);
  const snap = await uploadBytes(sref, blob, { contentType: blob.type || 'image/png' });
  const url  = await getDownloadURL(snap.ref);
  return { path, url };
}

/**
 * Upload multiple cropped images. Accepts optional sides[] to label files "Left/Right".
 * @returns {Promise<Array<{index:number, side:string|null, path:string, url:string}>>}
 */
export async function uploadCroppedImages({ uid, captureId, crops, sides }) {
  const out = [];
  for (let i = 0; i < crops.length; i++) {
    const side = (sides && sides[i]) ? sides[i] : null;
    const fname = side ? `${i + 1}_${side}.png` : `image_${i + 1}.png`;
    const { path, url } = await uploadDataURLForCapture({
      uid, captureId, name: fname, dataUrl: crops[i]
    });
    out.push({ index: i, side, path, url });
  }
  return out;
}
