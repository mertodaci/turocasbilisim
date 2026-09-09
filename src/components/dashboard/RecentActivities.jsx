import { activityTypes, formatDuration, outcomeLabels } from "@/lib/activityHelpers";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function RecentActivities({ activities }) {
  const recent = [...activities]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 5);

  if (recent.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Bu Haftaki Aktiviteler</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Bu hafta aktivite kaydedilmemiş
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">Bu Haftaki Aktiviteler</h3>
      <div className="space-y-3">
        {recent.map((activity) => {
          const typeInfo = activityTypes[activity.activity_type] || activityTypes.diger;
          const Icon = typeInfo.icon;
          const outcome = activity.outcome ? outcomeLabels[activity.outcome] : null;

          return (
            <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeInfo.bg)}>
                <Icon className={cn("w-4 h-4", typeInfo.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{activity.employee_name}</p>
                  {outcome && (
                    <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", outcome.bg, outcome.color)}>
                      {outcome.label}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {typeInfo.label}
                  {activity.customer_name && ` • ${activity.customer_name}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">{formatDuration(activity.duration_minutes)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(new Date(activity.date), "d MMM", { locale: tr })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}