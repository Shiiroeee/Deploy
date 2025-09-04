// src/pages/history.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lofuImage from '../assets/3.png';
import '../components/history.css';
import '../App.css';
import '../components/Screen.css';
import MainButton from '../components/MainButton';
import ThemeToggle from '../components/darkmode';

import { ensureSignedIn, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { listCaptures, deleteCapture } from '../lib/uploads';

function fmtDate(ts) {
  try {
    let d;
    if (!ts) return '—';
    if (typeof ts.toDate === 'function') d = ts.toDate();
    else d = new Date(ts);
    return d.toLocaleString();
  } catch {
    return '—';
  }
}
function predSummary(classification) {
  if (!Array.isArray(classification) || classification.length === 0) return '—';
  const first = classification[0];
  if (!first?.prediction) return '—';
  const label = first.prediction;
  const conf = typeof first.confidence === 'number' ? ` ${(first.confidence * 100).toFixed(0)}%` : '';
  return `${label}${conf}`;
}

export default function HistoryPage() {
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

  const navigate = useNavigate();

  const [uid, setUid] = useState(null);
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [moreLoading, setMoreLoading] = useState(false);
  const [error, setError] = useState('');

  const pageSize = 12;
  const fetchedOnce = useRef(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const user = await ensureSignedIn();
      if (mounted) setUid(user?.uid || null);
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid || null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!uid || fetchedOnce.current) { setLoading(false); return; }
      setLoading(true); setError('');
      try {
        const { items: first, nextCursor } = await listCaptures({ uid, pageSize });
        setItems(first);
        setCursor(nextCursor);
      } catch (e) {
        console.error(e);
        setError('Failed to load history.');
      } finally {
        setLoading(false);
        fetchedOnce.current = true;
      }
    };
    run();
  }, [uid]);

  const loadMore = async () => {
    if (!uid || !cursor) return;
    setMoreLoading(true); setError('');
    try {
      const { items: next, nextCursor } = await listCaptures({ uid, pageSize, cursor });
      setItems((prev) => [...prev, ...next]);
      setCursor(nextCursor);
    } catch (e) {
      console.error(e);
      setError('Failed to load more.');
    } finally {
      setMoreLoading(false);
    }
  };

  const openCapture = (cap) => {
    const imgs = [cap?.urls?.left, cap?.urls?.right].filter(Boolean);
    if (imgs.length === 0 && cap?.urls?.capture) imgs.push(cap.urls.capture);

    navigate('/result', {
      state: {
        images: imgs,
        results: cap.classification ?? [],
        captureId: cap.id
      }
    });
  };

  const handleDelete = async (cap) => {
    if (!uid) return;
    const ok = window.confirm('Delete this capture and its files?');
    if (!ok) return;
    try {
      await deleteCapture({
        uid,
        captureId: cap.id,
        files: {
          capture: cap?.files?.capture,
          left: cap?.files?.left,
          right: cap?.files?.right,
        }
      });
      setItems((prev) => prev.filter((x) => x.id !== cap.id));
    } catch (e) {
      console.error(e);
      alert('Failed to delete.');
    }
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
        </div>
        <div className="navbar-right">
          <ul className="navbar-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/result">Result</Link></li>
            <li><Link to="/information">Information</Link></li>
            <li><Link to="/history" className="active">History</Link></li>
            <li><Link to="/admin">Admin</Link></li>
          </ul>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </nav>

      <div className="history-body">
        {error && <div className="history-error">{error}</div>}

        {loading ? (
          <div className="history-empty">Loading history…</div>
        ) : items.length === 0 ? (
          <div className="history-empty">No captures yet.</div>
        ) : (
          <>
            <div className="history-grid">
              {items.map((cap) => {
                const thumb = cap?.urls?.left || cap?.urls?.capture || '';
                return (
                  <div className="history-card" key={cap.id}>
                    <div className="history-thumb-wrap">
                      {thumb ? (
                        <img src={thumb} alt="thumb" className="history-thumb" />
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
                        <span className="history-label">Prediction:</span>
                        <span className="history-value">{predSummary(cap.classification)}</span>
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
                <div className="history-end">No more items.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
