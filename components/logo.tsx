import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg";

const containerSizes: Record<LogoSize, string> = {
  xs: "w-6 h-6 rounded-[6px]",
  sm: "w-8 h-8 rounded-[8px]",
  md: "w-10 h-10 rounded-[10px]",
  lg: "w-14 h-14 rounded-[14px]",
};

const svgSizes: Record<LogoSize, number> = { xs: 13, sm: 16, md: 20, lg: 28 };

const textSizes: Record<LogoSize, string> = {
  xs: "text-xs",
  sm: "text-[14px]",
  md: "text-[16px]",
  lg: "text-xl",
};

/**
 * The α glyph drawn as:
 *   – A circular bowl (large arc, counterclockwise) from upper-right to lower-right
 *   – A descending right stroke (the distinguishing element of lowercase α)
 * viewBox 0 0 16 16, designed at small sizes so the opening gap stays readable.
 */
function AlphaMark({ size, light = false }: { size: number; light?: boolean }) {
  const stroke = light ? "#F5F5F7" : "#F5F5F7";
  const w = size;
  const h = size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 16" fill="none" aria-hidden>
      {/*
        Bowl: M 12.5 6.5  →  arc (large, CCW)  →  12.5 9.5
        Circle center ≈ (7.5, 8), radius 5.
        The gap on the right between y=6.5 and y=9.5 is the α opening.
      */}
      <path
        d="M 12.5 6.5 A 5 5 0 1 0 12.5 9.5"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
        fill="none"
      />
      {/* Descending right stroke */}
      <line
        x1="12.5" y1="6.5"
        x2="12.5" y2="13.5"
        stroke={stroke}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoMark({
  size = "sm",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center flex-shrink-0",
        "bg-pa-surface-2 border border-white/[0.07]",
        containerSizes[size],
        className
      )}
    >
      <AlphaMark size={svgSizes[size]} />
    </div>
  );
}

export function Logo({
  size = "sm",
  className,
}: {
  size?: LogoSize;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <LogoMark size={size} />
      <span className={cn("font-semibold tracking-[-0.02em] leading-none", textSizes[size])}>
        <span className="text-pa-text-1">Pledge</span>
        <span className="text-pa-profit">Alpha</span>
      </span>
    </div>
  );
}
