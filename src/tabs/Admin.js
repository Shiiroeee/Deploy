import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import lofuImage from '../assets/3.png';
import '../App.css';
import '../components/AdminPage.css';
import MainButton from '../components/MainButton';

const BACKEND =
  (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim()) ||
  'http://localhost:5000';
const api = (path) => `${BACKEND.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

function normalizeResult(item) {
  if (!item) return { prediction: 'Unknown' };
  if (typeof item === 'string') return { prediction: item || 'Unknown' };
  const { prediction = 'Unknown' } = item;
  return { prediction };
}

export default function AdminPage() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [boundedImage, setBoundedImage]   = useState(null);

  // Crops in ascending visual order
  // [{ id, order, side, img }]
  const [crops, setCrops]                 = useState([]);
  const [results, setResults]             = useState([]);   // [{ prediction }]
  const [isClassifying, setIsClassifying] = useState(false);

  const fileInputRef = useRef(null);

  // ---------- Upload ----------
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result);
      setBoundedImage(null);
      setCrops([]);
      setResults([]);
    };
    reader.readAsDataURL(file);
  };

  // ---------- Drawing helpers ----------
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
        const { x1, y1, x2, y2, side, class: className, polygon_global } = box;

        // bbox
        ctx.strokeStyle = 'red';
        ctx.fillStyle = 'red';
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // label
        const label = side || className || '';
        if (label) ctx.fillText(label, x1, Math.max(12, y1 - 6));

        // polygon (optional)
        if (Array.isArray(polygon_global) && polygon_global.length >= 3) {
          ctx.strokeStyle = 'lime';
          ctx.beginPath();
          ctx.moveTo(polygon_global[0][0], polygon_global[0][1]);
          for (let i = 1; i < polygon_global.length; i++) {
            ctx.lineTo(polygon_global[i][0], polygon_global[i][1]);
          }
          ctx.closePath();
          ctx.stroke();

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

  // ---------- Detect (build ordered crop list) ----------
  const handleDetect = async () => {
    if (!uploadedImage) {
      alert('Please upload an image first.');
      return;
    }
    try {
      const response = await fetch(api('detect'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: uploadedImage }),
      });
      let detections = await response.json();

      if (!Array.isArray(detections)) {
        alert('Detection failed or returned no valid response.');
        return;
      }

      // Ascending order: Left -> Right -> Unknown; then area desc; tie-break x1 asc
      const sideSort = { Left: 0, Right: 1, Unknown: 2 };
      detections = detections
        .map(d => ({
          ...d,
          area: Math.max(0, (d.x2 - d.x1)) * Math.max(0, (d.y2 - d.y1)),
          side: d.side || 'Unknown',
        }))
        .sort((a, b) => {
          const sa = sideSort[a.side] ?? 2, sb = sideSort[b.side] ?? 2;
          if (sa !== sb) return sa - sb;
          if (b.area !== a.area) return b.area - a.area;
          if (a.x1 != null && b.x1 != null) return a.x1 - b.x1;
          return 0;
        });

      const top = detections.slice(0, 4);

      drawBoundingBoxes(top, uploadedImage);

      const nextCrops = top
        .map((det, i) => {
          const img = det.annotated_cropped || det.cropped_image;
          if (!img) return null;
          return {
            id: `${det.side || 'Unknown'}_${i + 1}`,
            order: i + 1,
            side: det.side || 'Unknown',
            img,
          };
        })
        .filter(Boolean);

      if (nextCrops.length === 0) {
        alert('No objects detected.');
        return;
      }

      setCrops(nextCrops);
      setResults(new Array(nextCrops.length).fill(null)); // placeholders for predictions
    } catch (err) {
      console.error('Detection error:', err);
      alert('Detection failed.');
    }
  };

  // ---------- Classify (incrementally update results) ----------
  const handleClassify = async () => {
    if (crops.length === 0) {
      alert('No detections to classify.');
      return;
    }
    try {
      setIsClassifying(true);
      const temp = [...results];

      for (let i = 0; i < crops.length; i++) {
        const img = crops[i].img;
        const res = await fetch(api('classify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: img }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Classification failed');

        temp[i] = normalizeResult({ prediction: data.prediction });

        // SHOW RESULT IMMEDIATELY
        setResults([...temp]);
      }
    } catch (err) {
      console.error('Classification error:', err);
      alert('Classification failed.');
    } finally {
      setIsClassifying(false);
    }
  };

  const formatArchLabel = (label) => {
    switch (label) {
      case 'Flat': return 'Flat Arch';
      case 'Normal': return 'Normal Arch';
      case 'High': return 'High Arch';
      default: return 'Unknown';
    }
  };

  const clearAll = () => {
    setUploadedImage(null);
    setBoundedImage(null);
    setCrops([]);
    setResults([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="App admin-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
        </div>
        <ul className="navbar-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/result">Result</Link></li>
          <li><Link to="/information">Information</Link></li>
          <li><Link to="/admin" className="active">Admin</Link></li>
        </ul>
      </nav>

      {/* Scrollable content area */}
      <div className="admin-scroll">
        <div className="admin-body centered">

          {/* Upload card */}
          <div className="admin-card upload-card">
            <h3 className="admin-card-title">Upload an Image</h3>
            <div className="upload-row">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
              />
              <div className="upload-actions">
                <MainButton onClick={handleDetect} disabled={!uploadedImage}>DETECT</MainButton>
                <button className="link-button" onClick={clearAll}>Clear</button>
              </div>
            </div>

            {uploadedImage && (
              <div className="upload-preview">
                <img
                  src={boundedImage || uploadedImage}
                  alt="Uploaded preview"
                  className="upload-image"
                />
              </div>
            )}
          </div>

          {/* Crops + classify (ascending order) */}
          <div className="admin-card detect-card">
            <h3 className="admin-card-title">Detections (Ascending)</h3>

            <div className="detect-body">
              {crops.length === 0 ? (
                <div className="placeholder tall">No detections yet. Upload an image and click DETECT.</div>
              ) : (
                <div className="crops-grid">
                  {crops.map((c, idx) => {
                    const r = results[idx];
                    return (
                      <div className="crop-card" key={c.id}>
                        <div className="crop-badge">{c.order}</div>
                        <img src={c.img} alt={`Cropped ${idx}`} className="crop-image" />
                        <div className="crop-meta">
                          <div className="crop-line">
                            <span className="k">Side:</span>
                            <span className="v">{c.side}</span>
                          </div>
                          <div className="crop-line">
                            <span className="k">Prediction:</span>
                            <span className="v">{formatArchLabel(r?.prediction)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="action-row">
              <MainButton onClick={handleClassify} disabled={crops.length === 0 || isClassifying}>
                {isClassifying ? 'CLASSIFYING…' : 'CLASSIFY'}
              </MainButton>
            </div>
          </div>

          {/* Results summary (same ascending order) */}
          {crops.length > 0 && (
            <div className="admin-card results-card">
              <h3 className="admin-card-title">Results</h3>
              <div className="results-body">
                <table className="results-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Side</th>
                      <th>Prediction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crops.map((c, i) => (
                      <tr key={c.id}>
                        <td>{c.order}</td>
                        <td>{c.side}</td>
                        <td>{formatArchLabel(results[i]?.prediction)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
