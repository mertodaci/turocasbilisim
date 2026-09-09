import { formatDuration } from "@/lib/activityHelpers";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TopEmployees({ activities, employees }) {
  const employeeStats = {};
  activities.forEach((a) => {
    if (!employeeStats[a.employee_id]) {
      employeeStats[a.employee_id] = { totalMinutes: 0, count: 0, name: a.employee_name };
    }
    employeeStats[a.employee_id].totalMinutes += a.duration_minutes || 0;
    employeeStats[a.employee_id].count += 1;
  });

  const ranked = Object.entries(employeeStats)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .slice(0, 5);

  const maxMinutes = ranked[0]?.totalMinutes || 1;

  const medalColors = ["text-amber-500", "text-slate-400", "text-orange-600"];

  if (ranked.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">En Aktif Çalışanlar</h3>
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Veri bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">En Aktif Çalışanlar</h3>
      <div className="space-y-4">
        {ranked.map((emp, i) => (
          <div key={emp.id} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {i < 3 && <Trophy className={cn("w-3.5 h-3.5", medalColors[i])} />}
                <span className="text-sm font-medium text-foreground">{emp.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{emp.count} aktivite</span>
                <span className="font-semibold text-foreground">{formatDuration(emp.totalMinutes)}</span>
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(emp.totalMinutes / maxMinutes) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}