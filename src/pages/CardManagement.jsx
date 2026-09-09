import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  Wifi, WifiOff, ScanLine, PlusCircle, Radio, Play, Square,
  RotateCcw, Search, Power, PowerOff, CreditCard,
} from "lucide-react";
import { toast } from "sonner";

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");

// Kimlik dogrulama httpOnly cookie ile yapiliyor; credentials:"include" yeterli.
async function pdksFetch(path, opts = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    ...opts,
    headers: { ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `İstek başarısız (${res.status})`);
  return data;
}

export default function CardManagement() {
  const queryClient = useQueryClient();

  // ---- Canli cihaz durumu ----
  const { data: pdksStatus = {} } = useQuery({
    queryKey: ["pdks-status"],
    queryFn: async () => {
      try { return await pdksFetch("/api/pdks/status"); } catch { return {}; }
    },
    refetchInterval: 5000,
    retry: false,
  });
  const pdksKnown = Object.keys(pdksStatus).length > 0;
  const pdksOnlineCount = Object.values(pdksStatus).filter((d) => d.online).length;

  // ---- Kayitli kartlar (aktif + pasif) ----
  const { data: pdksCards = [], refetch: refetchCards } = useQuery({
    queryKey: ["pdks-cards"],
    queryFn: async () => {
      try { return await pdksFetch("/api/pdks/cards"); } catch { return []; }
    },
    refetchInterval: 10000,
    retry: false,
  });
  const cardsByUid = useMemo(() => {
    const m = {};
    for (const c of pdksCards) m[c.uid] = c;
    return m;
  }, [pdksCards]);

  // ---- Calisanlar (isim secimi icin) ----
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-cardmap"],
    queryFn: () => flowApi.entities.Employee.list(),
  });
  const employeeOptions = useMemo(() => {
    const sorted = [...employees].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "", "tr"));
    const opts = sorted.map((e) => ({
      value: e.id,
      label: e.full_name + (e.card_uid ? ` (mevcut kart: ${e.card_uid})` : ""),
    }));
    opts.push({ value: "__other__", label: "Diğer / çalışan değil (elle isim gir)" });
    return opts;
  }, [employees]);

  async function linkEmployeeCard(employeeId, uid) {
    try {
      await flowApi.entities.Employee.update(employeeId, { card_uid: uid });
      queryClient.invalidateQueries({ queryKey: ["employees-cardmap"] });
    } catch (err) {
      toast.error("Çalışan profiline bağlanamadı: " + (err.message || "bilinmeyen hata"));
    }
  }

  // ==================== TEKLI HIZLI KART EKLEME ====================
  const [cardUid, setCardUid] = useState("");
  const [cardEmployeeId, setCardEmployeeId] = useState("");
  const [cardName, setCardName] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [readingDevice, setReadingDevice] = useState(null);
  const isOtherSelected = cardEmployeeId === "__other__";
  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === cardEmployeeId) || null,
    [employees, cardEmployeeId]
  );

  const readCardFromDevice = async (deviceId) => {
    setReadingDevice(deviceId);
    try {
      const data = await pdksFetch(`/api/pdks/last_uid?device=${deviceId}`);
      if (data.uid) {
        setCardUid(data.uid);
        toast.success(`Kart okundu: ${data.uid}`);
      } else {
        toast.error(`Son 30sn içinde ${deviceId} okuyucusunda okutulmuş kart bulunamadı.`);
      }
    } catch (err) {
      toast.error(err.message || "PDKS servisine ulaşılamadı");
    } finally {
      setReadingDevice(null);
    }
  };

  const addSingleCard = async () => {
    const uid = cardUid.trim().toUpperCase();
    const name = isOtherSelected ? cardName.trim() : (selectedEmployee?.full_name || "");
    if (!uid || !cardEmployeeId || !name) {
      toast.error(isOtherSelected ? "Kart ID ve isim zorunlu" : "Kart ID ve çalışan seçimi zorunlu");
      return;
    }
    setAddingCard(true);
    try {
      await pdksFetch("/api/pdks/cards", {
        method: "POST",
        body: JSON.stringify({ uid, name, employee_id: !isOtherSelected ? cardEmployeeId : undefined }),
      });
      if (!isOtherSelected && selectedEmployee) await linkEmployeeCard(selectedEmployee.id, uid);
      toast.success(`Kart eklendi: ${name}`);
      setCardUid("");
      setCardEmployeeId("");
      setCardName("");
      refetchCards();
    } catch (err) {
      toast.error(err.message || "Kart eklenemedi");
    } finally {
      setAddingCard(false);
    }
  };

  // ==================== TOPLU KART OKUMA (CAPTURE) ====================
  const [captureDevice, setCaptureDevice] = useState("GIRIS");
  const { data: captureStatus = { active: false, device: null, items: [] } } = useQuery({
    queryKey: ["pdks-capture"],
    queryFn: async () => {
      try { return await pdksFetch("/api/pdks/capture/status"); } catch { return { active: false, device: null, items: [] }; }
    },
    refetchInterval: (query) => (query.state.data?.active ? 1000 : 4000),
    retry: false,
  });
  // her satir icin secim/kayit durumu: { [uid]: { employeeId, name, saving } }
  const [rowState, setRowState] = useState({});

  const startCapture = async () => {
    try {
      await pdksFetch("/api/pdks/capture/start", {
        method: "POST",
        body: JSON.stringify({ device: captureDevice }),
      });
      setRowState({});
      toast.success(`Toplu okuma başladı (${captureDevice === "GIRIS" ? "Giriş" : "Çıkış"} okuyucusu). Kartları sırayla okutabilirsiniz.`);
      queryClient.invalidateQueries({ queryKey: ["pdks-capture"] });
    } catch (err) {
      toast.error(err.message || "Toplu okuma başlatılamadı");
    }
  };

  const stopCapture = async () => {
    try {
      await pdksFetch("/api/pdks/capture/stop", { method: "POST", body: "{}" });
      queryClient.invalidateQueries({ queryKey: ["pdks-capture"] });
    } catch (err) {
      toast.error(err.message || "Durdurulamadı");
    }
  };

  const clearCapture = async () => {
    if (!window.confirm("Okuma listesi temizlensin mi? (henüz kaydedilmemiş satırlar kaybolur)")) return;
    try {
      await pdksFetch("/api/pdks/capture/clear", { method: "POST", body: "{}" });
      setRowState({});
      queryClient.invalidateQueries({ queryKey: ["pdks-capture"] });
    } catch (err) {
      toast.error(err.message || "Temizlenemedi");
    }
  };

  const setRow = (uid, patch) => {
    setRowState((s) => ({ ...s, [uid]: { ...(s[uid] || {}), ...patch } }));
  };

  const saveRow = async (uid) => {
    const row = rowState[uid] || {};
    const other = row.employeeId === "__other__";
    const emp = employees.find((e) => e.id === row.employeeId) || null;
    const name = other ? (row.name || "").trim() : (emp?.full_name || "");
    if (!row.employeeId || !name) {
      toast.error(other ? "İsim girin" : "Çalışan seçin");
      return;
    }
    setRow(uid, { saving: true });
    try {
      await pdksFetch("/api/pdks/cards", {
        method: "POST",
        body: JSON.stringify({ uid, name, employee_id: !other ? row.employeeId : undefined }),
      });
      if (!other && emp) await linkEmployeeCard(emp.id, uid);
      toast.success(`${name} → ${uid} kaydedildi, teslim edebilirsiniz`);
      refetchCards();
    } catch (err) {
      toast.error(err.message || "Kaydedilemedi");
    } finally {
      setRow(uid, { saving: false });
    }
  };

  // ==================== AKTIF/PASIF/SIL ====================
  const [busyUid, setBusyUid] = useState(null);
  const [registrySearch, setRegistrySearch] = useState("");

  const deactivateCard = async (uid) => {
    setBusyUid(uid);
    try {
      await pdksFetch("/api/pdks/cards/deactivate", { method: "POST", body: JSON.stringify({ uid }) });
      toast.success("Kart pasif yapıldı (kapı artık açmaz)");
      refetchCards();
    } catch (err) {
      toast.error(err.message || "Pasif yapılamadı");
    } finally {
      setBusyUid(null);
    }
  };

  const activateCard = async (uid) => {
    setBusyUid(uid);
    try {
      await pdksFetch("/api/pdks/cards/activate", { method: "POST", body: JSON.stringify({ uid }) });
      toast.success("Kart tekrar aktif edildi");
      refetchCards();
    } catch (err) {
      toast.error(err.message || "Aktif edilemedi");
    } finally {
      setBusyUid(null);
    }
  };

  const filteredRegistry = useMemo(() => {
    const q = registrySearch.trim().toLowerCase();
    if (!q) return pdksCards;
    return pdksCards.filter(
      (c) => (c.name || "").toLowerCase().includes(q) || (c.uid || "").toLowerCase().includes(q)
    );
  }, [pdksCards, registrySearch]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Başlık */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard className="w-6 h-6" /> Kart Yönetimi
        </h1>
        <p className="text-sm text-muted-foreground">PDKS kapı kartlarının tanımlanması, teslimi ve aktif/pasif yönetimi</p>
      </div>

      {/* Canlı durum */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Radio className="w-4 h-4" /> Canlı Cihaz Durumu
            {pdksKnown && (
              <span className="text-xs font-normal text-muted-foreground">
                ({pdksOnlineCount}/{Object.keys(pdksStatus).length} çevrimiçi)
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {pdksKnown ? (
              Object.entries(pdksStatus).map(([id, d]) => (
                <span
                  key={id}
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    d.online ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {d.online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {d.name || id} — {d.online ? "çevrimiçi" : "çevrimdışı"}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">PDKS servisi yanıt vermiyor (pdks-daemon çalışıyor mu?)</span>
            )}
          </div>
        </div>
      </div>

      {/* Toplu kart kayıt */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-sm mb-3">Toplu Kart Kayıt</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Bir okuyucu seçip "Başlat"a basın, sonra kartları arka arkaya (birkaç saniye ara ile) okutun —
          her kart otomatik ve okutulma sırasıyla aşağıya eklenir. Sırayla isim seçip "Kaydet"e basarak
          kartı ilgili kişiye teslim edebilirsiniz, okumaya devam ederken bile.
        </p>

        {!captureStatus.active ? (
          <div className="flex items-center gap-2 flex-wrap">
            <SearchableSelect
              value={captureDevice}
              onChange={setCaptureDevice}
              options={[
                { value: "GIRIS", label: "Giriş okuyucusu" },
                { value: "CIKIS", label: "Çıkış okuyucusu" },
              ]}
              className="w-48"
              sort={false}
            />
            <Button type="button" size="sm" onClick={startCapture}>
              <Play className="w-4 h-4 mr-1.5" /> Toplu Okumayı Başlat
            </Button>
            {captureStatus.items.length > 0 && (
              <Button type="button" size="sm" variant="outline" onClick={clearCapture}>
                <RotateCcw className="w-4 h-4 mr-1.5" /> Listeyi Temizle
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
              <ScanLine className="w-3 h-3 animate-pulse" />
              Dinleniyor: {captureStatus.device === "GIRIS" ? "Giriş" : "Çıkış"} okuyucusu — {captureStatus.items.length} kart okundu
            </span>
            <Button type="button" size="sm" variant="outline" onClick={stopCapture}>
              <Square className="w-4 h-4 mr-1.5" /> Okumayı Durdur
            </Button>
          </div>
        )}

        {captureStatus.items.length > 0 && (
          <div className="mt-3 border border-border/50 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border/50">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-10">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Kart ID</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Okunma</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Kişi</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-32"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {captureStatus.items.map((it, idx) => {
                  const already = cardsByUid[it.uid];
                  const row = rowState[it.uid] || {};
                  const other = row.employeeId === "__other__";
                  return (
                    <tr key={it.uid} className="hover:bg-muted/20">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{it.uid}</td>
                      <td className="px-3 py-2 text-muted-foreground">{it.captured_at}</td>
                      <td className="px-3 py-2">
                        {already ? (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${already.status === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                            {already.name} ({already.status === "aktif" ? "kayıtlı" : "pasif"})
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <SearchableSelect
                              value={row.employeeId || ""}
                              onChange={(v) => setRow(it.uid, { employeeId: v })}
                              options={employeeOptions}
                              placeholder="Çalışan seçin..."
                              searchPlaceholder="Çalışan ara..."
                              emptyText="Çalışan bulunamadı"
                              sort={false}
                              className="w-52"
                            />
                            {other && (
                              <Input
                                value={row.name || ""}
                                onChange={(e) => setRow(it.uid, { name: e.target.value })}
                                placeholder="İsim / etiket"
                                className="w-36 h-9"
                              />
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!already && (
                          <Button type="button" size="sm" onClick={() => saveRow(it.uid)} disabled={row.saving}>
                            {row.saving ? "..." : "Kaydet"}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tekli hızlı ekleme */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm mb-6">
        <h2 className="font-semibold text-sm mb-3">Tek Kart Ekle</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => readCardFromDevice("GIRIS")} disabled={readingDevice === "GIRIS"}>
            <ScanLine className="w-4 h-4 mr-1.5" />
            {readingDevice === "GIRIS" ? "Okunuyor..." : "Kartı Oku (Giriş)"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => readCardFromDevice("CIKIS")} disabled={readingDevice === "CIKIS"}>
            <ScanLine className="w-4 h-4 mr-1.5" />
            {readingDevice === "CIKIS" ? "Okunuyor..." : "Kartı Oku (Çıkış)"}
          </Button>
          <Input value={cardUid} onChange={(e) => setCardUid(e.target.value.toUpperCase())} placeholder="Kart ID (hex)" className="w-36" />
          <SearchableSelect
            value={cardEmployeeId}
            onChange={setCardEmployeeId}
            options={employeeOptions}
            placeholder="Çalışan seçin..."
            searchPlaceholder="Çalışan ara..."
            emptyText="Çalışan bulunamadı"
            sort={false}
            className="w-56"
          />
          {isOtherSelected && (
            <Input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Kişi adı / etiket" className="w-44" />
          )}
          <Button type="button" size="sm" onClick={addSingleCard} disabled={addingCard}>
            <PlusCircle className="w-4 h-4 mr-1.5" />
            {addingCard ? "Ekleniyor..." : "Kart Ekle"}
          </Button>
        </div>
      </div>

      {/* Kayıtlı kartlar */}
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-sm">Kayıtlı Kartlar ({pdksCards.length})</h2>
          <div className="relative w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={registrySearch} onChange={(e) => setRegistrySearch(e.target.value)} placeholder="İsim veya kart ID ara..." className="pl-9 h-9" />
          </div>
        </div>
        <div className="border border-border/50 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border/50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Durum</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">İsim</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Kart ID</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Güncellendi</th>
                <th className="text-right px-3 py-2 font-semibold text-muted-foreground">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredRegistry.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">Kayıtlı kart yok</td></tr>
              ) : filteredRegistry.map((c) => (
                <tr key={c.uid} className="hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {c.status === "aktif" ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">{c.uid}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{c.updated_date}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {c.status === "aktif" ? (
                        <Button type="button" size="sm" variant="outline" onClick={() => deactivateCard(c.uid)} disabled={busyUid === c.uid} title="Pasif yap">
                          <PowerOff className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button type="button" size="sm" variant="outline" onClick={() => activateCard(c.uid)} disabled={busyUid === c.uid} title="Aktif yap">
                          <Power className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
