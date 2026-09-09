import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";

const colorMap = {
  slate: "#64748b", purple: "#a855f7", blue: "#3b82f6", orange: "#f97316",
  yellow: "#eab308", green: "#22c55e", red: "#ef4444", pink: "#ec4899", teal: "#14b8a6",
};

export default function JTDashboardChart({ tickets }) {
  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.JTTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });

  // Dinamik durum sayımı — key bazlı tek çubuk (panolarda kopya olabilir, ilkini al)
  const seen = new Set();
  const uniqueStatuses = statuses.filter(s => {
    if (s.key === 'arsivlendi' || seen.has(s.key)) return false;
    seen.add(s.key);
    return true;
  });
  const data = uniqueStatuses.map(s => ({
    name: s.name || s.label || s.key.replace(/_/g," "),
    count: tickets.filter(t => t.status === s.key).length,
    color: colorMap[s.color] || "#64748b",
  })).filter(d => d.count > 0);

  return (
    <div className="h-[300px]">
      {tickets.length === 0 ? (
        <div className="flex items-center justify-center h-full">
          <p className="text-sm text-muted-foreground">Henüz veri yok</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Bilet">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}