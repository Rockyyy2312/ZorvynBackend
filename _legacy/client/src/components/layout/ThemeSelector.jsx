import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function ThemeSelector() {
  const { theme: activeTheme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  return (
    <div className="theme-selector-container" ref={dropdownRef}>
      <button
        type="button"
        className="theme-selector-trigger btn btn-ghost"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Theme"
        aria-label="Change Theme"
        style={{
          padding: '8px', borderRadius: '50%',
          minWidth: '40px', height: '40px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <Palette size={18} />
      </button>

      {isOpen && (
        <div className="theme-dropdown glass-card animate-fade-in">
          <p className="theme-dropdown-title">Choose Theme</p>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`theme-option ${activeTheme === t.id ? 'active' : ''}`}
              onClick={() => { setTheme(t.id); setIsOpen(false); }}
            >
              <div className="theme-swatch">
                {t.colors.map((c, i) => (
                  <span
                    key={i}
                    className="theme-dot"
                    style={{ background: c, boxShadow: `0 0 6px ${c}` }}
                  />
                ))}
              </div>
              <span className="theme-option-name">{t.name}</span>
              {activeTheme === t.id && <Check size={13} className="theme-check" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
