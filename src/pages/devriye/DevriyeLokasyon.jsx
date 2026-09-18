import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, MapPin, QrCode, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MapPickerDialog from "@/components/map/MapPickerDialog";
import { sortTr } from "@/lib/sortTr";

function QrImage({ value, size = 120 }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 0, width: size }).then((d) => alive && setSrc(d)).catch(() => {});
    return () => { alive = false; };
  }, [value, size]);
  if (!src) return <div className="bg-muted rounded" style={{ width: size, height: size }} />;
  return <img src={src} alt="QR" width={size} height={size} className="rounded border border-border" />;
}

const emptyLok = { ad: "", aciklama: "", aktif: 1 };
const emptyNokta = {
  lokasyon_id: "", sira: 1, nokta_adi: "", olmasi_gereken_saat: "08:00", aktif: 1,
  qr_zorunlu: 1, qr_tipi: "sabit", disaridan_cikis_izni: 0, birim_ids: [],
  gps_enlem: null, gps_boylam: null,
};

export default function DevriyeLokasyon() {
  const qc = useQueryClient();
  const [lokDialog, setLokDialog] = useState({ open: false, item: null });
  const [lokForm, setLokForm] = useState(emptyLok);
  const [noktaDialog, setNoktaDialog] = useState({ open: false, item: null, lokasyonId: null });
  const [noktaForm, setNoktaForm] = useState(emptyNokta);
  const [expanded, setExpanded] = useState({});
  const [mapOpen, setMapOpen] = useState(false);

  const { data: lokasyonlar = [], isLoading } = useQuery({
    queryKey: ["devriye_lokasyonlar"],
    queryFn: () => flowApi.entities.DevriyeLokasyon.list("ad", 500),
  });
  const { data: noktalar = [] } = useQuery({
    queryKey: ["devriye_noktalar"],
    queryFn: () => flowApi.entities.DevriyeNokta.list("sira", 5000),
  });
  const { data: birimler = [] } = useQuery({
    queryKey: ["ik_bolumler_min"],
    queryFn: () => flowApi.entities.IkBolum.list("ad", 2000),
    select: (d) => sortTr(d, "ad"),
  });

  const invalidateLok = () => qc.invalidateQueries({ queryKey: ["devriye_lokasyonlar"] });
  const invalidateNokta = () => qc.invalidateQueries({ queryKey: ["devriye_noktalar"] });

  const createLok = useMutation({
    mutationFn: (d) => flowApi.entities.DevriyeLokasyon.create(d),
    onSuccess: () => { invalidateLok(); setLokDialog({ open: false, item: null }); toast.success("Lokasyon eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateLok = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.DevriyeLokasyon.update(id, data),
    onSuccess: () => { invalidateLok(); setLokDialog({ open: false, item: null }); toast.success("Güncellendi"); },
  });
  const deleteLok = useMutation({
    mutationFn: (id) => flowApi.entities.DevriyeLokasyon.delete(id),
    onSuccess: () => { invalidateLok(); toast.success("Silindi"); },
  });

  const createNokta = useMutation({
    mutationFn: (d) => flowApi.entities.DevriyeNokta.create(d), // qr_token backend'de uretilir (crypto.randomUUID() sadece HTTPS/localhost'ta calisir)
    onSuccess: () => { invalidateNokta(); setNoktaDialog({ open: false, item: null, lokasyonId: null }); toast.success("Nokta eklendi"); },
    onError: (e) => toast.error("Eklenemedi: " + (e?.message || "hata")),
  });
  const updateNokta = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.DevriyeNokta.update(id, data),
    onSuccess: () => { invalidateNokta(); setNoktaDialog({ open: false, item: null, lokasyonId: null }); toast.success("Güncellendi"); },
  });
  const deleteNokta = useMutation({
    mutationFn: (id) => flowApi.entities.DevriyeNokta.delete(id),
    onSuccess: () => { invalidateNokta(); toast.success("Silindi"); },
  });

  const openLokEdit = (l) => { setLokForm(l ? { ad: l.ad, aciklama: l.aciklama || "", aktif: l.aktif } : emptyLok); setLokDialog({ open: true, item: l }); };
  const submitLok = () => {
    if (!lokForm.ad.trim()) { toast.error("Lokasyon adı zorunlu"); return; }
    if (lokDialog.item) updateLok.mutate({ id: lokDialog.item.id, data: lokForm });
    else createLok.mutate(lokForm);
  };

  const openNoktaEdit = (lokasyonId, n) => {
    setNoktaForm(n ? {
      lokasyon_id: n.lokasyon_id, sira: n.sira, nokta_adi: n.nokta_adi,
      olmasi_gereken_saat: n.olmasi_gereken_saat, aktif: n.aktif,
      qr_zorunlu: n.qr_zorunlu ?? 1, qr_tipi: n.qr_tipi || "sabit",
      disaridan_cikis_izni: n.disaridan_cikis_izni ?? 0,
      birim_ids: Array.isArray(n.birim_ids) ? n.birim_ids : [],
      gps_enlem: n.gps_enlem ?? null, gps_boylam: n.gps_boylam ?? null,
    } : { ...emptyNokta, lokasyon_id: lokasyonId });
    setNoktaDialog({ open: true, item: n, lokasyonId });
  };
  const submitNokta = () => {
    if (!noktaForm.nokta_adi.trim()) { toast.error("Nokta adı zorunlu"); return; }
    const lok = lokasyonlar.find((l) => l.id === noktaForm.lokasyon_id);
    const data = { ...noktaForm, lokasyon_adi: lok?.ad || "" };
    if (noktaDialog.item) updateNokta.mutate({ id: noktaDialog.item.id, data });
    else createNokta.mutate(data);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => openLokEdit(null)}><Plus className="w-4 h-4 mr-2" /> Yeni Lokasyon</Button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-muted-foreground">Yükleniyor...</div>
      ) : lokasyonlar.length === 0 ? (
        <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2 bg-card rounded-2xl border border-border/50">
          <MapPin className="w-8 h-8 opacity-40" /><p>Henüz lokasyon yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lokasyonlar.map((l) => {
            const kendiNoktalar = noktalar.filter((n) => n.lokasyon_id === l.id).sort((a, b) => a.sira - b.sira);
            const isOpen = !!expanded[l.id];
            return (
              <div key={l.id} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/20" onClick={() => setExpanded((e) => ({ ...e, [l.id]: !e[l.id] }))}>
                  {isOpen ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">{l.ad}</p>
                    {l.aciklama && <p className="text-xs text-muted-foreground truncate">{l.aciklama}</p>}
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", l.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{l.aktif ? "Aktif" : "Pasif"}</span>
                  <span className="text-xs text-muted-foreground">{kendiNoktalar.length} nokta</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openLokEdit(l); }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm("Lokasyon silinsin mi?")) deleteLok.mutate(l.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                {isOpen && (
                  <div className="border-t border-border/50 p-4 space-y-3 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-1.5"><QrCode className="w-4 h-4" /> Devriye Noktaları</h4>
                      <Button size="sm" variant="outline" onClick={() => openNoktaEdit(l.id, null)}><Plus className="w-3.5 h-3.5 mr-1" /> Nokta Ekle</Button>
                    </div>
                    {kendiNoktalar.length === 0 ? <p className="text-xs text-muted-foreground">Nokta yok.</p> : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {kendiNoktalar.map((n) => (
                          <div key={n.id} className="border border-border/50 rounded-xl p-3 flex gap-3 items-start bg-card">
                            <QrImage value={n.qr_token} size={80} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{n.sira}. {n.nokta_adi}</p>
                              <p className="text-xs text-muted-foreground">Saat: {n.olmasi_gereken_saat}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", n.aktif ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500")}>{n.aktif ? "Aktif" : "Pasif"}</span>
                                {n.qr_tipi === "degisen" && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-indigo-100 text-indigo-700">Değişen QR</span>}
                                {Array.isArray(n.birim_ids) && n.birim_ids.length > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-sky-100 text-sky-700">{n.birim_ids.length} birim</span>}
                                {n.gps_enlem != null && n.gps_boylam != null && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" /> Konum</span>}
                              </div>
                              <div className="flex gap-1 mt-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openNoktaEdit(l.id, n)}><Pencil className="w-3 h-3" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => { if (confirm("Nokta silinsin mi?")) deleteNokta.mutate(n.id); }}><Trash2 className="w-3 h-3" /></Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={lokDialog.open} onOpenChange={(v) => !v && setLokDialog({ open: false, item: null })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{lokDialog.item ? "Lokasyon Düzenle" : "Yeni Lokasyon"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label className="mb-1.5 block">Ad *</Label><Input value={lokForm.ad} onChange={(e) => setLokForm({ ...lokForm, ad: e.target.value })} /></div>
            <div><Label className="mb-1.5 block">Açıklama</Label><Input value={lokForm.aciklama} onChange={(e) => setLokForm({ ...lokForm, aciklama: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setLokDialog({ open: false, item: null })}>İptal</Button>
              <Button onClick={submitLok}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noktaDialog.open} onOpenChange={(v) => !v && setNoktaDialog({ open: false, item: null, lokasyonId: null })}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{noktaDialog.item ? "Nokta Düzenle" : "Yeni Devriye Noktası"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1.5 block">Sıra</Label><Input type="number" value={noktaForm.sira} onChange={(e) => setNoktaForm({ ...noktaForm, sira: Number(e.target.value) })} /></div>
              <div><Label className="mb-1.5 block">Olması Gereken Saat</Label><Input type="time" value={noktaForm.olmasi_gereken_saat} onChange={(e) => setNoktaForm({ ...noktaForm, olmasi_gereken_saat: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1.5 block">Nokta Adı *</Label><Input value={noktaForm.nokta_adi} onChange={(e) => setNoktaForm({ ...noktaForm, nokta_adi: e.target.value })} /></div>

            <div className="flex items-center justify-between pt-1">
              <Label>Durum</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{noktaForm.aktif ? "Aktif" : "Pasif"}</span>
                <Switch checked={!!noktaForm.aktif} onCheckedChange={(v) => setNoktaForm({ ...noktaForm, aktif: v ? 1 : 0 })} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>QR Kod Okutma Zorunlu</Label>
                <p className="text-xs text-muted-foreground">Geçiş kontrolü için QR kod doğrulaması zorunlu kılın.</p>
              </div>
              <Switch checked={!!noktaForm.qr_zorunlu} onCheckedChange={(v) => setNoktaForm({ ...noktaForm, qr_zorunlu: v ? 1 : 0 })} />
            </div>

            <div>
              <Label className="mb-1.5 block">QR Tipi</Label>
              <div className="flex gap-2">
                {[{ v: "sabit", l: "Sabit" }, { v: "degisen", l: "Değişen" }].map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    onClick={() => setNoktaForm({ ...noktaForm, qr_tipi: opt.v })}
                    className={cn(
                      "flex-1 text-sm px-3 py-1.5 rounded-lg border font-medium transition-colors",
                      noktaForm.qr_tipi === opt.v ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">QR tek seferlik üretilir. Kağıda çıkarıp bir materyale bastırarak kullanabilirsiniz.</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Başka Konumlardan Çıkışa İzin Ver</Label>
                <p className="text-xs text-muted-foreground">Kapalıyken çalışanlar yalnızca bu geçiş noktasından çıkış yapabilir.</p>
              </div>
              <Switch checked={!!noktaForm.disaridan_cikis_izni} onCheckedChange={(v) => setNoktaForm({ ...noktaForm, disaridan_cikis_izni: v ? 1 : 0 })} />
            </div>

            <div>
              <Label className="mb-1.5 block">Birimler</Label>
              <p className="text-xs text-muted-foreground mb-1.5">Geçiş noktasının hangi birimlere ait olduğunu belirtin.</p>
              {birimler.length === 0 ? (
                <p className="text-xs text-muted-foreground">Tanımlı birim yok.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {birimler.map((b) => {
                    const sel = noktaForm.birim_ids.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setNoktaForm({
                          ...noktaForm,
                          birim_ids: sel ? noktaForm.birim_ids.filter((x) => x !== b.id) : [...noktaForm.birim_ids, b.id],
                        })}
                        className={cn(
                          "text-xs px-2.5 py-1 rounded-full border font-medium transition-colors",
                          sel ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {b.ad}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label>Konum Doğrulama</Label>
                <Button type="button" size="sm" variant="outline" onClick={() => setMapOpen(true)}>
                  <MapPin className="w-3.5 h-3.5 mr-1" /> Haritadan Seç
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {noktaForm.gps_enlem != null && noktaForm.gps_boylam != null
                  ? `Enlem: ${Number(noktaForm.gps_enlem).toFixed(6)}, Boylam: ${Number(noktaForm.gps_boylam).toFixed(6)}`
                  : "Konum seçilmedi"}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setNoktaDialog({ open: false, item: null, lokasyonId: null })}>İptal</Button>
              <Button onClick={submitNokta}>Kaydet</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <MapPickerDialog
        open={mapOpen}
        onOpenChange={setMapOpen}
        initialLat={noktaForm.gps_enlem}
        initialLng={noktaForm.gps_boylam}
        onPick={(lat, lng) => setNoktaForm({ ...noktaForm, gps_enlem: lat, gps_boylam: lng })}
      />
    </div>
  );
}
