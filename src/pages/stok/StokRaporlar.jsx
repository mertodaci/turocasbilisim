import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { BarChart3, Download, Boxes, Warehouse, Rows3, AlertTriangle } from "lucide-react";

const TABS = [
  { id: "merkez", label: "Merkez" },
  { id: "durum", label: "Stok Durum" },
  { id: "ekstre", label: "Ürün Ekstresi" },
  { id: "hareket", label: "Hareket Raporu" },
  { id: "raf", label: "Raf Doluluk" },
  { id: "degerleme", label: "Stok Değerleme" },
];

const xlsx = (rows, name) => {
  if (!rows?.length) return;
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Rapor");
  XLSX.writeFile(wb, `${name}-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

export default function StokRaporlar() {
  const [tab, setTab] = useState("merkez");
  const [f, setF] = useState({ depo_id: "", urun_id: "", mode: "", q: "", t1: "", t2: "", tip: "hepsi" });

  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });

  const merkez = useQuery({ queryKey: ["rp_merkez"], queryFn: () => flowApi.stok.rapor("merkez"), enabled: tab === "merkez" });
  const durum = useQuery({ queryKey: ["rp_durum", f.depo_id, f.urun_id, f.mode, f.q], queryFn: () => flowApi.stok.rapor("durum", { depo_id: f.depo_id, urun_id: f.urun_id, mode: f.mode, q: f.q }), enabled: tab === "durum" });
  const ekstre = useQuery({ queryKey: ["rp_ekstre", f.urun_id, f.depo_id, f.t1, f.t2], queryFn: () => flowApi.stok.rapor("ekstre", { urun_id: f.urun_id, depo_id: f.depo_id, t1: f.t1, t2: f.t2 }), enabled: tab === "ekstre" && !!f.urun_id });
  const hareket = useQuery({ queryKey: ["rp_hareket", f.depo_id, f.tip, f.t1, f.t2], queryFn: () => flowApi.stok.rapor("hareket", { depo_id: f.depo_id, tip: f.tip, t1: f.t1, t2: f.t2 }), enabled: tab === "hareket" });
  const raf = useQuery({ queryKey: ["rp_raf", f.depo_id], queryFn: () => flowApi.stok.rapor("raf-doluluk", { depo_id: f.depo_id }), enabled: tab === "raf" });
  const degerleme = useQuery({ queryKey: ["rp_deger", f.depo_id, f.urun_id], queryFn: () => flowApi.stok.rapor("degerleme", { depo_id: f.depo_id, urun_id: f.urun_id }), enabled: tab === "degerleme" });

  const depoOpts = [{ value: "", label: "Tüm Depolar" }, ...depolar.map((d) => ({ value: d.id, label: d.ad }))];
  const urunOpts = [{ value: "", label: "Tüm Ürünler" }, ...urunler.map((u) => ({ value: u.id, label: u.ad }))];
  const Th = ({ children, r }) => <th className={`px-3 py-2 font-semibold text-muted-foreground ${r ? "text-right" : "text-left"}`}>{children}</th>;
  const Td = ({ children, r, b }) => <td className={`px-3 py-1.5 ${r ? "text-right" : ""} ${b ? "font-semibold" : "text-muted-foreground"}`}>{children}</td>;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="w-6 h-6 text-primary" /> Stok Raporları</h1>
        <p className="text-sm text-muted-foreground mt-1">Stok durum, ürün ekstresi, hareket, raf doluluk ve değerleme raporları.</p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "merkez" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[[Boxes, "Aktif Ürün", merkez.data?.aktif_urun], [Warehouse, "Aktif Depo", merkez.data?.aktif_depo], [Rows3, "Aktif Raf", merkez.data?.aktif_raf],
              [AlertTriangle, "Stok Biten", merkez.data?.stok_biten], [AlertTriangle, "Kritik (≤10)", merkez.data?.kritik]].map(([Ic, l, v]) => (
              <div key={l} className="bg-card border rounded-xl p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Ic className="w-4 h-4" />{l}</div><p className="text-2xl font-bold mt-1">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-card border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Depo Yoğunluğu</p>
              {(merkez.data?.depo_yogunluk || []).map((d) => <div key={d.depo_adi} className="flex justify-between text-sm py-1 border-b last:border-0"><span>{d.depo_adi}</span><span className="text-muted-foreground">{d.m}</span></div>)}
            </div>
            <div className="bg-card border rounded-xl p-4">
              <p className="text-sm font-semibold mb-2">Son Hareketler</p>
              {(merkez.data?.son_hareket || []).map((h, i) => (
                <div key={i} className="flex justify-between text-xs py-1 border-b last:border-0">
                  <span>{h.urun_adi} <span className="text-muted-foreground">· {h.depo_adi}</span></span>
                  <span className={h.tip === "giris" ? "text-emerald-600" : "text-red-600"}>{h.tip === "giris" ? "+" : "−"}{h.miktar}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "durum" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Input className="max-w-xs" placeholder="Ürün / depo / raf / grup ara" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
            <div className="w-52"><SearchableSelect value={f.depo_id} onChange={(v) => setF({ ...f, depo_id: v })} options={depoOpts} placeholder="Depo" /></div>
            <Select value={f.mode || "hepsi"} onValueChange={(v) => setF({ ...f, mode: v === "hepsi" ? "" : v })}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="hepsi">Tümü</SelectItem><SelectItem value="zero">Stok 0</SelectItem><SelectItem value="critical">Kritik</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" onClick={() => xlsx(durum.data?.rows, "stok-durum")}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-w-2xl">
            <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Giren</p><p className="text-lg font-bold">{durum.data?.toplam?.giren ?? 0}</p></div>
            <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Çıkan</p><p className="text-lg font-bold">{durum.data?.toplam?.cikan ?? 0}</p></div>
            <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Mevcut</p><p className="text-lg font-bold">{durum.data?.toplam?.mevcut ?? 0}</p></div>
            <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Rezerve</p><p className="text-lg font-bold text-amber-600">{durum.data?.toplam?.rezerve ?? 0}</p></div>
            <div className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">Kullanılabilir</p><p className="text-lg font-bold text-emerald-600">{durum.data?.toplam?.kullanilabilir ?? 0}</p></div>
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Depo</Th><Th>Raf</Th><Th>Ürün Kodu</Th><Th>Ürün Adı</Th><Th>Grup</Th><Th r>Giren</Th><Th r>Çıkan</Th><Th r>Mevcut</Th><Th r>Rezerve</Th><Th r>Kull.</Th><Th>Birim</Th></tr></thead>
              <tbody>
                {(durum.data?.rows || []).map((r, i) => (
                  <tr key={i} className="border-b last:border-0"><Td>{r.depo_adi}</Td><Td>{r.raf_adi || "GENEL RAF"}</Td><Td>{r.urun_kodu}</Td><Td b>{r.urun_adi}</Td><Td>{r.grup}</Td><Td r>{r.giren}</Td><Td r>{r.cikan}</Td><Td r b>{r.mevcut}</Td><Td r>{r.rezerve ? <span className="text-amber-600">{r.rezerve}</span> : "—"}</Td><Td r>{r.kullanilabilir ?? r.mevcut}</Td><Td>{r.birim}</Td></tr>
                ))}
                {durum.isLoading && <tr><td colSpan={11} className="text-center py-6 text-muted-foreground">Yükleniyor...</td></tr>}
                {!durum.isLoading && !(durum.data?.rows || []).length && <tr><td colSpan={11} className="text-center py-6 text-muted-foreground">Kayıt yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "ekstre" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-64"><SearchableSelect value={f.urun_id} onChange={(v) => setF({ ...f, urun_id: v })} options={urunOpts} placeholder="Ürün seçin *" /></div>
            <div className="w-52"><SearchableSelect value={f.depo_id} onChange={(v) => setF({ ...f, depo_id: v })} options={depoOpts} placeholder="Depo" /></div>
            <Input type="date" className="w-40" value={f.t1} onChange={(e) => setF({ ...f, t1: e.target.value })} />
            <Input type="date" className="w-40" value={f.t2} onChange={(e) => setF({ ...f, t2: e.target.value })} />
            <Button variant="outline" onClick={() => xlsx(ekstre.data?.rows, "urun-ekstresi")}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          </div>
          {!f.urun_id ? <p className="text-sm text-muted-foreground">Ekstre için ürün seçin.</p> : (
            <div className="bg-card border rounded-2xl overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead className="bg-muted/40 border-b"><tr><Th>Tarih</Th><Th>Fiş</Th><Th>Tip</Th><Th>Depo / Raf</Th><Th r>Giriş</Th><Th r>Çıkış</Th><Th r>Bakiye</Th></tr></thead>
                <tbody>
                  {(ekstre.data?.rows || []).map((r, i) => (
                    <tr key={i} className="border-b last:border-0"><Td>{r.tarih}</Td><Td>{r.fis_no}</Td><Td>{r.tip}</Td><Td>{r.depo}{r.raf ? ` / ${r.raf}` : ""}</Td><Td r>{r.giris || ""}</Td><Td r>{r.cikis || ""}</Td><Td r b>{r.bakiye}</Td></tr>
                  ))}
                  {!(ekstre.data?.rows || []).length && <tr><td colSpan={7} className="text-center py-6 text-muted-foreground">Hareket yok.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "hareket" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-52"><SearchableSelect value={f.depo_id} onChange={(v) => setF({ ...f, depo_id: v })} options={depoOpts} placeholder="Depo" /></div>
            <Select value={f.tip} onValueChange={(v) => setF({ ...f, tip: v })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="hepsi">Tümü</SelectItem><SelectItem value="giris">Giriş</SelectItem><SelectItem value="cikis">Çıkış</SelectItem><SelectItem value="transfer">Transfer</SelectItem></SelectContent>
            </Select>
            <Input type="date" className="w-40" value={f.t1} onChange={(e) => setF({ ...f, t1: e.target.value })} />
            <Input type="date" className="w-40" value={f.t2} onChange={(e) => setF({ ...f, t2: e.target.value })} />
            <Button variant="outline" onClick={() => xlsx(hareket.data?.rows, "hareket-raporu")}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Fiş No</Th><Th>Tip</Th><Th>Tarih</Th><Th>Firma</Th><Th>Depo / Hedef</Th><Th r>Satır</Th><Th r>Miktar</Th><Th>Kullanıcı</Th></tr></thead>
              <tbody>
                {(hareket.data?.rows || []).map((r, i) => (
                  <tr key={i} className="border-b last:border-0"><Td b>{r.fis_no}</Td><Td>{r.tip}</Td><Td>{r.tarih}</Td><Td>{r.cari || "—"}</Td><Td>{r.depo}</Td><Td r>{r.satir}</Td><Td r>{r.miktar}</Td><Td>{r.kullanici}</Td></tr>
                ))}
                {!(hareket.data?.rows || []).length && <tr><td colSpan={8} className="text-center py-6 text-muted-foreground">Hareket yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "raf" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="w-52"><SearchableSelect value={f.depo_id} onChange={(v) => setF({ ...f, depo_id: v })} options={depoOpts} placeholder="Depo" /></div>
          </div>
          <div className="grid grid-cols-4 gap-3 max-w-lg">
            {[["Toplam Raf", raf.data?.ozet?.toplam], ["Dolu", raf.data?.ozet?.dolu], ["Boş", raf.data?.ozet?.bos], ["Kritik (≥%85)", raf.data?.ozet?.kritik]].map(([l, v]) => (
              <div key={l} className="bg-card border rounded-xl p-3"><p className="text-[11px] text-muted-foreground">{l}</p><p className="text-lg font-bold">{v ?? 0}</p></div>
            ))}
          </div>
          <div className="space-y-3">
            {Object.entries(raf.data?.gruplu || {}).map(([depo, raflar]) => (
              <div key={depo} className="bg-card border rounded-xl p-3">
                <p className="text-sm font-semibold mb-2">{depo}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {raflar.map((r) => (
                    <div key={r.id} className="border rounded-lg p-2 text-xs">
                      <p className="font-medium">{r.kod} {r.ad}</p>
                      <p className="text-muted-foreground">{r.mevcut} birim · {r.urun_sayisi} ürün</p>
                      {r.doluluk != null && <div className="h-1.5 bg-muted rounded mt-1"><div className={`h-full rounded ${r.doluluk >= 85 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(r.doluluk, 100)}%` }} /></div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {!Object.keys(raf.data?.gruplu || {}).length && <p className="text-sm text-muted-foreground">Raf yok.</p>}
          </div>
        </div>
      )}

      {tab === "degerleme" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="w-52"><SearchableSelect value={f.depo_id} onChange={(v) => setF({ ...f, depo_id: v })} options={depoOpts} placeholder="Depo" /></div>
            <div className="w-64"><SearchableSelect value={f.urun_id} onChange={(v) => setF({ ...f, urun_id: v })} options={urunOpts} placeholder="Ürün" /></div>
            <div className="ml-auto bg-primary/10 text-primary rounded-lg px-4 py-2 text-sm font-semibold">Toplam Değer: {(degerleme.data?.toplam_deger ?? 0).toLocaleString("tr-TR")} ₺</div>
            <Button variant="outline" onClick={() => xlsx(degerleme.data?.rows, "stok-degerleme")}><Download className="w-4 h-4 mr-1.5" /> Excel</Button>
          </div>
          <div className="bg-card border rounded-2xl overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-muted/40 border-b"><tr><Th>Ürün</Th><Th>Depo</Th><Th r>Miktar</Th><Th r>Ort. Maliyet</Th><Th r>Değer</Th></tr></thead>
              <tbody>
                {(degerleme.data?.rows || []).map((r, i) => (
                  <tr key={i} className="border-b last:border-0"><Td b>{r.urun_adi}</Td><Td>{r.depo_adi}</Td><Td r>{r.miktar}</Td><Td r>{(r.ort_maliyet ?? 0).toFixed(2)}</Td><Td r b>{(r.deger ?? 0).toFixed(2)}</Td></tr>
                ))}
                {!(degerleme.data?.rows || []).length && <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">Değerlenecek stok yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
