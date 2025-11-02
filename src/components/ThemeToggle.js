import React, { useEffect, useRef, useState } from "react";
import "./ThemeToggle.css";

/**
 * ThemeToggle dropdown
 * Props:
 *  - theme: "light" | "dark"
 *  - setTheme: (next: "light" | "dark") => void
 *
 * The parent (App / Result / History / Information page) already handles:
 *   document.documentElement.setAttribute('data-theme', theme)
 *   localStorage.setItem('theme', theme)
 */
export default function ThemeToggle({ theme = "light", setTheme }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!open) return;
      const t = e.target;
      if (menuRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keyup", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keyup", onKey);
    };
  }, [open]);

  const apply = (next) => {
    if (next !== "light" && next !== "dark") return;
    setTheme(next);
    setOpen(false);
  };

  const isDark = theme === "dark";

  return (
    <div className="tt-wrap">
      <button
        ref={btnRef}
        type="button"
        className="tt-trigger"
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        title="Theme"
        onClick={() => setOpen((v) => !v)}
      >
        {/* Current icon */}
        {isDark ? <MoonIcon /> : <SunIcon />}
        <span className="tt-label">{isDark ? "Dark" : "Light"}</span>
        <ChevronIcon />
      </button>

      {open && (
        <div className="tt-menu" role="menu" ref={menuRef}>
          <button
            className={`tt-item ${theme === "light" ? "active" : ""}`}
            role="menuitemradio"
            aria-checked={theme === "light"}
            onClick={() => apply("light")}
          >
            <SunIcon />
            <span>Light</span>
          </button>
          <button
            className={`tt-item ${theme === "dark" ? "active" : ""}`}
            role="menuitemradio"
            aria-checked={theme === "dark"}
            onClick={() => apply("dark")}
          >
            <MoonIcon />
            <span>Dark</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* === Icons === */
function SunIcon() {
  return (
    <svg
      className="tt-ic"
      xmlns="http://www.w3.org/2000/svg"
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4"></circle>
      <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.535-7.535-1.414 1.414M7.879 16.121l-1.414 1.414m0-12.728 1.414 1.414m9.9 9.9 1.414 1.414"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      className="tt-ic"
      xmlns="http://www.w3.org/2000/svg"
      width="16" height="16" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="tt-ic chevron"
      xmlns="http://www.w3.org/2000/svg"
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
