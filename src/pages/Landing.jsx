import { useState } from "react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, Boxes, Users, Wallet, Building2, ScrollText, ClipboardList, Sun, Moon } from "lucide-react";
import turkonixLogo from "@/assets/turkonix-logo.png";

// Sol paneldeki özellik listesi — uygulamanın gerçek modülleri (bottom nav /
// navItems.js ile tutarlı), şablon metni değil.
const OZELLIKLER = [
  { icon: Boxes, baslik: "Stok / Depo Yönetimi" },
  { icon: Users, baslik: "PDKS" },
  { icon: Wallet, baslik: "Maaş & Bordro" },
  { icon: Building2, baslik: "Müşteri Yönetimi" },
  { icon: ScrollText, baslik: "Sözleşme Yönetimi" },
  { icon: ClipboardList, baslik: "İş Takibi" },
];

// Logo açık temada olduğu gibi (koyu lacivert) okunaklı; koyu temada beyaza
// çevrilir + mavi aksan üçgeni ikinci, kırpılmış bir kopyayla korunur.
function TurkonixLogo({ className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <img src={turkonixLogo} alt="Turkonix" className="block w-full h-auto object-contain dark:brightness-0 dark:invert" />
      <img src={turkonixLogo} alt="" aria-hidden="true" className="hidden dark:block absolute inset-0 w-full h-full object-contain" style={{ clipPath: "inset(20% 28% 58% 53%)" }} />
    </div>
  );
}

// Düşük detaylı bina silüeti — sol/sağ dekoratif panellerin altında.
function SkylineSilhouette({ className = "" }) {
  return (
    <svg viewBox="0 0 400 80" className={className} preserveAspectRatio="none" fill="currentColor" aria-hidden="true">
      <rect x="0" y="30" width="30" height="50" />
      <rect x="35" y="15" width="24" height="65" />
      <rect x="64" y="40" width="20" height="40" />
      <rect x="89" y="5" width="28" height="75" />
      <rect x="122" y="35" width="22" height="45" />
      <rect x="149" y="20" width="18" height="60" />
      <rect x="172" y="45" width="26" height="35" />
      <rect x="203" y="10" width="24" height="70" />
      <rect x="232" y="30" width="20" height="50" />
      <rect x="257" y="0" width="30" height="80" />
      <rect x="292" y="38" width="22" height="42" />
      <rect x="319" y="18" width="26" height="62" />
      <rect x="350" y="42" width="20" height="38" />
      <rect x="375" y="25" width="25" height="55" />
    </svg>
  );
}

// Sağ üstteki gerçek tema anahtarı — mockup'taki güneş|anahtar|ay sürgüsü,
// ama gerçekten uygulamanın next-themes durumunu değiştiriyor.
function ThemeSwitch({ className = "" }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/90 backdrop-blur border border-border shadow-sm text-muted-foreground hover:text-foreground transition-colors",
        className
      )}
      title={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
    >
      <Sun className="w-3.5 h-3.5 shrink-0" />
      <span className={cn("relative w-8 h-4 rounded-full transition-colors shrink-0", isDark ? "bg-primary" : "bg-muted")}>
        <span className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform", isDark && "translate-x-4")} />
      </span>
      <Moon className="w-3.5 h-3.5 shrink-0" />
    </button>
  );
}

export default function Landing() {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(loginData.email, loginData.password);
    } catch (err) {
      setError(err.message || "Giris basarisiz");
    } finally {
      setLoading(false);
    }
  };

  // Uygulamada self-servis şifre sıfırlama akışı yok (hesaplar İK/admin
  // tarafından açılıp şifre atanıyor) — boşa çıkan bir link yerine dürüst
  // bir yönlendirme mesajı.
  const handleForgotPassword = () => {
    toast.info("Şifre sıfırlama için yöneticinizle iletişime geçin.");
  };

  return (
    <div className="min-h-screen relative flex bg-background transition-colors">
      <ThemeSwitch className="absolute top-5 right-5 md:top-7 md:right-7 z-20" />

      {/* Sol — özellik paneli (marka rengi, temadan bağımsız) */}
      <div className="hidden lg:flex lg:w-[38%] relative overflow-hidden bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 text-white">
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full -translate-y-1/3 translate-x-1/3 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/3 -translate-x-1/3 blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center h-full px-12 py-16">
          <h2 className="text-3xl font-bold leading-tight">
            İşiniz Her Zaman<br /><span className="text-sky-200">Yolunda</span>
          </h2>
          <div className="mt-9 space-y-4">
            {OZELLIKLER.map(({ icon: Icon, baslik }) => (
              <div key={baslik} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-white/90">{baslik}</span>
              </div>
            ))}
          </div>
        </div>

        <SkylineSilhouette className="absolute bottom-0 left-0 w-full h-16 text-white/10" />
      </div>

      {/* Orta — giriş kartı, uygulamanın gerçek temasıyla uyumlu */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="bg-card border border-border rounded-3xl shadow-xl p-8">
            <TurkonixLogo className="w-40 mx-auto" />
            <p className="text-center text-xs text-muted-foreground tracking-wide mt-2 mb-7">Sınırsız İletişim, Gerçek Verimlilik</p>

            <h1 className="text-2xl font-bold text-foreground text-center">Tekrar hoş geldiniz</h1>
            <p className="text-sm text-muted-foreground text-center mt-2 mb-6">
              Turkonix hesabınıza giriş yaparak kaldığınız yerden devam edin.
            </p>

            {error && <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive text-sm text-center">{error}</div>}

            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} className="pl-11 h-12 rounded-xl" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} className="pl-11 pr-11 h-12 rounded-xl" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} />
                  Beni hatırla
                </label>
                <button type="button" onClick={handleForgotPassword} className="text-xs text-primary hover:underline">
                  Şifremi unuttum
                </button>
              </div>

              <Button type="submit" className="w-full rounded-xl h-12 shadow-lg mt-1 group" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2">Giriş Yap <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Sağ — gece paneli (marka rengi, temadan bağımsız), yalnız çok geniş ekranlarda */}
      <div className="hidden xl:flex xl:w-[30%] relative overflow-hidden bg-gradient-to-br from-slate-900 via-[#0a1024] to-indigo-950 text-white">
        <div className="absolute top-12 right-16 w-20 h-20 rounded-full bg-gradient-to-br from-slate-100 to-slate-300 shadow-[0_0_50px_15px_rgba(226,232,255,0.25)]" />

        <div className="relative z-10 flex flex-col justify-end h-full px-12 pb-20">
          <h2 className="text-3xl font-bold leading-tight">Bugün de<br />Yarın da</h2>
          <p className="text-sm text-white/60 mt-4">İşiniz hep güvende, Turkonix yanınızda.</p>
        </div>

        <SkylineSilhouette className="absolute bottom-0 left-0 w-full h-16 text-white/10" />
      </div>
    </div>
  );
}
