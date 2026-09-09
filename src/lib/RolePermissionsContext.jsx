import { createContext, useContext } from "react";
import { useAuth } from "@/lib/AuthContext";

export const MODULES = [
  { key: "dashboard",           label: "Dashboard",              path: "/" },
  { key: "employees",           label: "Çalışanlar",             path: "/calisanlar" },
  { key: "customers",           label: "Müşteriler",             path: "/musteriler" },
  { key: "musteri_kullanicilari", label: "Müşteri Kullanıcıları",  path: "/musteri-kullanicilari" },
  { key: "role_permissions",    label: "Yetkilendirme",          path: "/yetkilendirme" },
  { key: "cop_kutusu",          label: "Çöp Kutusu",             path: "/cop-kutusu" },
  { key: "denetim_kaydi",       label: "Denetim Kaydı",          path: "/denetim-kaydi" },
  { key: "oturum_yonetimi",     label: "Oturum Yönetimi",        path: "/oturum-yonetimi" },
  { key: "calendar",            label: "Takvim",                 path: "/takvim" },
  { key: "activities",          label: "Aktiviteler",            path: "/aktiviteler" },
  { key: "add_activity",        label: "Aktivite Ekle",          path: "/aktivite-ekle" },
  { key: "work_tracking",       label: "İş Takip",               path: "/is-takip" },
  { key: "ideas",               label: "Bir Fikrim Var",         path: "/fikirler" },
  { key: "messages",            label: "Mesajlar",               path: "/mesajlar" },
  { key: "todos",               label: "Yapılacaklar",           path: "/yapilacaklar" },
  { key: "leave_requests",      label: "İzin Talepleri",         path: "/izin-talepleri" },
  { key: "my_leave_requests",   label: "İzinlerim",              path: "/izinlerim" },
  { key: "ik_leave_requests",   label: "İzin Yönetimi (IK)",     path: "/ik-izin-yonetimi" },
  { key: "personal_calendar",   label: "Kişisel Takvim",         path: "/kisisel-takvim" },
  { key: "reports",             label: "Raporlar",               path: "/raporlar" },
  { key: "employee_report",     label: "Çalışan Raporu",         path: "/calisan-raporu" },
  { key: "personel_hareketleri", label: "PDKS (Personel Hareketleri)", path: "/personel-hareketleri" },
  { key: "users",               label: "Kullanıcılar",           path: "/kullanicilar" },
  { key: "app_version",         label: "Versiyon",               path: "/versiyon" },
  { key: "definitions",         label: "Tanım Ekranları",        path: "/tanimlar" },
  { key: "customer_map",        label: "Müşteri Haritası",       path: "/musteriler-haritasi" },
  { key: "expenses",            label: "Harcamalar",             path: "/harcamalar" },
  { key: "leave_allowances",    label: "İzin Hakları",           path: "/izin-haklari" },
  { key: "leave_types",         label: "İzin Türleri",           path: "/izin-turleri" },
  { key: "taskqube_v3",         label: "TaskQube v3",            path: "/taskqube-v3" },
  { key: "taskqube_dashboard",  label: "TaskQube Dashboard",     path: "/taskqube-v3/dashboard" },
  { key: "taskqube_projects",   label: "TaskQube Projeler",      path: "/taskqube-v3" },
  { key: "taskqube_tickets",    label: "TaskQube Biletler",      path: "/taskqube-v3/tickets" },
  { key: "taskqube_kanban",     label: "TaskQube Panolar",       path: "/taskqube-v3/kanban" },
  { key: "taskqube_settings",   label: "TaskQube Tanımlar",      path: "/taskqube-v3/tanimlar" },
  { key: "control_panel",       label: "Kontrol Paneli",         path: "/takvim-v2" },
  { key: "ik_expense_requests", label: "Harcama Yönetimi (IK)", path: "/ik-harcama-yonetimi" },
  { key: "announcements",       label: "Duyurular",              path: "/duyurular" },
  { key: "support_center",      label: "Destek Merkezi",         path: "/destek-merkezi" },
  { key: "org_chart",           label: "Organizasyon Semasi",    path: "/org-sema" },
  { key: "quick_report",        label: "Hizli Raporlama",        path: "/hizli-rapor" },
  { key: "project_planning",     label: "Proje Planlama",         path: "/proje-planlama" },
  { key: "satis",               label: "Satış",                  path: null },
  { key: "satis_masasi",        label: "Satış Masası",           path: "/satis-raporlari" },
  { key: "satis_aktivite_ekle", label: "Satış Aktivite Ekle",     path: "/satis-aktivite-ekle" },
  { key: "satis_teklifleri",    label: "Teklifler",              path: "/satis-teklifleri" },
  { key: "satis_raporlari",     label: "Satış Raporları",        path: "/satis-raporlari" },
  { key: "yonetici_masasi",     label: "Yönetici Masası",        path: "/yonetici-masasi" },
  { key: "sozlesmeler",         label: "Sözleşmeler",            path: "/sozlesmeler" },
  { key: "hakedisler",          label: "Hakediş",                path: "/hakedisler" },
  // ── Stok / Depo Yönetimi — Faz 1: Tanımlar ──
  { key: "stok_urunler",        label: "Ürün Kartları",          path: "/stok/urunler" },
  { key: "stok_gruplar",        label: "Ürün Grupları",          path: "/stok/gruplar" },
  { key: "stok_depolar",        label: "Depolar",                path: "/stok/depolar" },
  { key: "stok_raflar",         label: "Raf Tanımları",          path: "/stok/raflar" },
  { key: "stok_urun_raf",       label: "Ürün - Raf Atama",       path: "/stok/urun-raf" },
  { key: "stok_sahalar",        label: "Sahalar / Projeler",     path: "/stok/sahalar" },
  { key: "stok_tedarikciler",   label: "Tedarikçiler",           path: "/stok/tedarikciler" },
  // Faz 2: Hareket fişleri
  { key: "stok_giris",          label: "Stok Giriş",             path: "/stok/giris" },
  { key: "stok_cikis",          label: "Stok Çıkış",             path: "/stok/cikis" },
  { key: "stok_transfer",       label: "Depo Transfer",          path: "/stok/transfer" },
  { key: "stok_fisler",         label: "Stok Fiş Listesi",       path: "/stok/fisler" },
  { key: "stok_talep",          label: "Malzeme Talebi",         path: "/stok/talep" },
  { key: "stok_sayim",          label: "Sayım / Envanter",       path: "/stok/sayim" },
  { key: "stok_parti_takibi",   label: "Parti & Raf Ömrü",       path: "/stok/partiler" },
  { key: "stok_raporlar",       label: "Stok Raporları",         path: "/stok/raporlar" },
  { key: "stok_satinalma",      label: "Satın Alma",             path: "/stok/satin-alma" },
  { key: "stok_zimmet",         label: "El Aletleri & Zimmet",   path: "/stok/zimmet" },
  { key: "stok_dashboard",      label: "Stok Kontrol Merkezi",   path: "/stok" },
  { key: "stok_mobil",          label: "Mobil Hızlı İşlem",      path: "/stok/mobil" },
  { key: "stok_etiket",         label: "Etiket Bas",             path: "/stok/etiket" },
  { key: "stok_excel",          label: "Excel Stok Yükleme",     path: "/stok/excel" },
  { key: "stok_qnb",            label: "QNB e-Belge",            path: "/stok/qnb" },
  { key: "stok_fiyat_arastir",  label: "Fiyat Araştır",          path: "/stok/fiyat-arastir" },
];

const none = () => Object.fromEntries(MODULES.map(m => [m.key, { view: false, add: false, edit: false, delete: false }]));

export const DEFAULT_PERMISSIONS = {
  admin: Object.fromEntries(MODULES.map(m => [m.key, { view: true, add: true, edit: true, delete: true }])),
  yonetici: { ...none(), dashboard:{view:true,add:false,edit:false,delete:false}, employees:{view:true,add:true,edit:true,delete:false}, customers:{view:true,add:true,edit:true,delete:false}, calendar:{view:true,add:false,edit:false,delete:false}, activities:{view:true,add:true,edit:true,delete:true}, add_activity:{view:true,add:true,edit:true,delete:true}, work_tracking:{view:true,add:true,edit:true,delete:true}, ideas:{view:true,add:true,edit:true,delete:false}, messages:{view:true,add:true,edit:true,delete:true}, todos:{view:true,add:true,edit:true,delete:true}, leave_requests:{view:true,add:true,edit:true,delete:true}, my_leave_requests:{view:true,add:true,edit:true,delete:true}, personal_calendar:{view:true,add:false,edit:false,delete:false}, reports:{view:true,add:false,edit:false,delete:false}, employee_report:{view:true,add:false,edit:false,delete:false}, users:{view:true,add:true,edit:true,delete:false}, app_version:{view:true,add:false,edit:false,delete:false}, definitions:{view:true,add:false,edit:false,delete:false}, customer_map:{view:true,add:false,edit:false,delete:false}, expenses:{view:true,add:true,edit:true,delete:true}, leave_allowances:{view:true,add:true,edit:true,delete:false}, leave_types:{view:true,add:true,edit:true,delete:false}, taskqube_v3:{view:true,add:true,edit:true,delete:true}, taskqube_dashboard:{view:true,add:false,edit:false,delete:false}, taskqube_projects:{view:true,add:true,edit:true,delete:true}, taskqube_tickets:{view:true,add:true,edit:true,delete:true}, taskqube_kanban:{view:true,add:true,edit:true,delete:true}, taskqube_settings:{view:true,add:true,edit:true,delete:false}, oturum_yonetimi:{view:true,add:true,edit:true,delete:true} },
  ik: { ...none(), dashboard:{view:true,add:false,edit:false,delete:false}, employees:{view:true,add:true,edit:true,delete:false}, leave_requests:{view:true,add:true,edit:true,delete:true}, my_leave_requests:{view:true,add:true,edit:true,delete:true}, ik_leave_requests:{view:true,add:false,edit:true,delete:false}, messages:{view:true,add:true,edit:true,delete:true}, reports:{view:true,add:false,edit:false,delete:false}, employee_report:{view:true,add:false,edit:false,delete:false}, leave_allowances:{view:true,add:true,edit:true,delete:false}, leave_types:{view:true,add:true,edit:true,delete:false} },
  kullanici: { ...none(), dashboard:{view:true,add:false,edit:false,delete:false}, customers:{view:true,add:false,edit:false,delete:false}, calendar:{view:true,add:false,edit:false,delete:false}, activities:{view:true,add:true,edit:true,delete:false}, add_activity:{view:true,add:true,edit:true,delete:false}, work_tracking:{view:true,add:true,edit:true,delete:false}, ideas:{view:true,add:true,edit:false,delete:false}, messages:{view:true,add:true,edit:true,delete:true}, todos:{view:true,add:true,edit:true,delete:true}, my_leave_requests:{view:true,add:true,edit:false,delete:true}, personal_calendar:{view:true,add:false,edit:false,delete:false}, customer_map:{view:true,add:false,edit:false,delete:false}, expenses:{view:true,add:true,edit:true,delete:false}, taskqube_v3:{view:true,add:true,edit:true,delete:false}, taskqube_dashboard:{view:true,add:false,edit:false,delete:false}, taskqube_projects:{view:true,add:false,edit:false,delete:false}, taskqube_tickets:{view:true,add:true,edit:true,delete:false}, taskqube_kanban:{view:true,add:false,edit:false,delete:false} },
  stajer: { ...none(), dashboard:{view:true,add:false,edit:false,delete:false}, activities:{view:true,add:true,edit:false,delete:false}, add_activity:{view:true,add:true,edit:false,delete:false}, my_leave_requests:{view:true,add:true,edit:false,delete:false}, work_tracking:{view:true,add:true,edit:false,delete:false}, messages:{view:true,add:true,edit:false,delete:false}, todos:{view:true,add:true,edit:false,delete:false} },
  musteri: { ...none(), taskqube_v3:{view:true,add:false,edit:false,delete:false}, taskqube_dashboard:{view:true,add:false,edit:false,delete:false}, taskqube_projects:{view:true,add:false,edit:false,delete:false}, taskqube_tickets:{view:true,add:true,edit:true,delete:false}, taskqube_kanban:{view:true,add:false,edit:false,delete:false} },
  satis: { ...none(), dashboard:{view:true,add:false,edit:false,delete:false}, customers:{view:true,add:true,edit:true,delete:false}, activities:{view:true,add:true,edit:true,delete:false}, add_activity:{view:true,add:true,edit:true,delete:false}, messages:{view:true,add:true,edit:true,delete:false}, todos:{view:true,add:true,edit:true,delete:true}, expenses:{view:true,add:true,edit:true,delete:false}, my_leave_requests:{view:true,add:true,edit:false,delete:false}, users:{view:true,add:false,edit:false,delete:false}, app_version:{view:true,add:false,edit:false,delete:false}, satis:{view:true,add:true,edit:true,delete:false}, satis_masasi:{view:true,add:false,edit:false,delete:false}, satis_aktivite_ekle:{view:true,add:true,edit:true,delete:false}, satis_teklifleri:{view:true,add:true,edit:true,delete:false}, satis_raporlari:{view:true,add:false,edit:false,delete:false} },
};

const RolePermissionsContext = createContext({ MODULES, DEFAULT_PERMISSIONS });

export function RolePermissionsProvider({ children }) {
  return (
    <RolePermissionsContext.Provider value={{ MODULES, DEFAULT_PERMISSIONS }}>
      {children}
    </RolePermissionsContext.Provider>
  );
}

export function useRolePermissions() {
  const ctx = useContext(RolePermissionsContext);
  const { user } = useAuth();
  const role = user?.role || "kullanici";
  const dbPerms = user?.permissions || [];

  const hasPermission = (roleKey, moduleKey) => {
    if (roleKey === "admin") return true;
    const perm = dbPerms.find(p => p.module === moduleKey);
    return perm ? perm.can_view == 1 : false;
  };

  const can = (roleKey, moduleKey, action = "view") => {
    if (roleKey === "admin") return true;
    const map = { view: "can_view", add: "can_add", edit: "can_edit", delete: "can_delete" };
    const perm = dbPerms.find(p => p.module === moduleKey);
    return perm ? perm[map[action]] == 1 : false;
  };

  return {
    ...ctx,
    permissions: DEFAULT_PERMISSIONS,
    hasPermission,
    can,
    updatePermission: () => {},
    dbPermissions: dbPerms,
    isLoadingPermissions: false,
    resetToDefaults: () => {},
  };
}
