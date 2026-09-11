import { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { flowApi } from "@/api/flowApiClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Boxes, Users, UserRound, Database, BarChart3, ArrowRight } from "lucide-react";
import turkonixLogo from "@/assets/turkonix-logo.png";

const MODULLER = [
  { icon: Boxes, baslik: "Stok / Depo Takibi" },
  { icon: Users, baslik: "PDKS" },
  { icon: UserRound, baslik: "Personel Kayıtları" },
  { icon: Database, baslik: "Maaş Yönetimi" },
  { icon: BarChart3, baslik: "Müşteri ve Operasyon Yönetimi" },
];

function SistemDurumu() {
  const [durum, setDurum] = useState("kontrol");

  useEffect(() => {
    let iptal = false;
    flowApi.health().then(() => { if (!iptal) setDurum("aktif"); }).catch(() => { if (!iptal) setDurum("sorun"); });
    return () => { iptal = true; };
  }, []);

  if (durum === "kontrol") return null;
  const aktif = durum === "aktif";
  return (
    <div className="absolute top-6 right-8 flex items-center gap-2 bg-white/5 border border-white/10 rounded-full pl-2.5 pr-3.5 py-1.5">
      <span className={`w-2 h-2 rounded-full ${aktif ? "bg-emerald-400" : "bg-amber-400"}`} />
      <span className="text-xs text-slate-300">{aktif ? "Tüm sistemler aktif" : "Bağlantı sorunu"}</span>
    </div>
  );
}

export default function Landing() {
  const [tab, setTab] = useState("login");
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [registerData, setRegisterData] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, register } = useAuth();

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

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(registerData.email, registerData.password, registerData.full_name);
    } catch (err) {
      setError(err.message || "Kayit basarisiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden relative flex" style={{ background: "linear-gradient(135deg, #0a1024 0%, #101a3a 50%, #0a1230 100%)" }}>
      <SistemDurumu />

      {/* Sol — marka bloğu */}
      <div className="hidden lg:flex lg:w-[42%] relative overflow-hidden border-r border-white/10">
        <div className="absolute top-0 left-0 w-72 h-72 bg-gradient-to-br from-white/[0.04] to-transparent -translate-x-1/3 -translate-y-1/3 rotate-12" style={{ clipPath: "polygon(20% 0%, 100% 10%, 80% 100%, 0% 90%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-96 bg-gradient-to-tr from-white/[0.03] to-transparent" style={{ clipPath: "polygon(0% 30%, 60% 0%, 100% 100%, 0% 100%)" }} />

        <div className="relative z-10 flex flex-col justify-center h-full px-16">
          <img src={turkonixLogo} alt="Turkonix" className="h-32 w-auto object-contain self-start -ml-3" style={{ filter: "brightness(0) invert(1)" }} />
          <p className="text-slate-400 text-sm tracking-[0.2em] uppercase mt-6">İşinizi Daha İleriye Taşır</p>
          <div className="w-12 h-0.5 bg-blue-400/60 mt-5" />
        </div>

        <div className="absolute bottom-14 left-16 z-10">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-500 uppercase leading-loose">
            Veri<br />İnsan<br />Süreç<br />Daha Güçlü Yarınlar
          </p>
        </div>
      </div>

      {/* Sağ — giriş formu */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-20 h-full overflow-y-auto">
        <div className="w-full max-w-sm mx-auto lg:mx-0">
          <img src={turkonixLogo} alt="Turkonix" className="h-14 w-auto object-contain self-start mb-6 lg:hidden" style={{ filter: "brightness(0) invert(1)" }} />

          <p className="text-slate-400 text-xs tracking-[0.25em] uppercase">Turkonix</p>
          <p className="text-slate-500 text-xs tracking-[0.2em] uppercase mt-1">Entegre Yönetim Platformu</p>

          <h1 className="text-4xl font-bold text-white tracking-tight mt-5">
            {tab === "login" ? "Tekrar hoş geldiniz" : "Hesap oluşturun"}
          </h1>
          <p className="text-slate-400 text-sm mt-3 mb-7 leading-relaxed">
            {tab === "login"
              ? <>İş süreçlerinizi tek platformda yönetin.<br />Daha verimli, daha güçlü, birlikte.</>
              : "Birkaç bilgiyle TURKONIX hesabınızı oluşturun."}
          </p>

          {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-xl text-red-300 text-sm text-center">{error}</div>}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3.5">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} className="pl-11 h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/40 focus-visible:border-blue-400/60" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} className="pl-11 pr-11 h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/40 focus-visible:border-blue-400/60" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <Button type="submit" className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 h-14 shadow-lg shadow-blue-600/30 mt-1 group" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span className="flex items-center gap-2">Giriş Yap <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" /></span>}
              </Button>
              <p className="text-center text-sm text-slate-400 pt-1">
                Hesabınız yok mu?{" "}
                <button type="button" onClick={() => { setTab("register"); setError(""); }} className="text-blue-400 font-medium hover:underline">Kayıt olun</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input type="text" placeholder="Ad Soyad" value={registerData.full_name} onChange={e => setRegisterData(p => ({ ...p, full_name: e.target.value }))} className="pl-11 h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/40 focus-visible:border-blue-400/60" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input type="email" placeholder="E-posta" value={registerData.email} onChange={e => setRegisterData(p => ({ ...p, email: e.target.value }))} className="pl-11 h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/40 focus-visible:border-blue-400/60" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={registerData.password} onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))} className="pl-11 pr-11 h-14 rounded-2xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/40 focus-visible:border-blue-400/60" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <Button type="submit" className="w-full rounded-2xl bg-blue-600 hover:bg-blue-500 h-14 shadow-lg shadow-blue-600/30 mt-1" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kayıt Ol"}</Button>
              <p className="text-center text-sm text-slate-400 pt-1">
                Zaten hesabınız var mı?{" "}
                <button type="button" onClick={() => { setTab("login"); setError(""); }} className="text-blue-400 font-medium hover:underline">Giriş yapın</button>
              </p>
            </form>
          )}

          <div className="border-t border-white/10 mt-7 pt-6">
            <div className="flex justify-between">
              {MODULLER.map(({ icon: Icon, baslik }) => (
                <div key={baslik} className="flex flex-col items-center text-center w-16">
                  <Icon className="w-5 h-5 text-blue-300/80 mb-1.5" />
                  <p className="text-[10px] text-slate-400 leading-tight">{baslik}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
