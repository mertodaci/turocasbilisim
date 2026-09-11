import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, FileText, Check, X, Pencil, Eye, Printer, Undo2, Plus } from "lucide-react";
import { fisBelgeYazdir } from "@/lib/stokBelge";
import { toast } from "sonner";

const TIP_BADGE = {
  giris: { label: "Giriş", cls: "bg-emerald-100 text-emerald-700", Icon: ArrowDownToLine },
  cikis: { label: "Çıkış", cls: "bg-red-100 text-red-700", Icon: ArrowUpFromLine },
  transfer: { label: "Transfer", cls: "bg-blue-100 text-blue-700", Icon: ArrowLeftRight },
  iade: { label: "Ted. İade", cls: "bg-orange-100 text-orange-700", Icon: Undo2 },
  sayim: { label: "Sayım", cls: "bg-amber-100 text-amber-700", Icon: FileText },
  talep: { label: "Talep", cls: "bg-purple-100 text-purple-700", Icon: FileText },
};
const DURUM_BADGE = {
  taslak: "bg-slate-100 text-slate-600",
  onay_bekliyor: "bg-amber-100 text-amber-700",
  onayli: "bg-emerald-100 text-emerald-700",
  iptal: "bg-red-100 text-red-600 line-through",
};
const DURUM_LBL = { taslak: "Taslak", onay_bekliyor: "Onay Bekliyor", onayli: "Onaylı", iptal: "İptal" };
const SEBEP_LBL = {
  satin_alma: "Satın Alma", sayim_fazlasi: "Sayım Fazlası", acilis_devir: "Açılış Bakiyesi / Devir",
  sarf_kullanim: "Sarf / Kullanım", numune_test: "Numune / Test", hurdaya_ayirma: "Hurdaya Ayırma",
  kayip_calinti: "Kayıp / Çalıntı", sayim_eksigi: "Sayım Eksiği",
  arizali_urun: "Arızalı Ürün", yanlis_urun: "Yanlış Ürün Gönderildi", fazla_siparis: "Fazla Sipariş", diger: "Diğer",
};

export default function StokFisListesi() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("hepsi");
  const [q, setQ] = useState("");
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [detay, setDetay] = useState(null);
  const [turSecici, setTurSecici] = useState(false);

  const { data: fisler = [], isLoading } = useQuery({
    queryKey: ["stok_fisler"],
    queryFn: () => flowApi.entities.StokFis.list("-created_date", 3000),
  });
  const { data: ozet } = useQuery({ queryKey: ["stok_fis_ozet"], queryFn: () => flowApi.stok.fisOzet() });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["stok_fisler"] });
    queryClient.invalidateQueries({ queryKey: ["stok_fis_ozet"] });
  };
  const onaylaM = useMutation({
    mutationFn: (id) => flowApi.stok.onayla(id),
    onSuccess: (f) => { invalidate(); toast.success(`${f.fis_no} onaylandı — stok güncellendi`); },
    onError: (e) => toast.error(String(e?.message || "Onaylanamadı")),
  });
  const iptalM = useMutation({
    mutationFn: (id) => flowApi.stok.iptal(id),
    onSuccess: (f) => { invalidate(); toast.success(`${f.fis_no} iptal edildi`); },
    onError: (e) => toast.error(String(e?.message || "İptal edilemedi")),
  });
  const taslagaM = useMutation({
    mutationFn: (id) => flowApi.stok.fisTaslagaAl(id),
    onSuccess: () => { invalidate(); toast.success("Fiş taslağa alındı — düzenleyip tekrar onaya gönderin"); },
    onError: (e) => toast.error(String(e?.message || "İşlenemedi")),
  });

  const filtered = useMemo(() => fisler.filter((f) => {
    if (f.is_deleted === 1) return false;
    if (tab !== "hepsi" && f.tip !== tab) return false;
    if (t1 && (!f.tarih || f.tarih < t1)) return false;
    if (t2 && (!f.tarih || f.tarih > t2)) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!`${f.fis_no} ${f.cari_adi} ${f.kaynak_depo_adi} ${f.hedef_depo_adi} ${f.hedef_saha_adi} ${f.aciklama}`.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [fisler, tab, q, t1, t2]);

  const openDetay = async (f) => {
    try { setDetay(await flowApi.stok.getFis(f.id)); }
    catch (e) { toast.error("Detay açılamadı: " + (e?.message || "hata")); }
  };
  const yazdir = async (f, belgeTuru) => {
    try { fisBelgeYazdir(await flowApi.stok.getFis(f.id), { belgeTuru }); }
    catch (e) { toast.error("Belge açılamadı: " + (e?.message || "hata")); }
  };
  const duzenleYol = (f) => `/stok/${f.tip === "giris" ? "giris" : f.tip === "cikis" ? "cikis" : f.tip === "iade" ? "iade" : "transfer"}?id=${f.id}`;

  const k = ozet || {};

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Stok Fiş Listesi</h1>
          <p className="text-sm text-muted-foreground mt-1">Giriş, çıkış ve transfer fişleri. Stok hareketi yalnız <b>onaylı</b> fişten oluşur.</p>
        </div>
        <Button onClick={() => setTurSecici(true)}><Plus className="w-4 h-4 mr-1.5" /> Yeni Fiş</Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {[
          ["Toplam", k.toplam], ["Giriş", k.giris], ["Çıkış", k.cikis], ["Transfer", k.transfer], ["Ted. İade", k.iade],
          ["Taslak", k.taslak], ["Onay Bekleyen", k.onay_bekliyor], ["Onaylı", k.onayli], ["İptal", k.iptal],
        ].map(([lbl, v]) => (
          <div key={lbl} className="bg-card border rounded-xl p-3">
            <p className="text-[11px] text-muted-foreground">{lbl}</p>
            <p className="text-xl font-bold">{v ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {["hepsi", "giris", "cikis", "transfer", "iade"].map((t) => (
          <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t === "hepsi" ? "Tümü" : TIP_BADGE[t].label}
          </Button>
        ))}
        <div className="flex items-center gap-1.5 ml-auto">
          <Input type="date" className="w-[150px]" value={t1} onChange={(e) => setT1(e.target.value)} title="Başlangıç tarihi" />
          <span className="text-muted-foreground text-sm">–</span>
          <Input type="date" className="w-[150px]" value={t2} onChange={(e) => setT2(e.target.value)} title="Bitiş tarihi" />
        </div>
        <Input className="max-w-xs" placeholder="Fiş no / firma / depo / açıklama ara" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="bg-card rounded-2xl border shadow-sm overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground">Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2"><FileText className="w-8 h-8 opacity-40" /><p>Fiş yok.</p></div>
        ) : (
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Fiş No</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tip</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Tarih</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Depo / Hedef</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Satır</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Miktar</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f, i) => {
                const tb = TIP_BADGE[f.tip] || TIP_BADGE.giris;
                const hedef = f.hedef_saha_adi || f.hedef_depo_adi || "—";
                const depoGosterim = f.tip === "giris" ? hedef
                  : f.tip === "cikis" ? (f.hedef_saha_adi ? `${f.kaynak_depo_adi || "—"} → ${f.hedef_saha_adi}` : `${f.kaynak_depo_adi || "—"} (sarf)`)
                  : f.tip === "iade" ? `${f.kaynak_depo_adi || "—"} → ${f.cari_adi || "tedarikçi"}`
                  : `${f.kaynak_depo_adi || "—"} → ${f.hedef_depo_adi || "—"}`;
                return (
                  <tr key={f.id} className={`border-b last:border-0 hover:bg-muted/20 ${i % 2 ? "bg-muted/10" : ""}`}>
                    <td className="px-4 py-3 font-medium">{f.fis_no || "—"}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${tb.cls}`}><tb.Icon className="w-3 h-3" />{tb.label}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{f.tarih || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{depoGosterim}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.satir_sayisi || 0}</td>
                    <td className="px-4 py-3 text-muted-foreground">{f.toplam_miktar || 0}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${DURUM_BADGE[f.durum] || ""}`}>{DURUM_LBL[f.durum] || f.durum}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Detay" onClick={() => openDetay(f)}><Eye className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Belge Çıktısı" onClick={() => yazdir(f, "fis")}><Printer className="w-3.5 h-3.5" /></Button>
                        {["taslak", "onay_bekliyor"].includes(f.durum) && (
                          <>
                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Düzenle" onClick={() => navigate(duzenleYol(f))}><Pencil className="w-3.5 h-3.5" /></Button>
                            {f.durum === "onay_bekliyor" && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" title="Taslağa Al"
                                disabled={taslagaM.isPending} onClick={() => taslagaM.mutate(f.id)}><Undo2 className="w-3.5 h-3.5" /></Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" title="Onayla"
                              disabled={onaylaM.isPending} onClick={() => onaylaM.mutate(f.id)}><Check className="w-3.5 h-3.5" /></Button>
                          </>
                        )}
                        {f.durum !== "iptal" && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="İptal"
                            disabled={iptalM.isPending} onClick={() => { if (confirm(f.durum === "onayli" ? "Onaylı fiş iptal edilecek — stok hareketleri geri alınır. Devam?" : "Fiş iptal edilsin mi?")) iptalM.mutate(f.id); }}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={turSecici} onOpenChange={setTurSecici}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>İşlem türü seçiniz</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button variant="outline" className="h-16 flex-col gap-1 text-emerald-700" onClick={() => navigate("/stok/giris")}>
              <ArrowDownToLine className="w-5 h-5" /> Giriş
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1 text-red-700" onClick={() => navigate("/stok/cikis")}>
              <ArrowUpFromLine className="w-5 h-5" /> Çıkış
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1 text-blue-700" onClick={() => navigate("/stok/transfer")}>
              <ArrowLeftRight className="w-5 h-5" /> Depolar Arası Transfer
            </Button>
            <Button variant="outline" className="h-16 flex-col gap-1 text-orange-700" onClick={() => navigate("/stok/iade")}>
              <Undo2 className="w-5 h-5" /> Tedarikçiye İade
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detay} onOpenChange={(v) => !v && setDetay(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{detay?.fis_no} — {TIP_BADGE[detay?.tip]?.label} <span className={`ml-2 text-xs px-2 py-0.5 rounded ${DURUM_BADGE[detay?.durum] || ""}`}>{DURUM_LBL[detay?.durum]}</span></DialogTitle></DialogHeader>
          {detay && (
            <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => fisBelgeYazdir(detay, { belgeTuru: "fis" })}><Printer className="w-3.5 h-3.5 mr-1.5" /> Belge Çıktısı</Button>
                {(detay.tip === "cikis" || detay.tip === "transfer") && (
                  <Button size="sm" variant="outline" onClick={() => fisBelgeYazdir(detay, { belgeTuru: "irsaliye" })}><Printer className="w-3.5 h-3.5 mr-1.5" /> Sevk İrsaliyesi</Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <div>Tarih: <b className="text-foreground">{detay.tarih}</b></div>
                <div>Oluşturan: <b className="text-foreground">{detay.olusturan || "—"}</b></div>
                {detay.cari_adi && <div>Firma: <b className="text-foreground">{detay.cari_adi}</b></div>}
                {detay.kaynak_depo_adi && <div>Kaynak: <b className="text-foreground">{detay.kaynak_depo_adi}</b></div>}
                {(detay.hedef_depo_adi || detay.hedef_saha_adi) && <div>Hedef: <b className="text-foreground">{detay.hedef_saha_adi || detay.hedef_depo_adi}</b></div>}
                {detay.onaylayan && <div>Onaylayan: <b className="text-foreground">{detay.onaylayan}</b></div>}
                {detay.sebep_kodu && <div>Sebep: <b className="text-foreground">{SEBEP_LBL[detay.sebep_kodu] || detay.sebep_kodu}</b></div>}
                {(detay.fatura_no || detay.irsaliye_no || detay.belge_no) && <div>Belge: <b className="text-foreground">{[detay.fatura_no, detay.irsaliye_no, detay.belge_no].filter(Boolean).join(" / ")}</b></div>}
              </div>
              {detay.aciklama && <p className="text-muted-foreground">Açıklama: {detay.aciklama}</p>}
              <table className="w-full text-xs border rounded-lg overflow-hidden">
                <thead className="bg-muted/40"><tr>
                  <th className="text-left px-2 py-1.5">Ürün</th><th className="text-left px-2 py-1.5">Raf</th>
                  <th className="text-left px-2 py-1.5">Birim</th><th className="text-right px-2 py-1.5">Miktar</th>
                  <th className="text-right px-2 py-1.5">Ana Birim</th><th className="text-right px-2 py-1.5">Fiyat</th>
                </tr></thead>
                <tbody>
                  {(detay.satirlar || []).map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="px-2 py-1.5">{s.urun_adi}{s.lot_no ? ` · Lot ${s.lot_no}` : ""}{s.seri_no ? ` · SN ${s.seri_no}` : ""}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{s.hedef_raf_adi || s.kaynak_raf_adi || "GENEL RAF"}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{s.birim} ×{s.carpan}</td>
                      <td className="px-2 py-1.5 text-right">{s.miktar}</td>
                      <td className="px-2 py-1.5 text-right">{s.miktar_ana_birim}</td>
                      <td className="px-2 py-1.5 text-right">{s.birim_fiyat}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(detay.hareketler || []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Oluşan stok hareketleri</p>
                  <table className="w-full text-xs border rounded-lg overflow-hidden">
                    <thead className="bg-muted/40"><tr><th className="text-left px-2 py-1.5">Ürün</th><th className="text-left px-2 py-1.5">Depo</th><th className="text-left px-2 py-1.5">Tip</th><th className="text-right px-2 py-1.5">Miktar</th></tr></thead>
                    <tbody>
                      {detay.hareketler.map((h) => (
                        <tr key={h.id} className="border-t">
                          <td className="px-2 py-1.5">{h.urun_adi}</td>
                          <td className="px-2 py-1.5 text-muted-foreground">{h.depo_adi}{h.raf_adi ? ` / ${h.raf_adi}` : ""}</td>
                          <td className={`px-2 py-1.5 ${h.tip === "giris" ? "text-emerald-600" : "text-red-600"}`}>{h.tip === "giris" ? "Giriş" : "Çıkış"}</td>
                          <td className="px-2 py-1.5 text-right">{h.tip === "giris" ? "+" : "−"}{h.miktar}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
