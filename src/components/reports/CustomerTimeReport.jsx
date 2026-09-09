import { useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatDuration } from "@/lib/activityHelpers";
import { Building2 } from "lucide-react";

const COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
];

export default function CustomerTimeReport({ activities }) {
  const customerData = useMemo(() => {
    const map = {};
    (activities || []).forEach((a) => {
      if (!a.customer_name || a.customer_name.trim() === "") return;
      const key = a.customer_name.trim();
      if (!map[key]) map[key] = { name: key, totalMinutes: 0, count: 0 };
      map[key].totalMinutes += a.duration_minutes || 0;
      map[key].count += 1;
    });
    return Object.values(map).sort((a, b) => b.totalMinutes - a.totalMinutes).slice(0, 15);
  }, [activities]);

  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Building2 className="w-4 h-4 text-primary" />
        Müşteri Destek Raporu
      </h3>

      {customerData.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Bu dönem için müşteri verisi bulunamadı
        </div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={Math.max(200, customerData.length * 36)}>
            <BarChart data={customerData} layout="vertical" margin={{ left: 10, right: 60, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => `${Math.floor(v / 60)}sa`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => v.length > 20 ? v.slice(0, 18) + "…" : v}
              />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                formatter={(val) => [formatDuration(val), "Toplam Süre"]}
              />
              <Bar dataKey="totalMinutes" radius={[0, 4, 4, 0]}>
                {customerData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-2 text-xs text-muted-foreground font-medium">Müşteri</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Aktivite</th>
                  <th className="text-right py-2 px-2 text-xs text-muted-foreground font-medium">Toplam Süre</th>
                </tr>
              </thead>
              <tbody>
                {customerData.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-2.5 px-2 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-2.5 px-2 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {c.name}
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right text-muted-foreground">{c.count}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-primary">{formatDuration(c.totalMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}