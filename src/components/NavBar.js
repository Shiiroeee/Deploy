// src/components/NavBar.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import ThemeToggle from './darkmode';
import ProductAdminModal from './ProductAdminModal'; 
import lofuImage from '../assets/3.png';
import './NavBar.css';

function NavBar({ theme, setTheme }) {
  const [open, setOpen] = useState(false);        // dropdown open
  const [openAdmin, setOpenAdmin] = useState(false); // ⬅️ modal open
  const menuRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click or Esc
  useEffect(() => {
    const onDown = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setOpenAdmin(false);
      }
      if (!menuRef.current || !btnRef.current) return;
      if (!menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onDown);
    };
  }, []);

  // Focus first menu item when menu opens
  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector('[data-menuitem]');
    first?.focus();
  }, [open]);

  const onMenuKeyDown = (e) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const items = Array.from(menuRef.current.querySelectorAll('[data-menuitem]'));
    if (!items.length) return;
    const idx = items.indexOf(document.activeElement);
    let next = 0;
    if (e.key === 'ArrowDown') next = (idx + 1) % items.length;
    if (e.key === 'ArrowUp')   next = (idx - 1 + items.length) % items.length;
    if (e.key === 'Home')      next = 0;
    if (e.key === 'End')       next = items.length - 1;
    items[next].focus();
  };

  const handleOpenAdmin = () => {
    setOpen(false);       // close dropdown
    setOpenAdmin(true);   // open modal
  };

  return (
    <>
      <nav className="navbar">
        <div className="navbar-logo">
          <Link to="/">
            <img src={lofuImage} alt="Lofu" className="lofu-name" />
          </Link>
        </div>

        <div className="navbar-right">
          <ul className="navbar-links">
            <li><Link to="/result">Result</Link></li>
            <li><Link to="/history">History</Link></li>
            <li><Link to="/information">Information</Link></li>
          </ul>

          {/* Dropdown trigger + menu */}
          <div className="nav-dropdown">
            <button
              ref={btnRef}
              className="nav-dropdown-btn"
              aria-haspopup="menu"
              aria-expanded={open ? 'true' : 'false'}
              onClick={() => setOpen((v) => !v)}
              title="Menu"
            >
              {/* Hamburger icon */}
              <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 6h18M3 12h18M3 18h18"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
              </svg>
            </button>

            {open && (
              <div
                ref={menuRef}
                className="nav-dropdown-menu"
                role="menu"
                aria-label="Settings menu"
                onKeyDown={onMenuKeyDown}
              >
                <button
                  className="nav-menu-item"
                  role="menuitem"
                  onClick={handleOpenAdmin}
                  data-menuitem
                >
                  {/* Update icon */}
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  Update Product
                </button>

                <div className="nav-menu-sep" aria-hidden="true" />

                {/* Theme row: label + toggle on the right */}
                <div
                  className="nav-menu-item nav-menu-inline"
                  role="menuitem"
                  tabIndex={0}
                  data-menuitem
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setTheme(theme === 'dark' ? 'light' : 'dark');
                    }
                  }}
                >
                  <span>Theme</span>
                  <ThemeToggle theme={theme} setTheme={setTheme} />
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ⬇️ Mount the modal once; control with state */}
      <ProductAdminModal
        open={openAdmin}
        onClose={() => setOpenAdmin(false)}
      />
    </>
  );
}

export default NavBar;
