import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";
import { flowApi } from "@/api/flowApiClient";
import { getAllLeafItems } from "@/components/layout/navItems";

// GlobalSearch.jsx (TopBar ⌘K modalı) ve dashboard'daki gömülü Arama
// widget'ı arasında paylaşılan arama/veri katmanı — ikisi de aynı menü/
// müşteri/bilet kaynaklarını, aynı filtre mantığıyla arıyor. `active`
// true iken müşteri/bilet sorguları tetiklenir (modal için `open`, widget
// için her zaman true); react-query aynı queryKey'i paylaştığı için iki
// tüketici de tek bir ağ isteğinin sonucunu kullanır.
export function useGlobalSearch(active) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

  const { data: searchCustomers = [] } = useQuery({
    queryKey: ["global-search-customers"],
    queryFn: () => flowApi.entities.Customer.list("company_name", 2000),
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });
  const { data: searchTickets = [] } = useQuery({
    queryKey: ["global-search-tickets"],
    queryFn: () => flowApi.entities.JTTicket.list("-created_date", 2000),
    enabled: active,
    staleTime: 5 * 60 * 1000,
  });

  const userPerms = user?.permissions || [];
  const userRole = user?.role || "kullanici";
  const canViewModule = (moduleKey) => {
    if (userRole === "admin") return true;
    const perm = userPerms.find((p) => p.module === moduleKey);
    return perm ? perm.can_view == 1 : false;
  };

  const leafItems = getAllLeafItems().filter((i) => canViewModule(i.labelKey));
  const favoriteItems = favorites
    .map((key) => leafItems.find((i) => i.labelKey === key))
    .filter(Boolean);

  // Müşteri/bilet listeleri 2000'e kadar kayıt taşıyabildiği için, sorgu
  // en az 2 karakter olmadan hiç eşleşme üretilmez ve sonuçlar ilk 8 ile
  // sınırlanır.
  const q = query.trim().toLowerCase();
  const matchedCustomers = q.length < 2 ? [] : searchCustomers
    .filter((c) => `${c.company_name || ""} ${c.city || ""}`.toLowerCase().includes(q))
    .slice(0, 8);
  const matchedTickets = q.length < 2 ? [] : searchTickets
    .filter((tk) => `${tk.title || ""} ${tk.ticket_number || ""} ${tk.customer_name || ""}`.toLowerCase().includes(q))
    .slice(0, 8);

  return { query, setQuery, leafItems, favoriteItems, matchedCustomers, matchedTickets };
}
