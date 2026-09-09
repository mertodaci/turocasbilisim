import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { FileUp, Undo2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Beklenen kolonlar: "kod"/"urun_kodu" veya "barkod", "miktar", opsiyonel "birim_fiyat"
function parseSheet(file, cb) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: "binary" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
    const rows = raw.map((r) => {
      const k = {};
      for (const key of Object.keys(r)) k[String(key).trim().toLowerCase()] = r[key];
      return { kod: k["kod"] || k["urun_kodu"] || k["ürün kodu"] || k["stok kodu"] || "", barkod: k["barkod"] || "", miktar: k["miktar"] || k["adet"] || 0, birim_fiyat: k["birim_fiyat"] || k["fiyat"] || k["alis_fiyati"] || "" };
    }).filter((r) => (r.kod || r.barkod) && Number(r.miktar) > 0);
    // Guvenilirlik: kolon adlari beklenenle eslesmezse (veya miktar 0/bos ise)
    // rows bombos donuyordu ve onizleme paneli sessizce hic gorunmuyordu --
    // kullanici dosyanin bozuk oldugunu sanip anlamsizca ugrasiyordu. Bunun
    // yerine cagirana kac ham satir okundugu da bildirilir ki net bir uyari
    // gosterilebilsin.
    cb(rows, raw.length);
  };
  reader.readAsBinaryString(file);
}

export default function StokExcel() {
  const qc = useQueryClient();
  const [depoId, setDepoId] = useState("");
  const [rows, setRows] = useState([]);
  const [dosya, setDosya] = useState("");
  const fileRef = useRef(null);

  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: yuklemeler = [] } = useQuery({ queryKey: ["stok_excel_yuklemeler"], queryFn: () => flowApi.entities.StokExcelYukleme.list("-created_date", 500) });
  const inv = () => qc.invalidateQueries({ queryKey: ["stok_excel_yuklemeler"] });

  const yukleM = useMutation({
    mutationFn: () => flowApi.stok.excelYukle({ depo_id: depoId, dosya_adi: dosya, satirlar: rows }),
    onSuccess: (r) => { inv(); setRows([]); setDosya(""); if (fileRef.current) fileRef.current.value = ""; toast.success(`${r.fis_no} oluşturuldu ve onaylandı — ${r.eslesen} satır, ${r.atlanan} atlandı`); },
    onError: (e) => toast.error(String(e?.message || "Yüklenemedi")),
  });
  const geriM = useMutation({ mutationFn: (id) => flowApi.stok.excelGeriAl(id), onSuccess: () => { inv(); toast.success("Geri alındı"); }, onError: (e) => toast.error(String(e?.message)) });

  return (
    <div className="space-y-5 max-w-4xl">
      <div><h1 className="text-2xl font-bold flex items-center gap-2"><FileUp className="w-6 h-6 text-primary" /> Excel Stok Yükleme</h1>
        <p className="text-sm text-muted-foreground mt-1">Excel'den toplu giriş. Kolonlar: <b>kod</b> veya <b>barkod</b>, <b>miktar</b>, opsiyonel <b>birim_fiyat</b>. Yükleme bir giriş fişi oluşturur ve onaylar; "Geri Al" ile iptal edilir.</p></div>

      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="w-64"><SearchableSelect value={depoId} onChange={setDepoId} options={depolar.map((d) => ({ value: d.id, label: d.ad }))} placeholder="Hedef depo *" /></div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="text-sm" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setDosya(f.name);
            parseSheet(f, (parsed, rawCount) => {
              setRows(parsed);
              if (parsed.length === 0) {
                toast.error(
                  rawCount > 0
                    ? `Dosyada ${rawCount} satır bulundu ama hiçbiri okunamadı. Sütun adlarının "kod"/"urun_kodu"/"barkod" ve "miktar" (0'dan büyük) ile eşleştiğinden emin olun.`
                    : "Dosyada okunacak satır bulunamadı."
                );
              }
            });
          }} />
        </div>
        {rows.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground">{rows.length} satır okundu. Önizleme:</p>
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 sticky top-0"><tr><th className="text-left px-2 py-1.5">Kod</th><th className="text-left px-2 py-1.5">Barkod</th><th className="text-right px-2 py-1.5">Miktar</th><th className="text-right px-2 py-1.5">Birim Fiyat</th></tr></thead>
                <tbody>{rows.slice(0, 200).map((r, i) => <tr key={i} className="border-t"><td className="px-2 py-1">{r.kod}</td><td className="px-2 py-1">{r.barkod}</td><td className="px-2 py-1 text-right">{r.miktar}</td><td className="px-2 py-1 text-right">{r.birim_fiyat}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button disabled={!depoId || yukleM.isPending} onClick={() => yukleM.mutate()}><CheckCircle2 className="w-4 h-4 mr-1.5" /> Yükle ve Onayla</Button>
            </div>
          </>
        )}
      </div>

      <div className="bg-card border rounded-2xl overflow-x-auto">
        <p className="px-4 py-3 text-sm font-semibold border-b">Yükleme Geçmişi</p>
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b"><tr><th className="text-left px-4 py-2 text-muted-foreground">Yükleme No</th><th className="text-left px-4 py-2 text-muted-foreground">Dosya</th><th className="text-left px-4 py-2 text-muted-foreground">Depo</th><th className="text-left px-4 py-2 text-muted-foreground">Fiş</th><th className="text-right px-4 py-2 text-muted-foreground">Satır (eşl./atl.)</th><th className="text-left px-4 py-2 text-muted-foreground">Durum</th><th className="px-4 py-2"></th></tr></thead>
          <tbody>
            {yuklemeler.filter((y) => y.is_deleted !== 1).map((y) => (
              <tr key={y.id} className="border-b last:border-0">
                <td className="px-4 py-1.5 font-medium">{y.yukleme_no}</td>
                <td className="px-4 py-1.5 text-muted-foreground">{y.dosya_adi || "—"}</td>
                <td className="px-4 py-1.5 text-muted-foreground">{y.depo_adi}</td>
                <td className="px-4 py-1.5 text-muted-foreground">{y.olusan_fis_no || "—"}</td>
                <td className="px-4 py-1.5 text-right text-muted-foreground">{y.satir_yeni} / {y.satir_atlanan}</td>
                <td className="px-4 py-1.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${y.durum === "geri_alindi" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-700"}`}>{y.durum === "geri_alindi" ? "Geri Alındı" : "Aktif"}</span></td>
                <td className="px-4 py-1.5 text-right">{y.durum === "aktif" && <Button variant="ghost" size="sm" className="h-7 text-destructive" onClick={() => { if (confirm("Yükleme geri alınsın mı? (giriş fişi iptal edilir)")) geriM.mutate(y.id); }}><Undo2 className="w-3.5 h-3.5 mr-1" /> Geri Al</Button>}</td>
              </tr>
            ))}
            {!yuklemeler.length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Yükleme yok.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
