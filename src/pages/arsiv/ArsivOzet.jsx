import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Archive, ScrollText, FileText, Users, ClipboardList, Wallet } from "lucide-react";

const CARDS = [
  { key: "sozlesmeler", label: "Sözleşmeler", icon: ScrollText, to: "/arsiv/sozlesmeler", tone: "blue" },
  { key: "musteriEvraklari", label: "Müşteri Evrak Arşivi", icon: FileText, to: "/arsiv/musteri-evraklari", tone: "emerald" },
  { key: "ik", label: "İnsan Kaynakları", icon: Users, to: "/arsiv/ik", tone: "indigo" },
  { key: "isTakibi", label: "İş Takibi", icon: ClipboardList, to: "/arsiv/is-takibi", tone: "teal" },
  { key: "bordro", label: "Bordro", icon: Wallet, to: "/arsiv/bordro", tone: "amber" },
];

const TONE_BG = {
  blue: "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
  emerald: "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600",
  indigo: "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600",
  teal: "bg-teal-50 dark:bg-teal-950/30 text-teal-600",
  amber: "bg-amber-50 dark:bg-amber-950/30 text-amber-600",
};

function useCount(key, fetcher) {
  const { data } = useQuery({ queryKey: ["arsiv", key], queryFn: fetcher });
  if (Array.isArray(data)) return data.length;
  if (data && typeof data === "object") {
    return (data.pasif_personel?.length || 0) + (data.evraklar?.length || 0) + (data.tutanaklar?.length || 0);
  }
  return 0;
}

export default function ArsivOzet() {
  const sozlesmeler = useCount("sozlesmeler", flowApi.arsiv.sozlesmeler);
  const musteriEvraklari = useCount("musteriEvraklari", flowApi.arsiv.musteriEvraklari);
  const ik = useCount("ik", flowApi.arsiv.ik);
  const isTakibi = useCount("isTakibi", flowApi.arsiv.isTakibi);
  const bordro = useCount("bordro", flowApi.arsiv.bordro);
  const counts = { sozlesmeler, musteriEvraklari, ik, isTakibi, bordro };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><Archive className="w-5 h-5" /> Arşiv Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">Kapanmış/bilerek saklanan kayıtlar — silinmiş değil, arşivlenmiş.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CARDS.map((c) => (
          <Link key={c.key} to={c.to} className="bg-card border rounded-2xl p-5 hover:shadow-md transition-shadow flex items-center gap-4">
            <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${TONE_BG[c.tone]}`}><c.icon className="w-5 h-5" /></span>
            <div>
              <p className="text-2xl font-bold">{counts[c.key]}</p>
              <p className="text-sm text-muted-foreground">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
