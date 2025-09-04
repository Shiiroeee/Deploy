import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import lofuImage from '../assets/3.png';
import '../App.css';
import MainButton from '../components/MainButton';
import '../components/AdminPage.css';


const BACKEND = 'http://localhost:5000';

function AdminPage() {
  const [uploadedImage, setUploadedImage] = useState(null);   
  const [boundedImage, setBoundedImage] = useState(null);     
  const [savedImages, setSavedImages] = useState([]);         // cropped detections (Left->Right)
  const [results, setResults] = useState([]);                
  const [history, setHistory] = useState([]);                 
  const fileInputRef = useRef(null);

  // ---------- Upload ----------
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result);
      setBoundedImage(null);
      setSavedImages([]);
      setResults([]);
    };
    reader.readAsDataURL(file);
  };

  const drawBoundingBoxes = (boxes, imageSrc) => {
    const canvas = document.createElement('canvas');
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
        const { x1, y1, x2, y2, side, class: className, confidence, polygon_global } = box;

        // 1) draw bbox (red)
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // label + confidence
        const label = side || className || '';
        const text = label ? `${label}${confidence != null ? ` (${(confidence * 100).toFixed(0)}%)` : ''}` : '';
        if (text) ctx.fillText(text, x1, Math.max(12, y1 - 6));

        // 2) draw polygon (if present)
        if (Array.isArray(polygon_global) && polygon_global.length >= 3) {
          // outline (green)
          ctx.strokeStyle = 'lime';
          ctx.beginPath();
          ctx.moveTo(polygon_global[0][0], polygon_global[0][1]);
          for (let i = 1; i < polygon_global.length; i++) {
            ctx.lineTo(polygon_global[i][0], polygon_global[i][1]);
          }
          ctx.closePath();
          ctx.stroke();

          // vertices (red dots)
          ctx.fillStyle = 'red';
          const r = 3;
          for (const [px, py] of polygon_global) {
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

  // ---------- Detect ----------
  const handleDetect = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first.');
      return;
    }

    try {
      const response = await fetch(`${BACKEND}/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage }),
      });

      let detections = await response.json();

      if (!Array.isArray(detections)) {
        alert('Detection failed or returned no valid response.');
        return;
      }

      // sort Left -> Right, fallback to area if side missing
      const order = { Left: 0, Right: 1 };
      detections = detections
        .map(d => ({
          ...d,
          area: Math.max(0, (d.x2 - d.x1)) * Math.max(0, (d.y2 - d.y1)),
        }))
        .sort((a, b) => {
          const sa = order[a.side] ?? 2, sb = order[b.side] ?? 2;
          if (sa !== sb) return sa - sb;
          return b.area - a.area;
        });

      // keep at most two in L/R order
      const topTwo = detections.slice(0, 2);

      // draw on full-frame: bbox + polygon
      drawBoundingBoxes(topTwo, uploadedImage);

      // use annotated crop if available (polygon drawn), else plain crop
      const croppedBase64s = topTwo
        .map(det => det.annotated_cropped || det.cropped_image)
        .filter(Boolean);

      if (croppedBase64s.length === 0) {
        alert('No objects detected.');
        return;
      }

      setSavedImages(croppedBase64s);
      setResults(new Array(croppedBase64s.length).fill(null)); // placeholders

    } catch (error) {
      console.error('Detection error:', error);
      alert('Detection failed.');
    }
  };

  // ---------- Classify cropped detections ----------
  const handleClassify = async () => {
    if (savedImages.length === 0) {
      alert('No detections to classify.');
      return;
    }

    try {
      const newResults = [...results];
      const historyEntries = [];

      for (let i = 0; i < savedImages.length; i++) {
        const img = savedImages[i];
        const response = await fetch(`${BACKEND}/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: img }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Classification failed');

        newResults[i] = {
          prediction: data.prediction,
          confidence: data.confidence,
          probabilities: data.probabilities,
        };

        historyEntries.push({
          image: img,
          prediction: data.prediction,
          confidence: data.confidence,
          probabilities: data.probabilities,
          timestamp: new Date().toLocaleString(),
        });
      }

      setResults(newResults);
      setHistory(prev => [...prev, ...historyEntries]);

      console.table(newResults.map((r, idx) => ({
        idx,
        prediction: r?.prediction,
        confidence: r?.confidence?.toFixed?.(3),
        Flat: r?.probabilities?.Flat?.toFixed?.(3),
        Normal: r?.probabilities?.Normal?.toFixed?.(3),
        High: r?.probabilities?.High?.toFixed?.(3),
      })));

    } catch (error) {
      console.error('Classification error:', error);
      alert('Classification failed.');
    }
  };

  const formatArchLabel = (label) => {
    switch (label) {
      case 'Flat': return 'Flat Arch';
      case 'Normal': return 'Normal Arch';
      case 'High': return 'High Arch';
      default: return label ?? '-';
    }
  };

  const ProbTable = ({ probs }) => (
    <table style={{ marginTop: 8, width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left' }}>Class</th>
          <th style={{ textAlign: 'right' }}>Probability</th>
        </tr>
      </thead>
      <tbody>
        {['Flat', 'Normal', 'High'].map(cls => (
          <tr key={cls}>
            <td>{formatArchLabel(cls)}</td>
            <td style={{ textAlign: 'right' }}>
              {probs && probs[cls] != null ? probs[cls].toFixed(3) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
        </div>
        <ul className="navbar-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/result">Result</Link></li>
          <li><Link to="/information">Information</Link></li>
          <li><Link to="/admin">Admin</Link></li>
        </ul>
      </nav>

      {/* Admin Body */}
      <div className="main-body-vertical">
        {/* Left: detection + classification */}
        <div className="left-section">
          <div className="image-pair-row">
            {savedImages.length > 0 ? (
              savedImages.map((img, idx) => {
                const r = results[idx];
                return (
                  <div key={idx} className="image-box">
                    <img src={img} alt={`Cropped ${idx}`} />
                    <div className="prediction-details" style={{ textAlign: 'left', marginTop: 8 }}>
                      <div><strong>Prediction:</strong> {formatArchLabel(r?.prediction) || '—'}</div>
                      <div><strong>Confidence:</strong> {r?.confidence != null ? `${(r.confidence * 100).toFixed(1)}%` : '—'}</div>
                      <ProbTable probs={r?.probabilities} />
                    </div>
                  </div>
                );
              })
            ) : (
              <>
                <div className="image-box"><div className="placeholder">No detection yet</div></div>
                <div className="image-box"><div className="placeholder">No detection yet</div></div>
              </>
            )}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', gap: 12 }}>
            <MainButton onClick={handleClassify}>CLASSIFY</MainButton>
          </div>

          {/* History Section */}
          <div className="history-section" style={{ marginTop: '30px', textAlign: 'left' }}>
            <h3>Classification History</h3>
            {history.length === 0 ? (
              <p>No history yet.</p>
            ) : (
<table style={{ width: '100%', marginTop: '10px', borderCollapse: 'collapse' }}>
  <thead>
    <tr style={{ background: '#f0f0f0' }}>
      <th style={{ textAlign: 'left', padding: '6px' }}>Time</th>
      <th style={{ textAlign: 'left', padding: '6px' }}>Prediction</th>
      <th style={{ textAlign: 'right', padding: '6px' }}>Confidence</th>
    </tr>
  </thead>
  <tbody>
    {history.map((entry, idx) => (
      <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
        <td style={{ padding: '6px' }}>
          {new Date(entry.timestamp).toLocaleString?.() || entry.timestamp}
        </td>
        <td style={{ padding: '6px' }}>
          <strong>{formatArchLabel(entry.prediction)}</strong>
        </td>
        <td style={{ padding: '6px', textAlign: 'right' }}>
          {(entry.confidence * 100).toFixed(1)}%
        </td>
      </tr>
    ))}
  </tbody>
</table>

            )}
          </div>
        </div>

        {/* Right: upload + detect */}
        <div className="right-section">
          {uploadedImage ? (
            <div className="captured-wrapper">
              <div className="image-slot">
                <img src={boundedImage || uploadedImage} alt="Uploaded" />
                <button
                  className="exit-icon"
                  onClick={() => {
                    setUploadedImage(null);
                    setBoundedImage(null);
                    setSavedImages([]);
                    setResults([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ×
                </button>
              </div>
              <div className="detect-capture-buttons" style={{ display: 'flex', gap: 12 }}>
                <MainButton onClick={handleDetect}>DETECT</MainButton>
              </div>
            </div>
          ) : (
            <div className="upload-container">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPage;
