import type { SVGProps } from 'react';
import type { IconKey } from '../lib/types';

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 22, children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconHome = (p: Props) => (
  <Svg {...p}>
    <path d="M4 10.4 12 4l8 6.4" />
    <path d="M6 9.6V19a1 1 0 0 0 1 1h3.2v-4.6h3.6V20H17a1 1 0 0 0 1-1V9.6" />
  </Svg>
);

export const IconReceipt = (p: Props) => (
  <Svg {...p}>
    <path d="M6 3.6h12v17l-2.4-1.6-2.4 1.6-2.4-1.6L6.4 20.6 6 20V3.6Z" />
    <path d="M9.2 8.4h5.6M9.2 12h4" />
  </Svg>
);

export const IconTarget = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3.6" />
    <path d="M12 3v2.4M21 12h-2.4M12 21v-2.4M3 12h2.4" />
  </Svg>
);

export const IconWallet = (p: Props) => (
  <Svg {...p}>
    <path d="M3.6 8.4A2.4 2.4 0 0 1 6 6h11.4A2.4 2.4 0 0 1 20 8.4v8.2a2.4 2.4 0 0 1-2.4 2.4H6a2.4 2.4 0 0 1-2.4-2.4V8.4Z" />
    <path d="M14.6 6.2v-.6a1.6 1.6 0 0 0-1.9-1.6L5.4 5.2" />
    <circle cx="16.2" cy="12.6" r="1.4" />
  </Svg>
);

export const IconGrid = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6.4" height="6.4" rx="2" />
    <rect x="13.6" y="4" width="6.4" height="6.4" rx="2" />
    <rect x="4" y="13.6" width="6.4" height="6.4" rx="2" />
    <rect x="13.6" y="13.6" width="6.4" height="6.4" rx="2" />
  </Svg>
);

export const IconPlus = (p: Props) => (
  <Svg strokeWidth={2.4} {...p}>
    <path d="M12 5.4v13.2M5.4 12h13.2" />
  </Svg>
);

export const IconCamera = (p: Props) => (
  <Svg {...p}>
    <path d="M4.4 9.4a2 2 0 0 1 2-2h1.8l1.2-1.8h5.2l1.2 1.8h1.8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2v-7Z" />
    <circle cx="12" cy="12.8" r="3.2" />
  </Svg>
);

export const IconQr = (p: Props) => (
  <Svg {...p}>
    <path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" />
    <path d="M8.4 8.4h2.2v2.2H8.4zM13.4 13.4h2.2v2.2h-2.2zM8.4 13.6h2M14 8.6h1.6v1.4" />
  </Svg>
);

export const IconSearch = (p: Props) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="m16 16 3.6 3.6" />
  </Svg>
);

export const IconFilter = (p: Props) => (
  <Svg {...p}>
    <path d="M4 7.4h16M7 12h10M10 16.6h4" />
  </Svg>
);

export const IconChevronLeft = (p: Props) => (
  <Svg {...p}>
    <path d="m14.4 5.6-6.4 6.4 6.4 6.4" />
  </Svg>
);

export const IconChevronRight = (p: Props) => (
  <Svg {...p}>
    <path d="m9.6 5.6 6.4 6.4-6.4 6.4" />
  </Svg>
);

export const IconChevronDown = (p: Props) => (
  <Svg {...p}>
    <path d="m5.6 9.4 6.4 6.2 6.4-6.2" />
  </Svg>
);

export const IconMore = (p: Props) => (
  <Svg strokeWidth={2.2} {...p}>
    <circle cx="5.6" cy="12" r="1.2" fill="currentColor" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" />
    <circle cx="18.4" cy="12" r="1.2" fill="currentColor" />
  </Svg>
);

export const IconClose = (p: Props) => (
  <Svg strokeWidth={2.2} {...p}>
    <path d="m6.4 6.4 11.2 11.2M17.6 6.4 6.4 17.6" />
  </Svg>
);

export const IconCheck = (p: Props) => (
  <Svg strokeWidth={2.3} {...p}>
    <path d="m5 12.6 4.6 4.4L19 6.6" />
  </Svg>
);

export const IconArrowRight = (p: Props) => (
  <Svg {...p}>
    <path d="M4.6 12h14.2M13.4 6.6 18.8 12l-5.4 5.4" />
  </Svg>
);

export const IconArrowUpRight = (p: Props) => (
  <Svg {...p}>
    <path d="M7 17 17 7M9.4 7H17v7.6" />
  </Svg>
);

/** Four point sparkle, used only as the brand's decorative mark. */
export const IconSparkle = (p: Props) => (
  <Svg fill="currentColor" stroke="none" {...p}>
    <path d="M12 2.6c.5 4.9 1.9 6.7 6.6 7.4v.3c-4.7.7-6.1 2.5-6.6 7.4h-.2c-.5-4.9-1.9-6.7-6.6-7.4v-.3c4.7-.7 6.1-2.5 6.6-7.4h.2Z" />
  </Svg>
);

export const IconTrophy = (p: Props) => (
  <Svg {...p}>
    <path d="M8 4.4h8v3.2a4 4 0 0 1-8 0V4.4Z" />
    <path d="M8 6H5.4v1.6A3.2 3.2 0 0 0 8 10.8M16 6h2.6v1.6A3.2 3.2 0 0 1 16 10.8" />
    <path d="M12 11.6v3.8M9 19.6h6l-.6-2.2H9.6L9 19.6Z" />
  </Svg>
);

export const IconDownload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v10.4M7.6 10.4 12 14.8l4.4-4.4" />
    <path d="M5 18.4h14" />
  </Svg>
);

export const IconTrash = (p: Props) => (
  <Svg {...p}>
    <path d="M5 7.4h14M9.4 7.4V5.2h5.2v2.2" />
    <path d="M6.6 7.4l.8 11.2a1.6 1.6 0 0 0 1.6 1.4h6a1.6 1.6 0 0 0 1.6-1.4l.8-11.2" />
    <path d="M10.4 11v5.4M13.6 11v5.4" />
  </Svg>
);

export const IconPencil = (p: Props) => (
  <Svg {...p}>
    <path d="M15.4 5.2 18.8 8.6 9 18.4l-4.2 1 1-4.2 9.6-10Z" />
    <path d="m13.8 6.8 3.4 3.4" />
  </Svg>
);

export const IconSun = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3.2v1.8M12 19v1.8M4.6 12H2.8M21.2 12h-1.8M6.4 6.4 5.2 5.2M18.8 18.8l-1.2-1.2M17.6 6.4l1.2-1.2M5.2 18.8l1.2-1.2" />
  </Svg>
);

export const IconMoon = (p: Props) => (
  <Svg {...p}>
    <path d="M19 14.6A7.6 7.6 0 0 1 9.4 5a7.8 7.8 0 1 0 9.6 9.6Z" />
  </Svg>
);

export const IconLogout = (p: Props) => (
  <Svg {...p}>
    <path d="M14.4 5.4H7a2 2 0 0 0-2 2v9.2a2 2 0 0 0 2 2h7.4" />
    <path d="M16.6 8.6 20 12l-3.4 3.4M10.6 12H19" />
  </Svg>
);

export const IconUser = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="8.4" r="3.6" />
    <path d="M5 20c.6-3.4 3.5-5.4 7-5.4s6.4 2 7 5.4" />
  </Svg>
);

export const IconUpload = (p: Props) => (
  <Svg {...p}>
    <path d="M12 15.6V5M7.6 9.4 12 5l4.4 4.4" />
    <path d="M5 19h14" />
  </Svg>
);

export const IconTransfer = (p: Props) => (
  <Svg {...p}>
    <path d="M4.6 9h11.2l-3-3M19.4 15H8.2l3 3" />
  </Svg>
);

export const IconBell = (p: Props) => (
  <Svg {...p}>
    <path d="M6.6 10.4a5.4 5.4 0 0 1 10.8 0c0 4 1.4 5.2 1.4 5.2H5.2s1.4-1.2 1.4-5.2Z" />
    <path d="M10.4 19a1.8 1.8 0 0 0 3.2 0" />
  </Svg>
);

export const IconAlert = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4.6 20 19H4l8-14.4Z" />
    <path d="M12 10v4M12 16.8v.2" />
  </Svg>
);

export const IconInfo = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 11v5M12 8.2v.2" />
  </Svg>
);

export const IconArchive = (p: Props) => (
  <Svg {...p}>
    <path d="M4 6.6h16v2.6H4zM5.7 9.2v9a1.7 1.7 0 0 0 1.7 1.7h9.2a1.7 1.7 0 0 0 1.7-1.7v-9" />
    <path d="M12 12.2v4.2M9.9 14.3 12 16.4l2.1-2.1" />
  </Svg>
);

export const IconRestore = (p: Props) => (
  <Svg {...p}>
    <path d="M4.6 9.6A7.8 7.8 0 1 1 5 15" />
    <path d="M4 5.4v4.4h4.4" />
  </Svg>
);

export const IconCalendar = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="5.4" width="16" height="14.6" rx="2.4" />
    <path d="M4 9.6h16M8.6 3.6v3M15.4 3.6v3" />
  </Svg>
);

export const IconLock = (p: Props) => (
  <Svg {...p}>
    <rect x="5.4" y="10.4" width="13.2" height="9.4" rx="2.4" />
    <path d="M8.6 10.4V8A3.4 3.4 0 0 1 15.4 8v2.4" />
  </Svg>
);

export const IconSettings = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3.4v2.2M12 18.4v2.2M3.4 12h2.2M18.4 12h2.2M6 6l1.6 1.6M16.4 16.4 18 18M18 6l-1.6 1.6M7.6 16.4 6 18" />
    <circle cx="12" cy="12" r="7.4" strokeDasharray="2 4" opacity="0.55" />
  </Svg>
);

export const IconFood = (p: Props) => (
  <Svg {...p}>
    <path d="M4 11.2h16a8 8 0 0 1-16 0Z" />
    <path d="M8 8.4c0-1.4 1-1.6 1-3M12 8.2c0-1.6 1.2-1.8 1.2-3.4M16 8.4c0-1.4 1-1.6 1-3" />
  </Svg>
);

export const IconTransport = (p: Props) => (
  <Svg {...p}>
    <path d="M4.4 17.6h15.2" />
    <circle cx="7.2" cy="17.6" r="1.7" />
    <circle cx="16.8" cy="17.6" r="1.7" />
    <path d="M4.4 17.6v-3.4l2-1 2.2-3.8h5.8l2.6 4.6 2.6 1.4v2.2" />
    <path d="M10.8 9.4h4.4" />
  </Svg>
);

export const IconShopping = (p: Props) => (
  <Svg {...p}>
    <path d="M5.4 8h13.2l-1 11.2a1.6 1.6 0 0 1-1.6 1.4H8a1.6 1.6 0 0 1-1.6-1.4L5.4 8Z" />
    <path d="M9 8V6.4a3 3 0 0 1 6 0V8" />
  </Svg>
);

export const IconHealth = (p: Props) => (
  <Svg {...p}>
    <path d="M12 20s-7.2-4.4-7.2-9.4A4.2 4.2 0 0 1 12 8a4.2 4.2 0 0 1 7.2 2.6C19.2 15.6 12 20 12 20Z" />
    <path d="M8 13.2h2l1-2 1.6 3.4 1.2-1.4H16" />
  </Svg>
);

export const IconFun = (p: Props) => (
  <Svg {...p}>
    <path d="M8.4 7.6h7.2a4.2 4.2 0 0 1 4.1 3.4l.7 4.4a2.8 2.8 0 0 1-4.9 2.3l-1-1.1H9.5l-1 1.1a2.8 2.8 0 0 1-4.9-2.3l.7-4.4a4.2 4.2 0 0 1 4.1-3.4Z" />
    <path d="M8 11.4v2.2M6.9 12.5h2.2M15.6 12.8v.2M17.4 11.8v.2" />
  </Svg>
);

export const IconBill = (p: Props) => (
  <Svg {...p}>
    <path d="M6.4 3.8h11.2v16.4l-2.2-1.4-1.6 1.4-1.8-1.4-1.8 1.4-1.6-1.4-2.2 1.4V3.8Z" />
    <path d="M9 8.4h6M9 12h4.4" />
  </Svg>
);

export const IconEducation = (p: Props) => (
  <Svg {...p}>
    <path d="M4 8.6 12 5l8 3.6-8 3.6-8-3.6Z" />
    <path d="M7 10.6v4.6c0 1.2 2.2 2.4 5 2.4s5-1.2 5-2.4v-4.6" />
    <path d="M20 8.6v5" />
  </Svg>
);

export const IconSalary = (p: Props) => (
  <Svg {...p}>
    <rect x="3.6" y="6.4" width="16.8" height="11.2" rx="2.2" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6.8 12h.2M17 12h.2" />
  </Svg>
);

export const IconBonus = (p: Props) => (
  <Svg {...p}>
    <ellipse cx="12" cy="7.2" rx="6" ry="2.6" />
    <path d="M6 7.2v4.2c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6V7.2" />
    <path d="M6 11.4v4.2c0 1.4 2.7 2.6 6 2.6s6-1.2 6-2.6v-4.2" />
  </Svg>
);

export const IconGift = (p: Props) => (
  <Svg {...p}>
    <rect x="4.4" y="9.4" width="15.2" height="10.2" rx="2" />
    <path d="M4.4 12.6h15.2M12 9.4v10.2" />
    <path d="M12 9.4C10.4 6 9 5.4 8 6s-.8 2.4 4 3.4Zm0 0c1.6-3.4 3-4 4-3.4s.8 2.4-4 3.4Z" />
  </Svg>
);

export const IconOther = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" strokeDasharray="3 3" />
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
  </Svg>
);

export const CATEGORY_ICONS: Record<IconKey, (p: Props) => JSX.Element> = {
  food: IconFood,
  transport: IconTransport,
  home: IconHome,
  shopping: IconShopping,
  health: IconHealth,
  fun: IconFun,
  bill: IconBill,
  education: IconEducation,
  salary: IconSalary,
  bonus: IconBonus,
  gift: IconGift,
  other: IconOther,
};

export const ICON_KEYS = Object.keys(CATEGORY_ICONS) as IconKey[];
