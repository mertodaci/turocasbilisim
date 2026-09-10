import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

/**
 * Aranabilir + A-Z sirali select.
 * Props:
 *   value: secili deger
 *   onChange: (value) => void
 *   options: [{ value, label, keywords }] -- keywords: aramaya dahil olsun ama
 *     etikette gorunmesin diye ek metin (orn. barkod). cmdk filtresi label +
 *     keywords birlesimine bakar, ekranda hala sadece label gosterilir.
 *   placeholder: tetikleyici metni
 *   searchPlaceholder: arama kutusu metni
 *   emptyText: sonuc yoksa
 *   disabled
 *   sort: true (varsayilan) -> label'a gore A-Z (tr locale)
 *   fixDialogWheelScroll: false (varsayilan) -> true verilirse, bu Popover bir
 *     Dialog icinde acildiginda Dialog'un scroll-lock'unun fare tekerlegini
 *     yanlislikla engellemesini onler (kaydirma cubugunu surukleme calisir ama
 *     tekerlek calismazsa bu belirtidir). Sadece ihtiyac duyulan yerde acilsin
 *     diye varsayilan kapali, digerlerini etkilemez.
 */
export function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = "Seçin...",
  searchPlaceholder = "Ara...",
  emptyText = "Sonuç yok",
  disabled = false,
  sort = true,
  className,
  fixDialogWheelScroll = false,
}) {
  const [open, setOpen] = useState(false);

  const list = sort
    ? [...options].sort((a, b) => (a.label || "").localeCompare(b.label || "", "tr"))
    : options;

  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground", className)}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        onWheel={fixDialogWheelScroll ? (e) => e.stopPropagation() : undefined}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {list.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.keywords ? `${opt.label} ${opt.keywords}` : opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{opt.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SearchableSelect;
