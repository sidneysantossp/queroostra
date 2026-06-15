type LogoProps = {
  compact?: boolean;
  light?: boolean;
  className?: string;
};

export function OysterLogo({
  compact = false,
  light = false,
  className = "",
}: LogoProps) {
  const ink = light ? "#050505" : "#E8C76A";

  return (
    <div className={`flex items-center gap-3 ${className}`} aria-label="Quero Ostra">
      <svg
        width={compact ? 38 : 48}
        height={compact ? 38 : 48}
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-label="Símbolo de uma ostra"
      >
        <path
          d="M9.5 37.2C7.2 28.5 12.9 18.3 22 13.5c8.7-4.6 18-2 23.9 5.2 8.1 2.1 12.6 9.5 10 17.1-2.3 6.7-9.9 10.6-17.5 9.2-6.3 6.8-17.3 7.5-24.1 1.5-2.9-2.5-4.5-5.7-4.8-9.3Z"
          stroke={ink}
          strokeWidth="1.7"
        />
        <path
          d="M15.2 35.4c3.4-7.2 9.6-12.6 17-14.8m-13.5 20c5.4-5.2 12.2-8.8 19.5-10.2m-12.6 14c5.6-2.5 12-3.1 18-1.6m-17.9-17c2 1.4 3.7 3.2 4.9 5.3m6.7-12.8c-.3 3.4.3 6.6 1.8 9.6m8.1-5.1c-1.7 2.4-2.7 5.2-2.9 8.1"
          stroke={ink}
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M28.5 34.4c3.2-3.3 8.8-3.9 12.5-1.3 3.1 2.2 3.9 6.4 1.4 9.1-2.9 3.2-8.6 3.2-12.1.5-2.8-2.1-3.7-5.7-1.8-8.3Z"
          stroke={ink}
          strokeWidth="1.5"
        />
      </svg>
      {!compact && (
        <div className="leading-none whitespace-nowrap">
          <div
            className={`font-display text-[1.55rem] font-semibold tracking-[0.04em] ${
              light ? "text-ink" : "text-pearl"
            }`}
          >
            QUERO <span className={light ? "text-[#8b6516]" : "text-champagne"}>OSTRA</span>
          </div>
          <div
            className={`mt-1 text-[0.52rem] font-semibold tracking-[0.22em] ${
              light ? "text-[#6f5721]" : "text-gold"
            }`}
          >
            FRESCOR DO MAR NA SUA MESA
          </div>
        </div>
      )}
    </div>
  );
}
