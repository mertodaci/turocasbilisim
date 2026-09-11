import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useUrunEkBarkodMap } from "@/hooks/useUrunEkBarkod";
import { SEBEP_LISTESI } from "@/lib/stokSebepleri";
import { Plus, Trash2, ArrowDownToLine, ArrowUpFromLine, ArrowLeftRight, ListChecks, Undo2 } from "lucide-react";
import { toast } from "sonner";

const TIP_CFG = {
  giris: { baslik: "Stok Giriş Fişi", icon: ArrowDownToLine, renk: "text-emerald-600", aciklama: "Satın alma, başlangıç veya sayım fazlası girişleri. Hedef depo/raf seçilir; parti ve raf ömrü bilgisi FIFO'ya kaydedilir." },
  cikis: { baslik: "Stok Çıkış Fişi", icon: ArrowUpFromLine, renk: "text-red-600", aciklama: "Kaynak depodan sarf / teslim çıkışı. İsteğe bağlı hedef saha/proje seçilebilir. Depo→depo taşıma için Depo Transfer fişi kullanın. Onaylama anında stok yeterlilik kontrol edilir." },
  transfer: { baslik: "Depo Transfer Fişi", icon: ArrowLeftRight, renk: "text-blue-600", aciklama: "Depo/araç/raf arası net transfer. Lot, maliyet ve tarihler hedefe aynen taşınır." },
  iade: { baslik: "Tedarikçiye İade Fişi", icon: Undo2, renk: "text-orange-600", aciklama: "Hatalı / fazla / arızalı malın tedarikçiye geri gönderilmesi. Kaynak depodan FIFO ile düşer, cari ekstreye alacak yazılır." },
};

const bosSatir = () => ({
  urun_id: "", urun_adi: "", urun_kodu: "", barkod: "", birim: "", carpan: 1, miktar: 1, birim_fiyat: 0,
  kaynak_raf_id: "", hedef_raf_id: "", icerik_aciklamasi: "", seri_no: "",
  lot_no: "", uretim_tarihi: "", raf_omru_ay: "", kontrol_tarihi: "", skt: "", raf_omru_durumu: "Takip Edilecek",
});

export default function FisForm({ tip }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get("id");
  const cfg = TIP_CFG[tip];
  const Icon = cfg.icon;
  const bugun = new Date().toISOString().slice(0, 10);

  const [header, setHeader] = useState({
    tarih: bugun, cari_id: "", kaynak_depo_id: "", hedef_depo_id: "", hedef_saha_id: "",
    fatura_no: "", irsaliye_no: "", belge_no: "", aciklama: "",
    sebep_kodu: SEBEP_LISTESI[tip]?.[0]?.value || "",
    teslim_eden: "", teslim_alan: "", gonderim_adresi: "",
  });
  const [lines, setLines] = useState([bosSatir()]);
  const [durum, setDurum] = useState("taslak");
  const [saving, setSaving] = useState(false);
  const [depoKullanilabilir, setDepoKullanilabilir] = useState({}); // { [urun_id]: miktar }
  const [depoFifoMaliyet, setDepoFifoMaliyet] = useState({}); // { [urun_id]: en eski açık partinin alış maliyeti }

  const { data: urunler = [] } = useQuery({ queryKey: ["stok_urunler-min"], queryFn: () => flowApi.entities.StokUrun.list("ad", 5000) });
  const ekBarkodMap = useUrunEkBarkodMap();
  const { data: depolar = [] } = useQuery({ queryKey: ["stok_depolar"], queryFn: () => flowApi.entities.StokDepo.list("ad", 2000) });
  const { data: raflar = [] } = useQuery({ queryKey: ["stok_raflar"], queryFn: () => flowApi.entities.StokRaf.list("depo_adi", 8000) });
  const { data: sahalar = [] } = useQuery({ queryKey: ["stok_sahalar"], queryFn: () => flowApi.entities.StokSaha.list("ad", 5000) });
  const { data: cariler = [] } = useQuery({ queryKey: ["customers-sup"], queryFn: () => flowApi.entities.Customer.list("company_name", 5000) });

  useEffect(() => {
    if (!editId) return;
    flowApi.stok.getFis(editId).then((f) => {
      if (f.tip !== tip) { navigate(`/stok/${f.tip === "giris" ? "giris" : f.tip === "cikis" ? "cikis" : f.tip === "iade" ? "iade" : "transfer"}?id=${editId}`); return; }
      if (!["taslak", "onay_bekliyor"].includes(f.durum)) { toast.error("Bu fiş düzenlenemez (durum: " + f.durum + ")"); navigate("/stok/fisler"); return; }
      setHeader({
        tarih: f.tarih || bugun, cari_id: f.cari_id || "", kaynak_depo_id: f.kaynak_depo_id || "",
        hedef_depo_id: f.hedef_depo_id || "", hedef_saha_id: f.hedef_saha_id || "",
        fatura_no: f.fatura_no || "", irsaliye_no: f.irsaliye_no || "", belge_no: f.belge_no || "",
        aciklama: f.aciklama || "", sebep_kodu: f.sebep_kodu || SEBEP_LISTESI[tip]?.[0]?.value || "",
        teslim_eden: f.teslim_eden || "", teslim_alan: f.teslim_alan || "",
        gonderim_adresi: f.gonderim_adresi || "",
      });
      setLines((f.satirlar || []).map((s) => ({
        urun_id: s.urun_id || "", urun_adi: s.urun_adi || "", urun_kodu: s.urun_kodu || "", barkod: s.barkod || "",
        birim: s.birim || "", carpan: s.carpan || 1, miktar: s.miktar || 0, birim_fiyat: s.birim_fiyat || 0,
        kaynak_raf_id: s.kaynak_raf_id || "", hedef_raf_id: s.hedef_raf_id || "", icerik_aciklamasi: s.icerik_aciklamasi || "", seri_no: s.seri_no || "",
        lot_no: s.lot_no || "", uretim_tarihi: s.uretim_tarihi || "", raf_omru_ay: s.raf_omru_ay ?? "",
        kontrol_tarihi: s.kontrol_tarihi || "", skt: s.skt || "", raf_omru_durumu: s.raf_omru_durumu || "Takip Edilecek",
      })));
      setDurum(f.durum);
    }).catch((e) => toast.error("Fiş açılamadı: " + (e?.message || "hata")));
  }, [editId]); // eslint-disable-line

  // Çıkış/Transfer/İade'de kaynak depo seçilince, o depodaki tüm ürünlerin
  // kullanılabilir miktarı + en eski açık partinin gerçek maliyeti tek seferde çekilir.
  useEffect(() => {
    if (tip === "giris" || !header.kaynak_depo_id) { setDepoKullanilabilir({}); setDepoFifoMaliyet({}); return; }
    let iptal = false;
    flowApi.stok.rapor("durum", { depo_id: header.kaynak_depo_id }).then((r) => {
      if (iptal) return;
      const m = {};
      (r?.rows || []).forEach((row) => { m[row.urun_id] = (m[row.urun_id] || 0) + (row.kullanilabilir || 0); });
      setDepoKullanilabilir(m);
    }).catch(() => {});
    flowApi.stok.partiler({ depo_id: header.kaynak_depo_id, durum: "acik" }).then((rows) => {
      if (iptal) return;
      const m = {};
      (rows || []).forEach((p) => { if (!(p.urun_id in m)) m[p.urun_id] = p.alis_maliyeti; }); // liste zaten FIFO sıralı, ilk görülen = en eski
      setDepoFifoMaliyet(m);
    }).catch(() => {});
    return () => { iptal = true; };
  }, [tip, header.kaynak_depo_id]);

  const depoAdi = (id) => depolar.find((d) => d.id === id)?.ad || "";
  const urunById = (id) => urunler.find((u) => u.id === id);
  const isSerili = (id) => { const u = urunById(id); return u?.seri_no_takip === 1 || u?.seri_no_takip === true; };
  // Demirbaş, Çıkış fişine giremez — kişiye/yere teslim edilecekse Zimmet kullanılmalı.
  // Tek istisna: sebep "Hurdaya Ayırma" / "Kayıp-Çalıntı" ise demirbaş da seçilebilir
  // (backend ayrıca o demirbaşın zimmetsiz — önce İade Alınmış — olmasını zorunlu kılar).
  // Giriş/Transfer/İade'de demirbaş dahil tüm ürünler seçilebilir.
  const hurdaIstisnasi = tip === "cikis" && ["hurdaya_ayirma", "kayip_calinti"].includes(header.sebep_kodu);
  const urunlerForTip = useMemo(
    () => (tip === "cikis" && !hurdaIstisnasi ? urunler.filter((u) => u.urun_tipi !== "demirbas") : urunler),
    [urunler, tip, hurdaIstisnasi]
  );
  const rafById = (id) => raflar.find((r) => r.id === id);
  const rafOptions = (depoId) => raflar.filter((r) => r.depo_id === depoId).map((r) => ({ value: r.id, label: `${r.kod || ""} ${r.ad || ""}`.trim() }));

  const setLine = (i, patch) => setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((ls) => [...ls, bosSatir()]);
  const delLine = (i) => setLines((ls) => (ls.length > 1 ? ls.filter((_, idx) => idx !== i) : ls));

  const onPickUrun = (i, urunId) => {
    const u = urunler.find((x) => x.id === urunId);
    // Çıkış/Transfer/İade'de o depodaki en eski açık partinin gerçek maliyeti
    // varsa onu öner (ürün kartının sabit satış fiyatı yerine); yoksa eskisi gibi.
    const fifoMaliyet = tip !== "giris" ? depoFifoMaliyet[urunId] : undefined;
    setLine(i, {
      urun_id: urunId, urun_adi: u?.ad || "", urun_kodu: u?.kod || "", barkod: u?.barkod || "",
      birim: u?.ana_birim || "ADET", carpan: 1, miktar: 1, seri_no: "",
      birim_fiyat: tip === "giris" ? (u?.alis_fiyati || 0) : (fifoMaliyet ?? (u?.satis_fiyati || 0)),
      raf_omru_ay: tip === "giris" ? (u?.varsayilan_raf_omru_ay || "") : "",
    });
  };

  const buildPayload = () => {
    const h = { tip, tarih: header.tarih, cari_id: header.cari_id || null,
      cari_adi: cariler.find((c) => c.id === header.cari_id)?.company_name || null,
      fatura_no: header.fatura_no || null, irsaliye_no: header.irsaliye_no || null, belge_no: header.belge_no || null,
      aciklama: header.aciklama || null, sebep_kodu: tip !== "transfer" ? (header.sebep_kodu || null) : null,
      teslim_eden: header.teslim_eden || null, teslim_alan: header.teslim_alan || null,
      gonderim_adresi: header.gonderim_adresi || null };
    if (tip === "giris") { h.hedef_depo_id = header.hedef_depo_id || null; h.hedef_depo_adi = depoAdi(header.hedef_depo_id); }
    if (tip === "iade") { h.kaynak_depo_id = header.kaynak_depo_id || null; h.kaynak_depo_adi = depoAdi(header.kaynak_depo_id); }
    if (tip === "cikis") {
      h.kaynak_depo_id = header.kaynak_depo_id || null; h.kaynak_depo_adi = depoAdi(header.kaynak_depo_id);
      // Çıkış hedefi yalnız saha/proje (opsiyonel); depo→depo taşıma Depo Transfer'de.
      h.hedef_saha_id = header.hedef_saha_id || null;
      h.hedef_saha_adi = sahalar.find((s) => s.id === header.hedef_saha_id)?.ad || null;
    }
    if (tip === "transfer") {
      h.kaynak_depo_id = header.kaynak_depo_id || null; h.kaynak_depo_adi = depoAdi(header.kaynak_depo_id);
      h.hedef_depo_id = header.hedef_depo_id || null; h.hedef_depo_adi = depoAdi(header.hedef_depo_id);
    }
    const satirlar = lines.map((l) => ({
      ...l,
      kaynak_raf_adi: l.kaynak_raf_id ? (rafById(l.kaynak_raf_id)?.ad || rafById(l.kaynak_raf_id)?.kod || "") : "",
      hedef_raf_adi: l.hedef_raf_id ? (rafById(l.hedef_raf_id)?.ad || rafById(l.hedef_raf_id)?.kod || "") : "",
    }));
    return { fis: h, satirlar };
  };

  const validate = () => {
    if (tip !== "giris" && !header.kaynak_depo_id) return "Kaynak depo seçin";
    if (tip === "iade" && !header.cari_id) return "Tedarikçi (cari) seçin";
    if (tip === "giris" && !header.hedef_depo_id) return "Hedef depo seçin";
    if (tip === "transfer" && !header.hedef_depo_id) return "Hedef depo seçin";
    if (tip === "transfer" && header.kaynak_depo_id === header.hedef_depo_id) return "Kaynak ve hedef depo aynı olamaz";
    // Çıkışta hedef saha opsiyonel; depo hedefi yok (Depo Transfer fişi kullanılır).
    if (tip === "giris" && !header.fatura_no && !header.irsaliye_no && !header.belge_no) return "Fatura / İrsaliye / Fiş No alanlarından en az biri gerekli";
    if (!lines.some((l) => l.urun_id && Number(l.miktar) > 0)) return "En az bir ürün satırı (miktar > 0) girin";
    for (const l of lines) {
      if (!l.urun_id || !isSerili(l.urun_id)) continue;
      if ((Number(l.miktar) || 0) * (Number(l.carpan) || 1) !== 1) return `${l.urun_adi}: seri no takipli — satır 1 ana birim olmalı (her adet ayrı satır)`;
      if (!l.seri_no || !l.seri_no.trim()) return `${l.urun_adi}: seri no zorunlu`;
    }
    return null;
  };

  const kaydet = async (gonder, onayla) => {
    const err = validate();
    if (err) { toast.error(err); return; }
    const { fis, satirlar } = buildPayload();
    fis.durum = gonder ? "onay_bekliyor" : "taslak";
    const temiz = satirlar.filter((l) => l.urun_id && Number(l.miktar) > 0);
    setSaving(true);
    try {
      let saved;
      if (editId) saved = await flowApi.stok.updateFis(editId, fis, temiz);
      else saved = await flowApi.stok.createFis(fis, temiz);
      if (onayla) {
        await flowApi.stok.onayla(saved.id);
        toast.success(`${saved.fis_no} onaylandı — stok güncellendi`);
      } else {
        toast.success(`${saved.fis_no} kaydedildi (${fis.durum})`);
      }
      navigate("/stok/fisler");
    } catch (e) {
      toast.error(String(e?.message || "Kaydedilemedi"));
    } finally { setSaving(false); }
  };

  const cariOpts = useMemo(() => {
    const list = tip === "iade" ? cariler.filter((c) => c.is_supplier === 1 || c.is_supplier === true) : cariler;
    return [{ value: "", label: tip === "iade" ? "— Tedarikçi seçin" : "— Firma seçilmedi" },
      ...list.map((c) => ({ value: c.id, label: c.company_name || c.name || c.id }))];
  }, [cariler, tip]);
  const depoOpts = depolar.map((d) => ({ value: d.id, label: d.ad }));
  const sahaOpts = sahalar.map((s) => ({ value: s.id, label: s.ad }));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${cfg.renk}`}><Icon className="w-6 h-6" /> {cfg.baslik}{editId ? " (düzenle)" : ""}</h1>
          <p className="text-sm text-muted-foreground mt-1">{cfg.aciklama}</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/stok/fisler")}><ListChecks className="w-4 h-4 mr-2" /> Fiş Listesi</Button>
      </div>

      {/* Üst bilgi */}
      <div className="bg-card border rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label className="mb-1.5 block">Tarih *</Label>
          <Input type="date" value={header.tarih} onChange={(e) => setHeader({ ...header, tarih: e.target.value })} />
        </div>
        {(tip === "giris" || tip === "iade") && (
          <div>
            <Label className="mb-1.5 block">{tip === "iade" ? "Tedarikçi / Cari *" : "Firma / Cari"}</Label>
            <SearchableSelect value={header.cari_id} onChange={(v) => setHeader({ ...header, cari_id: v })} options={cariOpts} placeholder={tip === "iade" ? "Tedarikçi seçin" : "Firma seçin (opsiyonel)"} />
          </div>
        )}
        {tip !== "giris" && (
          <div>
            <Label className="mb-1.5 block">Kaynak Depo *</Label>
            <SearchableSelect value={header.kaynak_depo_id} onChange={(v) => setHeader({ ...header, kaynak_depo_id: v })} options={depoOpts} placeholder="Kaynak depo" />
          </div>
        )}
        {tip === "giris" && (
          <div>
            <Label className="mb-1.5 block">Hedef Depo *</Label>
            <SearchableSelect value={header.hedef_depo_id} onChange={(v) => setHeader({ ...header, hedef_depo_id: v })} options={depoOpts} placeholder="Hedef depo" />
          </div>
        )}
        {tip === "transfer" && (
          <div>
            <Label className="mb-1.5 block">Hedef Depo *</Label>
            <SearchableSelect value={header.hedef_depo_id} onChange={(v) => setHeader({ ...header, hedef_depo_id: v })} options={depoOpts} placeholder="Hedef depo" />
          </div>
        )}
        {tip === "cikis" && (
          <div>
            <Label className="mb-1.5 block">Hedef Saha / Proje (opsiyonel)</Label>
            <SearchableSelect value={header.hedef_saha_id} onChange={(v) => setHeader({ ...header, hedef_saha_id: v })} options={[{ value: "", label: "— Genel sarf (saha yok)" }, ...sahaOpts]} placeholder="Şantiye / proje" />
            <p className="text-[11px] text-muted-foreground mt-1">Başka bir depoya taşıma için <b>Depo Transfer</b> fişi kullanın.</p>
          </div>
        )}
        {tip === "giris" && (
          <>
            <div><Label className="mb-1.5 block">Fatura No</Label><Input value={header.fatura_no} onChange={(e) => setHeader({ ...header, fatura_no: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">İrsaliye No</Label><Input value={header.irsaliye_no} onChange={(e) => setHeader({ ...header, irsaliye_no: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Fiş / Belge No</Label><Input value={header.belge_no} onChange={(e) => setHeader({ ...header, belge_no: e.target.value })} /></div>
          </>
        )}
        {tip !== "giris" && (
          <div><Label className="mb-1.5 block">{tip === "iade" ? "İade / İrsaliye No" : "Çıkış Fiş / Talep / İş Emri No"}</Label><Input value={header.belge_no} onChange={(e) => setHeader({ ...header, belge_no: e.target.value })} /></div>
        )}
        {tip === "transfer" && (
          <>
            <div><Label className="mb-1.5 block">Teslim Eden</Label><Input value={header.teslim_eden} onChange={(e) => setHeader({ ...header, teslim_eden: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Teslim Alan</Label><Input value={header.teslim_alan} onChange={(e) => setHeader({ ...header, teslim_alan: e.target.value })} /></div>
            <div className="sm:col-span-2 lg:col-span-3"><Label className="mb-1.5 block">Gönderilecek Adres</Label><Input value={header.gonderim_adresi} onChange={(e) => setHeader({ ...header, gonderim_adresi: e.target.value })} /></div>
          </>
        )}
        {SEBEP_LISTESI[tip] && (
          <div>
            <Label className="mb-1.5 block">İşlem Sebebi</Label>
            <Select value={header.sebep_kodu} onValueChange={(v) => setHeader({ ...header, sebep_kodu: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEBEP_LISTESI[tip].map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="sm:col-span-2 lg:col-span-3">
          <Label className="mb-1.5 block">Açıklama</Label>
          <Textarea rows={2} value={header.aciklama} onChange={(e) => setHeader({ ...header, aciklama: e.target.value })} />
        </div>
      </div>

      {/* Satırlar */}
      <div className="bg-card border rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ürün ve Raf Satırları</h2>
          <Button size="sm" onClick={addLine}><Plus className="w-4 h-4 mr-1.5" /> Satır Ekle</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Çoklu birim: birim çarpanı ile ana stok birimine çevrilir (ör. 2 KOLİ × 12 = 24 ADET). Raf seçilmezse deponun GENEL RAF'ı kullanılır.
        </p>
        {lines.map((l, i) => (
          <div key={i} className="border rounded-xl p-3 space-y-3 bg-muted/10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
              <div className="md:col-span-4">
                <Label className="mb-1 block text-xs">Ürün *</Label>
                <SearchableSelect value={l.urun_id} onChange={(v) => onPickUrun(i, v)}
                  options={urunlerForTip.map((u) => ({ value: u.id, label: `${u.kod ? u.kod + " · " : ""}${u.ad}`, keywords: [u.barkod, ekBarkodMap[u.id]].filter(Boolean).join(" ") }))}
                  placeholder="Ürün kodu / adı / barkod" fixDialogWheelScroll />
              </div>
              {tip !== "giris" && (
                <div className="md:col-span-3">
                  <Label className="mb-1 block text-xs">Kaynak Raf</Label>
                  <SearchableSelect value={l.kaynak_raf_id} onChange={(v) => setLine(i, { kaynak_raf_id: v })}
                    options={[{ value: "", label: "GENEL RAF (otomatik)" }, ...rafOptions(header.kaynak_depo_id)]} placeholder="Raf" fixDialogWheelScroll />
                </div>
              )}
              {(tip === "giris" || tip === "transfer") && (
                <div className="md:col-span-3">
                  <Label className="mb-1 block text-xs">Hedef Raf</Label>
                  <SearchableSelect value={l.hedef_raf_id} onChange={(v) => setLine(i, { hedef_raf_id: v })}
                    options={[{ value: "", label: "GENEL RAF (otomatik)" }, ...rafOptions(header.hedef_depo_id)]} placeholder="Raf" fixDialogWheelScroll />
                </div>
              )}
              <div className="md:col-span-1">
                <Label className="mb-1 block text-xs">
                  Birim
                  {tip !== "giris" && l.urun_id && header.kaynak_depo_id && (
                    <span className="ml-1 font-normal text-muted-foreground">· çıkabilir: {depoKullanilabilir[l.urun_id] ?? 0}</span>
                  )}
                </Label>
                <Input value={l.birim} onChange={(e) => setLine(i, { birim: e.target.value })} />
              </div>
              <div className="md:col-span-1">
                <Label className="mb-1 block text-xs">Çarpan</Label>
                <Input type="number" value={l.carpan} onChange={(e) => setLine(i, { carpan: parseFloat(e.target.value) || 1 })} />
              </div>
              <div className="md:col-span-1">
                <Label className="mb-1 block text-xs">Miktar *</Label>
                <Input type="number" value={l.miktar} onChange={(e) => setLine(i, { miktar: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="md:col-span-1">
                <Label className="mb-1 block text-xs">Birim Fiyat</Label>
                <Input type="number" value={l.birim_fiyat} onChange={(e) => setLine(i, { birim_fiyat: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="md:col-span-1 flex md:justify-end">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => delLine(i)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
            {l.urun_id && isSerili(l.urun_id) && (
              <div className="flex items-center gap-2">
                <Label className="text-xs shrink-0 text-amber-600">Sicil No *</Label>
                <Input placeholder="Elle yazın, barkod okutun ya da otomatik üretin" value={l.seri_no}
                  onChange={(e) => setLine(i, { seri_no: e.target.value })} />
                <Button type="button" size="sm" variant="outline" className="shrink-0" onClick={() => setLine(i, { seri_no: `${l.urun_kodu || "SN"}-${Date.now().toString().slice(-6)}` })}>
                  Otomatik Üret
                </Button>
              </div>
            )}
            {tip === "cikis" && (
              <Input placeholder="Açıklama / içerik (KUTULU/KUTUSUZ vb.)" value={l.icerik_aciklamasi} onChange={(e) => setLine(i, { icerik_aciklamasi: e.target.value })} />
            )}
            {tip === "giris" && (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                <div><Label className="mb-1 block text-xs">Lot / Parti No</Label><Input value={l.lot_no} onChange={(e) => setLine(i, { lot_no: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Üretim Tarihi</Label><Input type="date" value={l.uretim_tarihi} onChange={(e) => setLine(i, { uretim_tarihi: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Raf Ömrü (Ay)</Label><Input type="number" value={l.raf_omru_ay} onChange={(e) => setLine(i, { raf_omru_ay: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Kontrol Tarihi</Label><Input type="date" value={l.kontrol_tarihi} onChange={(e) => setLine(i, { kontrol_tarihi: e.target.value })} /></div>
                <div><Label className="mb-1 block text-xs">Son Kullanım (SKT)</Label><Input type="date" value={l.skt} onChange={(e) => setLine(i, { skt: e.target.value })} /></div>
                <div>
                  <Label className="mb-1 block text-xs">Raf Ömrü Durumu</Label>
                  <Select value={l.raf_omru_durumu} onValueChange={(v) => setLine(i, { raf_omru_durumu: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Takip Edilecek">Takip Edilecek</SelectItem>
                      <SelectItem value="Raf ömrü uygulanmaz">Raf ömrü uygulanmaz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        ))}
        <div className="text-right text-sm text-muted-foreground">
          Toplam (ana birim): <b>{lines.reduce((a, l) => a + (Number(l.miktar) || 0) * (Number(l.carpan) || 1), 0)}</b>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => navigate("/stok/fisler")}>Vazgeç</Button>
        <Button variant="secondary" disabled={saving} onClick={() => kaydet(false, false)}>Taslak Kaydet</Button>
        <Button variant="secondary" disabled={saving} onClick={() => kaydet(true, false)}>Onaya Gönder</Button>
        <Button disabled={saving} onClick={() => kaydet(true, true)}>{saving ? "Kaydediliyor..." : "Kaydet ve Onayla"}</Button>
      </div>
    </div>
  );
}
