import {
  Armchair,
  Ban,
  Baby,
  Bed,
  Brain,
  CalendarDays,
  Car,
  Check,
  CircleHelp,
  ClipboardList,
  Clock,
  Droplet,
  Dumbbell,
  Ear,
  Expand,
  Flame,
  Footprints,
  Gauge,
  Hand,
  Heart,
  HeartPulse,
  Hourglass,
  MessageCircle,
  MessageSquareText,
  Moon,
  Move,
  PersonStanding,
  Pill,
  Scale,
  ShieldAlert,
  Smile,
  Split,
  Sun,
  Syringe,
  Timer,
  Utensils,
  Wine,
  Waves,
  Weight,
  Wind,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { SVGProps } from "react";

// Pictograms are drawn on lucide's 24x24 grid with the same 2px stroke so the
// custom ones sit next to the library ones without looking pasted in.

type CustomIcon = (p: SVGProps<SVGSVGElement>) => React.ReactElement;

function base(p: SVGProps<SVGSVGElement>, children: React.ReactNode) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...p}>
      {children}
    </svg>
  );
}

const Lungs: CustomIcon = (p) =>
  base(
    p,
    <>
      <path d="M12 3v8" />
      <path d="M12 11c-1.5 0-2.5 1-2.5 1" />
      <path d="M12 11c1.5 0 2.5 1 2.5 1" />
      <path d="M9.5 7.5C7 6 4 9 3.5 13.5S4 20 6.5 20 9.5 18 9.5 15V7.5Z" />
      <path d="M14.5 7.5C17 6 20 9 20.5 13.5S20 20 17.5 20 14.5 18 14.5 15V7.5Z" />
    </>,
  );

const Fall: CustomIcon = (p) =>
  base(
    p,
    <>
      <circle cx="16" cy="5" r="2" />
      <path d="M14.5 8 10 11l-4-1" />
      <path d="m10 11 1.5 4-4 3" />
      <path d="m11.5 15 4.5 1 2 4" />
      <path d="M3 21h18" />
      <path d="M4 5.5 6 7M3 9h2.5" />
    </>,
  );

const Belly: CustomIcon = (p) =>
  base(
    p,
    <>
      <path d="M8 3c-1 3-3 5-3 9 0 5 3 9 7 9s7-4 7-9c0-4-2-6-3-9" />
      <circle cx="12" cy="13" r="1" />
      <path d="M9 9.5c1.5 1 4.5 1 6 0" />
    </>,
  );

const Stairs: CustomIcon = (p) =>
  base(
    p,
    <>
      <path d="M3 20h5v-4h4v-4h4V8h5" />
      <path d="M3 20V8M21 8v12H3" />
    </>,
  );

const WeakArm: CustomIcon = (p) =>
  base(
    p,
    <>
      <path d="M4 18c2-1 4-1 6-3l3-4c1-1.5 3-2 4.5-1" />
      <path d="M17.5 10c1 .5 2 1.5 2 3" />
      <path d="M14 4l1.5 2-1.5 1.5L16 9" />
      <path d="M4 21h16" />
    </>,
  );

const Dizzy: CustomIcon = (p) =>
  base(
    p,
    <>
      <path d="M12 12c0-1 1-1.5 1.7-1 .9.6.7 2.2-.5 2.8-1.7.8-3.7-.3-4-2.2-.4-2.5 1.8-4.6 4.3-4.4 3.3.3 5.2 3.6 4.3 6.6-1.1 3.7-5.4 5.2-8.7 3.5" />
      <path d="M4 5l1 1M20 5l-1 1M12 2v1.5" />
    </>,
  );

const HeadHit: CustomIcon = (p) =>
  base(
    p,
    <>
      <circle cx="11" cy="13" r="7" />
      <path d="M17 4l1.5 2.5M21 7.5l-2.5.5M19.5 2l-.5 2" />
      <path d="M8.5 12h.01M13.5 12h.01M9 16c1.2.8 2.8.8 4 0" />
    </>,
  );

const RaiseArms: CustomIcon = (p) =>
  base(
    p,
    <>
      <circle cx="12" cy="5" r="2" />
      <path d="M5 3l3 6h8l3-6" />
      <path d="M9 9v5l-1 7M15 9v5l1 7M9 14h6" />
    </>,
  );

const LIBRARY: Record<string, LucideIcon> = {
  ear: Ear,
  help: CircleHelp,
  chest: HeartPulse,
  blood: Droplet,
  clock: Clock,
  walk: Footprints,
  chair: Armchair,
  bed: Bed,
  exercise: Dumbbell,
  food: Utensils,
  drink: Wine,
  car: Car,
  scale: Scale,
  move: Move,
  hand: Hand,
  pill: Pill,
  none: Ban,
  pain: Zap,
  pressure: Weight,
  sharp: Zap,
  burning: Flame,
  tearing: Split,
  aching: Waves,
  body: PersonStanding,
  spread: Expand,
  gauge: Gauge,
  allergy: ShieldAlert,
  syringe: Syringe,
  heart: Heart,
  inhaler: Wind,
  clipboard: ClipboardList,
  brain: Brain,
  baby: Baby,
  smile: Smile,
  speech: MessageCircle,
  chat: MessageSquareText,
  yes: Check,
  no: X,
  "duration.minutes": Timer,
  "duration.about_1_hour": Clock,
  "duration.few_hours": Hourglass,
  "duration.today": Sun,
  "duration.yesterday": Moon,
  "duration.days": CalendarDays,
  "duration.unknown": CircleHelp,
};

const CUSTOM: Record<string, CustomIcon> = {
  lungs: Lungs,
  fall: Fall,
  belly: Belly,
  stairs: Stairs,
  arm: WeakArm,
  dizzy: Dizzy,
  head: HeadHit,
  arms: RaiseArms,
};

export function Icon({ name, size = 32, className, strokeWidth }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const C = CUSTOM[name];
  if (C) return <C width={size} height={size} className={className} strokeWidth={strokeWidth ?? 2} aria-hidden />;
  const L = LIBRARY[name] ?? CircleHelp;
  return <L size={size} className={className} strokeWidth={strokeWidth ?? 2} aria-hidden />;
}
