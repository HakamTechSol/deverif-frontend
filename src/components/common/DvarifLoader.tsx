import logoMark from "@/assets/logo-mark.png";
import { cn } from "@/lib/utils";

const sizeClasses = {
  xs: "h-4 w-4 rounded",
  sm: "h-6 w-6 rounded-md",
  md: "h-10 w-10 rounded-lg",
  lg: "h-14 w-14 rounded-xl",
} as const;

export function DvarifLoader({
  size = "md",
  label,
  fullscreen = false,
  className,
}: {
  size?: keyof typeof sizeClasses;
  label?: string;
  fullscreen?: boolean;
  className?: string;
}) {
  const showHalo = size === "md" || size === "lg";

  const mark = (
    <span
      aria-hidden={fullscreen || label ? true : undefined}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
    >
      {showHalo ? <span className="dvarif-loader__halo absolute inset-0" /> : null}
      <img
        src={logoMark}
        alt=""
        className={cn("dvarif-loader__mark relative object-contain", sizeClasses[size])}
      />
    </span>
  );

  if (fullscreen) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background"
      >
        {mark}
        {label ? <p className="text-sm text-muted-foreground">{label}</p> : null}
      </div>
    );
  }

  if (label) {
    return (
      <span role="status" className="inline-flex items-center gap-2.5">
        {mark}
        <span className="text-sm text-muted-foreground">{label}</span>
      </span>
    );
  }

  return mark;
}
