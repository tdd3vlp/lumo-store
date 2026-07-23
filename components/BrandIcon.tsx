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
  const Glyph = GLYPHS[type];
  if (!Glyph) return null;
  return <Glyph className="h-[18px] w-[18px]" style={{ color: BRAND_COLOR[type] }} />;
}
