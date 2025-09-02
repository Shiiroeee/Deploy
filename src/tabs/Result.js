import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import lofuImage from '../assets/LOGO21.png';
import '../App.css';
import '../components/Screen.css';
import MainButton from '../components/MainButton';
import ThemeToggle from '../components/darkmode';

function ResultPage() {
  // Theme (read/persist locally so the toggle reflects current theme on this page)
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

  const location = useLocation();
  const navigate = useNavigate();
  const { images = [], results = [] } = location.state || {};

  const handleBack = () => navigate('/');

  const formatArchLabel = (label) => {
    switch (label) {
      case 'Flat': return 'Flat Arch';
      case 'Normal': return 'Normal Arch';
      case 'High': return 'High Arch';
      default: return label ?? '-';
    }
  };

  const getResultObj = (r) => {
    if (!r) return { prediction: '-', confidence: null, probabilities: {} };
    if (typeof r === 'string') return { prediction: r, confidence: null, probabilities: {} };
    const { prediction = '-', confidence = null, probabilities = {} } = r;
    return { prediction, confidence, probabilities };
  };

  return (
    <div className="App">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/"><img src={lofuImage} alt="Lofu" className="lofu-name" /></Link>
        </div>

        {/* Right side: links + theme toggle */}
        <div className="navbar-right">
          <ul className="navbar-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/result" className="active">Result</Link></li>
            <li><Link to="/information">Information</Link></li>
            <li><Link to="/history">History</Link></li>
            <li><Link to="/admin">Admin</Link></li>
          </ul>
          <ThemeToggle theme={theme} setTheme={setTheme} />
        </div>
      </nav>

      <div className="result-body centered">
        {images.map((img, index) => {
          const { prediction, confidence, probabilities } = getResultObj(results[index]);
          return (
            <div className="result-card" key={index}>
              <img src={img} alt={`Result ${index}`} className="result-image" />
              <div className="prediction-details">
                <h3>
                  Prediction: <span>{formatArchLabel(prediction)}</span>
                </h3>
                <p style={{ marginTop: 6 }}>
                  Confidence:{' '}
                  <strong>
                    {confidence != null ? `${(confidence * 100).toFixed(1)}%` : '—'}
                  </strong>
                </p>

                {/* Probability table */}
                <table className="prob-table" style={{ marginTop: 10, width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Class</th>
                      <th style={{ textAlign: 'right' }}>Probability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['Flat', 'Normal', 'High'].map((cls) => (
                      <tr key={cls}>
                        <td>{formatArchLabel(cls)}</td>
                        <td style={{ textAlign: 'right' }}>
                          {probabilities && probabilities[cls] != null
                            ? probabilities[cls].toFixed(3)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        <div className="result-actions">
          <MainButton onClick={handleBack}>Back</MainButton>
        </div>
      </div>
    </div>
  );
}

export default ResultPage;
