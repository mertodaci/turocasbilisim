import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Users as UsersIcon, Search, Building2, AlertTriangle, Mail, Calendar, X, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";

const getInitials = (name) =>
  name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

const AVATAR_COLORS = [
  "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-blue-500",
  "bg-teal-500", "bg-green-500", "bg-orange-500", "bg-red-500",
];

export default function CustomerUsers() {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const PAGE_SIZE = 20;
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => flowApi.auth.users(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.auth.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Kullanıcı güncellendi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.auth.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      setSelectedUser(null);
      toast.success("Kullanıcı silindi");
    },
  });

  const customerName = (id) => {
    if (!id) return null;
    const c = customers.find((x) => x.id === id);
    return c ? (c.company_name || c.name) : null;
  };

  const customerUsers = users
    .filter((u) => u.role === "musteri")
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      const firm = (customerName(u.customer_id) || "").toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        firm.includes(q)
      );
    });

  const totalPages = Math.ceil(customerUsers.length / PAGE_SIZE);
  const paginated = customerUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const unassignedCount = users.filter((u) => u.role === "musteri" && !u.customer_id).length;
  const selectedUserData = selectedUser ? users.find(u => u.id === selectedUser.id) || selectedUser : null;

  const fmtDate = (d) => {
    if (!d) return "-";
    try { return format(new Date(d), "d MMMM yyyy", { locale: tr }); }
    catch { return "-"; }
  };

  const avatarColor = (u) => AVATAR_COLORS[u.email?.length % AVATAR_COLORS.length] || "bg-indigo-500";

  return (
    <div className="flex gap-6 max-w-[1200px]">
      {/* SOL PANEL */}
      <div className="flex-1 min-w-0 space-y-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UsersIcon className="w-6 h-6 text-orange-500" /> Müşteri Kullanıcıları
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {customerUsers.length} müşteri kullanıcısı
            {unassignedCount > 0 && <span className="text-amber-500 ml-2">({unassignedCount} firma atanmamış)</span>}
          </p>
        </div>

        {/* Arama */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            placeholder="Ad, e-posta veya firma ile ara..."
            className="w-full pl-10 pr-3 py-2 text-sm border border-border/50 rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          />
        </div>

        {/* Liste */}
        <div className="bg-card rounded-xl border border-border/50 overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Yükleniyor...</div>
          ) : customerUsers.length === 0 ? (
            <div className="p-12 text-center">
              <UsersIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {search ? "Aramayla eşleşen müşteri kullanıcısı yok." : "Henüz müşteri kullanıcısı yok."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {paginated.map((u, i) => {
                const firm = customerName(u.customer_id);
                const isSelected = selectedUser?.id === u.id;
                return (
                  <div key={u.id}
                    onClick={() => setSelectedUser(isSelected ? null : u)}
                    className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-muted/30 ${isSelected ? "bg-orange-50 dark:bg-orange-950/20 border-l-2 border-orange-500" : ""}`}>
                    <div className={`w-9 h-9 rounded-full ${AVATAR_COLORS[i % AVATAR_COLORS.length]} text-white flex items-center justify-center text-xs font-semibold shrink-0`}>
                      {getInitials(u.full_name || u.email)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{u.full_name || "(isimsiz)"}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <Mail className="w-3 h-3 shrink-0" /> {u.email}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {firm ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
                          <Building2 className="w-3 h-3" /> {firm}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertTriangle className="w-3 h-3" /> Firma atanmadı
                        </span>
                      )}
                      {u.created_at && (
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" /> {fmtDate(u.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <span className="text-xs text-muted-foreground">{customerUsers.length} kullanıcı · Sayfa {currentPage}/{totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
                  className="px-3 py-1 text-xs rounded-lg border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors">← Önceki</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}
                  className="px-3 py-1 text-xs rounded-lg border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors">Sonraki →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SAĞ PANEL */}
      {selectedUserData && (
        <div className="w-72 shrink-0">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden sticky top-6">
            {/* Header */}
            <div className={`${avatarColor(selectedUserData)} p-6 text-white relative`}>
              <button onClick={() => setSelectedUser(null)}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-white/20 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold mx-auto mb-2">
                {getInitials(selectedUserData.full_name || selectedUserData.email)}
              </div>
              <p className="text-center font-semibold text-sm">{selectedUserData.full_name || "(isimsiz)"}</p>
              <p className="text-center text-xs opacity-80 mt-0.5">{selectedUserData.email}</p>
              <div className="flex justify-center mt-2">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Müşteri</span>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Kayıt tarihi */}
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Kayıt Tarihi</p>
                <p className="text-sm font-medium">{fmtDate(selectedUserData.created_at)}</p>
              </div>

              {/* Hesap durumu */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Hesap Durumu</p>
                <div className={`flex items-center justify-between p-2 rounded-lg border ${selectedUserData.status === "pasif" ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                  <span className={`text-xs font-medium ${selectedUserData.status === "pasif" ? "text-amber-700" : "text-emerald-700"}`}>
                    {selectedUserData.status === "pasif" ? "Pasif — Giriş yapamaz" : "Aktif — Giriş yapabilir"}
                  </span>
                  <button
                    onClick={() => updateMutation.mutate({ id: selectedUserData.id, data: { status: selectedUserData.status === "pasif" ? "aktif" : "pasif" } })}
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold ${selectedUserData.status === "pasif" ? "bg-amber-500 text-white" : "bg-emerald-500 text-white"}`}>
                    {selectedUserData.status === "pasif" ? "AKTİF" : "PASİF"}
                  </button>
                </div>
              </div>

              {/* Bağlı Müşteri */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Bağlı Müşteri</p>
                <Select value={selectedUserData.customer_id || "none"}
                  onValueChange={(v) => updateMutation.mutate({ id: selectedUserData.id, data: { customer_id: v === "none" ? null : v } })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Firma seç..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Firma yok —</SelectItem>
                    {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!selectedUserData.customer_id && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ Firma atanmadı</p>
                )}
              </div>

              {/* Sil */}
              <button
                onClick={() => { if (confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) deleteMutation.mutate(selectedUserData.id); }}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Kullanıcıyı Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
