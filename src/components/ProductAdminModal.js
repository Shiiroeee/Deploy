// src/components/ProductAdminModal.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../lib/firebase';
import {
  doc, getDoc, setDoc, serverTimestamp,
  collection, getDocs, query, limit, deleteDoc
} from 'firebase/firestore';
import './ProductAdminModal.css';

export default function ProductAdminModal({ open, onClose }) {
  const [productId, setProductId] = useState('');
  const [form, setForm] = useState({
    name: '', brand: '', url: '', price: '',
    currency: 'PHP', arch_claims: '', materials: '', tags: '',
    country: 'PH', note: '',
  });
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // table data
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  // inline edit state
  const [editRowId, setEditRowId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  useEffect(() => {
    if (!open) return;
    setStatus('');
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'products'), limit(200)));
        const list = snap.docs.map(d => d.data());
        setRows(list);
      } catch (e) {
        console.warn('Load products failed:', e);
      }
    })();
  }, [open]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => {
      const hay = [
        r.name, r.brand, r.product_id,
        ...(Array.isArray(r.tags) ? r.tags : []),
      ].join(' ').toLowerCase();
      return hay.includes(s);
    });
  }, [rows, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const splitList = (val) =>
    String(val || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

  const loadProduct = async () => {
    if (!productId.trim()) return setStatus('Enter a product_id to load.');
    setLoading(true); setStatus('');
    try {
      const ref = doc(db, 'products', productId.trim());
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setStatus('No document found. You can create it by saving.');
      } else {
        const d = snap.data() || {};
        setForm({
          name: d.name || '',
          brand: d.brand || '',
          url: d.url || '',
          price: d.price ?? '',
          currency: d.currency || 'PHP',
          arch_claims: Array.isArray(d.arch_claims) ? d.arch_claims.join(', ') : (d.arch_claims || ''),
          materials: Array.isArray(d.materials) ? d.materials.join(', ') : (d.materials || ''),
          tags: Array.isArray(d.tags) ? d.tags.join(', ') : (d.tags || ''),
          country: Array.isArray(d.country) ? (d.country[0] || 'PH') : (d.country || 'PH'),
          note: d.note || '',
        });
        setStatus('Loaded.');
      }
    } catch (e) {
      setStatus(`Failed to load: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  const saveProduct = async () => {
    if (!productId.trim()) return setStatus('product_id is required.');
    setLoading(true); setStatus('');
    try {
      const payload = {
        product_id: productId.trim(),
        name: form.name.trim(),
        brand: form.brand.trim(),
        url: form.url.trim(),
        price: form.price === '' ? null : Number(form.price),
        currency: (form.currency || 'PHP').trim(),
        arch_claims: splitList(form.arch_claims),
        materials: splitList(form.materials),
        tags: splitList(form.tags),
        country: splitList(form.country || 'PH'),
        note: form.note.trim(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'products', payload.product_id), payload, { merge: true });
      setStatus('Saved.');

      // reflect in table
      setRows(prev => {
        const i = prev.findIndex(p => p.product_id === payload.product_id);
        if (i >= 0) {
          const copy = prev.slice();
          copy[i] = { ...copy[i], ...payload };
          return copy;
        }
        return [{ ...payload }, ...prev];
      });
    } catch (e) {
      setStatus(`Failed to save: ${e.message || e}`);
    } finally {
      setLoading(false);
    }
  };

  // ===== inline edit helpers =====
  const startEdit = (p) => {
    setEditRowId(p.product_id);
    setEditDraft({
      name: p.name || '',
      brand: p.brand || '',
      price: p.price ?? '',
      tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
    });
  };
  const changeDraft = (k, v) => setEditDraft(d => ({ ...d, [k]: v }));
  const cancelEdit = () => { setEditRowId(null); setEditDraft({}); };

  const saveEdit = async (p) => {
    const id = p.product_id;
    if (!id) return;
    try {
      const patch = {
        name: (editDraft.name || '').trim(),
        brand: (editDraft.brand || '').trim(),
        price: editDraft.price === '' ? null : Number(editDraft.price),
        tags: splitList(editDraft.tags),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'products', id), patch, { merge: true });

      setRows(prev => prev.map(x => x.product_id === id ? { ...x, ...patch } : x));
      // also reflect to the left form if this is the currently selected product
      if (productId === id) {
        setForm(f => ({
          ...f,
          name: patch.name,
          brand: patch.brand,
          price: patch.price ?? '',
          tags: Array.isArray(patch.tags) ? patch.tags.join(', ') : '',
        }));
      }
      cancelEdit();
    } catch (e) {
      alert(`Edit failed: ${e.message || e}`);
    }
  };

  const deleteRow = async (p) => {
    const id = p.product_id;
    if (!id) return;
    if (!window.confirm(`Delete "${p.name || id}"?`)) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      setRows(prev => prev.filter(x => x.product_id !== id));
      if (productId === id) {
        setProductId('');
        setForm({
          name: '', brand: '', url: '', price: '',
          currency: 'PHP', arch_claims: '', materials: '', tags: '',
          country: 'PH', note: '',
        });
      }
    } catch (e) {
      alert(`Delete failed: ${e.message || e}`);
    }
  };

  const stop = (e) => e.stopPropagation();
  if (!open) return null;

  return (
    <div className="pa-modal__overlay" onClick={onClose}>
      <div className="pa-modal" onClick={stop} role="dialog" aria-modal="true" aria-label="Update Product">
        <div className="pa-modal__header">
          <h3 className="pa-title">Insole Product</h3>
          <button className="pa-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="pa-content">
          {/* LEFT: form */}
          <section className="pa-form">
            <div className="pa-row">
              <label>product_id</label>
              <div className="pa-inline">
                <input
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  placeholder="e.g., dr_kong_universal_flatfoot_insole"
                />
                <button disabled={loading} onClick={loadProduct}>Load</button>
              </div>
            </div>

            <div className="pa-grid">
              <div className="pa-row">
                <label>Name</label>
                <input name="name" value={form.name} onChange={handleChange} />
              </div>
              <div className="pa-row">
                <label>Brand</label>
                <input name="brand" value={form.brand} onChange={handleChange} />
              </div>
              <div className="pa-row">
                <label>URL</label>
                <input name="url" value={form.url} onChange={handleChange} />
              </div>
              <div className="pa-row">
                <label>Price (number)</label>
                <input name="price" value={form.price} onChange={handleChange} inputMode="decimal" />
              </div>
              <div className="pa-row">
                <label>Currency</label>
                <input name="currency" value={form.currency} onChange={handleChange} placeholder="PHP" />
              </div>
              <div className="pa-row">
                <label>Arch claims (comma)</label>
                <input name="arch_claims" value={form.arch_claims} onChange={handleChange} placeholder="Flat, High" />
              </div>
              <div className="pa-row">
                <label>Materials (comma)</label>
                <input name="materials" value={form.materials} onChange={handleChange} />
              </div>
              <div className="pa-row">
                <label>Tags (comma)</label>
                <input name="tags" value={form.tags} onChange={handleChange} />
              </div>
              <div className="pa-row">
                <label>Country (comma)</label>
                <input name="country" value={form.country} onChange={handleChange} placeholder="PH" />
              </div>
              <div className="pa-row" style={{ gridColumn: '1 / -1' }}>
                <label>Note</label>
                <textarea name="note" value={form.note} onChange={handleChange} rows={3} />
              </div>
            </div>

            {status && <div className="pa-status">{status}</div>}

            <div className="pa-actions">
              <button className="pa-btn" onClick={saveProduct} disabled={loading}>
                {loading ? 'Saving…' : 'Save'}
              </button>
              <button className="pa-btn ghost" onClick={onClose}>Close</button>
            </div>
          </section>

          {/* RIGHT: table */}
          <aside className="pa-side">
            <div className="pa-table-wrap">
              <div className="pa-table-head">
                <h4 className="pa-table-title">Products</h4>
                <input
                  className="pa-search"
                  placeholder="Search name, brand, tags…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="pa-table-scroll">
                <table className="pa-table">
                  <colgroup>
                    <col style={{ width: '34%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '12%' }} />
                    <col />
                  </colgroup>

                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Brand</th>
                      <th>Price</th>
                      <th>product_id</th>
                      <th>Tags</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filtered.length === 0 ? (
                      <tr><td className="pa-empty" colSpan={6}>No products found.</td></tr>
                    ) : filtered.map(p => {
                      const isEditing = editRowId === p.product_id;
                      const priceCell = (
                        p.price != null ? (
                          <div className="pa-price">
                            <strong>{p.price}</strong>
                            <small>{p.currency || ''}</small>
                          </div>
                        ) : <span className="pa-muted">—</span>
                      );

                      return (
                        <tr
                          key={p.product_id}
                          onDoubleClick={() => startEdit(p)}
                          onClick={() => {
                            setProductId(p.product_id);
                            setForm({
                              name: p.name || '',
                              brand: p.brand || '',
                              url: p.url || '',
                              price: p.price ?? '',
                              currency: p.currency || 'PHP',
                              arch_claims: Array.isArray(p.arch_claims) ? p.arch_claims.join(', ') : (p.arch_claims || ''),
                              materials: Array.isArray(p.materials) ? p.materials.join(', ') : (p.materials || ''),
                              tags: Array.isArray(p.tags) ? p.tags.join(', ') : (p.tags || ''),
                              country: Array.isArray(p.country) ? (p.country[0] || 'PH') : (p.country || 'PH'),
                              note: p.note || '',
                            });
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <td className="pa-clip">
                            {isEditing ? (
                              <input
                                value={editDraft.name}
                                onChange={e => changeDraft('name', e.target.value)}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : p.name}
                          </td>

                          <td className="pa-clip">
                            {isEditing ? (
                              <input
                                value={editDraft.brand}
                                onChange={e => changeDraft('brand', e.target.value)}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : p.brand}
                          </td>

                          <td>
                            {isEditing ? (
                              <input
                                value={editDraft.price}
                                inputMode="decimal"
                                onChange={e => changeDraft('price', e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: 100 }}
                              />
                            ) : priceCell}
                          </td>

                          <td className="pa-clip">{p.product_id}</td>

                          <td className="pa-tags">
                            {isEditing ? (
                              <input
                                value={editDraft.tags}
                                onChange={e => changeDraft('tags', e.target.value)}
                                onClick={e => e.stopPropagation()}
                              />
                            ) : Array.isArray(p.tags) ? (
                              p.tags.slice(0, 3).map(t => (
                                <span className="pa-pill" key={t}>{t}</span>
                              ))
                            ) : null}
                          </td>

                          <td>
                            {isEditing ? (
                              <div className="pa-actions-inline">
                                <button
                                  className="pa-mini-btn"
                                  onClick={(e) => { e.stopPropagation(); saveEdit(p); }}
                                >Save</button>
                                <button
                                  className="pa-mini-btn ghost"
                                  onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                                >Cancel</button>
                              </div>
                            ) : (
                              <div className="pa-actions-inline">
                                <button
                                  className="pa-mini-btn"
                                  onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                                >Edit</button>
                                <button
                                  className="pa-mini-btn danger"
                                  onClick={(e) => { e.stopPropagation(); deleteRow(p); }}
                                >Delete</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
