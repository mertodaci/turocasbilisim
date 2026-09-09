import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { ClipboardList, Building2, CheckCircle2, AlertCircle, Clock, Activity, ArrowRight } from "lucide-react";
import TQDashboardChart from "@/components/taskqube/TQDashboardChart";
import { CUSTOMER_APPROVAL_STATUSES } from "@/lib/taskqubeStatus";

const STATUS_LABELS = {
  musteri_talep: "Müşteri Talebi",
  cevap_bekleniyor: "Cevap Bekleniyor",
  analiz_gelistiriliyor: "Analiz Geliştiriliyor",
  analiz_onaylandi: "Analiz Onaylandı",
  acil_isler: "Acil İşler",
  yazilim_onay_bekliyor: "Yazılım Onay Bekliyor",
  yapilacak: "Yapılacak",
  merge_bekleniyor: "Merge Bekleniyor",
  yazilim_gelistiriliyor: "Yazılım Geliştiriliyor",
  musteri_testten_donen: "Müşteri Testten Dönen",
  testten_donen: "Testten Dönen",
  musteri_onay: "Müşteri Onayı",
  sonuclanan: "Sonuçlandı",
  iptal: "İptal",
  arsivlendi: "Arşivlendi",
};

const PRIORITY_COLORS = {
  kritik: "bg-red-100 text-red-700",
  yuksek: "bg-orange-100 text-orange-700",
  orta: "bg-blue-100 text-blue-700",
  dusuk: "bg-slate-100 text-slate-600",
};

export default function CustomerDashboard() {
  const { user } = useAuth();

  const { data: customer } = useQuery({
    queryKey: ["customer-by-user", user?.customer_id],
    queryFn: () => flowApi.entities.Customer.get(user.customer_id),
    enabled: !!user?.customer_id,
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ["tq-tickets-customer", user?.customer_id],
    queryFn: () => flowApi.entities.TQTicket.filter({ customer_id: user.customer_id }),
    enabled: !!user?.customer_id,
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.TQTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements-active"],
    queryFn: () => flowApi.entities.Announcement.filter({ is_active: 1 }),
  });

  const activeAnnouncements = announcements.filter(a =>
    (a.is_active === 1 || a.is_active === true) &&
    (a.target_roles === "all" || !a.target_roles || a.target_roles.split(",").includes(user?.role))
  ).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const finalStatusKeys = statuses.filter(s => s.is_final).map(s => s.key);
  const openTickets = allTickets.filter(t => !finalStatusKeys.includes(t.status) && t.status !== "arsivlendi");
  const resolvedTickets = allTickets.filter(t => finalStatusKeys.includes(t.status));
  const criticalTickets = openTickets.filter(t => t.status === "acil_isler");
  const upcomingDeadlines = openTickets
    .filter(t => t.due_date)
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const recentTickets = [...allTickets].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  // Musteriden aksiyon bekleyen biletler
  const awaitingCustomer = openTickets.filter(t => t.status === "cevap_bekleniyor" || CUSTOMER_APPROVAL_STATUSES.includes(t.status));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Building2 className="w-6 h-6 text-primary" />
          {customer?.company_name || "Müşteri Panosu"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Destek biletlerinizi ve süreçlerinizi takip edin</p>
      </div>


      {/* Duyurular */}
      {activeAnnouncements.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/50 bg-card shadow-sm">
          <div className="flex items-center">
            <div className="flex-shrink-0 px-4 py-2.5 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider rounded-l-xl">Duyuru</div>
            <div className="overflow-hidden flex-1 py-2.5 px-3">
              <div className="animate-marquee whitespace-nowrap">
                {activeAnnouncements.map((a, i) => (
                  <span key={a.id} className="inline-flex items-center gap-2 mr-12">
                    {a.title && <span className="font-semibold text-sm text-foreground">{a.title}:</span>}
                    <span className="text-sm text-muted-foreground">{a.content}</span>
                    {i < activeAnnouncements.length - 1 && <span className="text-muted-foreground mx-4">•</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sizden Bekleyen */}
      {awaitingCustomer.length > 0 && (
        <Link to="/taskqube-v3/tickets" className="block">
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center gap-3 hover:bg-amber-100 transition-colors">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Sizden bekleyen {awaitingCustomer.length} bilet var</p>
              <p className="text-xs text-amber-700">Cevap veya onayınızı bekleyen talepler — lütfen inceleyin.</p>
            </div>
            <span className="text-amber-600 text-sm font-medium shrink-0">Görüntüle →</span>
          </div>
        </Link>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/taskqube-v3/tickets" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 hover:border-blue-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Aktif Biletler</CardTitle>
              <Activity className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{openTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Toplam {allTickets.length} biletten</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/taskqube-v3/tickets?group=acil_isler" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200 hover:border-red-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Acil İşler</CardTitle>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{criticalTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Acil işlem gereken</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/taskqube-v3/tickets?group=sonuclanan" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-200 hover:border-green-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{resolvedTickets.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {allTickets.length > 0 ? Math.round((resolvedTickets.length / allTickets.length) * 100) : 0}% başarı oranı
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/taskqube-v3/tickets?group=guncelleme_bekleniyor" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-orange-200 hover:border-orange-400">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Yaklaşan Teslim</CardTitle>
              <Clock className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{upcomingDeadlines.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Teslim tarihi olan</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Grafik ve Yaklaşan Teslimler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Bilet Durum Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TQDashboardChart tickets={allTickets} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Yaklaşan Teslim Tarihleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Teslim tarihi olan bilet yok</p>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(t.due_date).toLocaleDateString("tr-TR")}</p>
                    </div>
                    {t.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.orta}`}>
                        {t.priority}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Açık Biletler ve Son Biletler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><Activity className="w-5 h-5" /> Açık Biletler</span>
              <Link to="/taskqube-v3/tickets" className="text-xs text-primary hover:underline font-normal">Tümünü Gör</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {openTickets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500 opacity-50" />
                <p className="text-sm">Tüm biletler tamamlanmış!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {openTickets.slice(0, 8).map(t => (
                  <Link key={t.id} to="/taskqube-v3/tickets" className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground font-mono">#{t.ticket_number || "-"}</span>
                        <p className="text-sm font-medium truncate">{t.title}</p>
                      </div>
                      {t.assigned_to_name && <p className="text-xs text-muted-foreground mt-0.5">Atanan: {t.assigned_to_name}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {t.priority && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority] || PRIORITY_COLORS.orta}`}>{t.priority}</span>}
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{STATUS_LABELS[t.status] || t.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Son Biletler</span>
              <Link to="/taskqube-v3/tickets" className="text-xs text-primary hover:underline font-normal">Tümünü Gör</Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentTickets.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_date).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge className={t.status === "sonuclanan" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
                      {STATUS_LABELS[t.status] || t.status}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
