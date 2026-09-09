import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { flowApi } from "@/api/flowApiClient";
import { AlertTriangle, Clock } from "lucide-react";

// Sözleşme süresi yaklaşan/geçen kurumlar için uyarı bandı.
// admin/yönetici (AdminDashboard) ve kullanıcı (UserDashboard) görür.
// Her kurum adı tıklanabilir -> o kurumun detayına (/musteri/:id) gider.
export default function ContractAlerts() {
  const { data: contracts = [] } = useQuery({
    queryKey: ["contract-alerts"],
    queryFn: () => flowApi.entities.CustomerContract.list(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["contract-alerts-customers"],
    queryFn: () => flowApi.entities.Customer.list("-created_date", 300),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30 = new Date(today);
  in30.setDate(in30.getDate() + 30);

  const nameOf = (cid) => customers.find((c) => c.id === cid)?.company_name || "Bilinmeyen kurum";

  const expired = [];
  const upcoming = [];
  contracts.forEach((c) => {
    if (!c.end_date || c.status === "iptal") return;
    const end = new Date(c.end_date);
    if (isNaN(end.getTime())) return;
    end.setHours(0, 0, 0, 0);
    if (end < today) expired.push(c);
    else if (end <= in30) upcoming.push(c);
  });

  if (expired.length === 0 && upcoming.length === 0) return null;

  // Bir kurum listesini, her biri kendi detayina link olan rozetlere cevir
  const renderChips = (list, color) =>
    list.map((c) => (
      <Link
        key={c.id}
        to={`/musteri/${c.customer_id}`}
        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${color} hover:underline mr-1.5 mb-1`}
      >
        {nameOf(c.customer_id)}
        {c.end_date ? ` (${new Date(c.end_date).toLocaleDateString("tr-TR")})` : ""}
      </Link>
    ));

  return (
    <div className="space-y-2">
      {expired.length > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm font-semibold text-red-900">{expired.length} kurumun sözleşmesi sona erdi</p>
          </div>
          <div className="flex flex-wrap pl-7">
            {renderChips(expired, "bg-red-100 text-red-800")}
          </div>
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <Clock className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-900">{upcoming.length} kurumun sözleşmesi 30 gün içinde dolacak</p>
          </div>
          <div className="flex flex-wrap pl-7">
            {renderChips(upcoming, "bg-amber-100 text-amber-800")}
          </div>
        </div>
      )}
    </div>
  );
}
