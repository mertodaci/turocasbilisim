import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Badge } from "@/components/ui/badge";
import { FileCheck, AlertTriangle, XCircle, Clock, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  suresi_doldu: {
    label: "Süresi Doldu",
    icon: XCircle,
    className: "bg-red-50 text-red-700 border-red-200",
    iconColor: "text-red-500",
    order: 1,
  },
  suresi_dolmak_uzere: {
    label: "Süresi Dolmak Üzere",
    icon: AlertTriangle,
    className: "bg-amber-50 text-amber-700 border-amber-200",
    iconColor: "text-amber-500",
    order: 2,
  },
  taslak: {
    label: "Taslak",
    icon: Clock,
    className: "bg-blue-50 text-blue-700 border-blue-200",
    iconColor: "text-blue-400",
    order: 3,
  },
  aktif: {
    label: "Aktif",
    icon: FileCheck,
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconColor: "text-emerald-500",
    order: 4,
  },
  iptal: {
    label: "İptal",
    icon: XCircle,
    className: "bg-slate-100 text-slate-500 border-slate-200",
    iconColor: "text-slate-400",
    order: 5,
  },
};

const contractTypeLabels = {
  hizmet_sozlesmesi: "Hizmet Sözleşmesi",
  bakim_sozlesmesi: "Bakım Sözleşmesi",
  bakim_destek: "Bakım & Destek",
  lisans: "Lisans",
  gizlilik: "Gizlilik",
  is_ortakligi: "İş Ortaklığı",
  diger: "Diğer",
};

export default function ContractStatusSummary() {
  const { data: contracts = [], isLoading: loadingContracts } = useQuery({
    queryKey: ["all-contracts"],
    queryFn: () => flowApi.entities.CustomerContract.list(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ["customers-map"],
    queryFn: () => flowApi.entities.Customer.list(),
  });

  const customerMap = Object.fromEntries(customers.map((c) => [c.id, c.company_name]));

  const sorted = [...contracts].sort((a, b) => {
    const orderA = statusConfig[a.status]?.order ?? 99;
    const orderB = statusConfig[b.status]?.order ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    // İkinci sıralama: bitiş tarihi yakın olan üste
    if (a.end_date && b.end_date) return a.end_date.localeCompare(b.end_date);
    if (a.end_date) return -1;
    if (b.end_date) return 1;
    return 0;
  });

  if (loadingContracts) return null;

  const top5 = sorted.slice(0, 5);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex flex-row items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-primary" /> Sözleşme Durumları
        </div>
        <span className="text-xs text-muted-foreground">{contracts.length} sözleşme</span>
      </div>
      {top5.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">Henüz sözleşme eklenmemiş</div>
      ) : (
        <div className="divide-y divide-border/50">
          {top5.map((contract) => {
            const conf = statusConfig[contract.status] || statusConfig.taslak;
            const Icon = conf.icon;
            const companyName = customerMap[contract.customer_id] || "—";
            return (
              <div key={contract.id} className="flex items-center gap-3 px-6 py-3 hover:bg-muted/30 transition-colors">
                <Icon className={cn("w-4 h-4 shrink-0", conf.iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{contract.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {companyName}
                    {contract.contract_type && ` · ${contractTypeLabels[contract.contract_type] || contract.contract_type}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {contract.end_date && (
                    <span className="text-xs text-muted-foreground">{contract.end_date}</span>
                  )}
                  <Badge className={cn("text-[10px] px-1.5 py-0 border", conf.className)}>
                    {conf.label}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}