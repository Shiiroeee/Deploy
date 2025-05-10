import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import icon from './assets/White-Logo.png';
import './App.css';
import WelcomeModal from './components/WelcomeM';
import MainButton from './components/MainButton';
import { supabase } from './supabaseclient';

function App() {
  const [showModal, setShowModal] = useState(true);
  const [capturedImages, setCapturedImages] = useState([]);
  const [detections, setDetections] = useState([]);
  const [classResults, setClassResults] = useState([]);
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const overlayRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let stream;
    const constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        aspectRatio: { ideal: 16 / 9 },
        facingMode: "environment",
      }
    };

    navigator.mediaDevices.getUserMedia(constraints)
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play();
        }
      })
      .catch((err) => console.error('Camera error:', err));

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const detect = async () => {
      const video = videoRef.current;
      const canvas = captureCanvasRef.current;
      const overlayCanvas = overlayRef.current;

      if (video && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
        const ctx = overlayCanvas.getContext('2d');

        // Clear the canvas before drawing new bounding boxes
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        // Draw the video frame to the canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctxVideo = canvas.getContext('2d');
        ctxVideo.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = canvas.toDataURL('image/png');
        try {
          const res = await fetch('http://127.0.0.1:5000/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData }),
          });

          const data = await res.json();
          console.log("Detection data received:", data); // Debugging log
          if (Array.isArray(data)) {
            setDetections(data);
          } else {
            console.error('Detection response is not an array:', data);
            setDetections([]);
          }
        } catch (err) {
          console.error('Detection error:', err);
          setDetections([]);
        }
      }
    };

    const interval = setInterval(detect, 1000); // Detect every second
    return () => clearInterval(interval);
  }, [detections]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const ctx = canvas?.getContext('2d');

    if (canvas && ctx && detections.length) {
      // Clear the canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'lime';
      ctx.lineWidth = 2;
      ctx.font = '16px sans-serif';
      ctx.fillStyle = 'lime';

      // Draw bounding boxes on canvas
      detections.forEach(({ x1, y1, x2, y2, class: className }) => {
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.fillText(className || '', x1, y1 - 5);
      });
    }
  }, [detections]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const canvas = document.createElement('canvas');
    const videoCanvas = document.createElement('canvas');
    videoCanvas.width = video.videoWidth;
    videoCanvas.height = video.videoHeight;
    const videoCtx = videoCanvas.getContext('2d');
    videoCtx.drawImage(video, 0, 0);

    const crops = (detections || []).map(({ x1, y1, x2, y2 }) => {
      const width = x2 - x1;
      const height = y2 - y1;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoCanvas, x1, y1, width, height, 0, 0, width, height);
      return canvas.toDataURL('image/png'); // Capture as base64
    });

    setCapturedImages(crops); // Set captured images
    setClassResults([]); // Reset previous results
  };

  const handleClassify = async () => {
    if (capturedImages.length === 0) {
      alert('No images to classify.');
      return;
    }

    try {
      const results = [];
      for (let img of capturedImages) {
        const res = await fetch('http://127.0.0.1:5000/classify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: img }),
        });

        const { prediction } = await res.json();
        if (!prediction) throw new Error('No prediction received');
        results.push(prediction);
      }

      setClassResults(results); // Save classification results
      navigate('/result', { state: { images: capturedImages, results } }); // Navigate to result page
    } catch (err) {
      console.error('Classification error:', err);
      alert('Classification failed. Please try again.');
    }
  };

  return (
    <div className="App">
      <nav className="navbar">
        <div className="navbar-logo">
          <img src={icon} alt="Logo" />
          <span>Lofu</span>
        </div>
        <ul className="navbar-links">
          <li><a href="#">Home</a></li>
          <li><Link to="/result">Result</Link></li>
          <li><a href="#">Recommended</a></li>
          <li><a href="#">Information</a></li>
        </ul>
      </nav>

      {showModal && <WelcomeModal onClose={() => setShowModal(false)} />}

      <div className="main-body-vertical">
        <div className="left-section">
          {[0, 1].map(i => (
            <div className="image-slot" key={i}>
              {capturedImages[i] ? (
                <>
                  <img src={capturedImages[i]} alt={`Capture ${i + 1}`} />
                  <button className="delete-btn" onClick={() => {
                    const newImgs = [...capturedImages];
                    newImgs.splice(i, 1);
                    setCapturedImages(newImgs);
                  }}>✖</button>
                </>
              ) : (
                <span className="placeholder">Empty Slot</span>
              )}
            </div>
          ))}
          <div className="classify-btn-container">
            <MainButton onClick={handleClassify}>Classify</MainButton>
          </div>
        </div>

        <div className="right-section">
          <div className="camera-container">
            <div className="video-wrapper">
              <video ref={videoRef} autoPlay muted className="camera-feed" />
              <canvas ref={overlayRef} className="overlay-canvas" />
            </div>
            <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
            <div className="camera-buttons">
              <MainButton onClick={handleCapture}>Capture</MainButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
