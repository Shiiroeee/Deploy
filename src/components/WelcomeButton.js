import React, { useState } from 'react';
import './component.css';

const CustomButton = ({
  label,
  onClick,
  type = 'button',
  size = 'md',            // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) => {
  const [pressed, setPressed] = useState(false);

  const handleClick = (e) => {
    if (disabled || loading) return;
    setPressed(true);
    onClick?.(e);
    setTimeout(() => setPressed(false), 140);
  };

  const classes = [
    'custom-btn',
    `btn-${size}`,
    loading ? 'is-loading' : '',
    disabled ? 'is-disabled' : '',
    pressed ? 'is-pressed' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled || loading}
      aria-disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      <span className="btn-label">{children ?? label}</span>
    </button>
  );
};

export default CustomButton;
