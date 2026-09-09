import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Plus, LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import JTProjectCard from "@/components/jobtracking/JTProjectCard";
import JTProjectFormDialog from "@/components/jobtracking/JTProjectFormDialog";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";

export default function JobTrackingV3() {
  const [viewMode, setViewMode] = useState("grid");
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const canAdd = can(user?.role, "is_takibi_projeler", "add");
  const canEdit = can(user?.role, "is_takibi_projeler", "edit");
  const canDelete = can(user?.role, "is_takibi_projeler", "delete");
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.JTProject.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tq-projects"] }),
  });

  const { data: allProjects = [], isLoading } = useQuery({
    queryKey: ["tq-projects"],
    queryFn: () => flowApi.entities.JTProject.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.list(),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const { data: allTickets = [] } = useQuery({
    queryKey: ["tq-tickets"],
    queryFn: () => flowApi.entities.JTTicket.filter({ exclude_archived: 1 }),
  });
  const { data: contracts = [] } = useQuery({
    queryKey: ["customer-contracts"],
    queryFn: () => flowApi.entities.CustomerContract.list(),
  });
  const { data: contractTypeDefs = [] } = useQuery({
    queryKey: ["definitions", "sozlesme_turu"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "sozlesme_turu", is_active: true }),
  });
  const contractTypeLabel = (v) => {
    if (!v) return v;
    const d = contractTypeDefs.find(x => x.value === v);
    return d?.label || v;
  };

  const jobTrackingCustomerIds = customers.filter(c => c.use_job_tracking == true || c.use_job_tracking === 1).map(c => c.id);
  const projects = allProjects.filter(p => (p.is_active == 1 || p.is_active === true || p.is_active === undefined)).sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "tr"));

  // Proje başına aktif bilet sayısı
  const activeStatuses = ["musteri_talep", "cevap_bekleniyor", "analiz_onaylandi", "acil_isler", "yazilim_onay_bekliyor", "yapilacak", "merge_bekleniyor", "musteri_testten_donen", "testten_donen", "guncelleme_bekleniyor"];
  const ticketCountByProject = allTickets.reduce((acc, t) => {
    if (activeStatuses.includes(t.status)) {
      acc[t.project_id] = (acc[t.project_id] || 0) + 1;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projeler</h1>
          <p className="text-sm text-muted-foreground mt-1">İş Takibi proje yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={viewMode === "grid" ? "default" : "outline"} size="icon" onClick={() => setViewMode("grid")}>
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button variant={viewMode === "list" ? "default" : "outline"} size="icon" onClick={() => setViewMode("list")}>
            <List className="w-4 h-4" />
          </Button>
          {canAdd && (
            <Button onClick={() => { setEditingProject(null); setShowProjectForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Yeni Proje
            </Button>
          )}
        </div>
      </div>

      <div className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Henüz proje eklenmemiş.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <JTProjectCard
                key={project.id}
                project={project}
                ticketCount={ticketCountByProject[project.id] ?? 0}
                contractType={contractTypeLabel(contracts.find(c => c.customer_id === project.customer_id && c.status === "aktif")?.contract_type)}
                onEdit={canEdit ? () => { setEditingProject(project); setShowProjectForm(true); } : undefined}
                onDelete={canDelete ? () => { if (confirm("Bu projeyi silmek istediginize emin misiniz?")) deleteMutation.mutate(project.id); } : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Proje</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Müşteri</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Durum</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Öncelik</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Biletler</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Bitiş</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project, idx) => (
                  <tr key={project.id} className={`border-b border-border/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}>
                    <td className="px-4 py-3 font-medium">{project.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{project.customer_name || "-"}</td>
                    <td className="px-4 py-3">{project.status || "-"}</td>
                    <td className="px-4 py-3">{project.priority || "-"}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-primary">{ticketCountByProject[project.id] ?? 0}</span>
                      <span className="text-muted-foreground text-xs ml-1">aktif</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString("tr-TR") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingProject(project); setShowProjectForm(true); }}>
                        Düzenle
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showProjectForm && (
        <JTProjectFormDialog
          project={editingProject}
          customers={customers}
          employees={employees}
          open={showProjectForm}
          onOpenChange={setShowProjectForm}
        />
      )}
    </div>
  );
}