import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  tone?: "default" | "warning" | "danger" | "success";
  index?: number;
}

const toneStyles: Record<string, string> = {
  default: "from-primary/15 to-accent/10 text-primary",
  warning: "from-warning/20 to-warning/5 text-warning",
  danger: "from-danger/20 to-danger/5 text-danger",
  success: "from-success/20 to-success/5 text-success",
};

export function StatCard({ label, value, subtitle, icon: Icon, tone = "default", index = 0 }: StatCardProps) {
  const valueStr = String(value);
  // Scale font down for long values like "₹3,86,600"
  const len = valueStr.length;
  const valueSize =
    len > 10 ? "text-lg sm:text-xl xl:text-2xl"
    : len > 7 ? "text-xl sm:text-2xl xl:text-3xl"
    : "text-2xl sm:text-3xl";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: "easeOut" }}
      whileHover={{ y: -3 }}
      className="glass-card rounded-2xl p-4 sm:p-5 relative overflow-hidden group transition-shadow hover:shadow-2xl hover:shadow-primary/10"
    >
      <div className={cn("absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl bg-gradient-to-br opacity-40 group-hover:opacity-60 transition pointer-events-none", toneStyles[tone])} />
      <div className="flex items-start justify-between gap-3 relative min-w-0">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] sm:text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase truncate">{label}</div>
          <div className={cn("mt-3 font-bold tracking-tight font-[var(--font-display)] tabular-nums leading-tight break-words", valueSize)} title={valueStr}>{valueStr}</div>
          {subtitle && <div className="mt-1.5 text-xs text-muted-foreground truncate">{subtitle}</div>}
        </div>
        <div className={cn("h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-xl grid place-items-center bg-gradient-to-br", toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
