// src/tabs/Result.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../App.css';
import NavBar from '../components/NavBar';
import '../components/ResultPage.css';

// ---------------- CONFIG ----------------
const BACKEND =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  'http://localhost:5000';
const REPORT_ENDPOINT = 'report';
const api = (path) => `${BACKEND.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

// Helper: display arch nicely
const displayArch = (s) => {
  if (s === 'Flat') return 'Flat Arch';
  if (s === 'Normal') return 'Normal Arch';
  if (s === 'High') return 'High Arch';
  return 'Unknown';
};

// ---------- Overlay component ----------
function ImageWithOverlay({
  src,
  maskSrc,          // optional data URL (PNG) for mask overlay
  foreY = 0.25,     // normalized 0..1
  archY1 = 0.30,    // normalized 0..1
  archY2 = 0.70,    // normalized 0..1
  csi,              // optional number
  cls,              // optional string
  alt = 'Result Image',
}) {
  const imgRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const measure = React.useCallback(() => {
    const el = imgRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width || el.clientWidth || el.naturalWidth || 0);
    const h = Math.round(r.height || el.clientHeight || el.naturalHeight || 0);
    if (w && h) setBox({ w, h });
  }, []);

  const onImgLoad = () => measure();

  useEffect(() => {
    const el = imgRef.current;
    if (!el) return;
    measure();
    let ro;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener('resize', measure);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', measure);
    };
  }, [measure]);

  const yFore  = Math.round(foreY  * box.h);
  const yArch1 = Math.round(archY1 * box.h);
  const yArch2 = Math.round(archY2 * box.h);

  return (
    <div className="overlay-wrap" style={{ position: 'relative', width: '100%', display: 'inline-block' }}>
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="result-image"
        onLoad={onImgLoad}
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />

      {maskSrc && box.w > 0 && box.h > 0 && (
        <img
          src={maskSrc}
          alt="Mask overlay"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            mixBlendMode: 'multiply',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        />
      )}

      {box.w > 0 && box.h > 0 && (
        <svg
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none', zIndex: 2 }}
        >
          <line x1="0" y1={yFore} x2={box.w} y2={yFore} stroke="red" strokeWidth="4" />
          <line x1="0" y1={yArch1} x2={box.w} y2={yArch1} stroke="blue" strokeWidth="4" />
          <line x1="0" y1={yArch2} x2={box.w} y2={yArch2} stroke="blue" strokeWidth="4" />
        </svg>
      )}
    </div>
  );
}

export default function Result() {
  // ---- theme ----
  const systemPrefersDark = useMemo(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-color-scheme: dark)').matches,
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

  // ---- routing/state ----
  const location = useLocation();
  const navigate = useNavigate();
  const { images = [], results = [], captureId = null } = location.state || {};

  // Build rows
  const rows = useMemo(() => {
    const n = Math.max(results.length, images.length, 1);
    return Array.from({ length: n }).map((_, i) => {
      const res = results[i];
      const prediction = (typeof res === 'string' ? res : res?.prediction) || 'Unknown';
      const imgName =
        (res && res.image_name) || `capture_${captureId || 'session'}_${i + 1}.png`;
      return { img: images[i] || null, prediction, imgName, res };
    });
  }, [images, results, captureId]);

  const rowsCount = rows.length;

  // ---- report state ----
  const [payloads, setPayloads] = useState([]);
  const [loading, setLoading] = useState({});
  const [error, setError] = useState({});

  // Reset per session or row count changes
  useEffect(() => {
    setPayloads(Array(rowsCount).fill(undefined));
    setLoading({});
    setError({});
  }, [rowsCount, captureId]);

  // Fetch helper
  const fetchReportOnce = async (index, archType, imageName) => {
    const url = api(REPORT_ENDPOINT);
    const resForRow = rows[index]?.res || {};

    // forward CSI/overlay from classifier result if present
    const body = {
      image_name: imageName,
      arch_type: archType,
      csi: typeof resForRow.csi === 'number' ? resForRow.csi : resForRow.csi_intensity,
      overlay: resForRow.overlay,
      // mask_data_url: resForRow.mask_overlay, // if needed
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const ctype = (r.headers.get('content-type') || '').toLowerCase();
    const isJson = ctype.includes('application/json');

    if (!r.ok) {
      const txt = await r.text().catch(() => '');
      throw new Error(`HTTP ${r.status} ${r.statusText} | ${txt || 'no body'}`);
    }
    if (!isJson) {
      const txt = await r.text().catch(() => '');
      throw new Error(
        `Expected JSON but got "${ctype || 'unknown'}". Body preview: ${
          txt?.slice(0, 200) || '(empty)'
        }`
      );
    }
    return r.json();
  };

  // Trigger reports
  useEffect(() => {
    if (!rowsCount) return;
    let alive = true;

    const toFetch = [];
    for (let i = 0; i < rowsCount; i++) {
      if (!payloads[i] && !loading[i] && !error[i]) toFetch.push(i);
    }
    if (!toFetch.length) return;

    setLoading((curr) => {
      const next = { ...curr };
      toFetch.forEach((i) => (next[i] = true));
      return next;
    });

    (async () => {
      const tasks = toFetch.map(async (i) => {
        try {
          const payload = await fetchReportOnce(i, rows[i].prediction, rows[i].imgName);
          if (!alive) return;
          setPayloads((curr) => {
            const copy = curr.slice();
            copy[i] = payload;
            return copy;
          });
          setError((curr) => {
            const copy = { ...curr };
            delete copy[i];
            return copy;
          });
        } catch (e) {
          if (!alive) return;
          setError((curr) => ({ ...curr, [i]: e?.message || String(e) }));
        } finally {
          if (!alive) return;
          setLoading((curr) => {
            const copy = { ...curr };
            copy[i] = false;
            return copy;
          });
        }
      });
      await Promise.allSettled(tasks);
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, rowsCount, captureId]);

  return (
    <div className="App result-page">
      {/* Reusable NavBar with dropdown + theme toggle */}
      <NavBar theme={theme} setTheme={setTheme} />

      <div className="result-scroll">
        <button className="back-fab" onClick={() => navigate('/')}>← Back</button>

        <div className="result-body centered">
          {rows.map((row, index) => {
            const payload = payloads[index];
            const archLabel = payload?.arch_label || displayArch(row.prediction);

            // Overlay inputs (prefer server /report echo, else classifier result values)
            const ov = payload?.overlay || row.res?.overlay || {};
            const csiValue =
              typeof payload?.csi === 'number'
                ? payload.csi
                : (typeof row.res?.csi === 'number' ? row.res.csi : row.res?.csi_intensity);

            return (
              <div className="result-row" key={index}>
                {/* LEFT: Image + classification (with overlay) */}
                <div className="result-card image-side">
                  <div className="result-image-wrap">
                    {row.img ? (
                      <ImageWithOverlay
                        src={row.img}
                        maskSrc={row.res?.mask_overlay}
                        foreY={typeof ov.fore_y === 'number' ? ov.fore_y : 0.25}
                        archY1={typeof ov.arch_y1 === 'number' ? ov.arch_y1 : 0.30}
                        archY2={typeof ov.arch_y2 === 'number' ? ov.arch_y2 : 0.70}
                        csi={typeof csiValue === 'number' ? csiValue : undefined}
                        cls={archLabel}
                      />
                    ) : (
                      <div className="report-placeholder">No image for this result.</div>
                    )}
                  </div>
                  <div className="classification-chip">
                    <span className="chip-label">Classification Result:</span>
                    <span className="chip-value">{archLabel}</span>
                  </div>
                </div>

                {payload && typeof payload.csi === 'number' && (
                  <div className="classification-chip" style={{ marginTop: 8 }}>
                    <span className="chip-label">CSI Result:</span>
                    <span className="chip-value">
                      {payload.csi_arch || '—'}{`  (${payload.csi.toFixed(1)}%)`}
                    </span>
                  </div>
                )}

                {/* RIGHT: Report */}
                <div className="result-card report-status">
                  <h4 style={{ marginTop: 0 }}>Report</h4>

                  {loading[index] && (
                    <div className="report-placeholder">Generating report…</div>
                  )}

                  {error[index] && !loading[index] && (
                    <div className="report-placeholder" style={{ color: '#b00020', whiteSpace: 'pre-wrap' }}>
                      Failed: {error[index]}
                    </div>
                  )}

                  {payload && !loading[index] && !error[index] && (
                    <div className="report-content">
                      <div className="report-title">
                        {payload.title || 'Foot Arch Classification Report'}
                      </div>

                      <div className="ui-divider" />

                      <div className="report-line">
                        <span className="k">Generated on:</span>
                        <span className="v">{payload.generated_on}</span>
                      </div>
                      <div className="report-line">
                        <span className="k">Image Name:</span>
                        <span className="v">{payload.image_name}</span>
                      </div>
                      <div className="report-line">
                        <span className="k">Arch Type:</span>
                        <span className="v">{payload.arch_label || displayArch(payload.arch_type)}</span>
                      </div>

                      {typeof csiValue === 'number' && (
                        <div className="report-line">
                          <span className="k">CSI:</span>
                          <span className="v">{csiValue.toFixed(1)}%</span>
                        </div>
                      )}

                      <div className="ui-divider" />

                      <div className="report-subtitle">What this means</div>
                      <div className="report-paragraph">{payload.explanation}</div>

                      {Array.isArray(payload.care_tips) && payload.care_tips.length > 0 && (
                        <>
                          <div className="ui-divider" />
                          <div className="report-subtitle">Care tips</div>
                          <ul className="report-list">
                            {payload.care_tips.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </>
                      )}

                      {Array.isArray(payload.shoe_tips) && payload.shoe_tips.length > 0 && (
                        <>
                          <div className="ui-divider" />
                          <div className="report-subtitle">Shoe guidance</div>
                          <ul className="report-list">
                            {payload.shoe_tips.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </>
                      )}

                      {Array.isArray(payload.insoles) && payload.insoles.length > 0 && (
                        <>
                          <div className="ui-divider" />
                          <div className="report-subtitle">Recommended insoles</div>
                          <ul className="report-list">
                            {payload.insoles.map((ins, i) => (
                              <li key={i}>
                                <div className="insole-line">
                                  <span className="insole-name">{ins.name || 'Insole'}</span>
                                  {ins.url && (
                                    <>
                                      {' — '}
                                      <a className="link-button" href={ins.url} target="_blank" rel="noreferrer">
                                        View
                                      </a>
                                    </>
                                  )}
                                </div>
                                {ins.note && <div className="insole-note">{ins.note}</div>}
                              </li>
                            ))}
                          </ul>
                        </>
                      )}

                      {Array.isArray(payload.when_to_seek_help) && payload.when_to_seek_help.length > 0 && (
                        <>
                          <div className="ui-divider" />
                          <div className="report-subtitle">When to seek professional help</div>
                          <ul className="report-list">
                            {payload.when_to_seek_help.map((t, i) => <li key={i}>{t}</li>)}
                          </ul>
                        </>
                      )}

                      {payload.disclaimer && (
                        <>
                          <div className="ui-divider" />
                          <div className="report-disclaimer">{payload.disclaimer}</div>
                        </>
                      )}
                    </div>
                  )}

                  {!loading[index] && !error[index] && !payload && (
                    <div className="report-placeholder">Preparing report…</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
