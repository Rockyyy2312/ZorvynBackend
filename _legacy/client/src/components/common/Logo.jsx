import React from 'react';

/**
 * Nexo Branded Logo component
 * Renders the custom banknote-stack logo + NEXO title and tagline.
 */
export default function Logo({ variant = 'full', size = 'md', className = '' }) {
  // Dimensions based on sizes
  const iconSizes = {
    sm: { width: 32, height: 24 },
    md: { width: 52, height: 38 },
    lg: { width: 72, height: 52 },
    xl: { width: 100, height: 72 },
  };

  const currentSize = iconSizes[size] || iconSizes.md;

  const logoMark = (
    <svg
      width={currentSize.width}
      height={currentSize.height}
      viewBox="0 0 92 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="nexo-logo-mark"
      style={{ flexShrink: 0 }}
    >
      {/* Stepped banknotes (outlines only, fully transparent) */}
      {/* Banknote 4 (backmost) */}
      <path
        d="M 16 27 H 11 V 58 H 47 V 53"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      {/* Banknote 3 */}
      <path
        d="M 21 22 H 16 V 53 H 52 V 48"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      {/* Banknote 2 */}
      <path
        d="M 26 17 H 21 V 48 H 57 V 43"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      />
      
      {/* Banknote 1 (frontmost, complete outer rect + inner details) */}
      <rect
        x="26"
        y="12"
        width="56"
        height="31"
        rx="3"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      {/* Inner corner border arcs */}
      <path
        d="M 31 19 A 3 3 0 0 1 34 16 M 77 19 A 3 3 0 0 0 74 16 M 31 36 A 3 3 0 0 0 34 39 M 77 36 A 3 3 0 0 1 74 39"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Center circle representing currency seal */}
      <circle
        cx="54"
        cy="27.5"
        r="5.5"
        stroke="currentColor"
        strokeWidth="3"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <div className={`nexo-logo ${className}`}>{logoMark}</div>;
  }

  return (
    <div className={`nexo-logo ${variant === 'full' ? 'nexo-logo-full' : 'nexo-logo-compact'} ${className}`} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      {logoMark}
      
      <div className="nexo-logo-text-wrapper" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span className="nexo-logo-title" style={{
          fontSize: size === 'sm' ? '1.1rem' : size === 'lg' ? '2.1rem' : size === 'xl' ? '2.6rem' : '1.65rem',
          fontWeight: 900,
          letterSpacing: '0.04em',
          color: 'var(--text-primary)',
          fontFamily: "'Outfit', sans-serif"
        }}>
          NEXO
        </span>
        {variant === 'full' && (
          <span className="nexo-logo-tagline" style={{
            fontSize: size === 'sm' ? '0.55rem' : size === 'lg' ? '0.78rem' : size === 'xl' ? '0.9rem' : '0.68rem',
            fontWeight: 500,
            letterSpacing: '0.06em',
            color: 'var(--text-secondary)',
            marginTop: '3px',
            fontFamily: "'Space Grotesk', sans-serif"
          }}>
            track , save, grow
          </span>
        )}
      </div>
    </div>
  );
}
