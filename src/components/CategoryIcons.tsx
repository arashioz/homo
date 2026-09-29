/** Minimal line icons for smart-home categories */

import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const stroke = {
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function IconSwitch({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="10" y="8" width="28" height="32" rx="4" {...stroke} />
      <circle cx="24" cy="22" r="5" {...stroke} />
      <path d="M24 27v7" {...stroke} />
    </Svg>
  );
}

export function IconOutlet({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="10" y="10" width="28" height="28" rx="6" {...stroke} />
      <path d="M18 20v8M30 20v8" {...stroke} />
      <path d="M24 28v4" {...stroke} />
    </Svg>
  );
}

export function IconLock({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="12" y="22" width="24" height="16" rx="3" {...stroke} />
      <path d="M17 22v-5a7 7 0 0 1 14 0v5" {...stroke} />
      <circle cx="24" cy="30" r="2" {...stroke} />
    </Svg>
  );
}

export function IconHub({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="24" cy="24" r="5" {...stroke} />
      <circle cx="24" cy="10" r="3" {...stroke} />
      <circle cx="36" cy="30" r="3" {...stroke} />
      <circle cx="12" cy="30" r="3" {...stroke} />
      <path d="M24 19v-6M28.5 26.5l5 3.2M19.5 26.5l-5 3.2" {...stroke} />
    </Svg>
  );
}

export function IconAudio({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16 18v12M24 12v24M32 18v12" {...stroke} />
      <circle cx="16" cy="34" r="2.5" {...stroke} />
      <circle cx="24" cy="38" r="2.5" {...stroke} />
      <circle cx="32" cy="34" r="2.5" {...stroke} />
    </Svg>
  );
}

export function IconCurtain({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8 12h32" {...stroke} />
      <path d="M12 12v24c0 0 4-4 6-4s6 4 6 4V12" {...stroke} />
      <path d="M24 12v24c0 0 4-4 6-4s6 4 6 4V12" {...stroke} />
    </Svg>
  );
}

export function IconIntercom({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="11" y="8" width="26" height="32" rx="4" {...stroke} />
      <rect x="15" y="12" width="18" height="14" rx="2" {...stroke} />
      <circle cx="24" cy="34" r="3" {...stroke} />
    </Svg>
  );
}

export function IconRelay({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="9" y="14" width="30" height="20" rx="3" {...stroke} />
      <path d="M15 14V10M24 14V10M33 14V10" {...stroke} />
      <path d="M16 24h16" {...stroke} />
      <circle cx="20" cy="24" r="2" fill="currentColor" />
    </Svg>
  );
}

export function IconSensor({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="24" cy="24" r="7" {...stroke} />
      <path d="M24 8v4M24 36v4M8 24h4M36 24h4" {...stroke} />
      <path d="M13 13l2.5 2.5M32.5 32.5L35 35M35 13l-2.5 2.5M13 35l2.5-2.5" {...stroke} />
    </Svg>
  );
}

export function IconBuilding({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10 40V16l14-8 14 8v24" {...stroke} />
      <path d="M18 40V24h12v16" {...stroke} />
      <path d="M22 28h4M22 33h4" {...stroke} />
    </Svg>
  );
}

export function IconGeneric({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M24 8l14 8v16l-14 8-14-8V16l14-8z" {...stroke} />
      <circle cx="24" cy="24" r="4" {...stroke} />
    </Svg>
  );
}

export function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("ساختمان") || n.includes("سنتی")) return IconBuilding;
  if (n.includes("کلید")) return IconSwitch;
  if (n.includes("پریز")) return IconOutlet;
  if (n.includes("قفل") || n.includes("دستگیره") || n.includes("امنیت")) return IconLock;
  if (n.includes("هاب") || n.includes("مرکزی") || n.includes("گیت وی") || n.includes("gateway"))
    return IconHub;
  if (n.includes("صوتی") || n.includes("اسپیکر") || n.includes("بلندگو")) return IconAudio;
  if (n.includes("پرده") || n.includes("کرکره")) return IconCurtain;
  if (n.includes("آیفون") || n.includes("تصویری") || n.includes("درب")) return IconIntercom;
  if (n.includes("رله") || n.includes("ماژول")) return IconRelay;
  if (n.includes("سنسور") || n.includes("حسگر")) return IconSensor;
  if (n.includes("پکیج")) return IconHub;
  if (n.includes("نور") || n.includes("روشنایی")) return IconSwitch;
  return IconGeneric;
}
