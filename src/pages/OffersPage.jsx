import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FileText, Building2, Search, TrendingUp, CheckCircle2, MessageSquare, ExternalLink, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATUS_CONFIG = {
  taslak: { label: "Taslak", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  gonderildi: { label: "Gönderildi", color: "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  gorusulmede: { label: "Görüşmede", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300" },
  kazanildi: { label: "Kazanıldı", color: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  kaybedildi: { label: "Kaybedildi", color: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  iptal: { label: "İptal", color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
};

export default function OffersPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toDelete, setToDelete] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.SalesActivity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      setToDelete(null);
    },
  });

  // Teklifler artik salt-okuma: satis aktivitelerinden (teklif_sunumu tipi) beslenir
  const { data: offers = [] } = useQuery({
    queryKey: ["sales_activities", "teklif"],
    queryFn: () => flowApi.entities.SalesActivity.filter({ activity_type: "teklif_sunumu" }, "-date", 300),
  });

  const filtered = offers.filter((o) => {
    const matchSearch =
      !search ||
      o.title?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || (o.deal_status || "taslak") === filterStatus;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: offers.length,
    kazanildi: offers.filter((o) => o.deal_status === "kazanildi").length,
    gorusulmede: offers.filter((o) => o.deal_status === "gorusulmede").length,
    toplam_tutar: offers
      .filter((o) => o.deal_status === "kazanildi")
      .reduce((s, o) => s + (parseFloat(o.amount) || 0), 0),
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teklifler</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Satış aktivitelerinden gelen teklifler
          </p>
        </div>
      </div>

      {/* Ozet kartlar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-slate-500/10"><FileText className="w-4 h-4 text-slate-500" /></div>
          </div>
          <div className="text-2xl font-black text-foreground">{stats.total}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Toplam Teklif</div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-yellow-500/10"><MessageSquare className="w-4 h-4 text-yellow-500" /></div>
          </div>
          <div className="text-2xl font-black text-foreground">{stats.gorusulmede}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Görüşmede</div>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-green-500/10"><CheckCircle2 className="w-4 h-4 text-green-500" /></div>
          </div>
          <div className="text-2xl font-black text-foreground">{stats.kazanildi}</div>
          <div className="text-xs text-muted-foreground mt-0.5">Kazanıldı</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-800/50 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10"><TrendingUp className="w-4 h-4 text-amber-600" /></div>
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400">
            {stats.toplam_tutar.toLocaleString("tr-TR")} ₺
          </div>
          <div className="text-xs text-amber-600/80 dark:text-amber-500/80 mt-0.5">Kazanılan Tutar</div>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Teklif veya müşteri ara..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-44 rounded-xl"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tablo */}
      <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Teklif</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Müşteri</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Tarih</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Geçerlilik</th>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
              <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">Tutar</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-muted-foreground">
                  <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">{search ? "Sonuç bulunamadı" : "Henüz teklif yok"}</p>
                  <p className="text-xs mt-1 text-muted-foreground/60">Teklifler, Satış &gt; Aktivite Ekle ekranından "Teklif Sunumu" tipi ile oluşturulur.</p>
                </td>
              </tr>
            ) : (
              filtered.map((o, idx) => {
                const statusCfg = STATUS_CONFIG[o.deal_status] || STATUS_CONFIG.taslak;
                return (
                  <tr key={o.id} className={`border-b border-border/20 hover:bg-muted/20 transition-colors ${idx % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="font-medium text-foreground">{o.title || "(başlıksız)"}</p>
                          {o.employee_name && <p className="text-xs text-muted-foreground">{o.employee_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Building2 className="w-3 h-3" />
                        <span>{o.customer_name || "-"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {o.date ? format(new Date(o.date), "d MMM yyyy", { locale: tr }) : "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                      {o.valid_until ? format(new Date(o.valid_until), "d MMM yyyy", { locale: tr }) : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={`${statusCfg.color} text-xs`}>{statusCfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium hidden md:table-cell">
                      {o.amount ? `${parseFloat(o.amount).toLocaleString("tr-TR")} ${o.currency || "₺"}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2">
                        {o.customer_id && (
                          <Link
                            to={`/musteri/${o.customer_id}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="Müşteriye git"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setToDelete(o)}
                            className="text-muted-foreground hover:text-red-600 transition-colors"
                            title="Teklifi sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      {/* teklif-silme-dialog */}
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklif silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.title || "-"}</strong> başlıklı teklif ({toDelete?.customer_name || "-"}) silinecek.
              Bu işlem ilgili satış aktivitesini de kaldırır. Kayıt geri getirilebilir şekilde saklanır.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
