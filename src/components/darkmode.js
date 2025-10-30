import React from 'react';
import '../App.css';

export default function ThemeToggle({ theme, setTheme }) {
  const isDark = theme === 'dark';
  const toggle = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <label className="theme-switch" title={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}>
      <input
        type="checkbox"
        checked={isDark}
        onChange={toggle}
        aria-label="Toggle dark mode"
      />
      <span className="switch-track">
        <span className="switch-thumb" />
        <span className="switch-icons" aria-hidden="true">
          <span className="icon-sun">☀️</span>
          <span className="icon-moon">🌙</span>
        </span>
      </span>
    </label>
  );
}
