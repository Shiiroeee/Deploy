import React from 'react';
import './Screen.css';
import { Link, useLocation } from 'react-router-dom';
import icon from '../assets/White-Logo.png'; // adjust this path

const Result = () => {
  const location = useLocation();
  const { images = [], results = [] } = location.state || {};

  return (
    <div className="result-page">
      <nav className="navbar">
        <div className="navbar-logo">
          <img src={icon} alt="Logo" />
          <span style={{ fontWeight: 'bold', fontSize: '1.5rem' }}>Lofu</span>
        </div>
        <ul className="navbar-links">
          <li><Link to="/">Home</Link></li>
          <li><Link to="/result">Result</Link></li>
        </ul>
      </nav>

      <div className="result-content">
        <h2>Classification Results</h2>
        <div className="slot-row">
          {images.length > 0 ? (
            images.map((res, idx) => (
              <div className="image-slot-placeholder" key={idx}>
                {res.image ? (
                  <div>
                    <img src={res.image} alt={`Captured ${idx + 1}`} style={{ width: '100%' }} />
                    <p>
                      <strong>{res.label}</strong>
                      {res.confidence !== null && (
                        <span style={{ marginLeft: '8px', fontSize: '0.9rem' }}>
                          ({(res.confidence * 100).toFixed(1)}%)
                        </span>
                      )}
                    </p>
                  </div>
                ) : (
                  <div className="placeholder">No Image</div>
                )}
              </div>
            ))
          ) : (
            <p>No results to display.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Result;
