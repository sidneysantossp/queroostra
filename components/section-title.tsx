type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
};

export function SectionTitle({
  eyebrow,
  title,
  description,
  align = "center",
}: SectionTitleProps) {
  return (
    <div className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-xl"}>
      {eyebrow && (
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-gold">
          {eyebrow}
        </p>
      )}
      <h2 className="font-display text-4xl font-semibold leading-none text-pearl md:text-6xl">
        {title}
      </h2>
      {description && (
        <p className="mt-5 text-sm leading-7 text-silver md:text-base">{description}</p>
      )}
    </div>
  );
}
