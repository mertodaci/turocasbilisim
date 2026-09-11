import { useRef, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { KeyRound, Eye, EyeOff, Palette, Camera, Loader2 } from "lucide-react";
import { flowApi } from "@/api/flowApiClient";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ThemeSelector from "@/components/ThemeSelector";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

const roleLabels = {
  admin: { label: "Sistem Yöneticisi", color: "bg-red-100 text-red-700" },
  yonetici: { label: "Yönetici", color: "bg-purple-100 text-purple-700" },
  kullanici: { label: "Kullanıcı", color: "bg-blue-100 text-blue-700" },
  ik: { label: "İK", color: "bg-emerald-100 text-emerald-700" },
  stajer: { label: "Stajyer", color: "bg-amber-100 text-amber-700" },
  musteri: { label: "Müşteri", color: "bg-slate-200 text-slate-700" },
};

export default function Profile() {
  const { user, logout, checkUserAuth } = useAuth();
  const roleInfo = roleLabels[user?.role] || { label: user?.role || "—", color: "bg-slate-200 text-slate-700" };
  const initials = (user?.full_name || user?.email || "?").split(" ").filter(Boolean).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("") || "?";

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);

  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwLoading, setPwLoading] = useState(false);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: formData });
      if (!res.ok) throw new Error("Dosya yüklenemedi");
      const data = await res.json();
      await flowApi.auth.updateProfile({ full_name: user.full_name, avatar_url: `${BASE_URL}${data.url}` });
      await checkUserAuth();
      toast.success("Profil fotoğrafı güncellendi");
    } catch (err) {
      toast.error(err.message || "Fotoğraf yüklenemedi");
    } finally {
      setUploadingPhoto(false);
      e.target.value = "";
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      toast.error("Yeni şifre en az 6 karakter olmalıdır.");
      return;
    }
    setPwLoading(true);
    try {
      await flowApi.auth.changePassword({
        userId: user.id,
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      toast.success("Şifreniz başarıyla değiştirildi.");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch {
      toast.error("Mevcut şifreniz hatalı veya bir sorun oluştu.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Profilim</h1>
        <p className="text-sm text-muted-foreground mt-1">Hesap bilgileriniz</p>
      </div>

      <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
        <div className="h-16 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
        <div className="px-6 pb-6 -mt-10 space-y-5">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="group relative w-20 h-20 rounded-2xl overflow-hidden border-4 border-card bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-md"
                title="Profil fotoğrafını değiştir"
              >
                {uploadingPhoto ? (
                  <Loader2 className="w-6 h-6 text-white animate-spin" />
                ) : user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-white">{initials}</span>
                )}
                <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white" />
                </span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            </div>
            <div className="pb-1 min-w-0">
              <p className="text-xl font-bold text-foreground truncate">{user?.full_name || "—"}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", roleInfo.color)}>
              {roleInfo.label}
            </span>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">E-posta</span>
              <span className="text-sm font-medium text-foreground">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="w-full mt-2 py-2.5 rounded-xl border border-destructive/40 text-destructive text-sm font-medium hover:bg-destructive/5 transition-colors"
          >
            Çıkış Yap
          </button>
        </div>
      </div>

      {/* Tema Seçimi */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Tema</h2>
        </div>
        <p className="text-sm text-muted-foreground">Uygulama görünümünü tercihlerinize göre ayarlayın.</p>
        <ThemeSelector />
      </div>

      {/* Şifre Değiştir */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound className="w-5 h-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Şifre Değiştir</h2>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-3">
          {[
            { key: "current", field: "currentPassword", label: "Mevcut Şifre" },
            { key: "new", field: "newPassword", label: "Yeni Şifre" },
            { key: "confirm", field: "confirmPassword", label: "Yeni Şifre (Tekrar)" },
          ].map(({ key, field, label }) => (
            <div key={field} className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{label}</label>
              <div className="relative">
                <input
                  type={showPw[key] ? "text" : "password"}
                  value={pwForm[field]}
                  onChange={(e) => setPwForm((f) => ({ ...f, [field]: e.target.value }))}
                  required
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 pr-10 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder={label}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw[key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}
          <button
            type="submit"
            disabled={pwLoading}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {pwLoading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
          </button>
        </form>
      </div>
    </div>
  );
}
