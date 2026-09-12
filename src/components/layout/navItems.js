import { LayoutDashboard, Users, BarChart3, ClipboardList, CalendarDays, Building2, MessageCircle, CheckSquare, Umbrella, FileSpreadsheet, Wrench, ShieldCheck, ShieldOff, Receipt, Megaphone, FileText, Trash2, ScrollText, Clock, CreditCard, Wallet, Boxes, ArrowLeftRight, Layers, ClipboardCheck, ShoppingCart, HardHat, Smartphone, Tags, FileUp, FileCode2, CalendarClock, Calculator, Lock, ScanSearch, Radar, QrCode, Camera } from "lucide-react";

// Tek doğruluk kaynağı: uygulamanın tüm navigasyon ağacı. BottomNav.jsx
// (alt bar + uçan alt-menüler) ve GlobalSearch.jsx (⌘K hızlı atlama) buradan
// okur. Görünürlük `roles` alanından ETKİLENMEZ — tamamen Yetkilendirme
// ekranından yönetilen DB role_permissions.can_view'a bakılır (bkz.
// BottomNav.jsx `canViewModule`).
export const allNavItems = [
{ labelKey: "dashboard", path: "/", icon: LayoutDashboard, roles: ["admin", "yonetici", "kullanici"] },

{
  labelKey: "insan_kaynaklari", path: null, icon: Users, roles: ["admin", "yonetici", "kullanici", "ik"],
  children: [
    {
      labelKey: "ik_grp_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "ik_tanimlar", path: "/ik-tanimlar", icon: Wrench, roles: ["admin", "yonetici"] },
      ]
    },
    {
      labelKey: "ik_grp_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "employees", path: "/calisanlar", icon: Users, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "ikb_zam", path: "/ik/zam", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ozluk_evrak", path: "/ik/ozluk-evrak", icon: FileText, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_tutanak", path: "/ik/tutanak", icon: ScrollText, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ilan", path: "/ik/ilan", icon: Megaphone, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "org_chart", path: "/org-sema", icon: Users, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ik_leave_requests", path: "/ik-izin-yonetimi", icon: Umbrella, roles: ["admin", "yonetici"] },
        { labelKey: "ikb_izin_evrak", path: "/ik/izin-evrak", icon: ClipboardCheck, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ik_expense_requests", path: "/ik-harcama-yonetimi", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "ik_grp_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "employee_report", path: "/calisan-raporu", icon: FileSpreadsheet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "quick_report", path: "/hizli-rapor", icon: FileSpreadsheet, roles: ["admin", "yonetici", "kullanici", "ik"] },
      ]
    },
  ]
},
{
  labelKey: "pdks_vardiya", path: null, icon: CreditCard, roles: ["admin", "yonetici", "ik"],
  children: [
    {
      labelKey: "pdks_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "pdks_tanimlar", path: "/ik/pdks-tanimlar", icon: Wrench, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "pdks_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "pdks_kart_yonetimi", path: "/kart-yonetimi", icon: CreditCard, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_vardiya_atama", path: "/ik/vardiya-transfer", icon: ArrowLeftRight, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "pdks_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "personel_hareketleri", path: "/personel-hareketleri", icon: Clock, roles: ["admin", "yonetici", "ik"] },
      ]
    },
  ]
},
{
  labelKey: "devriye_yonetimi", path: null, icon: Radar, roles: ["admin", "yonetici", "guvenlik"],
  children: [
    {
      labelKey: "devriye_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici"],
      children: [
        { labelKey: "devriye_tanimlar", path: "/devriye/tanimlar", icon: Wrench, roles: ["admin", "yonetici"] },
      ]
    },
    {
      labelKey: "devriye_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "guvenlik"],
      children: [
        { labelKey: "devriye_atama", path: "/devriye/atama", icon: CalendarDays, roles: ["admin", "yonetici"] },
        { labelKey: "devriye_personel", path: "/devriye/personel", icon: Users, roles: ["admin", "yonetici"] },
        { labelKey: "devriye_qr_saha", path: "/devriye/qr-saha", icon: QrCode, roles: ["admin", "yonetici", "guvenlik"] },
      ]
    },
    {
      labelKey: "devriye_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici"],
      children: [
        { labelKey: "devriye_okuma_rapor", path: "/devriye/raporlar", icon: FileSpreadsheet, roles: ["admin", "yonetici"] },
        { labelKey: "devriye_saat_rapor", path: "/devriye/saat-raporu", icon: BarChart3, roles: ["admin", "yonetici"] },
        { labelKey: "devriye_qr_yazdir", path: "/devriye/qr-yazdir", icon: Camera, roles: ["admin"] },
      ]
    },
  ]
},
{
  labelKey: "maas_bordro", path: null, icon: Calculator, roles: ["admin", "yonetici", "ik"],
  children: [
    {
      labelKey: "maas_bordro_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "bordro_tanimlar", path: "/ik/bordro-tanimlar", icon: Wrench, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "maas_bordro_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "ikb_puantaj", path: "/ik/puantaj", icon: CalendarClock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_mesai", path: "/ik/mesai", icon: Clock, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_kesinti", path: "/ik/kesinti", icon: Receipt, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ic_borc", path: "/ik/ic-borc", icon: Wallet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_personel_masraf", path: "/ik/personel-masraf", icon: Wallet, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_bordro", path: "/ik/bordro", icon: Calculator, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_ay_kapanis", path: "/ik/ay-kapanis", icon: Lock, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "maas_bordro_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "ikb_puantaj_rapor", path: "/ik/puantaj-rapor", icon: BarChart3, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "ikb_maas_ozet", path: "/ik/maas-ozet", icon: FileSpreadsheet, roles: ["admin", "yonetici", "ik"] },
      ]
    },
  ]
},
{
  labelKey: "stok_yonetimi", path: null, icon: Boxes, roles: ["admin", "yonetici", "kullanici"],
  children: [
    {
      labelKey: "stok_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "stok_tanimlar", path: "/stok/tanimlar", icon: Wrench, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
    {
      labelKey: "stok_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "stok_mobil", path: "/stok/mobil", icon: Smartphone, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_fisler", path: "/stok/fisler", icon: FileText, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_sayim", path: "/stok/sayim", icon: ClipboardCheck, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_satinalma", path: "/stok/satin-alma", icon: ShoppingCart, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_zimmet", path: "/stok/zimmet", icon: HardHat, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_etiket", path: "/stok/etiket", icon: Tags, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_demirbas_sorgula", path: "/stok/demirbas-sorgula", icon: ScanSearch, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_excel", path: "/stok/excel", icon: FileUp, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_qnb", path: "/stok/qnb", icon: FileCode2, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
    {
      labelKey: "stok_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "stok_dashboard", path: "/stok", icon: Boxes, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_raporlar", path: "/stok/raporlar", icon: BarChart3, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "stok_parti_takibi", path: "/stok/partiler", icon: Layers, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
  ]
},
{
  labelKey: "is_takibi", path: null, icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"],
  children: [
    {
      labelKey: "is_takibi_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici"],
      children: [
        { labelKey: "is_takibi_tanimlar_v2", path: "/is-takibi/genel-tanimlar", icon: Wrench, roles: ["admin", "yonetici"] },
      ]
    },
    {
      labelKey: "is_takibi_islem", path: null, icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"],
      children: [
        { labelKey: "is_takibi_projeler", path: "/is-takibi", icon: Building2, roles: ["admin", "yonetici", "kullanici"] },
        { labelKey: "is_takibi_biletler", path: "/is-takibi/tickets", icon: ClipboardList, roles: ["admin", "yonetici", "kullanici", "musteri"] },
        { labelKey: "is_takibi_kanban", path: "/is-takibi/kanban", icon: CheckSquare, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
    {
      labelKey: "is_takibi_rapor", path: null, icon: BarChart3, roles: ["admin", "yonetici", "kullanici"],
      children: [
        { labelKey: "is_takibi_dashboard", path: "/is-takibi/dashboard", icon: BarChart3, roles: ["admin", "yonetici", "kullanici"] },
      ]
    },
  ]
},
{
  labelKey: "musteriler_menu", path: null, icon: Building2, roles: ["admin", "yonetici"],
  children: [
    { labelKey: "customers", path: "/musteriler", icon: Building2, roles: ["admin", "yonetici"] },
    { labelKey: "musteri_kullanicilari", path: "/musteri-kullanicilari", icon: Users, roles: ["admin", "yonetici"] },
  ]
},
{
  labelKey: "sozlesme_yonetimi", path: null, icon: ScrollText, roles: ["admin", "yonetici", "ik"],
  children: [
    {
      labelKey: "sozlesme_tanim", path: null, icon: Wrench, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "sozlesme_tanimlar", path: "/sozlesme-tanimlar", icon: Wrench, roles: ["admin", "yonetici", "ik"] },
      ]
    },
    {
      labelKey: "sozlesme_islem", path: null, icon: ArrowLeftRight, roles: ["admin", "yonetici", "ik"],
      children: [
        { labelKey: "sozlesmeler", path: "/sozlesmeler", icon: FileText, roles: ["admin", "yonetici", "ik"] },
        { labelKey: "hakedisler", path: "/hakedisler", icon: Wallet, roles: ["admin", "yonetici", "ik"] },
      ]
    },
  ]
},
{
  labelKey: "system_admin", path: null, icon: ShieldCheck, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"],
  children: [
    { labelKey: "users", path: "/kullanicilar", icon: Users, roles: ["admin", "yonetici", "kullanici", "ik", "stajer", "musteri"] },
    { labelKey: "role_permissions", path: "/yetkilendirme", icon: ShieldCheck, roles: ["admin"] },
    { labelKey: "oturum_yonetimi", path: "/oturum-yonetimi", icon: ShieldOff, roles: ["admin", "yonetici"] },
    { labelKey: "announcements", path: "/duyurular", icon: Megaphone, roles: ["admin", "yonetici"] },
    { labelKey: "cop_kutusu", path: "/cop-kutusu", icon: Trash2, roles: ["admin"] },
    { labelKey: "denetim_kaydi", path: "/denetim-kaydi", icon: ScrollText, roles: ["admin"] },
  ]
},
{
  labelKey: "support_center", path: null, icon: Wrench, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"],
  children: [
    { labelKey: "messages", path: "/mesajlar", icon: MessageCircle, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"] },
    { labelKey: "todos", path: "/yapilacaklar", icon: CheckSquare, roles: ["admin", "yonetici", "kullanici"] },
    { labelKey: "expenses", path: "/harcamalar", icon: FileSpreadsheet, roles: ["admin", "yonetici", "kullanici", "ik"] },
    { labelKey: "my_leave_requests", path: "/izinlerim", icon: Umbrella, roles: ["admin", "yonetici", "kullanici", "ik", "stajer"] },
  ]
},
];

export function getAllLeafItems() {
  const items = [];
  function walk(list) {
    for (const item of list) {
      if (item.children) {
        walk(item.children);
      } else {
        items.push(item);
      }
    }
  }
  walk(allNavItems);
  return items;
}

// Ata-zinciri: verilen path'e eşleşen yaprağa kadar geçilen tüm düğümlerin
// labelKey'lerini (ata grupları + yaprağın kendisi) sıralı dizi olarak döner.
// AppLayout'taki breadcrumb bunu kullanır. Eşleşme yoksa [] döner.
export function getBreadcrumbTrail(pathname) {
  function walk(list, trail) {
    for (const item of list) {
      const nextTrail = [...trail, item.labelKey];
      if (item.path === pathname) return nextTrail;
      if (item.children) {
        const found = walk(item.children, nextTrail);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(allNavItems, []) || [];
}

// Dinamik detay rotaları (navItems ağacında kendi yaprağı olmayan, ör.
// /calisan/:id) için: prefix eşleşince ata-zinciri leafPath'in yaprağından
// hesaplanır, sayfanın kendi dinamik etiketi (BreadcrumbContext) son segmenti
// değiştirir.
export const DETAIL_ROUTE_PARENTS = [
  { prefix: "/calisan/", leafPath: "/calisanlar" },
];
