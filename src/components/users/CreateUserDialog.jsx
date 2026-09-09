import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { X, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ROLES = [
  { value: "kullanici", label: "Kullanıcı" },
  { value: "yonetici", label: "Yönetici" },
  { value: "ik", label: "İK" },
  { value: "satis", label: "Satış" },
  { value: "stajer", label: "Stajer" },
  { value: "musteri", label: "Müşteri" },
  { value: "admin", label: "Admin" },
];

export default function CreateUserDialog({ onClose, customers = [], currentUserRole }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    password: "",
    role: "kullanici",
    customer_id: "",
  });

  // Sadece admin "admin" rolü atayabilsin; yönetici atayamasın
  const availableRoles = currentUserRole === "admin"
    ? ROLES
    : ROLES.filter((r) => r.value !== "admin");

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.auth.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Kullanıcı oluşturuldu");
      onClose();
    },
    onError: (err) => {
      toast.error(err?.message || "Kullanıcı oluşturulamadı");
    },
  });

  const canSubmit =
    form.email.trim() &&
    form.role &&
    (form.password.trim() === "" || form.password.trim().length >= 8);

  const handleSubmit = () => {
    if (!canSubmit) return;
    const payload = {
      email: form.email.trim(),
      full_name: form.full_name.trim(),
      role: form.role,
    };
    if (form.password.trim()) payload.password = form.password;
    if (form.role === "musteri" && form.customer_id) {
      payload.customer_id = form.customer_id;
    }
    createMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-indigo-500" />
            Yeni Kullanıcı
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">E-posta *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="ornek@firma.com"
              className="w-full mt-1 px-3 py-2 text-sm border border-border/50 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Ad Soyad</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Ad Soyad"
              className="w-full mt-1 px-3 py-2 text-sm border border-border/50 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Şifre (boş bırakılırsa Ind2026x)</label>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Boş bırak → Ind2026x"
              className="w-full mt-1 px-3 py-2 text-sm border border-border/50 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Kullanıcı ilk girişte kendi şifresini belirler. Elle girilirse en az 8 karakter.</p>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">Rol *</label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, customer_id: "" })}>
              <SelectTrigger className="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.role === "musteri" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Müşteri Firma (opsiyonel)</label>
              <Select value={form.customer_id || "none"} onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}>
                <SelectTrigger className="w-full mt-1">
                  <SelectValue placeholder="Firma seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Sonra atanacak —</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.company_name || c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm border border-border/50 rounded-xl hover:bg-muted transition-colors"
          >
            İptal
          </button>
          <button
            disabled={!canSubmit || createMutation.isPending}
            onClick={handleSubmit}
            className="flex-1 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50 font-medium"
          >
            {createMutation.isPending ? "Oluşturuluyor..." : "Oluştur"}
          </button>
        </div>
      </div>
    </div>
  );
}
