// src/components/ResultModal.jsx
import React, { useEffect, useState, useMemo } from 'react';
import '../components/ResultModal.css';

const BACKEND =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  'http://localhost:5000';
const api = (path) => `${BACKEND.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const formatArchLabel = (label) => {
  switch ((label || '').trim()) {
    case 'Flat': return 'Flat Arch';
    case 'Normal': return 'Normal Arch';
    case 'High': return 'High Arch';
    default: return 'Unknown';
  }
};

export default function ResultModal({ open, onClose, images = [], results = [], captureId = null }) {
  // rows = [{ img, res }]
  const rows = useMemo(() => {
    const n = Math.max(results?.length || 0, 1);
    const firstNonNull = images.find(Boolean) || null;
    return Array.from({ length: n }).map((_, i) => {
      const img = images[i] || firstNonNull || null;
      const res = results[i] || { prediction: 'Unknown' };
      return { img, res };
    });
  }, [images, results]);

  // Per-row report payload + state
  const [payloads, setPayloads] = useState([]);   // index -> payload from /report
  const [loading, setLoading]   = useState({});   // index -> boolean
  const [error, setError]       = useState({});   // index -> string

  // PDF download state
  const [downloading, setDownloading] = useState({}); // index -> boolean
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Reset state whenever modal re-opens with different capture/row count
  useEffect(() => {
    if (!open) return;
    setPayloads([]);
    setLoading({});
    setError({});
    setDownloading({});
    setDownloadingAll(false);
  }, [open, captureId, rows.length]);

  // Helper: fetch one row's report payload
  const fetchReport = async (index, archType) => {
    const imageName = `capture_${captureId || 'session'}_${index + 1}.png`;
    setLoading((s) => ({ ...s, [index]: true }));
    setError((s) => ({ ...s, [index]: '' }));
    try {
      const r = await fetch(api('report'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_name: imageName,
          arch_type: archType,  // 'Flat' | 'Normal' | 'High' | 'Unknown'
        }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        throw new Error(txt || `HTTP ${r.status}`);
      }
      const payload = await r.json();
      setPayloads((arr) => {
        const copy = [...arr];
        copy[index] = payload;
        return copy;
      });
    } catch (e) {
      setError((s) => ({ ...s, [index]: e?.message || String(e) }));
    } finally {
      setLoading((s) => ({ ...s, [index]: false }));
    }
  };

  // Auto-fetch reports for all rows when opened
  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    (async () => {
      for (let i = 0; i < rows.length; i++) {
        if (cancelled) break;
        const raw = rows[i]?.res?.prediction || 'Unknown';
        const archType = ['Flat', 'Normal', 'High'].includes(raw) ? raw : 'Unknown';
        if (!payloads[i] && !loading[i] && !error[i]) {
          await fetchReport(i, archType);
        }
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rows, captureId]);

  // Build a single item for /report/pdf/batch from a row + payload
  const buildItem = (index) => {
    const p = payloads[index];
    const row = rows[index];
    if (!p) return null;

    return {
      image_name: p?.original_image_name || `capture_${captureId || 'session'}_${index + 1}.png`,
      arch_type: p?.arch_type || 'Unknown',
      foot_side: null,
      csi: p?.csi,
      overlay: p?.overlay,
      insoles: p?.insoles,     // optional; server falls back to defaults if omitted
      image: row?.img || null, // data URL (will be embedded by backend)
    };
  };

  // Build all items (skips rows without payload yet)
  const buildAllItems = () => {
    const items = [];
    for (let i = 0; i < rows.length; i++) {
      const it = buildItem(i);
      if (it) items.push(it);
    }
    return items;
  };

  // Download helper
  const triggerDownload = async (res, filenameFallback = 'foot_arch_report.pdf') => {
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameFallback;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // Download a single-row PDF (one-item batch)
  const downloadOne = async (index) => {
    const item = buildItem(index);
    if (!item) {
      alert('Report not ready yet. Please wait a moment.');
      return;
    }

    setDownloading((s) => ({ ...s, [index]: true }));
    try {
      const res = await fetch(api('report/pdf/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [item] }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      // filename guess from image_name
      const base = (item.image_name || 'report').replace(/\.[a-z]+$/i, '');
      await triggerDownload(res, `${base}_report.pdf`);
    } catch (e) {
      alert(`Download failed: ${e?.message || e}`);
    } finally {
      setDownloading((s) => ({ ...s, [index]: false }));
    }
  };

  // Download a combined multi-page PDF (cover + one page per row)
  const downloadAll = async () => {
    const items = buildAllItems();
    if (!items.length) {
      alert('Reports are not ready yet. Please wait a moment.');
      return;
    }

    setDownloadingAll(true);
    try {
      const res = await fetch(api('report/pdf/batch'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || `HTTP ${res.status}`);
      }
      await triggerDownload(res, `foot_arch_report.pdf`);
    } catch (e) {
      alert(`Download failed: ${e?.message || e}`);
    } finally {
      setDownloadingAll(false);
    }
  };

  if (!open) return null;

  return (
    <div className="rm-overlay" onClick={onClose}>
      <div className="rm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rm-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="rm-title">Classification Details</h3>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="custom-btn"
              onClick={downloadAll}
              disabled={downloadingAll}
              title="Download PDF"
            >
              {downloadingAll ? 'Preparing…' : 'Download PDF'}
            </button>
            <button className="rm-close" onClick={onClose} aria-label="Close">×</button>
          </div>
        </div>

        <div className="rm-body">
          {rows.map((row, idx) => {
            const archTypeRaw = row?.res?.prediction || 'Unknown';
            const archLabel = formatArchLabel(archTypeRaw);
            const payload = payloads[idx];

            const care = payload?.care_tips || [];
            const shoes = payload?.shoe_tips || [];
            const insoles = payload?.insoles || [];
            const explanation = payload?.explanation;

            return (
              <div className="rm-row" key={idx}>
                {/* LEFT: Preview + chip */}
                <div className="rm-card">
                  {row.img ? (
                    <img className="rm-image" src={row.img} alt={`Result ${idx}`} />
                  ) : (
                    <div className="rm-placeholder">No image available.</div>
                  )}
                  <div className="rm-chip">
                    <span className="rm-chip-label">Classification:</span>
                    <strong>{archLabel}</strong>
                  </div>
                </div>

                {/* RIGHT: Report */}
                <div className="rm-card">
                  <h4 className="rm-subtitle">Report</h4>

                  {loading[idx] && <div className="rm-placeholder">Generating report…</div>}
                  {error[idx] && <div className="rm-error">Failed: {error[idx]}</div>}

                  {!!payload && !loading[idx] && !error[idx] && (
                    <>
                      <div className="rm-kv">
                        <div className="k">Generated on:</div>
                        <div className="v">{payload.generated_on}</div>
                      </div>
                      <div className="rm-kv">
                        <div className="k">Image Name:</div>
                        <div className="v">{payload.image_name}</div>
                      </div>
                      <div className="rm-kv">
                        <div className="k">Arch Type:</div>
                        <div className="v">{payload.arch_label || archLabel}</div>
                      </div>

                      {explanation && (
                        <div className="rm-section">
                          <div className="rm-section-title">What this means</div>
                          <div className="rm-paragraph">{explanation}</div>
                        </div>
                      )}

                      {Array.isArray(care) && care.length > 0 && (
                        <div className="rm-section">
                          <div className="rm-section-title">Care tips</div>
                          <ul className="rm-list">
                            {care.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </div>
                      )}

                      {Array.isArray(shoes) && shoes.length > 0 && (
                        <div className="rm-section">
                          <div className="rm-section-title">Shoe guidance</div>
                          <ul className="rm-list">
                            {shoes.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="rm-section">
                        <div className="rm-section-title">
                          Insole Recommendations for: <strong>{payload.arch_label || archLabel}</strong>
                        </div>

                        {Array.isArray(insoles) && insoles.length > 0 ? (
                          <ul className="rm-list">
                            {insoles.map((ins, i) => {
                              const name = ins?.name || 'Insole';
                              const url = ins?.url || '';
                              const price = ins?.price;
                              const currency = ins?.currency;
                              const note = ins?.note;
                              const materials = ins?.materials;

                              return (
                                <li key={i}>
                                  {url ? (
                                    <a className="link-button" href={url} target="_blank" rel="noreferrer">
                                      {name}
                                    </a>
                                  ) : (
                                    <strong>{name}</strong>
                                  )}
                                  {price != null && currency ? (
                                    <span> — {price} {currency}</span>
                                  ) : null}

                                  {note && (
                                    <div className="rm-paragraph" style={{ marginTop: 4 }}>{note}</div>
                                  )}

                                  {materials && (
                                    <div className="rm-paragraph" style={{ marginTop: 4 }}>
                                      <em>Materials:</em>{' '}
                                      {Array.isArray(materials) ? materials.join(', ') : String(materials)}
                                    </div>
                                  )}

                                  {Array.isArray(ins?.reasons) && ins.reasons.length > 0 && (
                                    <ul className="rm-list" style={{ marginTop: 4 }}>
                                      {ins.reasons.map((r, ri) => <li key={ri}>{r}</li>)}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <div className="rm-paragraph">No insole recommendations yet.</div>
                        )}
                      </div>

                      {payload.disclaimer && (
                        <div className="rm-section">
                          <div className="rm-paragraph" style={{ opacity: 0.8 }}>
                            {payload.disclaimer}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rm-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="custom-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
