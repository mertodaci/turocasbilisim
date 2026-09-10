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
      setError(err.message || "Giriş başarısız");
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
      setError(err.message || "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #3730a3 100%)",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Dekoratif daireler */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-blue-600/70 blur-sm z-10" />
      <div className="absolute top-[-40px] left-[-40px] w-44 h-44 rounded-full bg-blue-400/60 z-10" />
      <div className="absolute bottom-[-80px] right-[-80px] w-72 h-72 rounded-full bg-blue-600/70 blur-sm z-10" />
      <div className="absolute bottom-[-40px] right-[-40px] w-44 h-44 rounded-full bg-blue-400/60 z-10" />
      <div className="absolute top-1/2 right-[-60px] w-32 h-32 rounded-full bg-blue-500/40 z-10" />
      <div className="absolute top-1/3 left-[-30px] w-20 h-20 rounded-full bg-blue-300/40 z-10" />

      {/* Kart */}
      <div className="relative z-20 w-full max-w-sm mx-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden">
          {/* Üst kısım */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-8 pt-10 pb-8 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">Turkonix</h1>
            <p className="text-blue-200 text-xs mt-1">Turkonix — Sınırsız İletişim</p>
          </div>

          {/* Tab butonları */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setTab("login"); setError(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "login" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              Giriş Yap
            </button>
            <button
              onClick={() => { setTab("register"); setError(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === "register" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Form */}
          <div className="px-8 py-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            {tab === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="E-posta"
                    value={loginData.email}
                    onChange={e => setLoginData(p => ({ ...p, email: e.target.value }))}
                    className="pl-10 rounded-xl border-gray-200"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifre"
                    value={loginData.password}
                    onChange={e => setLoginData(p => ({ ...p, password: e.target.value }))}
                    className="pl-10 pr-10 rounded-xl border-gray-200"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Giriş Yap"}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Ad Soyad"
                    value={registerData.full_name}
                    onChange={e => setRegisterData(p => ({ ...p, full_name: e.target.value }))}
                    className="pl-10 rounded-xl border-gray-200"
                    required
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="E-posta"
                    value={registerData.email}
                    onChange={e => setRegisterData(p => ({ ...p, email: e.target.value }))}
                    className="pl-10 rounded-xl border-gray-200"
                    required
                  />
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Şifre"
                    value={registerData.password}
                    onChange={e => setRegisterData(p => ({ ...p, password: e.target.value }))}
                    className="pl-10 pr-10 rounded-xl border-gray-200"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 h-11" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kayıt Ol"}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
