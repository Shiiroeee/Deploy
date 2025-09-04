// App.js
import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import lofuImage from './assets/LOGO21.png';
import './App.css';
import WelcomeModal from './components/WelcomeM';
import MainButton from './components/MainButton';

function App() {
  const [showModal, setShowModal] = useState(true);
  const [capturedImage, setCapturedImage] = useState(null);
  const [boundedImage, setBoundedImage] = useState(null); // with bounding boxes
  const [savedImages, setSavedImages] = useState([]);     // cropped images (left placeholders)
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  // ---------- Camera ----------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // ---------- Save helpers ----------
  const saveFullToBackend = async (base64Image) => {
    try {
      await fetch('http://localhost:5000/save_full', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
    } catch (err) {
      console.error('Failed to save full captured image:', err);
    }
  };

  const saveCroppedToBackend = async (base64Image) => {
    try {
      await fetch('http://localhost:5000/save_cropped', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });
    } catch (err) {
      console.error('Failed to save cropped image:', err);
    }
  };

  // ---------- Capture ----------
  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL('image/png');
    setCapturedImage(dataURL);
    setBoundedImage(null);

    // Save the full captured image immediately
    await saveFullToBackend(dataURL);
  };

  // ---------- Detect (YOLO) ----------
  const handleDetect = async () => {
    if (!capturedImage) {
      alert('Please capture an image first.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: capturedImage }),
      });

      const detections = await response.json();

      if (!Array.isArray(detections)) {
        alert('Detection failed or returned no valid response.');
        return;
      }

      // Draw boxes on the right preview
      drawBoundingBoxes(detections, capturedImage);

      // Collect cropped images
      const croppedBase64s = detections
        .map(det => det.cropped_image)
        .filter(img => !!img);

      if (croppedBase64s.length === 0) {
        alert('No feet detected.');
        return;
      }

      // Save at most two cropped images to backend and to state
      const firstTwo = croppedBase64s.slice(0, 2);
      for (const img of firstTwo) {
        await saveCroppedToBackend(img);
      }

      setSavedImages(firstTwo);

      // (Optional) also ensure the full capture is saved (redundant if already saved in handleCapture)
      await saveFullToBackend(capturedImage);

    } catch (error) {
      console.error('Detection error:', error);
      alert('Detection failed.');
    }
  };

  // ---------- Draw bounding boxes for preview ----------
  const drawBoundingBoxes = (boxes, imageSrc) => {
    const canvas = captureCanvasRef.current;
    const ctx = canvas.getContext('2d');

    const image = new Image();
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.font = '16px Arial';
      ctx.fillStyle = 'red';

      boxes.forEach((box) => {
        const { x1, y1, x2, y2, class: className } = box;
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        if (className) ctx.fillText(className, x1, Math.max(0, y1 - 5));
      });

      const updatedImage = canvas.toDataURL('image/png');
      setBoundedImage(updatedImage);
    };
    image.src = imageSrc;
  };

  // ---------- Classify cropped images ----------
  const handleClassify = async () => {
    if (savedImages.length === 0) {
      alert('No images to classify. Please detect feet first.');
      return;
    }

    const results = [];

    try {
      for (const img of savedImages) {
        const response = await fetch('http://localhost:5000/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: img }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Classification failed');
        }

        results.push(data.prediction);
      }

      navigate('/result', {
        state: {
          images: savedImages,
          results: results,
        }
      });
    } catch (error) {
      console.error('Classification error:', error);
      alert('Classification failed.');
    }
  };

  return (
    <>
      {showModal && <WelcomeModal onClose={() => setShowModal(false)} />}

      <div className="App">

        {/* Navigation Bar */}
        <nav className="navbar">
          <div className="navbar-logo">
            <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
          </div>
          <ul className="navbar-links">
            <li><Link to="/result">Result</Link></li>
            <li><Link to="/information">Information</Link></li>
          </ul>
        </nav>
        
        {/* Home Screen */}
        <div className="main-body-vertical">
          {/* Left: placeholders for cropped images */}
          <div className="left-section">
            <div className="image-pair-row">
              <div className="image-box">
                {savedImages[0] ? (
                  <img src={savedImages[0]} alt="Cropped 1" />
                ) : (
                  <div className="placeholder">No image yet</div>
                )}
              </div>
              <div className="image-box">
                {savedImages[1] ? (
                  <img src={savedImages[1]} alt="Cropped 2" />
                ) : (
                  <div className="placeholder">No image yet</div>
                )}
              </div>
            </div>
            <div style={{ marginTop: '20px' }}>
              <MainButton onClick={handleClassify}>CLASSIFY</MainButton>
            </div>
          </div>

          {/* Right: camera / captured */}
          <div className="right-section">
            {capturedImage ? (
              <div className="captured-wrapper">
                <div className="image-slot">
                  <img src={boundedImage || capturedImage} alt="Captured" />
                  <button className="exit-icon" onClick={() => setCapturedImage(null)}>×</button>
                </div>
                <div className="detect-capture-buttons">
                  <MainButton onClick={handleDetect}>DETECT</MainButton>
                </div>
              </div>
            ) : (
              <div className="camera-container">
                <video ref={videoRef} autoPlay muted className="camera-feed" />
                <div className="camera-buttons">
                  <MainButton onClick={handleCapture}>CAPTURE</MainButton>
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
