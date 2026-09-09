import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import { LanguageProvider } from '@/lib/LanguageContext';
import { RolePermissionsProvider, useRolePermissions } from '@/lib/RolePermissionsContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { Navigate } from 'react-router-dom';

import Landing from './pages/Landing';
import ForcePasswordChange from './pages/ForcePasswordChange';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import { NotificationProvider } from './lib/NotificationContext';
const Employees = lazy(() => import('./pages/Employees'));
const PersonnelMovements = lazy(() => import('./pages/PersonnelMovements'));
const CardManagement = lazy(() => import('./pages/CardManagement'));
const AddActivity = lazy(() => import('./pages/AddActivity'));
const AddSalesActivity = lazy(() => import('./pages/AddSalesActivity'));
const EmployeeDetail = lazy(() => import('./pages/EmployeeDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Customers = lazy(() => import('./pages/Customers'));
const CustomerMap = lazy(() => import('./pages/CustomerMap'));
const Activities = lazy(() => import('./pages/Activities'));
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
const ActivityDetail = lazy(() => import('./pages/ActivityDetail'));
const Todos = lazy(() => import('./pages/Todos'));
const Messages = lazy(() => import('./pages/Messages'));
const LeaveRequests = lazy(() => import('./pages/LeaveRequests'));
const PersonalCalendar = lazy(() => import('./pages/PersonalCalendar'));
const EmployeeReport = lazy(() => import('./pages/EmployeeReport'));
const OrgChart = lazy(() => import('./pages/OrgChart'));
const QuickReport = lazy(() => import('./pages/QuickReport'));
const Users = lazy(() => import('./pages/Users'));
const RolePermissions = lazy(() => import('./pages/RolePermissions'));
const WorkTasks = lazy(() => import('./pages/WorkTasks'));
const AppVersion = lazy(() => import('./pages/AppVersion'));
const Definitions = lazy(() => import('./pages/Definitions'));
const EmployeeDefinitions = lazy(() => import('./pages/Definitions').then(m => ({ default: m.EmployeeDefinitions })));
const TrashBin = lazy(() => import('./pages/TrashBin'));
const AuditLog = lazy(() => import('./pages/AuditLog'));
const SessionManagement = lazy(() => import('./pages/SessionManagement'));
const CustomerUsers = lazy(() => import('./pages/CustomerUsers'));
const Announcements = lazy(() => import('./pages/Announcements'));
const Expenses = lazy(() => import('./pages/Expenses'));
const MyLeaveRequests = lazy(() => import('./pages/MyLeaveRequests'));
const IKLeaveRequests = lazy(() => import('./pages/IKLeaveRequests'));
const IKExpenseRequests = lazy(() => import('./pages/IKExpenseRequests'));
const LeaveAllowances = lazy(() => import('./pages/LeaveAllowances'));
const OffersPage = lazy(() => import('./pages/OffersPage'));
const SalesReportPage = lazy(() => import('./pages/SalesReportPage'));
const LeaveTypes = lazy(() => import('./pages/LeaveTypes'));
const Hakedisler = lazy(() => import('./pages/Hakedisler'));
const Sozlesmeler = lazy(() => import('./pages/Sozlesmeler'));
const SozlesmeForm = lazy(() => import('./pages/SozlesmeForm'));
const JobTrackingV3 = lazy(() => import('./pages/JobTrackingV3'));
const JobTrackingDashboard = lazy(() => import('./pages/JobTrackingDashboard'));
const JobTrackingTickets = lazy(() => import('./pages/JobTrackingTickets'));
const JobTrackingKanban = lazy(() => import('./pages/JobTrackingKanban'));
const JobTrackingSettings = lazy(() => import('./pages/JobTrackingSettings'));
// Stok / Depo Yönetimi — Faz 1: Tanımlar
const StokUrunler = lazy(() => import('./pages/stok/StokUrunler'));
const StokGruplar = lazy(() => import('./pages/stok/StokGruplar'));
const StokDepolar = lazy(() => import('./pages/stok/StokDepolar'));
const StokRaflar = lazy(() => import('./pages/stok/StokRaflar'));
const StokUrunRaf = lazy(() => import('./pages/stok/StokUrunRaf'));
const StokSahalar = lazy(() => import('./pages/stok/StokSahalar'));
const StokTedarikciler = lazy(() => import('./pages/stok/StokTedarikciler'));
const StokGiris = lazy(() => import('./pages/stok/StokGiris'));
const StokCikis = lazy(() => import('./pages/stok/StokCikis'));
const StokIade = lazy(() => import('./pages/stok/StokIade'));
const StokTransfer = lazy(() => import('./pages/stok/StokTransfer'));
const StokFisListesi = lazy(() => import('./pages/stok/StokFisListesi'));
const StokPartiTakibi = lazy(() => import('./pages/stok/StokPartiTakibi'));
const StokSayim = lazy(() => import('./pages/stok/StokSayim'));
const StokTalep = lazy(() => import('./pages/stok/StokTalep'));
const StokRezervasyon = lazy(() => import('./pages/stok/StokRezervasyon'));
const StokRaporlar = lazy(() => import('./pages/stok/StokRaporlar'));
const StokSatinAlma = lazy(() => import('./pages/stok/StokSatinAlma'));
const StokZimmet = lazy(() => import('./pages/stok/StokZimmet'));
const StokDashboard = lazy(() => import('./pages/stok/StokDashboard'));
const StokMobil = lazy(() => import('./pages/stok/StokMobil'));
const StokEtiket = lazy(() => import('./pages/stok/StokEtiket'));
const StokExcel = lazy(() => import('./pages/stok/StokExcel'));
const StokQnb = lazy(() => import('./pages/stok/StokQnb'));
const StokFiyatArastir = lazy(() => import('./pages/stok/StokFiyatArastir'));
// ── İK / Özlük / Bordro ──
const IkSubeler = lazy(() => import('./pages/ik/IkSubeler'));
const IkBolumler = lazy(() => import('./pages/ik/IkBolumler'));
const IkPersonel = lazy(() => import('./pages/ik/IkPersonel'));
const IkZam = lazy(() => import('./pages/ik/IkZam'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user, isAuthenticated, authChecked, showSessionWarning, extendSession } = useAuth();
  const { hasPermission } = useRolePermissions();
  const userPerms = user?.permissions || [];
  const userRole = user?.role || "kullanici";

  const guard = (moduleKey, component) => {
    if (userRole === "admin") return component;
    if (!authChecked) return null;
    if (userPerms.length > 0) { const p = userPerms.find(x => x.module === moduleKey); if (p) return p.can_view == 1 ? component : <Navigate to="/" replace />; return hasPermission(userRole, moduleKey) ? component : <Navigate to="/" replace />; }
    return hasPermission(userRole, moduleKey) ? component : <Navigate to="/" replace />;
  };
  if (showSessionWarning) {
    return (
      <>
        {/* Mevcut sayfa arkaplanda */}
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-card text-card-foreground rounded-xl shadow-xl p-8 max-w-sm w-full mx-4 text-center">
            <div className="text-4xl mb-4">⏱️</div>
            <h2 className="text-xl font-semibold mb-2">Oturumunuz Kapanmak Üzere</h2>
            <p className="text-gray-500 mb-6">60 saniye içinde işlem yapmazsanız oturumunuz kapanacak.</p>
            <button
              onClick={extendSession}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              Devam Et
            </button>
          </div>
        </div>
      </>
    );
  }

  if (isLoadingAuth || isLoadingPublicSettings || !authChecked) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      return (
        <Routes>
          <Route path="/landing" element={<Landing />} />
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      );
    }
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/landing" element={<Landing />} />
        <Route path="*" element={<Navigate to="/landing" replace />} />
      </Routes>
    );
  }
  // Ilk giris: gecici sifreyle giren kullanici kendi sifresini belirlemeden ice giremez
  if (user?.must_change_password) {
    return <ForcePasswordChange />;
  }

  return (
    <Suspense fallback={<div style={{display:"flex",justifyContent:"center",alignItems:"center",height:"60vh",color:"#888"}}>Yükleniyor...</div>}>
    <Routes>
      <Route path="/landing" element={<Navigate to="/" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={guard("dashboard", <Dashboard />)} />
        <Route path="/aktivite-ekle" element={guard("add_activity", <AddActivity />)} />
        <Route path="/satis-aktivite-ekle" element={guard("satis_aktivite_ekle", <AddSalesActivity />)} />
        <Route path="/profil" element={<Profile />} />
        <Route path="/musteriler" element={guard("customers", <Customers />)} />
        <Route path="/musteriler-haritasi" element={guard("customer_map", <CustomerMap />)} />
        <Route path="/aktiviteler" element={guard("activities", <Activities />)} />
        <Route path="/musteri/:id" element={guard("customers", <CustomerDetail />)} />
        <Route path="/aktivite/:id" element={guard("activities", <ActivityDetail />)} />
        <Route path="/yapilacaklar" element={guard("todos", <Todos />)} />
        <Route path="/mesajlar" element={guard("messages", <Messages />)} />
        <Route path="/izin-talepleri" element={guard("leave_requests", <LeaveRequests />)} />
        <Route path="/izinlerim" element={guard("my_leave_requests", <MyLeaveRequests />)} />
        <Route path="/ik-izin-yonetimi" element={guard("ik_leave_requests", <IKLeaveRequests />)} />
        <Route path="/ik-harcama-yonetimi" element={guard("ik_expense_requests", <IKExpenseRequests />)} />
        <Route path="/izin-haklari" element={guard("leave_allowances", <LeaveAllowances />)} />
        <Route path="/satis-teklifleri" element={guard("satis_teklifleri", <OffersPage />)} />
        <Route path="/satis-raporlari" element={guard("satis_raporlari", <SalesReportPage />)} />
        <Route path="/izin-turleri" element={guard("leave_types", <LeaveTypes />)} />
        <Route path="/harcamalar" element={guard("expenses", <Expenses />)} />
        <Route path="/kisisel-takvim" element={guard("personal_calendar", <PersonalCalendar />)} />
        <Route path="/calisanlar" element={guard("employees", <Employees />)} />
        <Route path="/calisan/:id" element={guard("employees", <EmployeeDetail />)} />
        <Route path="/calisan-raporu" element={guard("employee_report", <EmployeeReport />)} />
        <Route path="/hakedisler" element={guard("hakedisler", <Hakedisler />)} />
        <Route path="/sozlesmeler" element={guard("sozlesmeler", <Sozlesmeler />)} />
        <Route path="/sozlesmeler/yeni" element={guard("sozlesmeler", <SozlesmeForm />)} />
        <Route path="/sozlesmeler/:id" element={guard("sozlesmeler", <SozlesmeForm />)} />
        <Route path="/personel-hareketleri" element={guard("personel_hareketleri", <PersonnelMovements />)} />
        <Route path="/kart-yonetimi" element={guard("personel_hareketleri", <CardManagement />)} />
        <Route path="/org-sema" element={guard("employees", <OrgChart />)} />
        <Route path="/hizli-rapor" element={guard("reports", <QuickReport />)} />
        <Route path="/kullanicilar" element={guard("users", <Users />)} />
        <Route path="/yetkilendirme" element={guard("role_permissions", <RolePermissions />)} />
        <Route path="/versiyon" element={guard("app_version", <AppVersion />)} />
        <Route path="/tanimlar" element={guard("definitions", <Definitions />)} />
        <Route path="/ik-tanimlar" element={guard("ik_tanimlar", <EmployeeDefinitions />)} />
        <Route path="/cop-kutusu" element={guard("cop_kutusu", <TrashBin />)} />
        <Route path="/denetim-kaydi" element={guard("denetim_kaydi", <AuditLog />)} />
        <Route path="/oturum-yonetimi" element={guard("oturum_yonetimi", <SessionManagement />)} />
        <Route path="/musteri-kullanicilari" element={guard("musteri_kullanicilari", <CustomerUsers />)} />
        <Route path="/duyurular" element={guard("announcements", <Announcements />)} />
        <Route path="/is-takip" element={guard("work_tracking", <WorkTasks />)} />
        <Route path="/is-takibi" element={guard("is_takibi_projeler", <JobTrackingV3 />)} />
        <Route path="/is-takibi/dashboard" element={guard("is_takibi_dashboard", <JobTrackingDashboard />)} />
        <Route path="/is-takibi/tickets" element={guard("is_takibi_biletler", <JobTrackingTickets />)} />
        <Route path="/is-takibi/kanban" element={guard("is_takibi_kanban", <JobTrackingKanban />)} />
        <Route path="/is-takibi/tanimlar" element={guard("is_takibi_tanimlar", <JobTrackingSettings />)} />
        {/* Stok / Depo Yönetimi — Faz 1: Tanımlar */}
        <Route path="/stok/urunler" element={guard("stok_urunler", <StokUrunler />)} />
        <Route path="/stok/gruplar" element={guard("stok_gruplar", <StokGruplar />)} />
        <Route path="/stok/depolar" element={guard("stok_depolar", <StokDepolar />)} />
        <Route path="/stok/raflar" element={guard("stok_raflar", <StokRaflar />)} />
        <Route path="/stok/urun-raf" element={guard("stok_urun_raf", <StokUrunRaf />)} />
        <Route path="/stok/sahalar" element={guard("stok_sahalar", <StokSahalar />)} />
        <Route path="/stok/tedarikciler" element={guard("stok_tedarikciler", <StokTedarikciler />)} />
        {/* Faz 2: Hareket fişleri */}
        <Route path="/stok/giris" element={guard("stok_giris", <StokGiris />)} />
        <Route path="/stok/cikis" element={guard("stok_cikis", <StokCikis />)} />
        <Route path="/stok/transfer" element={guard("stok_transfer", <StokTransfer />)} />
        <Route path="/stok/iade" element={guard("stok_iade", <StokIade />)} />
        <Route path="/stok/fisler" element={guard("stok_fisler", <StokFisListesi />)} />
        {/* Faz 3: FIFO / parti */}
        <Route path="/stok/partiler" element={guard("stok_parti_takibi", <StokPartiTakibi />)} />
        {/* Faz 4: Sayım */}
        <Route path="/stok/sayim" element={guard("stok_sayim", <StokSayim />)} />
        {/* Faz 5: Malzeme Talep */}
        <Route path="/stok/talep" element={guard("stok_talep", <StokTalep />)} />
        <Route path="/stok/rezervasyon" element={guard("stok_rezervasyon", <StokRezervasyon />)} />
        {/* Faz 6: Raporlar */}
        <Route path="/stok/raporlar" element={guard("stok_raporlar", <StokRaporlar />)} />
        {/* Faz 7: Satın Alma */}
        <Route path="/stok/satin-alma" element={guard("stok_satinalma", <StokSatinAlma />)} />
        {/* Faz 8: Zimmet */}
        <Route path="/stok/zimmet" element={guard("stok_zimmet", <StokZimmet />)} />
        {/* Faz 9-11: Mobil, Etiket, Excel, Dashboard */}
        <Route path="/stok" element={guard("stok_dashboard", <StokDashboard />)} />
        <Route path="/stok/mobil" element={guard("stok_mobil", <StokMobil />)} />
        <Route path="/stok/etiket" element={guard("stok_etiket", <StokEtiket />)} />
        <Route path="/stok/excel" element={guard("stok_excel", <StokExcel />)} />
        {/* Faz 13: QNB e-Belge */}
        <Route path="/stok/qnb" element={guard("stok_qnb", <StokQnb />)} />
        {/* Faz 14: Fiyat Araştır */}
        <Route path="/stok/fiyat-arastir" element={guard("stok_fiyat_arastir", <StokFiyatArastir />)} />
        <Route path="/ik/subeler" element={guard("ikb_subeler", <IkSubeler />)} />
        <Route path="/ik/bolumler" element={guard("ikb_bolumler", <IkBolumler />)} />
        <Route path="/ik/personel" element={guard("ikb_personel", <IkPersonel />)} />
        <Route path="/ik/zam" element={guard("ikb_zam", <IkZam />)} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
    </Suspense>
  );
};

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClientInstance}>
          <NotificationProvider>
                  <RolePermissionsProvider>
                    <Router>
                      <AuthenticatedApp />
                    </Router>
                    <Toaster />
                    <SonnerToaster closeButton />
                  </RolePermissionsProvider>
          </NotificationProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App
