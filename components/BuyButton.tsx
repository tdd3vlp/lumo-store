import Link from "next/link";

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      className="h-3 w-3"
      aria-hidden="true"
    >
      <path d="M9 5.5 15 12l-6 6.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PILL_CLASSNAME =
  "group/buy inline-flex w-full items-center justify-between gap-2 rounded-full border border-[var(--signal)] bg-[var(--ink)] py-1 pl-4 pr-1 transition hover:border-[var(--signal-strong)]";

function BuyButtonContent({ label }: { label: string }) {
  return (
    <>
      <span className="whitespace-nowrap text-xs font-medium uppercase tracking-wide text-white">
        {label}
      </span>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--ink)] transition group-hover/buy:bg-[var(--signal-strong)]">
        <ChevronIcon />
      </span>
    </>
  );
}

type BuyButtonProps = {
  label?: string;
  className?: string;
  "aria-label"?: string;
} & (
  | { href: string; onClick?: undefined }
  | { href?: undefined; onClick?: () => void }
);

/** Renders as a `<Link>` when `href` is given, otherwise a `<button>` that fires `onClick`. */
export default function BuyButton({ label = "Купить", className = "", ...rest }: BuyButtonProps) {
  if (rest.href) {
    return (
      <Link href={rest.href} aria-label={rest["aria-label"]} className={`${PILL_CLASSNAME} ${className}`}>
        <BuyButtonContent label={label} />
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={rest.onClick}
      aria-label={rest["aria-label"]}
      className={`${PILL_CLASSNAME} ${className}`}
    >
      <BuyButtonContent label={label} />
    </button>
  );
}
