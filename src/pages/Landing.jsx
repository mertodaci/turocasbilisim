import { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Eye, EyeOff, Mail, Lock, User } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{backgroundImage: "url(/flowmetric.png)", backgroundSize: "cover", backgroundPosition: "center"}}>
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-slate-900/70" />
      <div className="relative z-20 w-full max-w-sm mx-4">
        <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/25 ring-1 ring-white/10">
          <div className="px-8 pt-10 pb-7 text-center border-b border-white/15">
            <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-sm">FlowMetrics</h1>
            <p className="text-blue-100/90 text-sm mt-2">IND Bilişim — Sektöre Özel Yazılım Çözümleri</p>
          </div>
          <div className="px-8 py-6">
            {error && <div className="mb-4 p-3 bg-red-500/20 border border-red-300/40 rounded-xl text-red-100 text-sm text-center backdrop-blur-sm">{error}</div>}
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 z-10" />
                  <Input type="email" placeholder="E-posta" value={loginData.email} onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))} className="pl-10 rounded-xl border-white/50 bg-white/60 text-slate-900 placeholder:text-slate-600 focus-visible:ring-blue-400/60 focus-visible:border-blue-400" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-700 z-10" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Şifre" value={loginData.password} onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))} className="pl-10 pr-10 rounded-xl border-white/50 bg-white/60 text-slate-900 placeholder:text-slate-600 focus-visible:ring-blue-400/60 focus-visible:border-blue-400" required />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700 hover:text-slate-900 z-10">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                <Button type="submit" className="w-full rounded-xl bg-blue-500 hover:bg-blue-600 h-11 shadow-lg shadow-blue-500/30" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Giriş Yap"}</Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input type="text" placeholder="Ad Soyad" value={registerData.full_name} onChange={e => setRegisterData(p => ({ ...p, full_name: e.target.value }))} className="pl-10 rounded-xl border-gray-200 bg-white/70" required />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input type="email" placeholder="E-posta" value={registerData.email} onChange={e => setRegisterData(p => ({ ...p, email: e.target.value }))} className="pl-10 rounded-xl border-gray-200 bg-white/70" required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input type={showPassword ? "text" : "password"} placeholder="Sifre" value={registerData.password} onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))} className="pl-10 pr-10 rounded-xl border-gray-200 bg-white/70" required />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
                </div>
                <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11" disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kayit Ol"}</Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
