import { createContext, useContext, useState, useEffect } from "react";

const LanguageContext = createContext();

const translations = {
  tr: {
    dashboard: "Operasyon Merkezi",
    employees: "Çalışanlar",
    customers: "Müşteriler",
    calendar: "Şirket Takvimi",
    ideas: "Bir Fikrim Var",
    corporate: "Kurumsal",
    authorization: "Yetkilendirme",
    my_workspace: "Operasyon Merkezi",
    support_center: "Destek Merkezi",
    hr: "İnsan Kaynakları",
    all_activities: "Tüm Aktiviteler",
    activities: "Aktiviteler",
    add_activity: "Aktivite Ekle",
    work_tracking: "İş Takip",
    taskqube_v3: "TaskQube v3",
    musteriler_menu: "Müşteriler",
    taskqube_dashboard: "Dashboard",
    musteri_panosu: "Müşteri Panosu",
    taskqube_projects: "Projeler",
    taskqube_tickets: "Biletler",
    taskqube_kanban: "Panolar",
    taskqube_settings: "TQ Tanımlar",
    tools: "Araçlar",
    messages: "Mesajlar",
    personal_calendar: "Kişisel Takvim",
    control_panel: "Kontrol Paneli",
    todos: "Yapılacaklar",
    leave_requests: "İzin Talepleri",
    my_leave_requests: "İzinler",
    ik_leave_management: "İzin Yönetimi",
    ik_leave_requests: "İzin Yönetimi",
    ik_expense_requests: "Harcama Yönetimi",
    profile: "Profil",
    reports: "Raporlar",
    general_report: "Detaylı Performans",
    employee_report: "Çalışan Raporu",
    pdks: "PDKS",
    personel_hareketleri: "Personel Hareketleri",
    pdks_kart_yonetimi: "Kart Yönetimi",
    org_chart: "Organizasyon Şeması",
    project_planning: "Proje Planlama",
    quick_report: "Hızlı Raporlama",
    satis: "Satış",
    satis_aktivite_ekle: "Satış Aktivitesi",
    satis_teklifleri: "Teklifler",
    satis_raporlari: "Satış Masası",
    satis_masasi: "Satış Masası",
    yonetici_masasi: "Yönetici Masası",
    system_admin: "Sistem Yönetimi",
    users: "Kullanıcılar",
    role_permissions: "Yetkilendirme",
    app_version: "Uygulama Versiyonu",
    definitions: "Tanım Ekranları",
    cop_kutusu: "Çöp Kutusu",
    musteri_kullanicilari: "Müşteri Kullanıcıları",
    denetim_kaydi: "Denetim Kaydı",
    oturum_yonetimi: "Oturum Yönetimi",
    announcements: "Duyurular",
    leave_allowances: "İzin Hakları Yönetimi",
    leave_types: "İzin Türleri ve Kurallar",
    hakedisler: "Hakediş",
    sozlesme_yonetimi: "Sözleşme Yönetimi",
    sozlesmeler: "Sözleşmeler",
    expenses: "Harcamalar",
    stok_yonetimi: "Stok / Depo Yönetimi",
    stok_urunler: "Ürün Kartları",
    stok_gruplar: "Ürün Grupları",
    stok_depolar: "Depolar",
    stok_raflar: "Raf Tanımları",
    stok_urun_raf: "Ürün - Raf Atama",
    stok_sahalar: "Sahalar / Projeler",
    stok_tedarikciler: "Tedarikçiler",
    stok_giris: "Stok Giriş",
    stok_cikis: "Stok Çıkış",
    stok_transfer: "Depo Transfer",
    stok_fisler: "Stok Fiş Listesi",
    stok_sayim: "Sayım / Envanter",
    stok_parti_takibi: "Parti & Raf Ömrü",
  },
  en: {
    dashboard: "Dashboard",
    employees: "Employees",
    customers: "Customers",
    calendar: "Company Calendar",
    ideas: "I Have an Idea",
    corporate: "Corporate",
    authorization: "Authorization",
    my_workspace: "Operations Center",
    support_center: "Support Center",
    hr: "Human Resources",
    all_activities: "All Activities",
    activities: "Activities",
    add_activity: "Add Activity",
    work_tracking: "Work Tracking",
    taskqube_v3: "TaskQube v3",
    taskqube_dashboard: "Dashboard",
    musteri_panosu: "Customer Dashboard",
    taskqube_projects: "Projects",
    taskqube_tickets: "Tickets",
    taskqube_kanban: "Boards",
    taskqube_settings: "TQ Definitions",
    tools: "Tools",
    messages: "Messages",
    personal_calendar: "Personal Calendar",
    control_panel: "Control Panel",
    todos: "To-Dos",
    leave_requests: "Leave Requests",
    my_leave_requests: "My Leaves",
    ik_leave_management: "Leave Management",
    ik_leave_requests: "Leave Management",
    ik_expense_requests: "Expense Management",
    profile: "Profile",
    reports: "Reports",
    general_report: "General Report",
    employee_report: "Employee Report",
    pdks: "PDKS",
    personel_hareketleri: "Personnel Movements",
    pdks_kart_yonetimi: "Card Management",
    org_chart: "Org Chart",
    quick_report: "Quick Report",
    system_admin: "System Administration",
    users: "Users",
    role_permissions: "Permissions",
    app_version: "App Version",
    definitions: "Definitions",
    cop_kutusu: "Trash Bin",
    musteri_kullanicilari: "Customer Users",
    denetim_kaydi: "Audit Log",
    oturum_yonetimi: "Session Management",
    announcements: "Announcements",
    leave_allowances: "Leave Allowances",
    leave_types: "Leave Types",
    hakedisler: "Progress Payments",
    sozlesme_yonetimi: "Contract Management",
    sozlesmeler: "Contracts",
    expenses: "Expenses",
    stok_yonetimi: "Inventory / Warehouse",
    stok_urunler: "Product Cards",
    stok_gruplar: "Product Groups",
    stok_depolar: "Warehouses",
    stok_raflar: "Shelves",
    stok_urun_raf: "Product - Shelf Assignment",
    stok_sahalar: "Sites / Projects",
    stok_tedarikciler: "Suppliers",
    stok_giris: "Stock In",
    stok_cikis: "Stock Out",
    stok_transfer: "Warehouse Transfer",
    stok_fisler: "Stock Vouchers",
    stok_sayim: "Stock Count",
    stok_parti_takibi: "Batch & Shelf Life",
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem("app_language");
    return saved || "tr";
  });

  useEffect(() => {
    localStorage.setItem("app_language", language);
  }, [language]);

  const t = (key) => {
    return translations[language]?.[key] || translations.tr?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}