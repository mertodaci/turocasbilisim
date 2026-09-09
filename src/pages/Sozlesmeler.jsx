import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollText, Plus, Pencil, Trash2, Eye, Wallet, ExternalLink } from "lucide-react";
import { num, tl, buildHakedisPayloads } from "@/lib/hakedisUtils";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

const TYPE_LABELS = {
  hizmet_sozlesmesi: "Hizmet Sözleşmesi", bakim_sozlesmesi: "Bakım Sözleşmesi",
  bakim_destek: "Bakım & Destek", lisans: "Lisans", gizlilik: "Gizlilik",
  is_ortakligi: "İş Ortaklığı", diger: "Diğer",
};
const STATUS_CFG = {
  aktif: { label: "Aktif", className: "bg-emerald-100 text-emerald-700" },
  suresi_dolmak_uzere: { label: "Süresi Dolmak Üzere", className: "bg-amber-100 text-amber-700" },
  suresi_doldu: { label: "Süresi Doldu", className: "bg-red-100 text-red-700" },
  iptal: { label: "İptal", className: "bg-slate-100 text-slate-500" },
  taslak: { label: "Taslak", className: "bg-blue-100 text-blue-700" },
};
const STATUS_OPTS = ["all", "taslak", "aktif", "suresi_dolmak_uzere", "suresi_doldu", "iptal"];

export default function Sozlesmeler() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const role = user?.role || "kullanici";
  const canAdd = can(role, "sozlesmeler", "add");
  const canEdit = can(role, "sozlesmeler", "edit");
  const canDelete = can(role, "sozlesmeler", "delete");
  const canGenHakedis = can(role, "hakedisler", "add");
  const canDelHakedis = can(role, "hakedisler", "delete");

  const [deleting, setDeleting] = useState(null);
  const [detail, setDetail] = useState(null);
  const [hakedisBusy, setHakedisBusy] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState(searchParams.get("customer") || "all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["sozlesmeler-all"],
    queryFn: () => fetch(`${BASE_URL}/api/sozlesmeler`, { credentials: "include" }).then((r) => {
      if (!r.ok) throw new Error("Sözleşmeler alınamadı");
      return r.json();
    }),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });
  const { data: hakedisler = [] } = useQuery({
    queryKey: ["hakedisler"],
    queryFn: () => flowApi.entities.Hakedis.list("-year", 5000),
  });

  const custById = useMemo(() => {
    const m = new Map();
    for (const c of customers) m.set(c.id, c);
    return m;
  }, [customers]);
  const hakedisByContract = useMemo(() => {
    const s = new Set();
    for (const h of hakedisler) if (h.contract_id) s.add(h.contract_id);
    return s;
  }, [hakedisler]);

  const customerNames = useMemo(() => {
    const m = new Map();
    for (const r of rows) if (r.customer_id) m.set(r.customer_id, r.company_name || "—");
    return [...m.entries()].sort((a, b) => String(a[1]).localeCompare(String(b[1]), "tr"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => {
      if (filterCustomer !== "all" && r.customer_id !== filterCustomer) return false;
      if (filterStatus !== "all" && (r.status || "taslak") !== filterStatus) return false;
      if (q && !String(r.title || "").toLocaleLowerCase("tr").includes(q)) return false;
      return true;
    });
  }, [rows, filterCustomer, filterStatus, search]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );
  useEffect(() => { setPage(1); }, [filterCustomer, filterStatus, search]);

  const totals = useMemo(() => {
    let deger = 0, aktif = 0, dolan = 0;
    for (const r of rows) {
      deger += num(r.contract_value) || 0;
      if (r.status === "aktif") aktif++;
      if (r.status === "suresi_doldu" || r.status === "suresi_dolmak_uzere") dolan++;
    }
    return { toplam: rows.length, aktif, dolan, deger };
  }, [rows]);

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.CustomerContract.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sozlesmeler-all"] });
      setDeleting(null);
      toast.success("Sözleşme silindi");
    },
    onError: (e) => toast.error(e?.message || "Silinemedi"),
  });

  const generateHakedis = async (contract) => {
    const cust = custById.get(contract.customer_id) || { id: contract.customer_id, company_name: contract.company_name };
    const payloads = buildHakedisPayloads(contract, cust);
    if (payloads.length === 0) {
      toast.error("Sözleşmede tutar, hakediş başlangıç tarihi ve taksit sayısı dolu olmalı");
      return;
    }
    const existing = hakedisler.filter((h) => h.contract_id === contract.id);
    if (existing.length && !window.confirm(`Bu sözleşme için ${existing.length} hakediş kaydı var. Silinip yeniden oluşturulsun mu?`)) return;
    setHakedisBusy(true);
    try {
      for (const h of existing) { try { await flowApi.entities.Hakedis.delete(h.id); } catch { /* devam */ } }
      let ok = 0;
      for (const p of payloads) { try { await flowApi.entities.Hakedis.create(p); ok++; } catch { /* devam */ } }
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      queryClient.invalidateQueries({ queryKey: ["sozlesmeler-all"] });
      toast.success(`${ok} hakediş kaydı oluşturuldu`);
    } finally {
      setHakedisBusy(false);
    }
  };

  const removeHakedisMutation = useMutation({
    mutationFn: async (contractId) => {
      const list = hakedisler.filter((h) => h.contract_id === contractId);
      for (const h of list) { try { await flowApi.entities.Hakedis.delete(h.id); } catch { /* devam */ } }
      return list.length;
    },
    onSuccess: (n) => {
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      queryClient.invalidateQueries({ queryKey: ["sozlesmeler-all"] });
      toast.success(`${n} hakediş kaydı silindi`);
    },
    onError: (e) => toast.error(e?.message || "Silinemedi"),
  });

  const eligible = (c) => !!(c.contract_value && c.hakedis_start_date && c.installment_count);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-primary" /> Sözleşmeler
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Tüm müşteri sözleşmeleri</p>
        </div>
        {canAdd && (
          <Button onClick={() => navigate("/sozlesmeler/yeni")} className="gap-1.5">
            <Plus className="w-4 h-4" /> Yeni Sözleşme
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Toplam Sözleşme", value: totals.toplam, suffix: "" },
          { label: "Aktif", value: totals.aktif, suffix: "" },
          { label: "Süresi Dolan / Dolmak Üzere", value: totals.dolan, suffix: "" },
          { label: "Toplam Değer", value: tl(totals.deger), suffix: " ₺" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className="text-lg font-bold mt-1">{c.value}{c.suffix}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterCustomer} onValueChange={setFilterCustomer}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Müşteri" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Müşteriler</SelectItem>
            {customerNames.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Durum" /></SelectTrigger>
          <SelectContent>
            {STATUS_OPTS.map((s) => (
              <SelectItem key={s} value={s}>{s === "all" ? "Tüm Durumlar" : (STATUS_CFG[s]?.label || s)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input placeholder="Başlıkta ara..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-56" />
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">Müşteri</th>
              <th className="px-3 py-2 text-left">Başlık</th>
              <th className="px-3 py-2 text-left">Tür</th>
              <th className="px-3 py-2 text-left">Durum</th>
              <th className="px-3 py-2 text-left">Başlangıç</th>
              <th className="px-3 py-2 text-left">Bitiş</th>
              <th className="px-3 py-2 text-right">Değer</th>
              <th className="px-3 py-2 text-left">Hakediş</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isLoading ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Yükleniyor...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">Sözleşme bulunamadı.</td></tr>
            ) : pageRows.map((c) => {
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.taslak;
              return (
                <tr key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetail(c)}>
                  <td className="px-3 py-2 font-medium">{c.company_name || "—"}</td>
                  <td className="px-3 py-2 max-w-[260px] truncate" title={c.title}>{c.title || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{TYPE_LABELS[c.contract_type] || c.contract_type || "—"}</td>
                  <td className="px-3 py-2"><Badge className={`${cfg.className} text-xs`}>{cfg.label}</Badge></td>
                  <td className="px-3 py-2 text-muted-foreground">{c.start_date || "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{c.end_date || "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{c.contract_value ? tl(num(c.contract_value)) + " ₺" : "—"}</td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    {hakedisByContract.has(c.id) ? (
                      <div className="flex items-center gap-1">
                        <Badge className="bg-emerald-100 text-emerald-700 text-xs">Oluşturuldu</Badge>
                        {canDelHakedis && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-600"
                            title="Bu sözleşmenin tüm hakediş kayıtlarını sil"
                            disabled={removeHakedisMutation.isPending}
                            onClick={() => { if (window.confirm("Bu sözleşme için oluşturulan tüm hakediş kayıtları silinsin mi?")) removeHakedisMutation.mutate(c.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ) : eligible(c) && canGenHakedis ? (
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1" disabled={hakedisBusy} onClick={() => generateHakedis(c)}>
                        <Wallet className="w-3 h-3" /> Hakediş Oluştur
                      </Button>
                    ) : <span className="text-muted-foreground">–</span>}
                  </td>
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetail(c)}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`/sozlesmeler/${c.id}`)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => setDeleting(c)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-border/50 text-xs text-muted-foreground">
            <span>Toplam {filtered.length} kayıt · Sayfa {currentPage} / {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Önceki</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sonraki</Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.title || "Sözleşme"} <span className="text-sm font-normal text-muted-foreground">— {detail?.company_name}</span></DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 mt-1 text-sm">
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <KV k="Müşteri" v={detail.company_name} />
                <KV k="Tür" v={TYPE_LABELS[detail.contract_type] || detail.contract_type} />
                <KV k="Durum" v={(STATUS_CFG[detail.status] || STATUS_CFG.taslak).label} />
                <KV k="Başlangıç" v={detail.start_date} />
                <KV k="Bitiş" v={detail.end_date} />
                <KV k="Sözleşme Tutarı" v={detail.contract_value ? tl(num(detail.contract_value)) + " ₺" : "–"} />
                <KV k="Hakediş Başlangıç" v={detail.hakedis_start_date} />
                <KV k="Taksit Sayısı" v={detail.installment_count} />
              </div>
              {detail.notes && <p className="text-muted-foreground border-t border-border/40 pt-2 italic">{detail.notes}</p>}
              {Array.isArray(detail.products) && detail.products.length > 0 && (
                <div className="border-t border-border/40 pt-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Ürünler</p>
                  <ul className="space-y-0.5">
                    {detail.products.map((p, i) => (
                      <li key={i} className="text-xs">• {p.name}{p.price ? ` — ${p.price}` : ""}{(p.moduleLabels || []).length ? ` (${p.moduleLabels.join(", ")})` : ""}</li>
                    ))}
                  </ul>
                </div>
              )}
              {detail.file_url && (
                <a href={detail.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
                  <ExternalLink className="w-3.5 h-3.5" /> Belgeyi Görüntüle
                </a>
              )}
              {hakedisByContract.has(detail.id) && (
                <p className="text-xs text-emerald-600">Bu sözleşme için hakediş kayıtları oluşturulmuş.</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sözleşme silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleting?.company_name}</strong> — {deleting?.title} kaydı kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(deleting.id)}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KV({ k, v }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className="text-sm font-medium truncate">{v === "" || v == null ? "–" : v}</div>
    </div>
  );
}
