// 線で描いたアイコン

type P = { size?: number; className?: string };

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const BackIcon = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><polyline points="15 6 9 12 15 18" /></svg>
);
export const NextIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><polyline points="9 6 15 12 9 18" /></svg>
);
export const DownIcon = ({ size = 16, className }: P) => (
  <svg {...base(size)} className={className}><polyline points="6 9 12 15 18 9" /></svg>
);
export const PencilIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
);
export const MenuIcon = ({ size = 22, className }: P) => (
  <svg {...base(size)} className={className}><line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="17" x2="20" y2="17" /></svg>
);
export const PlusIcon = ({ size = 26, className }: P) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
);
export const CloseIcon = ({ size = 18, className }: P) => (
  <svg {...base(size)} className={className}><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
);
export const PersonIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
);
export const PeopleIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17" cy="9" r="2.5" /><path d="M16 14a5 5 0 0 1 5 6" /></svg>
);
export const TrophyIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M12 13v4" /><line x1="8" y1="20" x2="16" y2="20" /></svg>
);
export const ListIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} className={className}><rect x="5" y="4" width="14" height="17" rx="2" /><line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /></svg>
);
export const AlertIcon = ({ size = 20, className }: P) => (
  <svg {...base(size)} strokeWidth={2.2} className={className}><circle cx="12" cy="12" r="9" /><line x1="12" y1="7.5" x2="12" y2="13" /><line x1="12" y1="16.5" x2="12" y2="16.5" /></svg>
);
export const CheckIcon = ({ size = 14, className }: P) => (
  <svg {...base(size)} strokeWidth={3} className={className}><polyline points="5 12 10 17 19 7" /></svg>
);
export const BigTrophyIcon = ({ size = 64, className }: P) => (
  <svg {...base(size)} strokeWidth={1.6} className={className}><path d="M8 4h8v5a4 4 0 0 1-8 0Z" /><path d="M8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3" /><path d="M12 13v4" /><line x1="8" y1="20" x2="16" y2="20" /></svg>
);
export const HourglassIcon = ({ size = 64, className }: P) => (
  <svg {...base(size)} strokeWidth={1.4} className={className}><path d="M6 3h12M6 21h12" /><path d="M7 3v3a5 5 0 0 0 10 0V3" /><path d="M7 21v-3a5 5 0 0 1 10 0v3" /></svg>
);
