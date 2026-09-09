import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Shield, User, Users, Briefcase, GraduationCap, TrendingUp } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useRolePermissions, MODULES } from "@/lib/RolePermissionsContext";
import { useLanguage } from "@/lib/LanguageContext";
import { flowApi } from "@/api/flowApiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_ICONS = {
  admin:    { icon: ShieldCheck, color: "text-red-600",    bg: "bg-red-500",    light: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800" },
  yonetici: { icon: Shield,      color: "text-purple-600", bg: "bg-purple-500", light: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800" },
  ik:       { icon: Briefcase,   color: "text-pink-600",   bg: "bg-pink-500",   light: "bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800" },
  kullanici:{ icon: User,        color: "text-blue-600",   bg: "bg-blue-500",   light: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800" },
  stajer:   { icon: GraduationCap,color:"text-green-600",  bg: "bg-green-500",  light: "bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800" },
  musteri:  { icon: Users,       color: "text-orange-600", bg: "bg-orange-500", light: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800" },
  satis:    { icon: TrendingUp,  color: "text-teal-600",   bg: "bg-teal-500",   light: "bg-teal-50 border-teal-200 dark:bg-teal-950/30 dark:border-teal-800" },
};

const CATEGORIES = [
  { label: "Ana Menü",         keys: ["dashboard", "yonetici_masasi", "calendar"] },
  { label: "Destek Merkezi",   keys: ["support_center", "control_panel", "work_tracking", "activities", "messages", "todos", "project_planning", "expenses", "my_leave_requests", "personal_calendar"] },
  { label: "TaskQube",         keys: ["taskqube_v3", "taskqube_dashboard", "taskqube_projects", "taskqube_tickets", "taskqube_kanban", "taskqube_settings"] },
  { label: "İnsan Kaynakları", keys: ["employees", "leave_requests", "ik_leave_requests", "leave_allowances", "leave_types", "ik_expense_requests", "employee_report", "org_chart", "personel_hareketleri"] },
  { label: "Müşteriler",       keys: ["customers", "musteri_kullanicilari", "customer_map"] },
  { label: "Sözleşme Yönetimi", keys: ["sozlesmeler", "hakedisler"] },
  { label: "Satış",            keys: ["satis", "satis_aktivite_ekle", "satis_teklifleri", "satis_raporlari"] },
  { label: "Raporlar",         keys: ["quick_report"] },
  { label: "Sistem Yönetimi",  keys: ["users", "app_version", "definitions", "announcements", "role_permissions", "cop_kutusu", "denetim_kaydi", "oturum_yonetimi"] },
  { label: "Stok — Genel", keys: ["stok_dashboard", "stok_mobil", "stok_etiket", "stok_excel"] },
  { label: "Stok — Tanımlar", keys: ["stok_urunler", "stok_gruplar", "stok_depolar", "stok_raflar", "stok_urun_raf", "stok_sahalar", "stok_tedarikciler"] },
  { label: "Stok — İşlemler", keys: ["stok_giris", "stok_cikis", "stok_transfer", "stok_talep", "stok_fisler", "stok_sayim", "stok_parti_takibi"] },
  { label: "Stok — Raporlar", keys: ["stok_raporlar"] },
  { label: "Stok — Satın Alma", keys: ["stok_satinalma"] },
  { label: "Stok — Zimmet", keys: ["stok_zimmet"] },
  { label: "Diğer",            keys: ["ideas"] },
];

const ACTIONS = [
  { key: "can_view",   label: "Görüntüle", short: "👁️" },
  { key: "can_add",    label: "Ekle",      short: "➕" },
  { key: "can_edit",   label: "Düzenle",   short: "✏️" },
  { key: "can_delete", label: "Sil",       short: "🗑️" },
];

export default function RolePermissionsPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { permissions } = useRolePermissions();
  const [activeRole, setActiveRole] = useState("yonetici");

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => flowApi.entities.Role.list("name", 100),
  });

  const { data: dbPermissions = [] } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => flowApi.entities.RolePermission.list(),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ role_name, module, field, value }) => {
      const existing = dbPermissions.find(p => p.role_name === role_name && p.module === module);
      if (existing) {
        return flowApi.entities.RolePermission.update(existing.id, { [field]: value ? 1 : 0 });
      } else {
        return flowApi.entities.RolePermission.create({
          role_name, module,
          can_view: field === "can_view" ? (value ? 1 : 0) : 0,
          can_add: field === "can_add" ? (value ? 1 : 0) : 0,
          can_edit: field === "can_edit" ? (value ? 1 : 0) : 0,
          can_delete: field === "can_delete" ? (value ? 1 : 0) : 0,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      toast.success("Yetki güncellendi");
    },
  });

  const getPermission = (role_name, module, field) => {
    const perm = dbPermissions.find(p => p.role_name === role_name && p.module === module);
    if (perm) return perm[field] == 1;
    const defPerm = permissions[role_name]?.[module];
    if (!defPerm) return false;
    const map = { can_view: "view", can_add: "add", can_edit: "edit", can_delete: "delete" };
    return defPerm[map[field]] === true;
  };

  const activeRoleObj = roles.find(r => r.name === activeRole);
  const cfg = ROLE_ICONS[activeRole] || ROLE_ICONS.kullanici;
  const RoleIcon = cfg.icon;

  return (
    <div className="flex gap-6 h-full">
      {/* SOL PANEL - ROLLER */}
      <div className="w-56 shrink-0">
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roller</p>
          </div>
          <div className="p-2 space-y-1">
            {roles.map((role) => {
              const rcfg = ROLE_ICONS[role.name] || ROLE_ICONS.kullanici;
              const RIcon = rcfg.icon;
              const isActive = activeRole === role.name;
              const moduleCount = dbPermissions.filter(p => p.role_name === role.name && p.can_view == 1).length;
              return (
                <button key={role.name} onClick={() => setActiveRole(role.name)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                    isActive ? `${rcfg.light} border` : "hover:bg-muted/50 border border-transparent")}>
                  <div className={cn("p-1.5 rounded-lg", isActive ? rcfg.bg : "bg-muted")}>
                    <RIcon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-muted-foreground")}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-semibold truncate", isActive ? rcfg.color : "text-foreground")}>{role.label}</p>
                    <p className="text-xs text-muted-foreground">{moduleCount} modül</p>
                  </div>
                  {isActive && <div className={cn("w-1.5 h-1.5 rounded-full", rcfg.bg)}/>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SAĞ PANEL - YETKİLER */}
      <div className="flex-1 min-w-0">
        {/* Rol Başlığı */}
        <div className={cn("flex items-center gap-3 p-4 rounded-2xl border mb-4", cfg.light)}>
          <div className={cn("p-2.5 rounded-xl", cfg.bg)}>
            <RoleIcon className="w-5 h-5 text-white"/>
          </div>
          <div>
            <h2 className={cn("text-base font-bold", cfg.color)}>{activeRoleObj?.label || activeRole}</h2>
            <p className="text-xs text-muted-foreground">{activeRoleObj?.description || "Rol yetki yönetimi"}</p>
          </div>
          {activeRole === "admin" && (
            <div className="ml-auto bg-red-100 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-xl border border-red-200">
              ⚠️ Tam Yetkili — Değiştirilemez
            </div>
          )}
        </div>

        {activeRole === "admin" ? (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
            <ShieldCheck className="w-12 h-12 text-red-400 mx-auto mb-2"/>
            <p className="text-sm text-red-700 dark:text-red-400 font-medium">Admin rolü tüm modüllere tam erişime sahiptir.</p>
            <p className="text-xs text-red-500 mt-1">Bu yetkiler değiştirilemez.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {CATEGORIES.map((cat) => {
              const catModules = MODULES.filter(m => cat.keys.includes(m.key));
              if (!catModules.length) return null;
              const catViewCount = catModules.filter(m => getPermission(activeRole, m.key, "can_view")).length;
              return (
                <div key={cat.label} className="bg-card rounded-2xl border border-border/50 overflow-hidden shadow-sm">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-muted/40 border-b border-border/30">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{cat.label}</h3>
                    <span className="text-xs text-muted-foreground">{catViewCount}/{catModules.length} aktif</span>
                  </div>
                  <div className="divide-y divide-border/20">
                    {catModules.map((mod) => (
                      <div key={mod.key} className="flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
                        <p className="flex-1 text-sm font-medium text-foreground">{mod.label}</p>
                        <div className="flex items-center gap-6">
                          {ACTIONS.map(action => {
                            const val = getPermission(activeRole, mod.key, action.key);
                            return (
                              <div key={action.key} className="flex flex-col items-center gap-1 w-14">
                                <span className="text-[10px] text-muted-foreground">{action.label}</span>
                                <Switch
                                  checked={val}
                                  onCheckedChange={(v) => updateMutation.mutate({
                                    role_name: activeRole, module: mod.key, field: action.key, value: v,
                                  })}
                                  className="scale-75"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
