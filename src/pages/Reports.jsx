import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDuration } from "@/lib/activityHelpers";

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [selectedEmployee, setSelectedEmployee] = useState("all");

  const { data: activities = [] } = useQuery({
    queryKey: ["activities"],
    queryFn: () => flowApi.entities.Activity.list("-date", 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const filtered = activities.filter((a) => {
    const dateMatch = a.date >= dateFrom && a.date <= dateTo;
    const empMatch = selectedEmployee === "all" || a.employee_id === selectedEmployee;
    return dateMatch && empMatch;
  });

  // Daily chart data
  const dailyMap = {};
  filtered.forEach((a) => {
    if (!dailyMap[a.date]) dailyMap[a.date] = { date: a.date, telefon: 0, toplanti: 0, diger: 0 };
    if (a.activity_type === "telefon_gorusmesi") {
      dailyMap[a.date].telefon += a.duration_minutes || 0;
    } else if (a.activity_type === "ofis_toplantisi" || a.activity_type === "musteri_toplantisi") {
      dailyMap[a.date].toplanti += a.duration_minutes || 0;
    } else {
      dailyMap[a.date].diger += a.duration_minutes || 0;
    }
  });
  const dailyData = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Employee comparison
  const empMap = {};
  filtered.forEach((a) => {
    if (!empMap[a.employee_id]) empMap[a.employee_id] = { name: a.employee_name, totalMinutes: 0, count: 0, phone: 0, meeting: 0 };
    empMap[a.employee_id].totalMinutes += a.duration_minutes || 0;
    empMap[a.employee_id].count += 1;
    if (a.activity_type === "telefon_gorusmesi") empMap[a.employee_id].phone += a.duration_minutes || 0;
    if (a.activity_type === "ofis_toplantisi" || a.activity_type === "musteri_toplantisi") empMap[a.employee_id].meeting += a.duration_minutes || 0;
  });
  const empData = Object.values(empMap).sort((a, b) => b.totalMinutes - a.totalMinutes);

  const totalMinutes = filtered.reduce((s, a) => s + (a.duration_minutes || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Raporlar</h1>

      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl p-5 border border-border/50 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-xs">Başlangıç</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Bitiş</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Çalışan</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Çalışanlar</SelectItem>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl p-5 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Toplam Süre</p>
          <p className="text-2xl font-bold text-foreground mt-1">{formatDuration(totalMinutes)}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Aktivite Sayısı</p>
          <p className="text-2xl font-bold text-foreground mt-1">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-2xl p-5 border border-border/50 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Ort. / Gün</p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {dailyData.length > 0 ? formatDuration(Math.round(totalMinutes / dailyData.length)) : "0dk"}
          </p>
        </div>
      </div>

      {/* Daily Chart */}
      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4">Günlük Aktivite Dağılımı (dakika)</h3>
        {dailyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => format(new Date(d), "d MMM", { locale: tr })}
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{ borderRadius: "12px", border: "1px solid hsl(var(--border))", fontSize: "12px" }}
                labelFormatter={(d) => format(new Date(d), "d MMMM yyyy", { locale: tr })}
                formatter={(val) => [`${val} dk`]}
              />
              <Legend />
              <Bar dataKey="telefon" name="Telefon" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="toplanti" name="Toplantı" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="diger" name="Diğer" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Veri bulunamadı</div>
        )}
      </div>

      {/* Employee Comparison */}
      {selectedEmployee === "all" && empData.length > 0 && (
        <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Çalışan Karşılaştırması</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 text-xs text-muted-foreground font-medium">Çalışan</th>
                  <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">Aktivite</th>
                  <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">Telefon</th>
                  <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">Toplantı</th>
                  <th className="text-right py-3 px-2 text-xs text-muted-foreground font-medium">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {empData.map((emp, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-2 font-medium">{emp.name}</td>
                    <td className="py-3 px-2 text-right text-muted-foreground">{emp.count}</td>
                    <td className="py-3 px-2 text-right text-blue-600 font-medium">{formatDuration(emp.phone)}</td>
                    <td className="py-3 px-2 text-right text-purple-600 font-medium">{formatDuration(emp.meeting)}</td>
                    <td className="py-3 px-2 text-right font-bold">{formatDuration(emp.totalMinutes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}