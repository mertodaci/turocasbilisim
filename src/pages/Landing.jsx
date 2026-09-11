import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, Boxes, Users, Wallet, Building2, ScrollText, ClipboardList } from "lucide-react";
import turkonixLogo from "@/assets/turkonix-logo.png";

// Sol paneldeki özellik şeridi — uygulamanın gerçek modülleri.
const OZELLIKLER = [
  { icon: Boxes, baslik: "Stok / Depo Yönetimi" },
  { icon: Users, baslik: "PDKS" },
  { icon: Wallet, baslik: "Maaş & Bordro" },
  { icon: Building2, baslik: "Müşteri Yönetimi" },
  { icon: ScrollText, baslik: "Sözleşme Yönetimi" },
  { icon: ClipboardList, baslik: "İş Takibi" },
];

// `theme="fixed-dark"`: sabit koyu lacivert sol panelde — görsel her zaman
// beyaza çevrilir + mavi/teal aksan üçgeni ikinci, kırpılmış bir kopyayla
// korunur. `theme="auto"` (varsayılan, sağ/mobil panel): panel artık gerçek
// next-themes durumuna göre değiştiğinden, logo da `dark:` varyantlarıyla
// aynı şekilde tepki verir (TopBar'daki logoyla aynı mekanizma).
function TurkonixLogo({ className = "", theme = "auto" }) {
  if (theme === "fixed-dark") {
    return (
      <div className={cn("relative", className)}>
        <img src={turkonixLogo} alt="Turkonix" className="block w-full h-auto object-contain" style={{ filter: "brightness(0) invert(1)" }} />
        <img src={turkonixLogo} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-contain" style={{ clipPath: "inset(20% 28% 58% 53%)" }} />
      </div>
    );
  }
  return (
    <div className={cn("relative", className)}>
      <img src={turkonixLogo} alt="Turkonix" className="block w-full h-auto object-contain dark:brightness-0 dark:invert" />
      <img src={turkonixLogo} alt="" aria-hidden="true" className="hidden dark:block absolute inset-0 w-full h-full object-contain" style={{ clipPath: "inset(20% 28% 58% 53%)" }} />
    </div>
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
    <div className="min-h-screen flex">
      {/* Sol — sabit koyu lacivert marka paneli */}
      <div className="hidden lg:flex lg:w-[55%] flex-col items-center justify-center relative overflow-hidden px-12 py-16" style={{ background: "linear-gradient(160deg, #0a1230 0%, #0d1840 100%)" }}>
        <TurkonixLogo className="w-full max-w-md" theme="fixed-dark" />
        <p className="text-teal-300/80 text-sm tracking-wide mt-6">İş süreçleriniz tek merkezde.</p>

        <div className="absolute bottom-14 left-0 right-0 px-12">
          <div className="flex items-start justify-between gap-2">
            {OZELLIKLER.map(({ icon: Icon, baslik }) => (
              <div key={baslik} className="flex flex-col items-center text-center w-20">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-2">
                  <Icon className="w-5 h-5 text-teal-300" />
                </div>
                <p className="text-[11px] text-slate-300 leading-tight">{baslik}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sağ — uygulamanın gerçek renk tokenlarıyla uyumlu, tema-duyarlı form paneli */}
      <div className="flex-1 flex flex-col items-center justify-center bg-background px-6 py-16">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-3xl shadow-sm p-8 md:p-10">
          <TurkonixLogo className="w-28 mb-8 lg:hidden" />

          <div className="w-10 h-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 mb-4" />
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Tekrar hoş geldiniz</h1>

          {error && <div className="mt-5 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-3.5 mt-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} className="pl-11 h-12 rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} className="pl-11 pr-11 h-12 rounded-xl bg-muted/50 border-border text-foreground placeholder:text-muted-foreground" required />
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
  );
}
