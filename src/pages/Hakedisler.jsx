import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { useRolePermissions } from "@/lib/RolePermissionsContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, FileSpreadsheet, Upload, Wallet, Eye, Check } from "lucide-react";
import {
  MONTHS, MONTH_KEYS, DURUM_OPTS, ANLASMA_OPTS, KDV_OPTS,
  num, tl, serialToISO, fmtDate, rowAdet, rowOrtalama,
  parseTahsilat, rowTahsilEdilen, monthPlanOrijinal,
  custSektor, norm,
} from "@/lib/hakedisUtils";

const emptyForm = () => ({
  year: new Date().getFullYear(),
  sira_no: "", musteri: "", customer_id: "", is_konusu: "", durum: "aktif",
  sektor: "", anlasma_turu: "", kdv_durumu: "",
  sozlesme_baslangic: "", sozlesme_bitis: "",
  toplam_sozlesme_tutari: "", pesin_tutari: "", yil_hedefi: "", aciklama: "",
  ...Object.fromEntries(MONTH_KEYS.map((k) => [k, ""])),
});

export default function Hakedisler() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { can } = useRolePermissions();
  const role = user?.role || "kullanici";
  const canAdd = can(role, "hakedisler", "add");
  const canEdit = can(role, "hakedisler", "edit");
  const canDelete = can(role, "hakedisler", "delete");

  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [importing, setImporting] = useState(false);
  const [tahsilatEdit, setTahsilatEdit] = useState(null); // { rowId, monthKey, monthLabel, year, planned }
  const [tahsilatForm, setTahsilatForm] = useState({ planlanan: "", alindi: false, tutar: "", tarih: "" });
  const fileRef = useRef(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["hakedisler"],
    queryFn: () => flowApi.entities.Hakedis.list("-year", 5000),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });
  const custByName = useMemo(() => {
    const m = new Map();
    for (const c of customers) m.set(norm(c.company_name), c);
    return m;
  }, [customers]);

  // Tüm kayıtlar, yıl ayrımı yapılmadan — en yeni oluşturulan en üstte.
  const allRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)),
    [rows]
  );

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = useMemo(
    () => allRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [allRows, currentPage]
  );

  const totals = useMemo(() => {
    let sozlesme = 0, hedef = 0, gerceklesen = 0;
    for (const r of allRows) {
      sozlesme += num(r.toplam_sozlesme_tutari) || 0;
      hedef += num(r.yil_hedefi) || 0;
      gerceklesen += rowTahsilEdilen(r);
    }
    return { sozlesme, hedef, gerceklesen, kalan: hedef - gerceklesen };
  }, [allRows]);

  const saveMutation = useMutation({
    mutationFn: ({ id, data }) => (id ? flowApi.entities.Hakedis.update(id, data) : flowApi.entities.Hakedis.create(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      setFormOpen(false); setEditingId(null);
      toast.success("Hakediş kaydedildi");
    },
    onError: (e) => toast.error(e?.message || "Kaydedilemedi"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Hakedis.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      setDeleting(null);
      toast.success("Hakediş silindi");
    },
    onError: (e) => toast.error(e?.message || "Silinemedi"),
  });

  // Bir ay hücresine tıklayınca: o ayın planlanan tutarı (düzenlenebilir) +
  // varsa mevcut tahsilat kaydını forma doldur.
  const openTahsilatDialog = (r, monthKey, monthLabel) => {
    const existing = parseTahsilat(r)[monthKey] || {};
    const planned = num(r[monthKey]) || 0;
    const orijinal = existing.plan_orijinal != null ? num(existing.plan_orijinal) : null;
    setTahsilatEdit({ rowId: r.id, monthKey, monthLabel, year: r.year, planned, orijinal });
    setTahsilatForm({
      planlanan: planned ? tl(planned) : "",
      alindi: !!existing.alindi,
      tutar: existing.tutar != null ? tl(existing.tutar) : (planned ? tl(planned) : ""),
      tarih: existing.tarih || "",
    });
  };

  const saveTahsilatMutation = useMutation({
    mutationFn: async () => {
      const row = rows.find((x) => x.id === tahsilatEdit.rowId);
      const current = parseTahsilat(row);
      const prev = current[tahsilatEdit.monthKey] || {};
      const newPlanned = num(tahsilatForm.planlanan);
      const oldPlanned = num(row?.[tahsilatEdit.monthKey]);
      const plannedChanged = (newPlanned ?? 0) !== (oldPlanned ?? 0);

      // "Orijinal" tutar: ilk elle düzeltmede o anki değeri sakla; sonra
      // üzerine yazma. Tutar orijinaline geri getirilirse işareti kaldır.
      let planOrijinal = prev.plan_orijinal != null ? num(prev.plan_orijinal) : null;
      if (plannedChanged && planOrijinal == null) planOrijinal = oldPlanned ?? 0;
      if (planOrijinal != null && (newPlanned ?? 0) === planOrijinal) planOrijinal = null;

      const entry = {
        alindi: !!tahsilatForm.alindi,
        tutar: tahsilatForm.alindi ? num(tahsilatForm.tutar) : null,
        tarih: tahsilatForm.alindi ? (tahsilatForm.tarih || null) : null,
      };
      if (planOrijinal != null) entry.plan_orijinal = planOrijinal;

      const updated = { ...current, [tahsilatEdit.monthKey]: entry };
      const payload = { tahsilat: updated };
      // Planlanan tutar elle değiştirildiyse: o ayı güncelle ve Yıl Hedefi'ni
      // (o satırın) 12 ayının toplamına eşitle.
      if (plannedChanged) {
        payload[tahsilatEdit.monthKey] = newPlanned;
        payload.yil_hedefi = MONTH_KEYS.reduce(
          (a, k) => a + (k === tahsilatEdit.monthKey ? (newPlanned || 0) : (num(row?.[k]) || 0)),
          0
        );
      }
      return flowApi.entities.Hakedis.update(tahsilatEdit.rowId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      setTahsilatEdit(null);
      toast.success("Kaydedildi");
    },
    onError: (e) => toast.error(e?.message || "Kaydedilemedi"),
  });

  const openNew = () => { setForm(emptyForm()); setEditingId(null); setFormOpen(true); };
  const openEdit = (r) => {
    setForm({
      ...emptyForm(), ...r,
      year: r.year || new Date().getFullYear(),
      pesin_tutari: r.pesin_tutari ?? "",
      ...Object.fromEntries(MONTH_KEYS.map((k) => [k, r[k] ?? ""])),
    });
    setEditingId(r.id); setFormOpen(true);
  };

  const submit = () => {
    if (!form.musteri?.trim()) { toast.error("Müşteri zorunlu"); return; }
    const data = {
      year: Number(form.year) || new Date().getFullYear(),
      sira_no: form.sira_no === "" ? null : Number(form.sira_no),
      musteri: form.musteri.trim(),
      customer_id: form.customer_id || custByName.get(norm(form.musteri))?.id || null,
      is_konusu: form.is_konusu?.trim() || "",
      durum: form.durum || "aktif",
      sektor: form.sektor || "",
      anlasma_turu: form.anlasma_turu || "",
      kdv_durumu: form.kdv_durumu || "",
      sozlesme_baslangic: form.sozlesme_baslangic || "",
      sozlesme_bitis: form.sozlesme_bitis || "",
      toplam_sozlesme_tutari: num(form.toplam_sozlesme_tutari),
      pesin_tutari: num(form.pesin_tutari),
      yil_hedefi: num(form.yil_hedefi),
      aciklama: form.aciklama?.trim() || "",
      ...Object.fromEntries(MONTH_KEYS.map((k) => [k, num(form[k])])),
    };
    saveMutation.mutate({ id: editingId, data });
  };

  const exportExcel = () => {
    const header = ["Yıl", "S.No", "Müşteri", "İşin Konusu", "Durum", "Sektör", "Anlaşma Türü", "KDV Durumu",
      "Sözleşme Başlangıç", "Sözleşme Bitiş", "Toplam Sözleşme Tutarı", "Yıl Hedefi",
      "Hakediş Adet", "Gerçekleşen", "Kalan", ...MONTHS.map(([, l]) => l), "Açıklama"];
    const data = allRows.map((r) => {
      const g = rowTahsilEdilen(r);
      return [
        r.year ?? "", r.sira_no ?? "", r.musteri || "", r.is_konusu || "", r.durum || "", r.sektor || "",
        r.anlasma_turu || "", r.kdv_durumu || "", fmtDate(r.sozlesme_baslangic), fmtDate(r.sozlesme_bitis),
        num(r.toplam_sozlesme_tutari) ?? "", num(r.yil_hedefi) ?? "",
        rowAdet(r), g, (num(r.yil_hedefi) || 0) - g,
        ...MONTH_KEYS.map((k) => num(r[k]) ?? ""), r.aciklama || "",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tumu");
    XLSX.writeFile(wb, "hakedisler-tumu.xlsx");
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
      const sheetYear = /^\d{4}$/.test(String(sheetName).trim()) ? Number(sheetName) : new Date().getFullYear();
      // Basligi (S.NO ile baslayan) bul, sonrasindaki col0'i sayisal satirlari al
      const dataRows = aoa.filter((r) => typeof r[0] === "number" && String(r[1] || "").trim());
      if (dataRows.length === 0) { toast.error("Aktarilacak satir bulunamadi"); return; }
      const payloads = dataRows.map((r) => {
        const musteri = String(r[1] || "").trim();
        const c = custByName.get(norm(musteri));
        return {
          year: sheetYear,
          sira_no: Number(r[0]) || null,
          musteri,
          customer_id: c?.id || null,
          is_konusu: String(r[2] || "").trim(),
          durum: String(r[3] || "").toUpperCase().includes("PAS") ? "pasif" : "aktif",
          sektor: String(r[4] || "").trim() || (c ? custSektor(c) : ""),
          anlasma_turu: String(r[5] || "").trim(),
          kdv_durumu: String(r[6] || "").trim(),
          sozlesme_baslangic: serialToISO(r[7]),
          sozlesme_bitis: serialToISO(r[8]),
          toplam_sozlesme_tutari: num(r[9]),
          yil_hedefi: num(r[10]),
          aciklama: String(r[28] || "").trim(),
          ...Object.fromEntries(MONTH_KEYS.map((k, i) => [k, num(r[14 + i])])),
        };
      });
      const existing = rows.filter((r) => Number(r.year) === sheetYear);
      const msg = existing.length
        ? `"${sheetName}" sayfası: ${payloads.length} satır. ${sheetYear} yılında zaten ${existing.length} kayıt var — silinip yeniden aktarılsın mı?`
        : `"${sheetName}" sayfasından ${payloads.length} hakediş satırı ${sheetYear} yılına aktarılsın mı?`;
      if (!window.confirm(msg)) return;
      setImporting(true);
      if (existing.length) {
        for (const r of existing) { try { await flowApi.entities.Hakedis.delete(r.id); } catch { /* devam */ } }
      }
      let ok = 0;
      for (const p of payloads) {
        try { await flowApi.entities.Hakedis.create(p); ok++; } catch { /* devam */ }
      }
      queryClient.invalidateQueries({ queryKey: ["hakedisler"] });
      setPage(1);
      toast.success(`${ok}/${payloads.length} satır aktarıldı`);
    } catch (err) {
      toast.error("Excel okunamadı: " + (err?.message || ""));
    } finally {
      setImporting(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Wallet className="w-6 h-6 text-emerald-500" /> Hakediş
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Sözleşme bazında yıllık hakediş takibi</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={exportExcel} disabled={allRows.length === 0} className="gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> Excel'e Aktar
          </Button>
          {canAdd && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onImportFile} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} className="gap-1.5">
                <Upload className="w-4 h-4" /> {importing ? "Aktarılıyor..." : "Excel'den İçe Aktar"}
              </Button>
              <Button onClick={openNew} className="gap-1.5"><Plus className="w-4 h-4" /> Yeni Hakediş</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Toplam Sözleşme Tutarı", value: totals.sozlesme, color: "text-foreground" },
          { label: "Yıl Hedefi", value: totals.hedef, color: "text-blue-600" },
          { label: "Gerçekleşen", value: totals.gerceklesen, color: "text-emerald-600" },
          { label: "Kalan Hakediş", value: totals.kalan, color: "text-orange-600" },
        ].map((c) => (
          <div key={c.label} className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
            <p className="text-xs text-muted-foreground">{c.label}</p>
            <p className={`text-lg font-bold mt-1 ${c.color}`}>{tl(c.value)} ₺</p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border/50 rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col className="w-14" />
            <col className="w-12" />
            <col />
            <col className="w-20" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-28" />
            <col className="w-24" />
          </colgroup>
          <thead className="bg-muted/50 border-b border-border/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-2 py-2 text-left">Yıl</th>
              <th className="px-2 py-2 text-left">S.No</th>
              <th className="px-2 py-2 text-left">Müşteri</th>
              <th className="px-2 py-2 text-left">Durum</th>
              <th className="px-2 py-2 text-right">Yıl Hedefi</th>
              <th className="px-2 py-2 text-right">Gerçekleşen</th>
              <th className="px-2 py-2 text-right">Kalan</th>
              <th className="px-2 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {isLoading ? (
              <tr><td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">Yükleniyor...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={8} className="px-2 py-8 text-center text-muted-foreground">Hiç hakediş kaydı yok. "Excel'den İçe Aktar" ile mevcut dosyanızı yükleyebilirsiniz.</td></tr>
            ) : pageRows.map((r) => {
              const g = rowTahsilEdilen(r);
              const kalan = (num(r.yil_hedefi) || 0) - g;
              return (
                <tr key={r.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setDetailCustomer(r.musteri)}>
                  <td className="px-2 py-2 text-muted-foreground">{r.year ?? "–"}</td>
                  <td className="px-2 py-2 text-muted-foreground">{r.sira_no ?? "–"}</td>
                  <td className="px-2 py-2 font-medium truncate" title={r.is_konusu ? `${r.musteri} — ${r.is_konusu}` : r.musteri}>
                    {r.musteri}
                    {r.contract_id && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground bg-muted rounded px-1 py-0.5 align-middle">Sözleşmeden</span>}
                  </td>
                  <td className="px-2 py-2">
                    <Badge className={r.durum === "pasif" ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>
                      {r.durum === "pasif" ? "Pasif" : "Aktif"}
                    </Badge>
                  </td>
                  <td className="px-2 py-2 text-right text-blue-600">{tl(num(r.yil_hedefi))}</td>
                  <td className="px-2 py-2 text-right text-emerald-600">{tl(g)}</td>
                  <td className={`px-2 py-2 text-right ${kalan > 0 ? "text-orange-600" : "text-muted-foreground"}`}>{tl(kalan)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setDetailCustomer(r.musteri); }}>
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={(e) => { e.stopPropagation(); setDeleting(r); }}>
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
        {allRows.length > 0 && (
          <div className="flex items-center justify-between gap-3 px-3 py-2.5 border-t border-border/50 text-xs text-muted-foreground">
            <span>Toplam {allRows.length} kayıt · Sayfa {currentPage} / {totalPages}</span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Önceki</Button>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Sonraki</Button>
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Hakedişi Düzenle" : "Yeni Hakediş"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <Field label="Müşteri *">
              <Input
                value={form.musteri}
                list="hakedis-musteriler"
                placeholder="Tanımlı müşteriden seç veya yaz..."
                onChange={(e) => {
                  const name = e.target.value;
                  const c = custByName.get(norm(name));
                  setForm((f) => ({
                    ...f,
                    musteri: name,
                    customer_id: c?.id || "",
                    ...(c && custSektor(c) ? { sektor: custSektor(c) } : {}),
                  }));
                }}
              />
              <datalist id="hakedis-musteriler">
                {[...customers]
                  .sort((a, b) => String(a.company_name || "").localeCompare(String(b.company_name || ""), "tr"))
                  .map((c) => <option key={c.id} value={c.company_name} />)}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Yıl"><Input type="number" value={form.year} onChange={(e) => set("year", e.target.value)} /></Field>
              <Field label="S. No"><Input type="number" value={form.sira_no} onChange={(e) => set("sira_no", e.target.value)} /></Field>
              <Field label="Durum">
                <Select value={form.durum} onValueChange={(v) => set("durum", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DURUM_OPTS.map((o) => <SelectItem key={o} value={o}>{o === "pasif" ? "Pasif" : "Aktif"}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="İşin Konusu"><Textarea value={form.is_konusu} onChange={(e) => set("is_konusu", e.target.value)} className="h-16" /></Field>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Anlaşma Türü"><ComboInput value={form.anlasma_turu} onChange={(v) => set("anlasma_turu", v)} options={ANLASMA_OPTS} /></Field>
              <Field label="KDV Durumu"><ComboInput value={form.kdv_durumu} onChange={(v) => set("kdv_durumu", v)} options={KDV_OPTS} /></Field>
              <Field label="Toplam Sözleşme Tutarı (KDV hariç)"><Input value={form.toplam_sozlesme_tutari} onChange={(e) => set("toplam_sozlesme_tutari", e.target.value)} /></Field>
              <Field label="Peşin Tutarı"><Input value={form.pesin_tutari} onChange={(e) => set("pesin_tutari", e.target.value)} /></Field>
              <Field label="Sözleşme Başlangıç"><Input type="date" value={form.sozlesme_baslangic || ""} onChange={(e) => set("sozlesme_baslangic", e.target.value)} /></Field>
              <Field label="Sözleşme Bitiş"><Input type="date" value={form.sozlesme_bitis || ""} onChange={(e) => set("sozlesme_bitis", e.target.value)} /></Field>
              <Field label={`${form.year} Gerçekleşme Hedefi`}><Input value={form.yil_hedefi} onChange={(e) => set("yil_hedefi", e.target.value)} /></Field>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Aylık Hakediş Tutarları</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {MONTHS.map(([k, l]) => (
                  <div key={k}>
                    <label className="text-[11px] text-muted-foreground">{l}</label>
                    <Input value={form[k] ?? ""} onChange={(e) => set(k, e.target.value)} className="h-8 text-xs" />
                  </div>
                ))}
              </div>
            </div>
            <Field label="Açıklama"><Textarea value={form.aciklama} onChange={(e) => set("aciklama", e.target.value)} className="h-16" /></Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setFormOpen(false)}>İptal</Button>
              <Button onClick={submit} disabled={saveMutation.isPending}>{saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Müşteri detay */}
      <Dialog open={!!detailCustomer} onOpenChange={(o) => !o && setDetailCustomer(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Hakediş Detayı — {detailCustomer}</DialogTitle>
          </DialogHeader>
          {(() => {
            const custRows = allRows.filter((r) => r.musteri === detailCustomer);
            const s = custRows.reduce((a, r) => {
              const g = rowTahsilEdilen(r);
              a.tutar += num(r.toplam_sozlesme_tutari) || 0;
              a.hedef += num(r.yil_hedefi) || 0;
              a.gerc += g;
              return a;
            }, { tutar: 0, hedef: 0, gerc: 0 });
            const money = (v, c = "") => (
              <span className={`tabular-nums whitespace-nowrap font-bold ${c}`}>{tl(v)}&nbsp;₺</span>
            );
            return (
              <div className="space-y-5 mt-1">
                {/* Musteri toplam ozeti */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    ["Toplam Tutar", s.tutar, ""],
                    ["Yıl Hedefi", s.hedef, "text-blue-600"],
                    ["Gerçekleşen", s.gerc, "text-emerald-600"],
                    ["Kalan", s.hedef - s.gerc, "text-orange-600"],
                  ].map(([l, v, c]) => (
                    <div key={l} className="rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">{l}</p>
                      <p className="text-sm mt-0.5">{money(v, c)}</p>
                    </div>
                  ))}
                </div>

                {custRows.map((r) => {
                  const g = rowTahsilEdilen(r);
                  const kalan = (num(r.yil_hedefi) || 0) - g;
                  return (
                    <div key={r.id} className="border border-border/50 rounded-xl p-4 space-y-4">
                      {/* baslik */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex flex-wrap items-center gap-2">
                          <span className="font-semibold line-clamp-2">{r.is_konusu || "(iş konusu yok)"}</span>
                          <Badge className={r.durum === "pasif" ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-700"}>
                            {r.durum === "pasif" ? "Pasif" : "Aktif"}
                          </Badge>
                          <Badge variant="outline" className="text-xs">{r.year}</Badge>
                        </div>
                        {canEdit && (
                          <Button variant="outline" size="sm" className="gap-1.5 shrink-0"
                            onClick={() => { setDetailCustomer(null); openEdit(r); }}>
                            <Pencil className="w-3.5 h-3.5" /> Düzenle
                          </Button>
                        )}
                      </div>

                      {/* sozlesme bilgileri */}
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Sözleşme Bilgileri</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3">
                          <KV k="Anlaşma Türü" v={r.anlasma_turu} />
                          <KV k="KDV Durumu" v={r.kdv_durumu} />
                          <KV k="Sözleşme" mono v={`${fmtDate(r.sozlesme_baslangic) || "–"}${r.sozlesme_bitis ? " – " + fmtDate(r.sozlesme_bitis) : ""}`} />
                        </div>
                      </div>

                      {/* finansal ozet */}
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Finansal Özet</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            ["Toplam Sözleşme Tutarı", num(r.toplam_sozlesme_tutari) || 0, ""],
                            ["Peşin Tutarı", num(r.pesin_tutari) || 0, "text-purple-600"],
                            ["Yıl Hedefi", num(r.yil_hedefi) || 0, "text-blue-600"],
                            ["Gerçekleşen", g, "text-emerald-600"],
                            ["Kalan", kalan, kalan > 0 ? "text-orange-600" : ""],
                            ["Hakediş Adet", rowAdet(r), ""],
                            ["Ortalama Hakediş", rowOrtalama(r), ""],
                          ].map(([l, v, c]) => (
                            <div key={l} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                              <p className="text-[11px] text-muted-foreground">{l}</p>
                              <p className="text-sm mt-0.5">
                                {l === "Hakediş Adet"
                                  ? <span className="tabular-nums font-bold">{v}</span>
                                  : money(v, c)}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* aylik kirilim — kompakt tablo */}
                      <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                          Aylık Kırılım <span className="normal-case text-muted-foreground/70">(bir satıra tıklayarak tutarı düzenle / tahsilatı işaretle)</span>
                        </p>
                        <div className="rounded-lg border border-border/50 overflow-hidden">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 text-[10px] uppercase text-muted-foreground">
                              <tr>
                                <th className="text-left px-2 py-1.5 font-semibold">Ay</th>
                                <th className="text-right px-2 py-1.5 font-semibold">Planlanan</th>
                                <th className="text-right px-2 py-1.5 font-semibold">Tahsil Edilen</th>
                                <th className="text-left px-2 py-1.5 font-semibold">Tarih</th>
                                <th className="px-2 py-1.5 w-6"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                              {MONTHS.map(([k, l]) => {
                                const v = num(r[k]);
                                const t = parseTahsilat(r)[k] || {};
                                const orij = monthPlanOrijinal(r, k);
                                const alindi = !!t.alindi;
                                const collected = alindi ? (num(t.tutar) ?? v ?? 0) : null;
                                const farkli = alindi && collected != null && v != null && collected !== v;
                                return (
                                  <tr key={k}
                                    onClick={() => openTahsilatDialog(r, k, l)}
                                    className={`cursor-pointer hover:bg-muted/40 ${alindi ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}>
                                    <td className="px-2 py-1.5 uppercase text-muted-foreground">{l}</td>
                                    <td className="px-2 py-1.5 text-right tabular-nums">
                                      {v ? tl(v) : "–"}
                                      {orij != null && orij !== v && (
                                        <span className="block text-[10px] text-muted-foreground/70 line-through">orij. {tl(orij)}</span>
                                      )}
                                    </td>
                                    <td className={`px-2 py-1.5 text-right tabular-nums ${alindi ? (farkli ? "text-amber-600 font-semibold" : "text-blue-600 font-medium") : "text-muted-foreground/40"}`}>
                                      {alindi ? (
                                        <span className="inline-flex items-center gap-1 justify-end">
                                          <Check className="w-3 h-3" strokeWidth={3} /> {tl(collected)}
                                        </span>
                                      ) : "–"}
                                    </td>
                                    <td className="px-2 py-1.5 text-muted-foreground whitespace-nowrap">{alindi && t.tarih ? fmtDate(t.tarih) : "–"}</td>
                                    <td className="px-2 py-1.5 text-right"><Pencil className="w-3 h-3 text-muted-foreground/50 inline" /></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {r.aciklama && <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">{r.aciklama}</p>}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hakediş silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription><strong>{deleting?.musteri}</strong> — {deleting?.is_konusu} kaydı kalıcı olarak silinecek.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => deleteMutation.mutate(deleting.id)}>Sil</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Ay tahsilatı */}
      <Dialog open={!!tahsilatEdit} onOpenChange={(o) => !o && setTahsilatEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{tahsilatEdit?.monthLabel} {tahsilatEdit?.year} — Hakediş / Tahsilat</DialogTitle>
          </DialogHeader>
          {tahsilatEdit && (
            <div className="space-y-4 mt-1">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Planlanan Tutar (bu ayın hakedişi)</label>
                <Input className="mt-1" value={tahsilatForm.planlanan}
                  onChange={(e) => setTahsilatForm((f) => ({ ...f, planlanan: e.target.value }))} />
                {tahsilatEdit.orijinal != null && tahsilatEdit.orijinal !== num(tahsilatForm.planlanan) && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Sözleşmeden oluşan orijinal: <span className="line-through">{tl(tahsilatEdit.orijinal)} ₺</span>
                  </p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">Değiştirirsen Yıl Hedefi de ayların toplamına göre güncellenir.</p>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={tahsilatForm.alindi}
                  onCheckedChange={(v) => setTahsilatForm((f) => ({
                    ...f,
                    alindi: !!v,
                    tutar: f.tutar || (v ? f.planlanan : f.tutar),
                  }))}
                />
                <span className="text-sm font-medium">Tahsil Edildi</span>
              </label>
              {tahsilatForm.alindi && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tahsilat Tutarı</label>
                    <Input className="mt-1" value={tahsilatForm.tutar}
                      onChange={(e) => setTahsilatForm((f) => ({ ...f, tutar: e.target.value }))} />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Planlanan {tl(num(tahsilatForm.planlanan) || 0)} ₺ — müşteriden farklı tutar tahsil edildiyse gerçek tutarı yaz.
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Tahsilat Tarihi</label>
                    <Input className="mt-1" type="date" value={tahsilatForm.tarih}
                      onChange={(e) => setTahsilatForm((f) => ({ ...f, tarih: e.target.value }))} />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setTahsilatEdit(null)}>İptal</Button>
                <Button onClick={() => saveTahsilatMutation.mutate()} disabled={saveTahsilatMutation.isPending}>
                  {saveTahsilatMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KV({ k, v, mono }) {
  return (
    <div className="min-w-0">
      <div className="text-[11px] text-muted-foreground">{k}</div>
      <div className={`text-sm font-medium ${mono ? "tabular-nums whitespace-nowrap" : "truncate"}`}>
        {v === "" || v == null ? "–" : v}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

// Bilinen secenekler + serbest metin
function ComboInput({ value, onChange, options }) {
  return (
    <>
      <Input value={value || ""} onChange={(e) => onChange(e.target.value)} list={`opt-${options[0]}`} />
      <datalist id={`opt-${options[0]}`}>
        {options.map((o) => <option key={o} value={o} />)}
      </datalist>
    </>
  );
}
