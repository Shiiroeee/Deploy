// src/utils/resolveImageForPdf.js
export async function resolveImageForPdf(src) {
  if (!src) return { image_url: null, image_data_url: null };
  if (typeof src !== 'string') return { image_url: null, image_data_url: null };

  // Already embeddable
  if (src.startsWith('data:image/')) return { image_url: null, image_data_url: src };
  if (/^https?:\/\//i.test(src))     return { image_url: src, image_data_url: null };

  // blob: or other -> convert to data URL
  try {
    const res = await fetch(src);
    const blob = await res.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    return { image_url: null, image_data_url: dataUrl };
  } catch {
    return { image_url: null, image_data_url: null };
  }
}
