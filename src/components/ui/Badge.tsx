import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200":
            variant === "default",
          "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400":
            variant === "success",
          "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400":
            variant === "warning",
          "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400":
            variant === "danger",
          "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400":
            variant === "info",
        },
        className
      )}
    >
      {children}
    </span>
  );
}
