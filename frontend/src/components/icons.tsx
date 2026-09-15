interface IconProps {
  size?: number;
  className?: string;
}

const base = (props: IconProps) => ({
  width: props.size ?? 24,
  height: props.size ?? 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  className: props.className,
} as const);

export function IconHome(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconUpload(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M12 16V4m0 0 4 4m-4-4L8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconEdit(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M4 20h4l10-10a2.121 2.121 0 0 0-3-3L5 17v3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 6.5 17 3l4 4-3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconChart(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M4 4v15a1 1 0 0 0 1 1h15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m8 15 4-5 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconGraph(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="6" r="2.3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="8" r="2.3" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="18" r="2.3" stroke="currentColor" strokeWidth="2" />
      <path d="M7.6 7.4 16 16.4M8 7.4l7.6-.8M10 17.4l6.4-7.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconBoard(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="18" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="3" width="7" height="12" rx="1.5" stroke="currentColor" strokeWidth="2" />
      <path d="M14 19h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCap(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M2 9 12 4l10 5-10 5L2 9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 11.5V16c0 1.1 2.7 2.5 6 2.5s6-1.4 6-2.5v-4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconLogout(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m16 17 5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconMenu(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconUsers(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 5.5a3 3 0 0 1 0 5.6M18.5 15.4c1.6.8 2.5 2.2 2.5 4.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheck(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
      <path d="m8.5 12.5 2.3 2.3 4.7-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconCoins(props: IconProps = {}) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="2" />
      <path d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}