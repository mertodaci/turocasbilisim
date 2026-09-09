import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from "recharts";
import { Building2, FileText, Activity, CheckCircle2 } from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { tr } from "date-fns/locale";

const TYPE_DIST = {
  musteri: { label: "Musteri", color: "#22c55e" },
  aday: { label: "Aday Musteri", color: "#f59e0b" },
};

const OFFER_STATUS = {
  taslak: { label: "Taslak", color: "#94a3b8" },
  gonderildi: { label: "Gonderildi", color: "#3b82f6" },
  gorusulmede: { label: "Gorusmede", color: "#eab308" },
  kazanildi: { label: "Kazanildi", color: "#22c55e" },
  kaybedildi: { label: "Kaybedildi", color: "#ef4444" },
  iptal: { label: "Iptal", color: "#9ca3af" },
};

export default function SalesReportPage() {
  const { data: customers = [] } = useQuery({
    queryKey: ["customers-report"],
    queryFn: () => flowApi.entities.Customer.list("-updated_date", 500),
  });

  const { data: salesActivities = [] } = useQuery({
    queryKey: ["sales-activities-report"],
    queryFn: () => flowApi.entities.SalesActivity.list("-date", 1000),
  });

  const offers = salesActivities.filter(a => a.activity_type === "teklif_sunumu");

  // Musteri / Aday dagilimi (aktif olanlar)
  const activeCustomers = customers.filter(c => c.status === "aktif" || !c.status);
  const typeData = [
    { name: TYPE_DIST.musteri.label, value: activeCustomers.filter(c => !(c.is_potential == 1 || c.is_potential === true)).length, color: TYPE_DIST.musteri.color },
    { name: TYPE_DIST.aday.label, value: activeCustomers.filter(c => c.is_potential == 1 || c.is_potential === true).length, color: TYPE_DIST.aday.color },
  ].filter(d => d.value > 0);

  // Son 6 ay satis aktivite sayisi
  const monthlyActivities = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(new Date(), 5 - i);
    const start = startOfMonth(d);
    const end = endOfMonth(d);
    const count = salesActivities.filter(a => {
      const date = new Date(a.date);
      return date >= start && date <= end;
    }).length;
    return { name: format(d, "MMM", { locale: tr }), value: count };
  });

  // Teklif durum dagilimi
  const offerData = Object.entries(OFFER_STATUS).map(([key, cfg]) => ({
    name: cfg.label,
    value: offers.filter(o => (o.deal_status || "taslak") === key).length,
    color: cfg.color,
    amount: offers.filter(o => (o.deal_status || "taslak") === key).reduce((s, o) => s + (parseFloat(o.amount) || 0), 0),
  })).filter(d => d.value > 0);

  // En cok satis aktivitesi olan musteriler
  const topCustomers = customers.map(c => ({
    name: c.company_name,
    count: salesActivities.filter(a => a.customer_id === c.id).length,
  })).filter(c => c.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);

  const totalOfferAmount = offers.filter(o => o.deal_status === "kazanildi").reduce((s, o) => s + (parseFloat(o.amount) || 0), 0);
  const winRate = offers.length > 0 ? Math.round((offers.filter(o => o.deal_status === "kazanildi").length / offers.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Satış Masası</h1>
        <p className="text-sm text-muted-foreground mt-1">Satış performansı ve istatistikler</p>
      </div>

      {/* Ozet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Building2 className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Aktif Müşteri</span>
          </div>
          <p className="text-2xl font-bold">{activeCustomers.length}</p>
          <p className="text-xs text-amber-600 mt-1">{activeCustomers.filter(c => c.is_potential == 1 || c.is_potential === true).length} aday müşteri</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Satış Aktivitesi</span>
          </div>
          <p className="text-2xl font-bold">{salesActivities.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Tüm zamanlar</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-muted-foreground">Toplam Teklif</span>
          </div>
          <p className="text-2xl font-bold">{offers.length}</p>
          <p className="text-xs text-muted-foreground mt-1">%{winRate} kazanma oranı</p>
        </div>
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-muted-foreground">Kazanılan Tutar</span>
          </div>
          <p className="text-2xl font-bold">{totalOfferAmount.toLocaleString("tr-TR")} ₺</p>
          <p className="text-xs text-green-600 mt-1">{offers.filter(o => o.deal_status === "kazanildi").length} teklif</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Aylik Satis Aktivite Grafigi */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">Son 6 Ay Satış Aktivitesi</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyActivities}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Aktivite" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Musteri Dagilimi */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">Müşteri Dağılımı</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={typeData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                  {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {typeData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-muted-foreground">{d.name}</span>
                  </div>
                  <span className="font-medium">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Teklif Durumlari */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">Teklif Durumları</h3>
          {offerData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Henüz teklif yok</p>
          ) : (
            <div className="space-y-2">
              {offerData.map((d, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{d.amount.toLocaleString("tr-TR")} ₺</span>
                    <span className="font-medium text-sm">{d.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* En Cok Satis Aktivitesi Olan Musteriler */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
          <h3 className="text-sm font-semibold mb-4">En Aktif Müşteriler</h3>
          {topCustomers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Henüz aktivite yok</p>
          ) : (
            <div className="space-y-2">
              {topCustomers.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{c.name}</p>
                    <div className="h-1.5 bg-muted rounded-full mt-1">
                      <div
                        className="h-1.5 bg-blue-500 rounded-full"
                        style={{ width: `${(c.count / topCustomers[0]?.count) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium shrink-0">{c.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
