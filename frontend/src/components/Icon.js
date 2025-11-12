import React from 'react';

export default function Icon({ name, size = 16, strokeWidth = 1.8, className }) {
  const baseProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': 'true',
  };

  switch (name) {
    case 'workspace':
      return (
        <svg {...baseProps}>
          <rect x="4" y="4" width="6" height="6" rx="1.2" stroke="none" fill="currentColor" />
          <rect x="14" y="4" width="6" height="6" rx="1.2" stroke="none" fill="currentColor" />
          <rect x="4" y="14" width="6" height="6" rx="1.2" stroke="none" fill="currentColor" />
          <rect x="14" y="14" width="6" height="6" rx="1.2" stroke="none" fill="currentColor" />
        </svg>
      );
    case 'mail':
      return (
        <svg {...baseProps}>
          <rect x="3" y="6" width="18" height="12" rx="2.2" />
          <path d="M3.5 7l8.5 6 8.5-6" />
        </svg>
      );
    case 'globe':
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3a15 15 0 0 1 0 18" />
          <path d="M12 3a15 15 0 0 0 0 18" />
        </svg>
      );
    case 'plus':
      return (
        <svg {...baseProps}>
          <line x1="12" y1="6" x2="12" y2="18" />
          <line x1="6" y1="12" x2="18" y2="12" />
        </svg>
      );
    case 'star':
      return (
        <svg {...baseProps}>
          <path d="M12 4l2.3 4.9 5.4.8-3.9 3.8.9 5.5-4.7-2.4-4.7 2.4.9-5.5L4.3 9.7l5.4-.8Z" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...baseProps}>
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      );
    case 'document':
      return (
        <svg {...baseProps}>
          <rect x="6" y="4" width="12" height="16" rx="2" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </svg>
      );
    case 'checklist':
      return (
        <svg {...baseProps}>
          <rect x="4" y="4" width="16" height="16" rx="2.5" />
          <path d="M8 12h8" />
          <path d="M8 8l2 2 4-4" />
        </svg>
      );
    case 'close':
      return (
        <svg {...baseProps}>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="6" y1="18" x2="18" y2="6" />
        </svg>
      );
    default:
      return null;
  }
}
