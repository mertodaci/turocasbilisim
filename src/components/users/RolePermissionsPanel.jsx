import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, Shield, User, Users, Briefcase, GraduationCap, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
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
};

const CATEGORIES = [
  { label: "Ana Menü",         keys: ["dashboard"] },
  { label: "Destek Merkezi",   keys: ["support_center", "messages", "todos", "expenses", "my_leave_requests", "personal_calendar"] },
  { label: "İş Takibi",         keys: ["is_takibi", "is_takibi_dashboard", "is_takibi_projeler", "is_takibi_biletler", "is_takibi_kanban", "is_takibi_bilet_durumlari", "is_takibi_bilet_tipleri", "is_takibi_tanimlar_v2"] },
  { label: "İnsan Kaynakları", keys: ["employees", "leave_requests", "ik_leave_requests", "leave_allowances", "leave_types", "ik_expense_requests", "employee_report", "quick_report", "org_chart", "personel_hareketleri"] },
  { label: "Müşteriler",       keys: ["customers", "musteri_kullanicilari", "customer_map", "musteri_tanimlari"] },
  { label: "Sözleşme Yönetimi", keys: ["sozlesmeler", "hakedisler", "sozlesme_tanimlar", "sozlesme_turleri", "sozlesme_urunler", "sozlesme_moduller"] },
  { label: "EBYS", keys: ["ebys_evraklar", "ebys_tanimlar", "ebys_ayarlari"] },
  { label: "Sistem Yönetimi",  keys: ["users", "definitions", "announcements", "role_permissions", "cop_kutusu", "denetim_kaydi", "oturum_yonetimi", "sistem_sagligi"] },
  { label: "Stok — Genel", keys: ["stok_dashboard", "stok_mobil", "stok_etiket", "stok_demirbas_sorgula", "stok_excel"] },
  { label: "Stok — Tanımlar", keys: ["stok_urunler", "stok_gruplar", "stok_depolar", "stok_raflar", "stok_urun_raf", "stok_sahalar", "stok_tedarikciler", "stok_zimmet_yerleri", "stok_tanimlar"] },
  { label: "Stok — İşlemler", keys: ["stok_giris", "stok_cikis", "stok_transfer", "stok_iade", "stok_fisler", "stok_sayim", "stok_parti_takibi"] },
  { label: "Stok — Raporlar", keys: ["stok_raporlar"] },
  { label: "Stok — Satın Alma", keys: ["stok_satinalma"] },
  { label: "Stok — Zimmet", keys: ["stok_zimmet", "stok_zimmet_yerleri"] },
  { label: "Stok — e-Belge", keys: ["stok_qnb"] },
  { label: "İK/Bordro — Tanımlar", keys: ["ikb_subeler", "ikb_bolumler", "ikb_vardiyalar", "ikb_vardiya_planlari", "pdks_tanimlar", "ikb_tatil_sihirbazi", "ikb_hakedis_ayar", "ikb_bordro_yemek", "ikb_sirket", "bordro_tanimlar"] },
  { label: "İK/Bordro — İşlemler", keys: ["ikb_personel", "ikb_zam", "ikb_ozluk_evrak", "ikb_izin_evrak", "ikb_vardiya_atama", "ikb_puantaj", "ikb_mesai", "ikb_kesinti", "ikb_ic_borc", "ikb_personel_masraf", "ikb_bordro", "ikb_ay_kapanis", "ikb_tutanak"] },
  { label: "İK/Bordro — Raporlar", keys: ["ikb_puantaj_rapor", "ikb_maas_ozet"] },
  { label: "Devriye Yönetimi", keys: ["devriye_lokasyon", "devriye_vardiya_tanim", "devriye_tanimlar", "devriye_atama", "devriye_personel", "devriye_qr_saha", "devriye_okuma_rapor", "devriye_saat_rapor", "devriye_qr_yazdir"] },
];

const ACTIONS = [
  { key: "can_view",   label: "Görüntüle", short: "👁️" },
  { key: "can_add",    label: "Ekle",      short: "➕" },
  { key: "can_edit",   label: "Düzenle",   short: "✏️" },
  { key: "can_delete", label: "Sil",       short: "🗑️" },
];

function RoleForm({ onSave, onCancel, initial, existingNames = [] }) {
  const [name, setName] = useState(initial?.name || "");
  const [label, setLabel] = useState(initial?.label || "");
  const [description, setDescription] = useState(initial?.description || "");
  const isEdit = !!initial;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label.trim()) { toast.error("Görünen ad zorunludur!"); return; }
    if (!isEdit) {
      const trimmed = name.trim();
      if (!trimmed) { toast.error("Sistem değeri zorunludur!"); return; }
      if (existingNames.includes(trimmed)) { toast.error("Bu sistem değeri zaten kullanılıyor!"); return; }
      onSave({ name: trimmed, label: label.trim(), description: description.trim() });
    } else {
      onSave({ label: label.trim(), description: description.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 bg-muted/40 border border-border/50 rounded-xl p-3 mb-2">
      {!isEdit && (
        <div className="space-y-1">
          <label className="text-[11px] text-muted-foreground">Sistem Değeri</label>
          <Input value={name} onChange={(e) => setName(e.target.value.trim())} placeholder="örn: depo_sorumlusu" className="h-8 text-xs" />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Görünen Ad</label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="örn: Depo Sorumlusu" className="h-8 text-xs" />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] text-muted-foreground">Açıklama (opsiyonel)</label>
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="örn: Depo işlemlerini yönetir" className="h-8 text-xs" />
      </div>
      <div className="flex gap-1.5 pt-0.5">
        <button type="submit" className="flex-1 flex items-center justify-center gap-1 h-7 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
          <Check className="w-3 h-3" /> Kaydet
        </button>
        <button type="button" onClick={onCancel} className="flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-foreground border border-border/50 rounded-lg">
          <X className="w-3 h-3" />
        </button>
      </div>
    </form>
  );
}

export default function RolePermissionsPanel() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const { permissions } = useRolePermissions();
  const [activeRole, setActiveRole] = useState("yonetici");
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState(null);

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => flowApi.entities.Role.list("name", 100),
  });

  const { data: dbPermissions = [] } = useQuery({
    queryKey: ["role-permissions"],
    queryFn: () => flowApi.entities.RolePermission.list(),
  });

  const createRoleMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Role.create({ ...data, is_active: 1 }),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setShowCreateRole(false);
      setActiveRole(created.name);
      toast.success("Rol oluşturuldu");
    },
    onError: (e) => toast.error(e?.message || "Rol oluşturulamadı"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Role.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setEditingRoleId(null);
      toast.success("Rol güncellendi");
    },
    onError: (e) => toast.error(e?.message || "Rol güncellenemedi"),
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (role) => {
      const orphaned = dbPermissions.filter((p) => p.role_name === role.name);
      for (const p of orphaned) {
        try { await flowApi.entities.RolePermission.delete(p.id); } catch { /* devam */ }
      }
      await flowApi.entities.Role.delete(role.id);
    },
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
      if (activeRole === role.name) {
        const remaining = roles.filter((r) => r.id !== role.id);
        setActiveRole(remaining[0]?.name || "yonetici");
      }
      toast.success("Rol silindi");
    },
    onError: (e) => toast.error(e?.message || "Rol silinemedi"),
  });

  const handleDeleteRole = (role) => {
    if (window.confirm(`"${role.label}" rolü silinsin mi? Bu role ait tüm yetki tanımları da silinir.`)) {
      deleteRoleMutation.mutate(role);
    }
  };

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
      <div className="w-64 shrink-0">
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/30">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Roller</p>
            <button onClick={() => { setShowCreateRole((v) => !v); setEditingRoleId(null); }} className="flex items-center gap-1 text-xs text-primary hover:underline">
              <Plus className="w-3.5 h-3.5" /> Yeni Rol
            </button>
          </div>
          <div className="p-2 space-y-1">
            {showCreateRole && (
              <RoleForm
                existingNames={roles.map((r) => r.name)}
                onSave={(data) => createRoleMutation.mutate(data)}
                onCancel={() => setShowCreateRole(false)}
              />
            )}
            {roles.map((role) => {
              const rcfg = ROLE_ICONS[role.name] || ROLE_ICONS.kullanici;
              const RIcon = rcfg.icon;
              const isActive = activeRole === role.name;
              const isAdmin = role.name === "admin";
              const moduleCount = dbPermissions.filter(p => p.role_name === role.name && p.can_view == 1).length;

              if (editingRoleId === role.id) {
                return (
                  <RoleForm
                    key={role.id}
                    initial={role}
                    onSave={(data) => updateRoleMutation.mutate({ id: role.id, data })}
                    onCancel={() => setEditingRoleId(null)}
                  />
                );
              }

              return (
                <div key={role.name}
                  className={cn("group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all",
                    isActive ? `${rcfg.light} border` : "hover:bg-muted/50 border border-transparent")}>
                  <button onClick={() => setActiveRole(role.name)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className={cn("p-1.5 rounded-lg shrink-0", isActive ? rcfg.bg : "bg-muted")}>
                      <RIcon className={cn("w-3.5 h-3.5", isActive ? "text-white" : "text-muted-foreground")}/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold truncate", isActive ? rcfg.color : "text-foreground")}>{role.label}</p>
                      <p className="text-xs text-muted-foreground">{moduleCount} modül</p>
                    </div>
                  </button>
                  {!isAdmin && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => { setEditingRoleId(role.id); setShowCreateRole(false); }} className="p-1 text-muted-foreground hover:text-foreground">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleDeleteRole(role)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {isActive && <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", rcfg.bg)}/>}
                </div>
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
