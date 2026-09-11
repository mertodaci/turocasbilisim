import { useState } from "react";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight, Boxes, Users, Wallet, Building2, ScrollText, ClipboardList, Sun, Moon } from "lucide-react";
import turkonixLogo from "@/assets/turkonix-logo.png";

// Sol paneldeki özellik listesi — uygulamanın gerçek modülleri.
const OZELLIKLER = [
  { icon: Boxes, baslik: "Stok / Depo Yönetimi" },
  { icon: Users, baslik: "PDKS" },
  { icon: Wallet, baslik: "Maaş & Bordro" },
  { icon: Building2, baslik: "Müşteri Yönetimi" },
  { icon: ScrollText, baslik: "Sözleşme Yönetimi" },
  { icon: ClipboardList, baslik: "İş Takibi" },
];

// Elle çizilmiş bina dizisi — hem şehir silüeti hem alttaki nehir
// yansıması için kullanılıyor (x/genişlik/yükseklik).
const BUILDINGS = [
  { x: 0, w: 26, h: 70 }, { x: 30, w: 20, h: 110 }, { x: 54, w: 16, h: 55 },
  { x: 74, w: 30, h: 130 }, { x: 108, w: 18, h: 85 }, { x: 130, w: 24, h: 60 },
  { x: 158, w: 22, h: 100 }, { x: 184, w: 28, h: 140 }, { x: 216, w: 20, h: 75 },
  { x: 240, w: 32, h: 150 }, { x: 276, w: 18, h: 65 }, { x: 298, w: 24, h: 95 },
  { x: 326, w: 20, h: 55 }, { x: 350, w: 28, h: 120 }, { x: 382, w: 22, h: 80 },
];
const SKY_H = 380; // binaların oturduğu taban çizgisi

// Gündüz/gece şehir manzarası — dağlar + nehir (yansımalı) + bina silüeti.
// Gerçek fotoğraf değil, kod ile çizilmiş düz-tasarım illüstrasyon (bkz. plan).
function Cityscape({ variant, className }) {
  const isNight = variant === "night";
  const sky = isNight ? ["#0f1c3a", "#1b2a4d"] : ["#bfe3f7", "#eef8ff"];
  const mtnBack = isNight ? "#1f2c4d" : "#a9cbe8";
  const mtnFront = isNight ? "#16223e" : "#8bb8dc";
  const river = isNight ? "#0b1530" : "#d7eefb";
  const building = isNight ? "#0c1530" : "#5b87ad";
  const window_ = isNight ? "#fbbf24" : "#eaf6ff";

  return (
    <svg viewBox="0 0 400 400" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`sky-${variant}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={sky[0]} />
          <stop offset="100%" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#sky-${variant})`} />

      {isNight && (
        <g fill="#ffffff">
          {[[40, 40, 1.4], [90, 70, 1], [150, 35, 1.2], [210, 90, 0.9], [260, 50, 1.3], [320, 75, 1], [360, 30, 1.1], [20, 110, 0.8], [130, 100, 0.7]].map(([cx, cy, r], i) => (
            <circle key={i} cx={cx} cy={cy} r={r} opacity="0.85" />
          ))}
        </g>
      )}

      {/* uzak dağlar */}
      <polygon points="-20,300 60,190 160,300" fill={mtnBack} opacity="0.65" />
      <polygon points="110,300 220,170 330,300" fill={mtnBack} opacity="0.65" />
      <polygon points="260,300 340,210 420,300" fill={mtnBack} opacity="0.65" />
      {/* yakın dağlar */}
      <polygon points="-20,320 90,230 210,320" fill={mtnFront} opacity="0.8" />
      <polygon points="160,320 290,220 420,320" fill={mtnFront} opacity="0.8" />

      {/* nehir */}
      <rect x="0" y={SKY_H - 20} width="400" height="40" fill={river} />

      {/* şehir silüeti */}
      <g fill={building}>
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={SKY_H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      {isNight && (
        <g fill={window_}>
          {BUILDINGS.filter((_, i) => i % 2 === 0).map((b, i) => (
            <g key={i}>
              <rect x={b.x + b.w * 0.25} y={SKY_H - b.h + 10} width="3" height="3" />
              <rect x={b.x + b.w * 0.6} y={SKY_H - b.h + 22} width="3" height="3" />
              <rect x={b.x + b.w * 0.3} y={SKY_H - b.h + 36} width="3" height="3" />
            </g>
          ))}
        </g>
      )}

      {/* nehirde yansıma — aynı binalar, ters çevrilip soluklaştırılmış */}
      <g fill={building} opacity="0.28" transform={`translate(0, ${2 * SKY_H}) scale(1, -1)`}>
        {BUILDINGS.map((b, i) => (
          <rect key={i} x={b.x} y={SKY_H - Math.min(b.h, 60)} width={b.w} height={Math.min(b.h, 60)} />
        ))}
      </g>
    </svg>
  );
}

// Gerçekçi hilal ay — açık daire + arka plan renginde ikinci, kaydırılmış
// daireyle "ısırılmış" görünüm.
function CrescentMoon({ className }) {
  return (
    <div className={cn("relative rounded-full", className)}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-slate-50 to-slate-300 shadow-[0_0_45px_14px_rgba(226,232,255,0.35)]" />
      <div className="absolute rounded-full bg-[#0f1c3a]" style={{ width: "82%", height: "82%", top: "4%", left: "26%" }} />
    </div>
  );
}

// Logo açık zeminde olduğu gibi (koyu lacivert) okunaklı; sağ üstteki tema
// anahtarı yalnız uygulamanın geri kalanını etkiler, bu sabit-beyaz kart
// referans görseldeki gibi temadan bağımsız kalır — bu yüzden logo hep
// filtresiz (ham) gösteriliyor.
function TurkonixLogo({ className = "" }) {
  return <img src={turkonixLogo} alt="Turkonix" className={cn("block w-full h-auto object-contain", className)} />;
}

// Sağ üstteki gerçek tema anahtarı — tıklayınca next-themes durumunu
// değiştirir (uygulamanın geri kalanı için), bu sayfanın kendi sabit
// gündüz/gece illüstrasyonunu etkilemez.
function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-white/40 shadow-sm text-slate-500 hover:text-slate-700 transition-colors"
      title={isDark ? "Açık temaya geç" : "Koyu temaya geç"}
    >
      <Sun className="w-3.5 h-3.5 shrink-0" />
      <span className={cn("relative w-8 h-4 rounded-full transition-colors shrink-0", isDark ? "bg-indigo-600" : "bg-slate-300")}>
        <span className={cn("absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform", isDark && "translate-x-4")} />
      </span>
      <Moon className="w-3.5 h-3.5 shrink-0" />
    </button>
  );
}

// "Tüm sistemler aktif" rozeti — backend sağlık kontrolüne bağlı.
function SistemDurumu() {
  const { data, isError } = useQuery({
    queryKey: ["landing-health"],
    queryFn: () => flowApi.health(),
    retry: 1,
    staleTime: 60 * 1000,
  });
  if (!data && !isError) return null;
  const ok = !!data && !isError;
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 backdrop-blur border border-white/40 shadow-sm text-xs text-slate-600">
      <span className={cn("w-2 h-2 rounded-full", ok ? "bg-emerald-500" : "bg-amber-500")} />
      {ok ? "Tüm sistemler aktif" : "Bağlantı sorunu"}
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Tek parça, diagonal gündüz/gece arka plan */}
      <div className="absolute inset-0">
        <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 60% 0, 40% 100%, 0% 100%)" }}>
          <Cityscape variant="day" className="absolute inset-0 w-full h-full" />
        </div>
        <div className="absolute inset-0" style={{ clipPath: "polygon(60% 0, 100% 0, 100% 100%, 40% 100%)" }}>
          <Cityscape variant="night" className="absolute inset-0 w-full h-full" />
        </div>
      </div>

      <CrescentMoon className="hidden lg:block absolute top-16 right-20 xl:right-28 w-16 h-16 z-10" />

      <div className="absolute top-5 right-5 md:top-7 md:right-7 z-20 flex items-center gap-3">
        <ThemeSwitch />
        <SistemDurumu />
      </div>

      {/* Sol metin — gündüz yarısının üstünde */}
      <div className="hidden lg:block absolute left-10 xl:left-16 top-[36%] -translate-y-1/2 z-10 max-w-[15rem]">
        <h2 className="text-3xl font-bold leading-tight text-slate-800">
          İşiniz Her Zaman<br /><span className="text-blue-600">Yolunda</span>
        </h2>
        <div className="mt-8 space-y-3.5">
          {OZELLIKLER.map(({ icon: Icon, baslik }) => (
            <div key={baslik} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-blue-700" />
              </div>
              <span className="text-sm font-medium text-slate-700">{baslik}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sağ metin — gece yarısının üstünde */}
      <div className="hidden lg:block absolute right-10 xl:right-16 bottom-[16%] z-10 max-w-[15rem] text-right">
        <h2 className="text-3xl font-bold leading-tight text-white">
          Bugün de<br /><span className="text-blue-300">Yarın da</span>
        </h2>
        <p className="text-sm text-white/70 mt-4">İşiniz hep güvende, Turkonix yanınızda.</p>
      </div>

      {/* Orta — logo kutusu + giriş kartı, sabit açık (temadan bağımsız) */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 pointer-events-none [&>*]:pointer-events-auto">
        <div className="bg-white rounded-2xl shadow-lg px-7 py-4 mb-3">
          <TurkonixLogo className="w-28" />
        </div>
        <p className="text-xs text-slate-500 tracking-wide mb-7">Sınırsız İletişim, Gerçek Verimlilik</p>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-slate-900 text-center">Tekrar hoş geldiniz</h1>
          <p className="text-sm text-slate-500 text-center mt-2 mb-6">
            TURKONIX hesabınıza giriş yaparak kaldığınız yerden devam edin.
          </p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">{error}</div>}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} className="pl-11 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400" required />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} className="pl-11 pr-11 h-12 rounded-xl bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400" required />
              <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center justify-between pt-0.5">
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <Checkbox checked={rememberMe} onCheckedChange={setRememberMe} />
                Beni hatırla
              </label>
              <button type="button" onClick={handleForgotPassword} className="text-xs text-blue-600 hover:underline">
                Şifremi unuttum
              </button>
            </div>

            <Button type="submit" className="w-full rounded-xl h-12 shadow-lg bg-blue-600 hover:bg-blue-700 mt-1 group" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2">Giriş Yap <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
