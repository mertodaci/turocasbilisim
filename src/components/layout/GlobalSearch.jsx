import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, ClipboardList } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLanguage } from "@/lib/LanguageContext";
import { flowApi } from "@/api/flowApiClient";
import { getAllLeafItems } from "./navItems";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";

// TopBar'daki arama kutusu. Menü sayfaları + favoriler (statik) yanında,
// dialog açıldığında müşteri ve bilet/talep kayıtlarını da (mevcut
// Customers.jsx/JobTrackingTickets.jsx'teki "sınırlı sayıda çek + client-side
// filtrele" deseniyle) getirip arama sonucuna katar. cmdk'nin kendi fuzzy
// filtresi her CommandItem'ın `value`'suna bakar, ayrı bir filtre motoru
// yazmaya gerek yok.
export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

  const { data: searchCustomers = [] } = useQuery({
    queryKey: ["global-search-customers"],
    queryFn: () => flowApi.entities.Customer.list("company_name", 2000),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });
  const { data: searchTickets = [] } = useQuery({
    queryKey: ["global-search-tickets"],
    queryFn: () => flowApi.entities.JTTicket.list("-created_date", 2000),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  // ⌘K / Ctrl+K global kısayolu.
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

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

  const go = (path) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  // Müşteri/bilet listeleri 2000'e kadar kayıt taşıyabildiği için, sorgu
  // en az 2 karakter olmadan hiç render edilmez ve eşleşenler ilk 8 ile
  // sınırlanır — dialog binlerce CommandItem ile açılıp yavaşlamaz.
  const q = query.trim().toLowerCase();
  const matchedCustomers = q.length < 2 ? [] : searchCustomers
    .filter((c) => `${c.company_name || ""} ${c.city || ""}`.toLowerCase().includes(q))
    .slice(0, 8);
  const matchedTickets = q.length < 2 ? [] : searchTickets
    .filter((tk) => `${tk.title || ""} ${tk.ticket_number || ""} ${tk.customer_name || ""}`.toLowerCase().includes(q))
    .slice(0, 8);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex w-52 lg:w-64 shrink-0 items-center gap-2 px-3 h-9 rounded-xl border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        <Search className="w-4 h-4 shrink-0" />
        <span className="flex-1 text-left truncate">Ara...</span>
        <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded-md border border-border bg-card text-[10px] font-semibold text-muted-foreground shrink-0">⌘K</kbd>
      </button>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors"
        title="Ara"
      >
        <Search className="w-5 h-5" />
      </button>

      <CommandDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQuery(""); }}>
        <CommandInput placeholder="Sayfa, müşteri veya bilet/talep ara..." value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>Sonuç bulunamadı.</CommandEmpty>
          {favoriteItems.length > 0 && (
            <CommandGroup heading="Favoriler">
              {favoriteItems.map((item) => (
                <CommandItem key={item.path} value={`favori ${t(item.labelKey)}`} onSelect={() => go(item.path)}>
                  <item.icon className="w-4 h-4" />
                  <span>{t(item.labelKey)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          <CommandGroup heading="Sayfalar">
            {leafItems.map((item) => (
              <CommandItem key={item.path} value={t(item.labelKey)} onSelect={() => go(item.path)}>
                <item.icon className="w-4 h-4" />
                <span>{t(item.labelKey)}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {matchedCustomers.length > 0 && (
            <CommandGroup heading="Müşteriler">
              {matchedCustomers.map((c) => (
                <CommandItem key={c.id} value={`${c.company_name || ""} ${c.city || ""}`} onSelect={() => go(`/musteri/${c.id}`)}>
                  <Building2 className="w-4 h-4" />
                  <span className="truncate">{c.company_name || "İsimsiz Müşteri"}</span>
                  {c.city && <span className="ml-auto text-xs text-muted-foreground shrink-0">{c.city}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {matchedTickets.length > 0 && (
            <CommandGroup heading="Bilet / Talepler">
              {matchedTickets.map((tk) => (
                <CommandItem key={tk.id} value={`${tk.title || ""} ${tk.ticket_number || ""} ${tk.customer_name || ""}`} onSelect={() => go("/is-takibi/tickets")}>
                  <ClipboardList className="w-4 h-4" />
                  <span className="truncate">{tk.title || "İsimsiz Bilet"}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">{tk.ticket_number || ""}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
