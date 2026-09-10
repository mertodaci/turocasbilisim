import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { flowApi } from "@/api/flowApiClient";
import {
  LayoutDashboard, PackageX, AlertTriangle, ArrowDownToLine, ArrowUpFromLine,
  ClipboardCheck, Undo2, CalendarClock, FileText,
} from "lucide-react";

export default function StokDashboard() {
  const { data = {}, isLoading } = useQuery({ queryKey: ["stok_dashboard"], queryFn: () => flowApi.stok.dashboard(), refetchInterval: 60000 });
  const k = data.is_kuyrugu || {};

  const Kart = ({ icon: Ic, lbl, val, alt, to, cls }) => {
    const inner = (
      <div className="bg-card border rounded-xl p-4 h-full hover:border-primary/40 transition-colors">
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Ic className={`w-4 h-4 ${cls || ""}`} />{lbl}</div>
        <p className="text-2xl font-bold mt-1">{val ?? 0}</p>
        {alt && <p className="text-[11px] text-muted-foreground mt-0.5">{alt}</p>}
      </div>
    );
    return to ? <Link to={to}>{inner}</Link> : inner;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><LayoutDashboard className="w-6 h-6 text-primary" /> Stok Kontrol Merkezi</h1>
        <p className="text-sm text-muted-foreground mt-1">Depo, stok ve zimmet operasyonlarını tek ekrandan yönetin.</p>
      </div>

      {isLoading ? <p className="text-muted-foreground">Yükleniyor...</p> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <Kart icon={PackageX} lbl="Stok Biten" val={data.stok_biten} alt="mevcut ≤ 0" to="/stok/raporlar" cls="text-red-500" />
            <Kart icon={AlertTriangle} lbl="Kritik Stok" val={data.kritik} alt="min. seviyenin altında" to="/stok/raporlar" cls="text-amber-500" />
            <Kart icon={ArrowDownToLine} lbl="Bugün Giriş" val={data.bugun_giris?.m} alt={`${data.bugun_giris?.n || 0} fiş`} cls="text-emerald-600" />
            <Kart icon={ArrowUpFromLine} lbl="Bugün Çıkış/Transfer" val={data.bugun_cikis?.m} alt={`${data.bugun_cikis?.n || 0} fiş`} cls="text-red-600" />
            <Kart icon={FileText} lbl="En Çok Çalışan" val={data.en_cok_calisan?.hareket || 0} alt={data.en_cok_calisan?.kullanici || "—"} />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">İş Kuyruğu</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Kart icon={FileText} lbl="Bekleyen Fiş" val={k.bekleyen_fis} alt="taslak / onay bekleyen" to="/stok/fisler" cls="text-amber-500" />
              <Kart icon={ClipboardCheck} lbl="Sayım Görevi" val={k.sayim_gorevi} alt="devam eden sayım" to="/stok/sayim" cls="text-amber-500" />
              <Kart icon={Undo2} lbl="Geciken Zimmet" val={k.geciken_zimmet} alt="termin geçti" to="/stok/zimmet" cls="text-red-500" />
              <Kart icon={CalendarClock} lbl="SKT Geçen Parti" val={k.skt_gecen} alt="bakiyeli" to="/stok/partiler" cls="text-red-500" />
              <Kart icon={CalendarClock} lbl="SKT Yaklaşan" val={k.skt_yaklasan} alt="30 gün içinde" to="/stok/partiler" cls="text-amber-500" />
              {data.fifo_tutarsiz > 0 && (
                <Kart icon={AlertTriangle} lbl="FIFO Tutarsız" val={data.fifo_tutarsiz} alt="parti izi ≠ stok" to="/stok/partiler" cls="text-red-500" />
              )}
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm font-semibold mb-2">Son Hareketler</p>
            <table className="w-full text-sm">
              <tbody>
                {(data.son_hareket || []).map((h, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-1.5">{h.fis_no}</td>
                    <td className="py-1.5">{h.urun_adi}</td>
                    <td className="py-1.5 text-muted-foreground">{h.depo_adi}</td>
                    <td className="py-1.5 text-muted-foreground">{h.tarih}</td>
                    <td className={`py-1.5 text-right font-medium ${h.tip === "giris" ? "text-emerald-600" : "text-red-600"}`}>{h.tip === "giris" ? "+" : "−"}{h.miktar}</td>
                  </tr>
                ))}
                {!(data.son_hareket || []).length && <tr><td className="py-4 text-center text-muted-foreground">Hareket yok.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
