import { useState } from "react";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export default function ForcePasswordChange() {
  const { user, checkUserAuth, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (newPassword.length < 4) { toast.error("Yeni şifre en az 4 karakter olmalı."); return; }
    if (newPassword !== confirmPassword) { toast.error("Yeni şifreler eşleşmiyor."); return; }
    if (newPassword === currentPassword) { toast.error("Yeni şifre geçici şifreyle aynı olamaz."); return; }
    setLoading(true);
    try {
      await flowApi.auth.changePassword({
        userId: user.id,
        currentPassword,
        newPassword,
      });
      toast.success("Şifreniz belirlendi. Hoş geldiniz!");
      await checkUserAuth(); // user tazelenir, must_change_password 0 doner, bu ekran kapanir
    } catch {
      toast.error("Geçici şifreniz hatalı veya bir sorun oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border/50 shadow-lg p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Şifrenizi Belirleyin</h1>
          <p className="text-sm text-muted-foreground mt-1">
            İlk girişiniz. Devam etmek için lütfen kendi şifrenizi oluşturun.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Geçici Şifre</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Size verilen şifre"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Yeni Şifre</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 4 karakter"
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Yeni Şifre (Tekrar)</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Yeni şifreyi tekrar girin"
              className="rounded-xl"
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
            />
          </div>

          <Button
            className="w-full rounded-xl gap-1.5 mt-2"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            onClick={handleSubmit}
          >
            <KeyRound className="w-4 h-4" /> {loading ? "Kaydediliyor..." : "Şifremi Belirle"}
          </Button>

          <button
            onClick={logout}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            Çıkış yap
          </button>
        </div>
      </div>
    </div>
  );
}
