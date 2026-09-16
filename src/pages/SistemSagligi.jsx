import { useQuery } from "@tanstack/react-query";
import { Activity, Cpu, MemoryStick, HardDrive, Server, Database, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const fmtBytes = (n) => {
  if (n == null) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = n, i = 0;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} ${units[i]}`;
};
const fmtDuration = (sec) => {
  if (sec == null) return "—";
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return `${d}g ${h}s ${m}dk`;
};

function StatCard({ icon: Icon, label, value, sub, tone = "indigo" }) {
  const tones = {
    indigo: "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400",
    emerald: "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400",
  };
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", tones[tone])}><Icon className="w-4 h-4" /></span>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
      <p className="text-xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function SistemSagligi() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["sistem-sagligi"],
    queryFn: () => fetch("/api/system/health", { credentials: "include" }).then((r) => {
      if (!r.ok) throw new Error("Sunucu bilgileri alınamadı");
      return r.json();
    }),
    refetchInterval: 30 * 1000,
  });

  const memUsedPct = data ? Math.round(((data.mem_total_bytes - data.mem_free_bytes) / data.mem_total_bytes) * 100) : null;
  const loadAvg = data?.load_avg?.map((n) => n.toFixed(2)).join(" / ");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Activity className="w-6 h-6 text-indigo-500" />Sunucu Bilgileri</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Sistemin anlık sağlık durumu — 30 saniyede bir yenilenir.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
          <p className="text-sm text-muted-foreground">Sunucu bilgileri alınamadı.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Clock} label="Süreç Çalışma Süresi" value={fmtDuration(data.process_uptime_sec)} tone="indigo" />
            <StatCard icon={Server} label="Sunucu Çalışma Süresi" value={fmtDuration(data.os_uptime_sec)} sub={data.hostname} tone="indigo" />
            <StatCard icon={Cpu} label="CPU Yükü (1/5/15 dk)" value={loadAvg || "—"} sub={`${data.cpu_count} çekirdek`} tone="amber" />
            <StatCard icon={MemoryStick} label="RAM Kullanımı" value={`%${memUsedPct ?? "—"}`} sub={`${fmtBytes(data.mem_total_bytes - data.mem_free_bytes)} / ${fmtBytes(data.mem_total_bytes)}`} tone={memUsedPct > 85 ? "rose" : "emerald"} />
            <StatCard icon={Database} label="Veritabanı Boyutu" value={fmtBytes(data.db_size_bytes)} tone="indigo" />
            {data.disk && (
              <StatCard icon={HardDrive} label="Disk Kullanımı" value={data.disk.usePercent} sub={`${fmtBytes(data.disk.usedKb * 1024)} / ${fmtBytes(data.disk.totalKb * 1024)}`} tone={Number(String(data.disk.usePercent).replace("%", "")) > 85 ? "rose" : "emerald"} />
            )}
            <StatCard icon={Server} label="Node Sürümü" value={data.node_version} sub={data.platform} tone="indigo" />
          </div>

          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Süreç Bellek Detayı</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">RSS: </span>{fmtBytes(data.process_memory?.rss)}</div>
              <div><span className="text-muted-foreground">Heap Kullanılan: </span>{fmtBytes(data.process_memory?.heapUsed)}</div>
              <div><span className="text-muted-foreground">Heap Toplam: </span>{fmtBytes(data.process_memory?.heapTotal)}</div>
              <div><span className="text-muted-foreground">External: </span>{fmtBytes(data.process_memory?.external)}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
