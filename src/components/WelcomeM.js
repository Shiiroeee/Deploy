import React, { useEffect, useState, useCallback } from 'react';
import './component.css';
import CustomButton from './WelcomeButton';
import logo from '../assets/White-Logo.png';

const WelcomeModal = ({ onClose }) => {
  const [fadeOut, setFadeOut] = useState(false);

  const closeNow = useCallback(() => {
    setFadeOut(true);
    setTimeout(() => {
      onClose?.(); // parent unmounts after fade
    }, 500); // match CSS transition
  }, [onClose]);

  // ESC to close
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeNow();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [closeNow]);

  // Backdrop click closes; clicks inside modal do not
  const onBackdropMouseDown = (e) => {
    if (e.target === e.currentTarget) closeNow();
  };

  return (
    <div
      className={`modal-overlay ${fadeOut ? 'fade-out' : ''}`}
      onMouseDown={onBackdropMouseDown}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="welcome-title">
        <div className="modal-header">
          <img src={logo} alt="Lofu Logo" className="modal-logo" />
          <h2 id="welcome-title">Welcome to Lofu!</h2>
        </div>

        <p className="modal-body-text">
          Plantar pressure distribution refers to how weight and force are spread across the
          bottom of your foot while standing, walking, or running. By analyzing this pattern,
          we can gain insights into foot health, posture, and gait. It helps spot deformities
          (flat feet, high arches, bunions), monitor high-pressure zones (e.g., in diabetes),
          and evaluate orthotics by comparing before/after support.
        </p>

        <div className="button-container-right">
          <CustomButton label="Enter" onClick={closeNow} />
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
