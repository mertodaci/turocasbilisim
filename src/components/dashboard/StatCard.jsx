import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

export default function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg, href }) {
  const content = (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconBg || "bg-primary/10")}>
        <Icon className={cn("w-5 h-5", iconColor || "text-primary")} />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link to={href} className="block bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-primary/30 hover:scale-[1.02] transition-all cursor-pointer">
        {content}
      </Link>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md transition-shadow">
      {content}
    </div>
  );
}