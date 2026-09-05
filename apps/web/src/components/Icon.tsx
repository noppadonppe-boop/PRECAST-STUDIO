import type { ReactNode } from 'react';

const paths: Record<string, ReactNode> = {
  portfolio: <><rect x="3" y="4" width="7" height="7" rx="1"/><rect x="14" y="4" width="7" height="7" rx="1"/><rect x="3" y="15" width="7" height="5" rx="1"/><rect x="14" y="15" width="7" height="5" rx="1"/></>,
  review: <><path d="M9 11l2 2 4-5"/><path d="M5 4h14v16H5z"/><path d="M9 4V2h6v2"/></>,
  team: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6"/><path d="M15 15c3.5-.5 6 1 6 4"/></>,
  audit: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  library: <><path d="M4 4h6v16H4zM14 4h6v16h-6z"/><path d="M7 8h0M17 8h0"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9L7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1L7 17M17 7l2.1-2.1"/></>,
  search: <><circle cx="10" cy="10" r="6"/><path d="M14.5 14.5L21 21"/></>,
  bell: <><path d="M6 9a6 6 0 0112 0v5l2 3H4l2-3z"/><path d="M10 21h4"/></>,
  chevron: <path d="M9 6l6 6-6 6"/>,
  shield: <><path d="M12 2l8 3v6c0 5-3.2 8.5-8 11-4.8-2.5-8-6-8-11V5z"/><path d="M8.5 12l2.2 2.2 4.8-5"/></>,
  cube: <><path d="M12 2l9 5-9 5-9-5z"/><path d="M3 7v10l9 5 9-5V7M12 12v10"/></>,
  warning: <><path d="M12 3L2.5 20h19z"/><path d="M12 9v5M12 17h0"/></>,
  arrow: <path d="M5 12h14M14 7l5 5-5 5"/>,
  close: <path d="M6 6l12 12M18 6L6 18"/>,
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths; size?: number }) {
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

