import { useNavigate } from "react-router-dom";
import { Search, Building2, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/LanguageContext";
import { useGlobalSearch } from "@/lib/useGlobalSearch";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

// Dashboard'a gömülü arama — TopBar'daki ⌘K modalının aynı veri/filtre
// katmanını (useGlobalSearch) kullanır, yalnızca CommandDialog sarmalayıcısı
// yerine düz bir Command kartı içinde render edilir.
export default function SearchWidgetCard({ iconSquareTone }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { query, setQuery, leafItems, favoriteItems, matchedCustomers, matchedTickets } = useGlobalSearch(true);

  const go = (path) => {
    setQuery("");
    navigate(path);
  };

  const q = query.trim();
  // Sorgu boşken uzun "Sayfalar" listesiyle widget'ı kaplamamak için yalnızca
  // favoriler gösterilir; yazınca tüm gruplar (sayfalar + müşteri + bilet) açılır.
  const showPages = q.length > 0;

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", iconSquareTone)}><Search className="w-4 h-4" /></span>
        <h3 className="text-xs font-bold uppercase tracking-wide text-foreground">Arama</h3>
      </div>
      <Command className="bg-transparent">
        <CommandInput placeholder="Sayfa, müşteri veya bilet/talep ara..." value={query} onValueChange={setQuery} />
        <CommandList className="max-h-64">
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
          {showPages && (
            <CommandGroup heading="Sayfalar">
              {leafItems.map((item) => (
                <CommandItem key={item.path} value={t(item.labelKey)} onSelect={() => go(item.path)}>
                  <item.icon className="w-4 h-4" />
                  <span>{t(item.labelKey)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
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
      </Command>
    </div>
  );
}
