import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Boxes, Clock, Users, Wallet, Building2, ClipboardList } from "lucide-react";
import turkonixLogo from "@/assets/turkonix-logo.png";

const hexClip = { clipPath: "polygon(9% 0%, 100% 0%, 100% 100%, 9% 100%, 0% 50%)" };

function ModulKart({ icon: Icon, baslik, alt, vurgu, className = "" }) {
  return (
    <div className={`w-44 bg-slate-800/50 border border-white/10 backdrop-blur-sm py-3 pl-7 pr-4 ${className}`} style={hexClip}>
      {vurgu ? (
        <div className="w-9 h-9 flex items-center justify-center mb-2 bg-cyan-400/10 border border-cyan-300/40" style={hexClip}>
          <Icon className="w-4 h-4 text-cyan-300" />
        </div>
      ) : (
        <Icon className="w-5 h-5 text-slate-300 mb-2" />
      )}
      <p className="text-white font-semibold text-sm leading-tight">{baslik}</p>
      <p className="text-blue-200/50 text-[11px] mt-0.5 leading-snug">{alt}</p>
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
    <div className="h-screen overflow-hidden flex bg-[#FAF8F5]">
      {/* Sol panel — giriş formu */}
      <div className="w-full lg:w-[44%] flex flex-col justify-between px-8 sm:px-14 py-6 h-full">
        <img src={turkonixLogo} alt="Turkonix" className="h-40 w-auto self-start object-contain -ml-3" />

        <div className="w-full max-w-sm mx-auto">
          <div className="w-9 h-1 rounded-full bg-indigo-600 mb-4" />
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            {tab === "login" ? "Tekrar hoş geldiniz" : "Hesap oluşturun"}
          </h1>
          <p className="text-slate-500 text-sm mt-2 mb-6">
            {tab === "login"
              ? "TURKONIX ile iş süreçleriniz her zaman kontrolünüzde."
              : "Birkaç bilgiyle TURKONIX hesabınızı oluşturun."}
          </p>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">{error}</div>}

          {tab === "login" ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-100/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} className="pl-10 pr-10 h-12 rounded-xl border-slate-200 bg-slate-100/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <Button type="submit" className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 shadow-lg shadow-indigo-600/25 mt-1" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Giriş Yap"}</Button>
              <p className="text-center text-sm text-slate-500 pt-1">
                Hesabınız yok mu?{" "}
                <button type="button" onClick={() => { setTab("register"); setError(""); }} className="text-indigo-600 font-medium hover:underline">Kayıt olun</button>
              </p>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="text" placeholder="Ad Soyad" value={registerData.full_name} onChange={e => setRegisterData(p => ({ ...p, full_name: e.target.value }))} className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-100/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400" required />
              </div>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type="email" placeholder="E-posta" value={registerData.email} onChange={e => setRegisterData(p => ({ ...p, email: e.target.value }))} className="pl-10 h-12 rounded-xl border-slate-200 bg-slate-100/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400" required />
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={registerData.password} onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))} className="pl-10 pr-10 h-12 rounded-xl border-slate-200 bg-slate-100/80 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500/40 focus-visible:border-indigo-400" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
              <Button type="submit" className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 h-12 shadow-lg shadow-indigo-600/25 mt-1" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kayıt Ol"}</Button>
              <p className="text-center text-sm text-slate-500 pt-1">
                Zaten hesabınız var mı?{" "}
                <button type="button" onClick={() => { setTab("login"); setError(""); }} className="text-indigo-600 font-medium hover:underline">Giriş yapın</button>
              </p>
            </form>
          )}
        </div>

        <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-200 pt-4">
          <span>Daha verimli bir gelecek için, birlikte.</span>
          <span className="font-bold tracking-wider text-slate-500">TURKONIX</span>
        </div>
      </div>

      {/* Sağ panel — tanıtım */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden h-full" style={{ background: "linear-gradient(150deg, #0a1128 0%, #131c47 55%, #1b2a5e 100%)" }}>
        {/* izometrik platform hissi veren büyük eğik bloklar */}
        <div className="absolute top-[-10%] right-[-8%] w-[34rem] h-[34rem] bg-gradient-to-br from-white/[0.05] to-transparent rotate-[28deg]" style={{ clipPath: "polygon(30% 0%, 100% 20%, 70% 100%, 0% 80%)" }} />
        <div className="absolute bottom-[-15%] left-[-10%] w-[38rem] h-[38rem] bg-gradient-to-tr from-black/20 to-transparent rotate-[18deg]" style={{ clipPath: "polygon(20% 10%, 100% 0%, 90% 90%, 10% 100%)" }} />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-indigo-500/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-cyan-400/10 blur-[110px]" />

        <div className="relative z-10 flex flex-col justify-between h-full w-full pl-14 pr-4 py-7">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-blue-300/80 uppercase leading-relaxed">
              Entegre<br />Yazılım Çözümleri
            </p>
            <div className="w-10 h-0.5 bg-blue-400/70 my-3" />
            <h2 className="text-3xl xl:text-[2.5rem] font-bold text-white leading-tight max-w-md">
              Tüm operasyonlarınız,<br /><span className="text-indigo-300">tek merkezde.</span>
            </h2>
            <p className="text-blue-100/60 text-sm mt-3 max-w-sm">Daha düzenli, daha verimli, daha güçlü bir işletme.</p>
          </div>

          {/* Modül kartları — mockup'taki çapraz kademeli yerleşim */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-end pr-6">
              <ModulKart icon={Boxes} baslik="Stok / Depo" alt="Takip" vurgu />
            </div>
            <div className="flex gap-6 pl-16">
              <ModulKart icon={Clock} baslik="PDKS" alt="Personel Devam Kontrol Sistemi" />
              <ModulKart icon={Users} baslik="İK" alt="Personel Kayıtları" className="mt-4" />
            </div>
            <div className="flex gap-6">
              <ModulKart icon={Wallet} baslik="Maaş" alt="Bordro Yönetimi" />
              <ModulKart icon={Building2} baslik="Müşteri" alt="Yönetimi" className="mt-4" />
            </div>
            <div className="flex pl-8">
              <ModulKart icon={ClipboardList} baslik="İş Takibi" alt="Proje ve Görev Takibi" />
            </div>
          </div>

          <p className="text-xs font-semibold tracking-[0.2em] text-blue-300/60 uppercase leading-relaxed">
            İşiniz<br />Daima İleride
          </p>
        </div>
      </div>
    </div>
  );
}
