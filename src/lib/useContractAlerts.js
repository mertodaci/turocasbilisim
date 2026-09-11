import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";

// Sözleşme süresi yaklaşan/geçen kurumları hesaplar — ContractAlerts.jsx
// (UserDashboard) ve AdminDashboard'daki birleşik uyarı paneli ortak kullanır.
export function useContractAlerts() {
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

  return { expired, upcoming, nameOf };
}
