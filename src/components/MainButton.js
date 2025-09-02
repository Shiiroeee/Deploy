import React from 'react';
import './component.css';
import { FaArrowRight } from 'react-icons/fa'; 

const MainButton = ({ onClick, children, className = '', icon = false }) => {
  return (
    <button className={`gradient-btn ${className}`} onClick={onClick}>
      {children}
      {icon && <FaArrowRight className="btn-icon" />}
    </button>
  );
};

export default MainButton;
