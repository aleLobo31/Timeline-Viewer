import type { ReactNode } from 'react';

export type Direction = 'up' | 'down' | 'left' | 'right';

const ROTATION: Record<Direction, number> = { up: 0, right: 90, down: 180, left: 270 };

function Svg({ children, rotate = 0 }: { children: ReactNode; rotate?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
    >
      {children}
    </svg>
  );
}

/** Arrow pointing in the given direction. */
export const ArrowIcon = ({ direction }: { direction: Direction }) => (
  <Svg rotate={ROTATION[direction]}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);

export const ImageIcon = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="9" cy="10" r="1.5" />
    <path d="M21 16l-5-5-8 9" />
  </Svg>
);

export const CheckIcon = () => (
  <Svg>
    <path d="M5 12l5 5 9-10" />
  </Svg>
);

export const CloseIcon = () => (
  <Svg>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);

export const ChevronIcon = ({ open }: { open: boolean }) => (
  <Svg rotate={open ? 180 : 0}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
