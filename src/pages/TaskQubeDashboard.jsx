import { useQuery } from "@tanstack/react-query";

const STATUS_LABELS = {
  musteri_talep: "Musteri Talep",
  cevap_bekleniyor: "Cevap Bekleniyor",
  analiz_gelistiriliyor: "Analiz Gelistiriliyor",
  analiz_onaylandi: "Analiz Onaylandi",
  acil_isler: "Acil Isler",
  yazilim_onay_bekliyor: "Yazilim Onay Bekliyor",
  yapilacak: "Yapilacak",
  merge_bekleniyor: "Merge Bekleniyor",
  yazilim_gelistiriliyor: "Yazilim Gelistiriliyor",
  musteri_testten_donen: "Musteri Testten Donen",
  testten_donen: "Testten Donen",
  guncelleme_bekleniyor: "Guncelleme Bekleniyor",
  musteri_onay: "Musteri Onay",
  sonuclanan: "Sonuclanan",
  iptal: "Iptal",
};
import { flowApi } from "@/api/flowApiClient";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Users, 
  TrendingUp,
  ArrowRight,
  BarChart3
} from "lucide-react";
import TQDashboardChart from "@/components/taskqube/TQDashboardChart";
import TQDeadlineList from "@/components/taskqube/TQDeadlineList";
import TQCustomerAssignmentList from "@/components/taskqube/TQCustomerAssignmentList";

const statusColors = {
  yeni: "bg-blue-100 text-blue-700",
  inceleme: "bg-purple-100 text-purple-700",
  devam_ediyor: "bg-yellow-100 text-yellow-700",
  test: "bg-orange-100 text-orange-700",
  tamamlandi: "bg-green-100 text-green-700",
  iptal: "bg-red-100 text-red-700",
};

export default function TaskQubeDashboard() {
  const { data: tickets = [] } = useQuery({
    queryKey: ["tq-tickets"],
    queryFn: () => flowApi.entities.TQTicket.filter({ exclude_archived: 1 }),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["tq-projects"],
    queryFn: () => flowApi.entities.TQProject.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.TQTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });

  if (tickets.length === 0 && projects.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TaskQube v3 Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Genel bakış ve istatistikler</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Henüz veri yok. İlk biletinizi veya projenizi oluşturun.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Final (tamamlandı/iptal) ve aktif durumları dinamik belirle
  const finalStatusKeys = statuses.filter(s => s.is_final).map(s => s.key);
  const activeTickets = tickets.filter(t => !finalStatusKeys.includes(t.status));
  const completedTickets = tickets.filter(t => finalStatusKeys.includes(t.status));
  const criticalTickets = tickets.filter(t => t.status === "acil_isler");
  
  // Yaklaşan teslim tarihleri (7 gün içinde)
  const upcomingDeadlines = tickets
    .filter(t => t.due_date && !finalStatusKeys.includes(t.status))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  // Aktif projeler (ilk 10) ve en yeni 10 bilet
  const activeProjects = projects.filter(p => p.status === "aktif");
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  // Müşteri bazlı istatistikler
  const customerStats = customers.map(customer => {
    const customerTickets = tickets.filter(t => t.customer_id === customer.id && t.status !== 'arsivlendi');
    return {
      customer_name: customer.company_name,
      total_tickets: customerTickets.length,
      active_tickets: customerTickets.filter(t => !finalStatusKeys.includes(t.status)).length,
      completed_tickets: customerTickets.filter(t => finalStatusKeys.includes(t.status)).length,
    };
  }).filter(c => c.total_tickets > 0);

  // Çalışan bazlı iş yükü — hem birincil (assigned_to_id) hem ek sorumlu (assigned_to_ids)
  const employeeWorkload = employees.map(emp => {
    const isAssigned = (t) => {
      if (t.assigned_to_id === emp.id) return true;
      const ids = Array.isArray(t.assigned_to_ids)
        ? t.assigned_to_ids
        : (typeof t.assigned_to_ids === "string" ? JSON.parse(t.assigned_to_ids || "[]") : []);
      return ids.includes(emp.id);
    };
    const assignedTickets = tickets.filter(t => isAssigned(t) && !finalStatusKeys.includes(t.status));
    return {
      employee_name: emp.full_name,
      department: emp.department,
      active_tickets: assignedTickets.length,
      overdue: assignedTickets.filter(t => {
        if (!t.due_date) return false;
        return new Date(t.due_date) < new Date();
      }).length,
    };
  }).filter(e => e.active_tickets > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">TaskQube v3 Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Genel bakış ve istatistikler</p>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/taskqube-v3/tickets?group=musteri_talep" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-blue-200 hover:border-blue-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Aktif Biletler</CardTitle>
            <Activity className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeTickets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Toplam {tickets.length} biletten
            </p>
          </CardContent>
        </Card></Link>

        <Link to="/taskqube-v3/tickets?group=sonuclanan" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-green-200 hover:border-green-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedTickets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {tickets.length > 0 ? Math.round((completedTickets.length / tickets.length) * 100) : 0}% başarı oranı
            </p>
          </CardContent>
        </Card></Link>

        <Link to="/taskqube-v3/tickets?status=acil_isler" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-red-200 hover:border-red-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Acil İşler</CardTitle>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{criticalTickets.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Acil işlem gereken
            </p>
          </CardContent>
        </Card></Link>

        <Link to="/taskqube-v3/tickets?group=guncelleme_bekleniyor" className="block">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-orange-200 hover:border-orange-400">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Yaklaşan Teslim</CardTitle>
            <Clock className="w-4 h-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{upcomingDeadlines.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              7 gün içinde
            </p>
          </CardContent>
        </Card></Link>
      </div>

      {/* Grafik ve Listeler */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Durum Grafiği */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Bilet Durum Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TQDashboardChart tickets={tickets} />
          </CardContent>
        </Card>

        {/* Yaklaşan Teslim Tarihleri */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Yaklaşan Teslim Tarihleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TQDeadlineList deadlines={upcomingDeadlines} />
          </CardContent>
        </Card>
      </div>

      {/* Müşteri ve Çalışan İstatistikleri */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Müşteri Bazlı Dağılım */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Müşteri Bazlı Bilet Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TQCustomerAssignmentList customerStats={customerStats} />
          </CardContent>
        </Card>

        {/* Çalışan İş Yükü */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Çalışan İş Yükü
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employeeWorkload.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Henüz atanmış bilet yok
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {employeeWorkload.map((emp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{emp.employee_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.department ? emp.department.replace(/_/g, ' ').replace(/\b\w/g, c => c.toLocaleUpperCase('tr')) : ''}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{emp.active_tickets} aktif</Badge>
                      {emp.overdue > 0 && (
                        <Badge className="bg-red-100 text-red-700">
                          {emp.overdue} gecikmiş
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Proje Özeti */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>
              <Link to="/taskqube-v3" className="flex items-center gap-2 hover:underline">
                <CheckCircle2 className="w-5 h-5" />
                Aktif Projeler
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeProjects.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Devam eden proje yok
                </p>
              ) : (
                activeProjects.slice(0, 10).map((project) => (
                  <div key={project.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{project.name}</p>
                      <p className="text-xs text-muted-foreground">{project.customer_name}</p>
                    </div>
                    <Badge className={statusColors.devam_ediyor}>Devam Ediyor</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              <Link to="/taskqube-v3/tickets" className="flex items-center gap-2 hover:underline">
                <TrendingUp className="w-5 h-5" />
                Son 10 Bilet
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTickets.map((ticket) => (
                <Link key={ticket.id} to="/taskqube-v3/tickets" className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-muted/30 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{ticket.title}</p>
                    <p className="text-xs text-muted-foreground">{ticket.customer_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[ticket.status] || statusColors.yeni}>
                      {STATUS_LABELS[ticket.status] || ticket.status}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}