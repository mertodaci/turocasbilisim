import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { activityTypes, formatDuration } from "@/lib/activityHelpers";

const COLOR_MAP = {
  blue: "#3b82f6", green: "#22c55e", red: "#ef4444", orange: "#f97316",
  purple: "#a855f7", yellow: "#eab308", teal: "#14b8a6", pink: "#ec4899",
  indigo: "#6366f1", slate: "#64748b",
};
const FALLBACK_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f97316", "#64748b", "#06b6d4", "#f59e0b", "#6b7280"];

export default function ActivityTypeChart({ activities }) {
  const { data: definitions = [] } = useQuery({
    queryKey: ["definitions", "aktivite_tipi"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "aktivite_tipi", is_active: true }),
  });

  const typeData = Object.entries(activityTypes).map(([key, val], i) => {
    const filtered = activities.filter(a => a.activity_type === key);
    const totalMinutes = filtered.reduce((sum, a) => sum + (Math.min(a.duration_minutes || 0, 1440)), 0);
    const def = definitions.find(d => d.value === key);
    const color = def?.color ? (COLOR_MAP[def.color] || FALLBACK_COLORS[i]) : FALLBACK_COLORS[i];
    return { name: val.label, value: totalMinutes, count: filtered.length, color };
  }).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

  if (typeData.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Aktivite Dağılımı</h3>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Veri bulunamadı</div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-4">Aktivite Dağılımı</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={typeData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={110}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(val) => formatDuration(val)}
            contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0", fontSize: "12px" }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} maxBarSize={20} name="Süre">
            {typeData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
