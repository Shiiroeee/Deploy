// src/App.js
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lofuImage from './assets/3.png';
import './App.css';
import WelcomeModal from './components/WelcomeM';
import MainButton from './components/MainButton';
import ThemeToggle from './components/darkmode';

import { ensureSignedIn } from './lib/firebase';
import { createCapture, attachCrops, attachClassification } from './lib/uploads';

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

  // AUTH (anonymous)
  const [uid, setUid] = useState(null);
  useEffect(() => {
    (async () => {
      const user = await ensureSignedIn();
      setUid(user?.uid || null);
    })();
  }, []);

  // WELCOME MODAL
  const [showModal, setShowModal] = useState(() => !hasSeenWelcome());
  const [showMain, setShowMain]   = useState(() =>  hasSeenWelcome());
  useEffect(() => {
    if (showModal && !hasSeenWelcome()) sessionStorage.setItem('welcome_seen', '1');
  }, [showModal]);
  const handleModalClose = () => { setShowModal(false); setShowMain(true); };

  // CAMERA + STATE
  const [capturedImage, setCapturedImage] = useState(null);
  const [boundedImage, setBoundedImage] = useState(null);
  const [savedImages, setSavedImages] = useState([]);    // [left, right]
  const [errorMsg, setErrorMsg] = useState('');
  const [captureId, setCaptureId] = useState(null);      // Firestore document id for this capture

  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    []
  );

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
    try {
      streamRef.current?.getTracks?.().forEach(t => t.stop());
    } catch {}
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (showMain && !capturedImage) startCamera();
    return () => stopCamera();
  }, [showMain, capturedImage, startCamera, stopCamera]);

  // Optional backend save (guarded)
  const saveBothToBackend = async (capturedBase64, croppedBase64Array) => {
    if (!USE_BACKEND) return;
    try {
      const res = await fetch(api('save_images'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captured_image: capturedBase64 || null,
          cropped_images: croppedBase64Array || []
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Save failed (${res.status})`);
      console.log('Saved files (backend):', data.files);
    } catch (err) {
      console.error('Failed to save images (backend):', err);
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
    setCaptureId(null);
    stopCamera();

    // Optional: your own backend
    await saveBothToBackend(dataURL, []);

    // Save to Firebase (new doc)
    try {
      if (!uid) throw new Error('No user UID yet.');
      const created = await createCapture({ uid, captureDataUrl: dataURL });
      setCaptureId(created.id);
    } catch (e) {
      console.error('Firebase createCapture failed:', e);
    }
  };

  // GEOMETRY helpers
  const buildGlobalPolygon = (det) => {
    if (Array.isArray(det.polygon_global) && det.polygon_global.length >= 3) return det.polygon_global;
    if (Array.isArray(det.polygon) && det.polygon.length >= 3) {
      const { x1 = 0, y1 = 0 } = det;
      return det.polygon.map(([px, py]) => [px + x1, py + y1]);
    }
    return null;
  };

  const drawBoundingBoxes = (boxes, imageSrc) => {
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      ctx.lineWidth = 2;
      ctx.font = '16px Arial';

      boxes.forEach((box) => {
        const { x1, y1, x2, y2, side, class: className } = box;
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        const label = side || className || '';
        if (label) ctx.fillText(label, x1, Math.max(12, y1 - 6));

        const polyG = buildGlobalPolygon(box);
        if (Array.isArray(polyG) && polyG.length >= 3) {
          ctx.strokeStyle = 'lime';
          ctx.beginPath();
          ctx.moveTo(polyG[0][0], polyG[0][1]);
          for (let i = 1; i < polyG.length; i++) ctx.lineTo(polyG[i][0], polyG[i][1]);
          ctx.closePath();
          ctx.stroke();

          ctx.fillStyle = 'red';
          const r = 3;
          for (const [px, py] of polyG) {
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });
      setBoundedImage(canvas.toDataURL('image/png'));
    };
    image.src = imageSrc;
  };

  // DETECT
  const handleDetect = async () => {
    if (!capturedImage) {
      alert('Please capture an image first.');
      return;
    }
    try {
      const response = await fetch(api('detect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage }),
      });
      let detections = await response.json();
      if (!Array.isArray(detections) || detections.length === 0) {
        alert('No feet detected.');
        return;
      }
      const order = { Left: 0, Right: 1 };
      detections = detections
        .map(d => ({ ...d, area: Math.max(0, (d.x2 - d.x1)) * Math.max(0, (d.y2 - d.y1)) }))
        .sort((a, b) => {
          const sa = order[a.side] ?? 2;
          const sb = order[b.side] ?? 2;
          if (sa !== sb) return sa - sb;
          return b.area - a.area;
        });
      const topTwo = detections.slice(0, 2);
      drawBoundingBoxes(topTwo, capturedImage);

      const croppedBase64s = topTwo.map(det => det.annotated_cropped || det.cropped_image).filter(Boolean);
      if (croppedBase64s.length === 0) {
        alert('No valid crops returned.');
        return;
      }
      setSavedImages(croppedBase64s);

      // Optional backend persist
      await saveBothToBackend(capturedImage, croppedBase64s);

      // Save crops to Firebase (attach to existing doc)
      try {
        if (uid && captureId) {
          await attachCrops({
            uid,
            captureId,
            leftDataUrl: croppedBase64s[0] || null,
            rightDataUrl: croppedBase64s[1] || null,
          });
        }
      } catch (e) {
        console.error('Firebase attachCrops failed:', e);
      }
    } catch (error) {
      console.error('Detection error:', error);
      alert('Detection failed.');
    }
  };

  // CLASSIFY
  const handleClassify = async () => {
    if (savedImages.length === 0) {
      alert('No images to classify. Please detect feet first.');
      return;
    }

    let results = [];
    try {
      if (USE_BACKEND) {
        for (const img of savedImages) {
          const response = await fetch(api('classify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: img }),
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Classification failed');
          results.push({ prediction: data.prediction, confidence: data.confidence, probabilities: data.probabilities });
        }
      } else {
        // frontend-only fallback so UI keeps working
        results = savedImages.map(() => ({ prediction: '-', confidence: null, probabilities: {} }));
      }

      // Save classification array to Firebase
      try {
        if (uid && captureId) {
          await attachClassification({ uid, captureId, classification: results });
        }
      } catch (e) {
        console.error('Firebase attachClassification failed:', e);
      }

      navigate('/result', { state: { images: savedImages, results, captureId } });
    } catch (error) {
      console.error('Classification error:', error);
      alert('Classification failed.');
    }
  };

  // NO-SCROLL PAGE CONTAINER
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

      <div className="App" style={containerStyle}>
        <nav className="navbar">
          <div className="navbar-logo">
            <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
          </div>

          <div className="navbar-right">
            <ul className="navbar-links">
              <li><Link to="/result">Result</Link></li>
              <li><Link to="/information">Information</Link></li>
              <li><Link to="/history">History</Link></li>
              <li><Link to="/admin">Admin</Link></li>
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
              flex: '0 0 auto'
            }}
          >
            {errorMsg}
          </div>
        )}

        <div className="main-body-vertical" style={{ flex: '1 1 auto', overflow: 'hidden' }}>
          {/* LEFT: Crops + classify */}
          <div className="left-section" style={{ overflow: 'hidden' }}>
            <div className="image-pair-row">
              <div className="image-box">
                {savedImages[0] ? <img src={savedImages[0]} alt="Cropped Left" /> : <div className="placeholder">No image yet</div>}
              </div>
              <div className="image-box">
                {savedImages[1] ? <img src={savedImages[1]} alt="Cropped Right" /> : <div className="placeholder">No image yet</div>}
              </div>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 12 }}>
              <MainButton className="btn-lively" onClick={handleClassify}>CLASSIFY</MainButton>
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
                    onClick={() => {
                      setCapturedImage(null);
                      setBoundedImage(null);
                      setSavedImages([]);
                      setCaptureId(null);
                      startCamera();
                    }}
                  >
                    ×
                  </button>
                </div>
                <div className="detect-capture-buttons">
                  <MainButton className="btn-lively" onClick={handleDetect}>DETECT</MainButton>
                </div>
              </div>
            ) : (
              <div className="camera-container">
                <video ref={videoRef} autoPlay playsInline muted className="camera-feed" />
                <div className="camera-buttons">
                  <MainButton className="btn-lively" onClick={handleCapture}>CAPTURE</MainButton>
                </div>
              </div>
            )}
            <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
