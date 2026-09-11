import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, Boxes, Users, Wallet, Building2, ScrollText, ClipboardList } from "lucide-react";
import turkonixLogo from "@/assets/turkonix-logo.png";
import sehirSiluet from "@/assets/sehir-siluet.png";

// Kartın sol kolonundaki kısa modül özet rozetleri — uygulamanın gerçek modülleri.
const OZELLIKLER = [
  { icon: Boxes, baslik: "Stok / Depo Yönetimi" },
  { icon: Users, baslik: "PDKS" },
  { icon: Wallet, baslik: "Maaş & Bordro" },
  { icon: Building2, baslik: "Müşteri Yönetimi" },
  { icon: ScrollText, baslik: "Sözleşme Yönetimi" },
  { icon: ClipboardList, baslik: "İş Takibi" },
];

// `theme="fixed-dark"`: sabit koyu lacivert zeminde — görsel her zaman
// beyaza çevrilir + mavi/teal aksan üçgeni ikinci, kırpılmış bir kopyayla
// korunur. `theme="auto"` (varsayılan): gerçek next-themes durumuna göre
// tepki verir (TopBar'daki logoyla aynı mekanizma).
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
    <div className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center px-4 md:px-10 py-10">
      {/* Tam ekran foto zemini + marka rengi karartma — foto ve renk paleti korunuyor */}
      <img src={sehirSiluet} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a1230]/85 via-[#0a1230]/60 to-[#0a1230]/90" />
      <div className="absolute inset-0 bg-gradient-to-tr from-violet-950/30 via-transparent to-fuchsia-950/20" />

      {/* İnce dikey kenar süslemeleri — yalnız geniş ekranda */}
      <div className="hidden 2xl:flex flex-col gap-2 absolute left-10 top-1/2 -translate-y-1/2 text-[11px] tracking-[0.35em] text-white/25 uppercase" style={{ writingMode: "vertical-rl" }}>
        <span>Güvenilir · Esnek · Sürdürülebilir</span>
      </div>
      <div className="hidden 2xl:flex flex-col gap-2 absolute right-10 top-1/2 -translate-y-1/2 text-[11px] tracking-[0.35em] text-white/25 uppercase" style={{ writingMode: "vertical-rl" }}>
        <span>İnsan · Süreç · Veri · Büyüme</span>
      </div>

      {/* HERO — logo + başlık/alt-yazı yan yana */}
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-12 mb-8 md:mb-10 animate-in fade-in slide-in-from-top-4 duration-700 text-center md:text-left">
        <TurkonixLogo className="w-52 md:w-60 shrink-0" theme="fixed-dark" />
        <div className="hidden md:block w-px h-20 bg-white/20" />
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">İşinizi Daha İleri Taşıyın</h2>
          <p className="text-white/60 text-sm mt-2 max-w-xs">Stok, depo, PDKS, personel, maaş, müşteri ve operasyon yönetiminde tek platform.</p>
          <div className="w-10 h-1 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 mt-4 mx-auto md:mx-0" />
        </div>
      </div>

      {/* TEK GENİŞ KART — sol: karşılama metni + modül özeti, sağ: form */}
      <div className="relative z-10 w-full max-w-4xl bg-card/95 backdrop-blur-md border border-white/10 rounded-3xl shadow-2xl p-6 md:p-10 grid md:grid-cols-2 gap-8 md:gap-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex flex-col justify-center">
          <div className="w-10 h-1 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 mb-4" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Tekrar hoş geldiniz</h1>
          <p className="text-sm text-muted-foreground mt-2">Turkonix ile iş süreçlerinizi tek ekrandan yönetin.</p>

          <div className="hidden md:grid grid-cols-2 gap-3 mt-7">
            {OZELLIKLER.map(({ icon: Icon, baslik }) => (
              <div key={baslik} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground leading-tight">{baslik}</p>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col justify-center space-y-3.5">
          {error && <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">{error}</div>}

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
  );
}
