import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, Clock, Building2, Home, MapPin } from "lucide-react";
import { activityTypes, formatDuration, outcomeLabels } from "@/lib/activityHelpers";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function CalendarDayDetail({ date, activities, employees }) {
  const dayLabel = format(date, "d MMMM yyyy, EEEE", { locale: tr });
  const totalMinutes = activities.reduce((s, a) => s + (a.duration_minutes || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm flex flex-col overflow-hidden">
      {/* Day Header */}
      <div className="p-5 border-b border-border bg-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wide">Seçili Gün</span>
        </div>
        <p className="text-base font-bold text-foreground capitalize">{dayLabel}</p>
        {activities.length > 0 && (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground">{activities.length} aktivite</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs font-medium text-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(totalMinutes)}
            </span>
          </div>
        )}
      </div>

      {/* Activity List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[520px]">
        {activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Bu gün için aktivite yok</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Başka bir güne tıkla veya aktivite ekle</p>
          </div>
        ) : (
          activities.map((activity) => {
            const typeInfo = activityTypes[activity.activity_type] || activityTypes.diger;
            const Icon = typeInfo.icon;
            const outcome = activity.outcome ? outcomeLabels[activity.outcome] : null;

            return (
              <div
                key={activity.id}
                className={cn(
                  "rounded-xl p-3.5 border transition-all",
                  typeInfo.border, typeInfo.bg
                )}
              >
                {/* Type & Time */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-white/60")}>
                      <Icon className={cn("w-3.5 h-3.5", typeInfo.color)} />
                    </div>
                    <span className={cn("text-xs font-semibold", typeInfo.color)}>{typeInfo.label}</span>
                  </div>
                  {activity.start_time && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {activity.start_time}
                    </span>
                  )}
                </div>

                {/* Employee & Location */}
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-bold text-foreground">{activity.employee_name}</p>
                  {activity.location && (() => {
                    const loc = {
                      ofis: { label: "Ofis", Icon: Building2, cls: "text-blue-600 bg-blue-50" },
                      evden: { label: "Evden", Icon: Home, cls: "text-emerald-600 bg-emerald-50" },
                      saha: { label: "Saha", Icon: MapPin, cls: "text-orange-600 bg-orange-50" },
                    }[activity.location];
                    if (!loc) return null;
                    const { label, Icon, cls } = loc;
                    return (
                      <span className={cn("flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md", cls)}>
                        <Icon className="w-3 h-3" />{label}
                      </span>
                    );
                  })()}
                </div>

                {/* Customer */}
                {activity.customer_name && (
                  <p className="text-xs text-muted-foreground mb-1.5">
                    👤 {activity.customer_name}
                  </p>
                )}

                {/* Notes */}
                {activity.notes && (
                  <p className="text-xs text-foreground/70 mb-2 line-clamp-2">{activity.notes}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs font-semibold text-foreground bg-white/50 px-2 py-0.5 rounded-md">
                    {formatDuration(activity.duration_minutes)}
                  </span>
                  {outcome && (
                    <Badge
                      variant="secondary"
                      className={cn("text-[10px] px-1.5 py-0", outcome.bg, outcome.color)}
                    >
                      {outcome.label}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-border bg-muted/20">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aktivite Türleri</p>
        <div className="grid grid-cols-2 gap-1">
          {[
            { color: "bg-blue-400", label: "Telefon" },
            { color: "bg-purple-400", label: "Ofis Topl." },
            { color: "bg-emerald-400", label: "Müşteri Topl." },
            { color: "bg-orange-400", label: "Saha Ziyareti" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full", item.color)} />
              {item.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}