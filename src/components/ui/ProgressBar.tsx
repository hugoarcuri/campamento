import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  className?: string;
  size?: "sm" | "md";
}

export function ProgressBar({ value, max, className, size = "sm" }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  let barColor = "bg-red-500";
  if (pct >= 100) barColor = "bg-emerald-500";
  else if (pct >= 75) barColor = "bg-emerald-400";
  else if (pct >= 50) barColor = "bg-amber-400";
  else if (pct >= 25) barColor = "bg-amber-500";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div
        className={cn(
          "flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300 tabular-nums">
        {pct}%
      </span>
    </div>
  );
}
