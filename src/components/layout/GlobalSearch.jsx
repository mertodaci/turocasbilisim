import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
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

// TopBar'daki arama kutusu. Şimdilik yalnız "sayfaya git" hızlı atlaması —
// mevcut menü ağacında arar (backend yok, yeni sorgu yok, sıfır maliyetli).
// Gerçek kayıt araması (personel/müşteri/bilet vb.) ayrı bir turda eklenecek.
export default function GlobalSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (!user) return;
    flowApi.auth.getFavorites().then(setFavorites).catch(() => setFavorites([]));
  }, [user]);

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
    navigate(path);
  };

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

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Sayfa ara... (kişi/müşteri/talep araması yakında)" />
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
        </CommandList>
      </CommandDialog>
    </>
  );
}
