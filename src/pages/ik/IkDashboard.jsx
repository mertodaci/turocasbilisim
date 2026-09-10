import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { flowApi } from "@/api/flowApiClient";
import { Users, CalendarClock, Umbrella, AlertTriangle, Clock, Cake, Calculator, FileWarning, CheckCircle2 } from "lucide-react";

import { sayi as nf } from "@/lib/ikFormat";

function Kart({ icon: Icon, label, value, sub, to, tone = "" }) {
  const body = (
    <div className={`bg-card border rounded-2xl p-4 h-full ${to ? "hover:border-primary/50 transition-colors" : ""}`}>
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="w-4 h-4" /> {label}</div>
      <p className={`text-2xl font-bold mt-1 ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const AYLAR = ["", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const durumRozet = { taslak: ["Taslak", "bg-amber-100 text-amber-700"], onayli: ["Onaylı", "bg-emerald-100 text-emerald-700"], kapali: ["Kapalı", "bg-slate-200 text-slate-600"], yok: ["Oluşturulmadı", "bg-slate-100 text-slate-500"] };

export default function IkDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["ik_dashboard"], queryFn: () => flowApi.ik.dashboard(), refetchInterval: 60000 });
  const k = data?.kpi || {};
  const dg = data?.dogum_gunu || [];
  const bd = data?.bordro_donem || { durum: "yok" };
  const [durumLabel, durumCls] = durumRozet[bd.durum] || durumRozet.yok;

  if (isLoading) return <div className="h-64 flex items-center justify-center text-muted-foreground">Yükleniyor...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarClock className="w-6 h-6 text-primary" /> İK / PDKS Kontrol Paneli</h1>
        <p className="text-sm text-muted-foreground mt-1">Bugün: {data?.tarih} · Dönem: {AYLAR[bd.ay] || ""} {bd.yil} <span className={`ml-1 text-xs px-2 py-0.5 rounded font-medium ${durumCls}`}>{durumLabel}</span></p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kart icon={Users} label="Aktif Personel" value={nf(k.aktif_personel)} to="/calisanlar" />
        <Kart icon={CalendarClock} label="Bugün Puantaj Kaydı" value={nf(k.bugun_puantaj)} to="/ik/puantaj" />
        <Kart icon={Umbrella} label="Bugün İzinli" value={nf(k.bugun_izinli)} />
        <Kart icon={Clock} label="Bugün Geç Kalan" value={nf(k.bugun_gec_kalan)} sub={`Toplam ${nf(k.bugun_gec_dk)} dk`} tone={k.bugun_gec_kalan ? "text-amber-600" : ""} to="/ik/puantaj-rapor" />
        <Kart icon={AlertTriangle} label="Bugün Gelmeyen" value={nf(k.bugun_gelmeyen)} tone={k.bugun_gelmeyen ? "text-red-600" : ""} to="/ik/puantaj-rapor" />
        <Kart icon={Clock} label="Bekleyen Mesai Onayı" value={nf(k.bekleyen_mesai)} tone={k.bekleyen_mesai ? "text-amber-600" : ""} to="/ik/mesai" />
        <Kart icon={FileWarning} label="Eksik Evraklı İzin" value={nf(k.eksik_evrakli_izin)} tone={k.eksik_evrakli_izin ? "text-amber-600" : ""} to="/ik/izin-evrak" />
        <Kart icon={AlertTriangle} label="Tutarsız Personel" value={nf(k.tutarsiz_personel)} sub="Eksik özlük/ücret" tone={k.tutarsiz_personel ? "text-red-600" : ""} to="/calisanlar?f=bordro" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-2xl p-5">
          <p className="text-sm font-semibold flex items-center gap-2"><Cake className="w-4 h-4 text-primary" /> Bugün Doğum Günü</p>
          {dg.length === 0 ? <p className="text-sm text-muted-foreground mt-2">Bugün doğum günü olan personel yok.</p> : (
            <ul className="mt-2 space-y-1 text-sm">{dg.map((n, i) => <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {n}</li>)}</ul>
          )}
        </div>

        <div className="bg-card border rounded-2xl p-5">
          <p className="text-sm font-semibold flex items-center gap-2"><Calculator className="w-4 h-4 text-primary" /> Bordro Dönemi</p>
          <p className="text-sm text-muted-foreground mt-2">
            {AYLAR[bd.ay] || ""} {bd.yil} dönemi <b className="text-foreground">{durumLabel}</b>.
            {bd.durum === "yok" && " Bordrolama ekranından 'Hesapla' ile oluşturun."}
            {bd.durum === "taslak" && " Kontrol edip 'Bordroyu Onayla' deyin."}
            {bd.durum === "onayli" && " Ay Kapanışı'ndan kilitleyebilirsiniz."}
          </p>
          <Link to="/ik/bordro" className="text-primary text-sm mt-2 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Bordrolama ekranına git</Link>
        </div>
      </div>

      {(data?.acik_mesai_onaylari || []).length > 0 && (
        <div className="bg-card border rounded-2xl overflow-x-auto">
          <p className="text-sm font-semibold p-4 pb-2 flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Onay Bekleyen Mesai Kayıtları</p>
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-y"><tr>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Personel</th>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Tarih</th>
              <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Tür</th>
              <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Süre (dk)</th>
              <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Tutar</th>
            </tr></thead>
            <tbody>
              {data.acik_mesai_onaylari.map((m) => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-2">{m.personel_adi}</td>
                  <td className="px-4 py-2 text-muted-foreground">{(m.tarih || "").slice(0, 10)}</td>
                  <td className="px-4 py-2">{m.tur === "tatil" ? "Tatil Mesai" : "Fazla Mesai"}</td>
                  <td className="px-4 py-2 text-right">{nf(m.sure_dk)}</td>
                  <td className="px-4 py-2 text-right">{(Number(m.tutar) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3"><Link to="/ik/mesai" className="text-primary text-sm">Tümünü Mesai Onayları'nda gör →</Link></div>
        </div>
      )}
    </div>
  );
}
