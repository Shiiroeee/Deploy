// src/App.js
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lofuImage from './assets/3.png';
import './App.css';

import WelcomeModal from './components/WelcomeM';
import MainButton from './components/MainButton';
import ThemeToggle from './components/darkmode';

import { ensureSignedIn } from './lib/firebase';
import { saveClassification } from './lib/uploads';
import { uploadDataURLForCapture, uploadCroppedImages } from './lib/storage';

// ===== Backend toggles =====
const USE_BACKEND = String(process.env.REACT_APP_USE_BACKEND || '0') === '1';
const BACKEND =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  'http://localhost:5000';
const api = (path) => `${BACKEND.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

const hasSeenWelcome = () => sessionStorage.getItem('welcome_seen') === '1';

function App() {
  // THEME
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
  useEffect(() => {
    (async () => {
      const user = await ensureSignedIn();
      setUid(user?.uid || null);
    })();
  }, []);

  // MODAL
  const [showModal, setShowModal] = useState(() => !hasSeenWelcome());
  const [showMain, setShowMain]   = useState(() =>  hasSeenWelcome());
  useEffect(() => {
    if (showModal && !hasSeenWelcome()) sessionStorage.setItem('welcome_seen', '1');
  }, [showModal]);
  const handleModalClose = () => { setShowModal(false); setShowMain(true); };

  // CAMERA + STATE
  const [capturedImage, setCapturedImage] = useState(null);
  const [boundedImage, setBoundedImage]   = useState(null);
  const [savedImages, setSavedImages]     = useState([]);   // Left/Right only
  const [errorMsg, setErrorMsg]           = useState('');

  const [sessionId, setSessionId]         = useState(null);

  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const uploadInputRef   = useRef(null);
  const streamRef        = useRef(null);
  const navigate         = useNavigate();

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

  // NEW: Global loading state for classification
  const [isClassifying, setIsClassifying] = useState(false);

  // Camera
  const startCamera = useCallback(async () => {
    try {
      setErrorMsg('');
      if (streamRef.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera error:', err);
      setErrorMsg('Could not access camera. Check permissions or ensure no other app is using it.');
    }
  }, []);
  const stopCamera = useCallback(() => {
    try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);
  useEffect(() => {
    if (showMain && !capturedImage) startCamera();
    return () => stopCamera();
  }, [showMain, capturedImage, startCamera, stopCamera]);

  // generic POST with nice errors
  const postJSON = async (path, body) => {
    const res = await fetch(api(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  };

  const saveCapturedLocal = async (dataUrl, session) => {
    try {
      await postJSON('save-images', { session, captured_image: dataUrl, cropped_images: [] });
    } catch (e) {
      // best-effort only
      console.warn('Failed to save captured locally:', e?.message || e);
    }
  };
  const saveCropsLocal = async (crops, sides, session) => {
    try {
      await postJSON('save-images', { session, cropped_images: crops, sides });
    } catch (e) {
      console.warn('Failed to save crops locally:', e?.message || e);
    }
  };

  // CAPTURE
  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) {
      alert('Camera not ready yet. Try again in a moment.');
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL('image/png');

    setCapturedImage(dataURL);
    setBoundedImage(null);
    setSavedImages([]);
    stopCamera();

    const newSession = String(Date.now());
    setSessionId(newSession);
    await saveCapturedLocal(dataURL, newSession);
  };

  // UPLOAD (icon)
  const uploadInputRefCb = (e) => {
    uploadInputRef.current = e;
  };
  const handleUploadIconClick = () => uploadInputRef.current?.click();
  const handleUploadChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCapturedImage(reader.result);
      setBoundedImage(null);
      setSavedImages([]);
      setSessionId(null);
      stopCamera();
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Draw boxes (Unknown too)
  const colorFor = (cls) => (cls === 'Left' ? 'red' : cls === 'Right' ? 'lime' : 'orange');

  const drawBoxes = (boxes, imageSrc) => {
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 3;
      ctx.font = '16px Arial';

      boxes.forEach((b) => {
        const { x1, y1, x2, y2, class: cls, polygon_global } = b;
        ctx.strokeStyle = colorFor(cls);
        ctx.fillStyle = colorFor(cls);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillText(cls || '', x1, Math.max(16, y1 - 6));

        if (Array.isArray(polygon_global) && polygon_global.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(polygon_global[0][0], polygon_global[0][1]);
          for (let i = 1; i < polygon_global.length; i++) {
            ctx.lineTo(polygon_global[i][0], polygon_global[i][1]);
          }
          ctx.closePath();
          ctx.stroke();
        }
      });

      setBoundedImage(canvas.toDataURL('image/png'));
    };
    image.src = imageSrc;
  };

  // DETECT
  const handleDetect = async () => {
    if (!capturedImage) { alert('Please capture or upload an image first.'); return; }
    try {
      const payload = await postJSON('detect', { image: capturedImage });

      // New API shape (boxes + detections). Back-compat fallback if someone still returns an array.
      let boxes = [];
      let detections = [];
      if (Array.isArray(payload)) {
        // old shape: treat everything as detections (no Unknown available)
        detections = payload;
      } else {
        boxes = Array.isArray(payload.boxes) ? payload.boxes : [];
        detections = Array.isArray(payload.detections) ? payload.detections : [];
      }

      // Draw ALL boxes (Unknown included)
      drawBoxes(boxes, capturedImage);

      // Only L/R go to placeholders
      const crops = detections
        .map((d) => d.annotated_cropped || d.cropped_image)
        .filter(Boolean);

      setSavedImages(crops);

      // Save local L/R (best-effort)
      const sides = detections.map((d, i) => d?.side || (i === 0 ? 'Left' : 'Right'));
      if (sessionId && crops.length) await saveCropsLocal(crops, sides, sessionId);

      // Helpful UX messages
      const hasLR = crops.length > 0;
      const hasUnknown = boxes.some((b) => b.class === 'Unknown');
      if (!hasLR && hasUnknown) {
        alert(' Unknown objects ');
      } else if (!hasLR && !hasUnknown) {
        alert('No detections found.');
      }
    } catch (error) {
      console.error('Detection error:', error);
      alert(`Detection failed: ${error.message || error}`);
    }
  };

  // CLASSIFY (with loading overlay)
  const handleClassify = async () => {
    if (savedImages.length === 0) {
      alert(' Please run DETECT and ensure feet are detected.');
      return;
    }
    if (!uid) {
      alert(' Please wait a moment and try again.');
      return;
    }

    setIsClassifying(true);
    try {
      const captureIdForStorage = String(Date.now());

      // 1) Upload originals + crops
      let originalMeta = null;
      let cropsMeta = [];
      try {
        if (capturedImage) {
          originalMeta = await uploadDataURLForCapture({
            uid, captureId: captureIdForStorage, name: 'original.png', dataUrl: capturedImage,
          });
        }
        const sides = savedImages.map((_, i) => (i === 0 ? 'Left' : i === 1 ? 'Right' : null));
        cropsMeta = await uploadCroppedImages({ uid, captureId: captureIdForStorage, crops: savedImages, sides });
      } catch (e) {
        console.error('Storage upload failed:', e);
        alert('Upload failed.');
        return;
      }

      // 2) Classify via backend
      let results = [];
      try {
        if (USE_BACKEND) {
          for (const img of savedImages) {
            const data = await postJSON('classify', { image: img });
            results.push({
              prediction: data.prediction,
              confidence: data.confidence,
              probabilities: data.probabilities,
            });
          }
        } else {
          results = savedImages.map(() => ({ prediction: '-', confidence: null, probabilities: {} }));
        }
      } catch (err) {
        console.error('Classification error:', err);
        alert(`Classification failed: ${err.message || err}`);
        return;
      }

      // 3) Save ONLY results + URLs to Firestore
      let captureId = null;
      try {
        const storageUploads = {
          folder: `users/${uid}/captures/${captureIdForStorage}`,
          original: originalMeta,
          crops: cropsMeta,
        };
        const created = await saveClassification({ uid, classification: results, storage: storageUploads });
        captureId = created.id;
      } catch (e) {
        console.error('Firestore saveClassification failed:', e);
      }

      // 4) Navigate
      navigate('/result', { state: { images: savedImages, results, captureId } });
    } finally {
      setIsClassifying(false);
    }
  };

  const containerStyle = {
    opacity: showMain ? 1 : 0,
    transform: showMain ? 'translateY(0)' : 'translateY(8px)',
    transition: prefersReducedMotion ? 'none' : 'opacity 420ms ease, transform 420ms ease',
    height: '100dvh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <>
      {showModal && <WelcomeModal onClose={handleModalClose} />}

      <div className="App" style={containerStyle} aria-busy={isClassifying}>
        <nav className="navbar">
          <div className="navbar-logo">
            <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
          </div>

          <div className="navbar-right">
            <ul className="navbar-links">
              <li><Link to="/result">Result</Link></li>
              <li><Link to="/history">History</Link></li>
              <li><Link to="/information">Information</Link></li>
            </ul>
            <ThemeToggle theme={theme} setTheme={setTheme} />
          </div>
        </nav>

        {errorMsg && (
          <div
            role="alert"
            style={{
              background: 'var(--alert-bg)',
              color: 'var(--alert-fg)',
              border: '1px solid var(--alert-border)',
              padding: '12px 14px',
              borderRadius: 10,
              margin: '12px 16px 0',
              flex: '0 0 auto',
            }}
          >
            {errorMsg}
          </div>
        )}

        <div className="main-body-vertical" style={{ flex: '1 1 auto', overflow: 'hidden' }}>
          {/* LEFT: Crops + CLASSIFY */}
          <div className="left-section" style={{ overflow: 'hidden' }}>
            <div className="image-pair-row">
              <div className="image-box">
                {savedImages[0] ? (
                  <img src={savedImages[0]} alt="Cropped Left" />
                ) : (
                  <div className="placeholder">No image yet</div>
                )}
              </div>
              <div className="image-box">
                {savedImages[1] ? (
                  <img src={savedImages[1]} alt="Cropped Right" />
                ) : (
                  <div className="placeholder">No image yet</div>
                )}
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <MainButton
                className="btn-lively"
                onClick={handleClassify}
                disabled={isClassifying || !uid || savedImages.length === 0}
                aria-busy={isClassifying}
              >
                {isClassifying ? (
                  <>
                    <svg
                      className="spin"
                      width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"
                      style={{ marginRight: 8, verticalAlign: 'text-bottom' }}
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                      <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    </svg>
                    CLASSIFYING…
                  </>
                ) : (
                  'CLASSIFY'
                )}
              </MainButton>
            </div>
          </div>

          {/* RIGHT: Camera / Captured */}
          <div className="right-section" style={{ overflow: 'hidden' }}>
            {capturedImage ? (
              <div className="captured-wrapper" style={{ width: '100%' }}>
                <div className="image-slot">
                  <img src={boundedImage || capturedImage} alt="Captured" />
                  <button
                    className="exit-icon"
                    aria-label="Close"
                    title="Close"
                    onClick={() => {
                      setCapturedImage(null);
                      setBoundedImage(null);
                      setSavedImages([]);
                      setSessionId(null);
                      startCamera();
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </button>
                </div>
                <div className="detect-capture-buttons">
                  <MainButton className="btn-lively" onClick={handleDetect} disabled={isClassifying}>
                    DETECT
                  </MainButton>
                </div>
              </div>
            ) : (
              <div className="camera-container" aria-disabled={isClassifying}>
                <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
                <div className="camera-buttons" style={{ gap: 10 }}>
                  <MainButton className="btn-lively" onClick={handleCapture} disabled={!uid || isClassifying}>
                    CAPTURE
                  </MainButton>
                  <button
                    type="button"
                    className="icon-btn"
                    title="Upload image"
                    aria-label="Upload image"
                    onClick={handleUploadIconClick}
                    disabled={isClassifying}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </button>
                  <input
                    ref={uploadInputRefCb}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleUploadChange}
                    disabled={isClassifying}
                  />
                </div>
              </div>
            )}
            <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
          </div>
        </div>

        {/* GLOBAL LOADING OVERLAY (appears while classifying) */}
        {isClassifying && (
          <div className="global-overlay" role="status" aria-live="polite">
            <div className="loading-card">
              <svg className="spin" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25"/>
                <path d="M12 2 a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" fill="none"/>
              </svg>
              <span>Classifying…</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default App;
