import { BsNintendoSwitch } from "react-icons/bs";
import { FaApple, FaPlaystation, FaSteam, FaTelegram, FaXbox } from "react-icons/fa6";

// All five brand marks now come from react-icons (Font Awesome 6 brands +
// Bootstrap Icons, both bundled in the one package) — react-icons is the only
// icon library found that carries Xbox and Nintendo Switch alongside
// PlayStation/Steam/Apple, so the whole row is real vector logos, no
// hand-drawn stand-ins.
const BRAND_COLOR: Record<string, string> = {
  playstation: "#0070d1",
  steam: "#171a21",
  apple: "#1d1d1f",
  xbox: "#107c10",
  nintendo: "#e60012",
  telegram: "#29a9ea",
  "ps-account": "#0070d1",
};

// "Игры на PlayStation" sits next to the PlayStation card entry, so it needs a
// mark of its own — the PS logo twice in one row reads as a duplicate.
function GamepadGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      style={{ color: BRAND_COLOR.playstation }}
      aria-hidden="true"
    >
      <path
        d="M7 8h10a4 4 0 0 1 3.9 3.1l.7 3.6a2.1 2.1 0 0 1-3.8 1.5L16 14H8l-1.8 2.2a2.1 2.1 0 0 1-3.8-1.5l.7-3.6A4 4 0 0 1 7 8Z"
        strokeLinejoin="round"
      />
      <path d="M7 11.5v2M6 12.5h2m8-1h.01M18 13h.01" strokeLinecap="round" />
    </svg>
  );
}

function GridGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="currentColor" aria-hidden="true">
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
    </svg>
  );
}

const GLYPHS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  playstation: FaPlaystation,
  steam: FaSteam,
  apple: FaApple,
  xbox: FaXbox,
  nintendo: BsNintendoSwitch,
  telegram: FaTelegram,
  "ps-account": FaPlaystation,
};

export default function BrandIcon({ type }: { type: string }) {
  if (type === "all") return <GridGlyph />;
  if (type === "games") return <GamepadGlyph />;
  const Glyph = GLYPHS[type];
  if (!Glyph) return null;
  return <Glyph className="h-[18px] w-[18px]" style={{ color: BRAND_COLOR[type] }} />;
}
