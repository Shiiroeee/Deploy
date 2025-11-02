// src/pages/HistoryPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import '../components/history.css';
import '../App.css';
import '../components/Screen.css';
import MainButton from '../components/MainButton';
import NavBar from '../components/NavBar';

import { ensureSignedIn, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listCaptures, deleteCapture } from '../lib/uploads';
import ResultModal from '../components/ResultModal';

function fmtDate(ts) {
  try {
    if (!ts) return '—';
    const d = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
    return d.toLocaleString();
  } catch {
    return '—';
  }
}

function joinPredictions(classification) {
  if (!Array.isArray(classification) || classification.length === 0) return '—';
  const labels = classification.map((c) =>
    String(c?.prediction || c?.label || c?.class || c?.name || 'Unknown').trim() || 'Unknown'
  );
  return labels.join(' / ');
}

export default function HistoryPage() {
  // THEME (so NavBar can control it)
  const systemPrefersDark = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches,
    []
  );
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ?? (systemPrefersDark ? 'dark' : 'light');
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // AUTH
  const [uid, setUid] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const user = await ensureSignedIn(); // hard auth; make soft by removing this call
        if (mounted) setUid(user?.uid || null);
      } catch (e) {
        console.warn('[History] ensureSignedIn failed (maybe not logged in):', e);
      } finally {
        if (mounted) setAuthReady(true);
      }
    })();

    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  // DATA
  const pageSize = 12;
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');

  const log = (...args) => console.debug('[History]', ...args);

  // INITIAL FETCH when auth ready & uid present
  useEffect(() => {
    const run = async () => {
      if (!authReady) return;
      if (!uid) {
        setItems([]);
        setCursor(null);
        setLoading(false);
        setError('');
        return;
      }
      setLoading(true);
      setError('');
      try {
        const resp = (await listCaptures({ uid, pageSize })) || {};
        const first = Array.isArray(resp.items) ? resp.items : [];
        const nextCursor = resp.nextCursor ?? null;

        // de-dupe by id
        const seen = new Set();
        const unique = [];
        for (const it of first) {
          if (it?.id && !seen.has(it.id)) {
            seen.add(it.id);
            unique.push(it);
          }
        }

        setItems(unique);
        setCursor(nextCursor);
        log('loaded', unique.length, 'items, nextCursor:', !!nextCursor);
      } catch (e) {
        console.error(e);
        setError('Failed to load history.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [authReady, uid, pageSize]);

  const loadMore = async () => {
    if (!uid || !cursor || moreLoading) return;
    setMoreLoading(true);
    setError('');
    try {
      const resp = (await listCaptures({ uid, pageSize, cursor })) || {};
      const next = Array.isArray(resp.items) ? resp.items : [];
      const nextCursor = resp.nextCursor ?? null;

      setItems((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        const merged = [...prev];
        for (const it of next) {
          if (it?.id && !seen.has(it.id)) {
            seen.add(it.id);
            merged.push(it);
          }
        }
        return merged;
      });
      setCursor(nextCursor);
      log('loadMore added', next.length, 'nextCursor:', !!nextCursor);
    } catch (e) {
      console.error(e);
      setError('Failed to load more.');
    } finally {
      setMoreLoading(false);
    }
  };

  // MODAL
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ images: [], results: [], captureId: null });

  const openCapture = (cap) => {
    const results = Array.isArray(cap?.classification) ? cap.classification : [];
    const urls = cap?.urls || {};
    const fallback = urls.left || urls.right || urls.capture || urls.original || null;

    const imgs = [];
    if (urls.left) imgs[0] = urls.left;
    if (urls.right) imgs[1] = urls.right;
    for (let i = 0; i < results.length; i++) {
      if (!imgs[i]) imgs[i] = fallback;
    }
    if (imgs.length === 0 && fallback) imgs.push(fallback);

    setModalData({ images: imgs, results, captureId: cap.id });
    setShowModal(true);
  };

  const handleDelete = async (cap) => {
    if (!uid) return;
    const ok = window.confirm('Delete this capture and its files?');
    if (!ok) return;
    try {
      await deleteCapture({ uid, captureId: cap.id, files: cap?.files || null });
      setItems((prev) => prev.filter((x) => x.id !== cap.id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete.');
    }
  };

  // RENDER
  return (
    <div className="App history-page">
      <NavBar theme={theme} setTheme={setTheme} />

      <div className="history-scroll">
        <div className="history-body">
          {!authReady ? (
            <div className="history-empty">Checking your account…</div>
          ) : !uid ? (
            <div className="history-empty">Please sign in to view your history.</div>
          ) : (
            <>
              {error && <div className="history-error">{error}</div>}

              {loading ? (
                <div className="history-empty">Loading history…</div>
              ) : items.length === 0 ? (
                <div className="history-empty">No captures yet.</div>
              ) : (
                <>
                  <div className="history-grid">
                    {items.map((cap) => {
                      const thumb =
                        cap?.urls?.left ||
                        cap?.urls?.capture ||
                        cap?.urls?.original ||
                        cap?.urls?.right ||
                        '';
                      return (
                        <div className="history-card" key={cap.id}>
                          <div className="history-thumb-wrap">
                            {thumb ? (
                              <img
                                src={thumb}
                                alt="thumb"
                                className="history-thumb"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '';
                                  e.currentTarget.replaceWith(
                                    Object.assign(document.createElement('div'), {
                                      className: 'history-thumb placeholder',
                                      textContent: 'No image',
                                    })
                                  );
                                }}
                              />
                            ) : (
                              <div className="history-thumb placeholder">No image</div>
                            )}
                          </div>

                          <div className="history-meta">
                            <div className="history-row">
                              <span className="history-label">Captured:</span>
                              <span className="history-value">{fmtDate(cap.createdAt)}</span>
                            </div>
                            <div className="history-row">
                              <span className="history-label">Predictions:</span>
                              <span className="history-value">{joinPredictions(cap.classification)}</span>
                            </div>
                          </div>

                          <div className="history-actions">
                            <MainButton className="btn-lively" onClick={() => openCapture(cap)}>
                              Open
                            </MainButton>
                            <button className="custom-btn btn-sm" onClick={() => handleDelete(cap)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="history-loadmore">
                    {cursor ? (
                      <MainButton className="btn-lively" onClick={loadMore} disabled={moreLoading}>
                        {moreLoading ? 'Loading…' : 'Load More'}
                      </MainButton>
                    ) : (
                      <div className="history-end" />
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <ResultModal
        open={showModal}
        onClose={() => setShowModal(false)}
        images={modalData.images}
        results={modalData.results}
        captureId={modalData.captureId}
      />
    </div>
  );
}
