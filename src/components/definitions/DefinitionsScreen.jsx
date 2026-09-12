import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Check, X, ToggleLeft, ToggleRight, Settings, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const COLOR_OPTIONS = [
  { value: "blue", cls: "bg-blue-500" },
  { value: "green", cls: "bg-green-500" },
  { value: "red", cls: "bg-red-500" },
  { value: "orange", cls: "bg-orange-500" },
  { value: "purple", cls: "bg-purple-500" },
  { value: "yellow", cls: "bg-yellow-500" },
  { value: "teal", cls: "bg-teal-500" },
  { value: "pink", cls: "bg-pink-500" },
  { value: "indigo", cls: "bg-indigo-500" },
  { value: "slate", cls: "bg-slate-500" },
];

function DefinitionForm({ onSave, onCancel, initial, showColor = false, showProductSelect = false, products = [], showBoardSelect = false, boards = [] }) {
  const [label, setLabel] = useState(initial?.label || "");
  const [value, setValue] = useState(initial?.value || "");
  const [color, setColor] = useState(initial?.color || "blue");
  const [parentKey, setParentKey] = useState(initial?.parent_key || "");
  const [boardId, setBoardId] = useState(initial?.board_id || "");
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!label || !value) { toast.error("Tüm alanlar zorunludur!"); return; }
    if (showProductSelect && !parentKey) { toast.error("Ürün seçimi zorunludur!"); return; }
    onSave({
      label, value,
      ...(showColor ? { color } : {}),
      ...(showProductSelect ? { parent_key: parentKey } : {}),
      ...(showBoardSelect ? { board_id: boardId, board_name: boards.find(b => b.id === boardId)?.name || "" } : {}),
    });
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 flex-wrap bg-muted/40 border border-border/50 rounded-xl px-4 py-3">
      <div className="flex-1 space-y-1 min-w-[140px]">
        <Label className="text-xs text-muted-foreground">Gösterim Adı</Label>
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="örn: Satış Departmanı" className="h-9 text-sm" required />
      </div>
      <div className="flex-1 space-y-1 min-w-[140px]">
        <Label className="text-xs text-muted-foreground">Sistem Değeri</Label>
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="örn: satis" className="h-9 text-sm" required />
      </div>
      {showProductSelect && (
        <div className="flex-1 space-y-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Bağlı Ürün</Label>
          <select value={parentKey} onChange={(e) => setParentKey(e.target.value)}
            className="h-9 text-sm w-full rounded-md border border-input bg-background px-3">
            <option value="">— Ürün seç —</option>
            {products.map(p => (
              <option key={p.id} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
      )}
      {showBoardSelect && (
        <div className="flex-1 space-y-1 min-w-[140px]">
          <Label className="text-xs text-muted-foreground">Pano</Label>
          <select value={boardId} onChange={(e) => setBoardId(e.target.value)}
            className="h-9 text-sm w-full rounded-md border border-input bg-background px-3">
            <option value="">— Pano seç —</option>
            {boards.map(b => (
              <option key={b.id} value={b.id}>{b.icon ? `${b.icon} ${b.name}` : b.name}</option>
            ))}
          </select>
        </div>
      )}
      {showColor && (
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Renk</Label>
          <div className="flex gap-1.5 flex-wrap">
            {COLOR_OPTIONS.map(c => (
              <button key={c.value} type="button" onClick={() => setColor(c.value)}
                className={`w-6 h-6 rounded-full ${c.cls} transition-all ${color === c.value ? "ring-2 ring-offset-1 ring-foreground scale-110" : "opacity-60 hover:opacity-100"}`}
              />
            ))}
          </div>
        </div>
      )}
      <Button type="submit" size="sm" className="h-9 gap-1.5">
        <Check className="w-3.5 h-3.5" /> Kaydet
      </Button>
      <Button type="button" size="sm" variant="ghost" className="h-9" onClick={onCancel}>
        <X className="w-3.5 h-3.5" />
      </Button>
    </form>
  );
}

export function CategoryPanel({ category, showColor = false }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["definitions", category],
    queryFn: () => flowApi.entities.Definition.filter({ category }),
  });
  const isModuleCategory = category === "modul";
  const { data: productList = [] } = useQuery({
    queryKey: ["definitions", "urun"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "urun" }),
    enabled: isModuleCategory,
  });
  // Pano ataması ürün değil MODÜL seviyesinde: aynı ürüne bağlı farklı
  // modüller farklı destek panolarına gidebiliyor (örn. OMIS ürünündeki
  // "muhasebe" modülü YBS Teknik Destek'e, "185" modülü ABYS OMIS'e gider).
  const { data: boardList = [] } = useQuery({
    queryKey: ["tq-boards"],
    queryFn: () => flowApi.entities.JTKanbanBoard.filter({ is_active: true }),
    enabled: isModuleCategory,
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Definition.create({ ...data, category, is_active: true, sort_order: items.length }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["definitions", category] }); setShowForm(false); toast.success("Eklendi"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Definition.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["definitions", category] }); setEditingItem(null); toast.success("Güncellendi"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Definition.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["definitions", category] }); toast.success("Silindi"); },
  });

  const activeItems = items.filter(i => i.is_active == 1 || i.is_active === true);
  const passiveItems = items.filter(i => i.is_active != 1 && i.is_active !== true);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{items.length} tanım</span>
          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">{activeItems.length} aktif</span>
          {passiveItems.length > 0 && <span className="text-xs px-2 py-0.5 bg-red-50 text-red-500 rounded-full">{passiveItems.length} pasif</span>}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => { setShowForm(true); setEditingItem(null); }}>
          <Plus className="w-3.5 h-3.5" /> Yeni Ekle
        </Button>
      </div>

      {showForm && (
        <DefinitionForm onSave={(d) => createMutation.mutate(d)} onCancel={() => setShowForm(false)} showColor={showColor} showProductSelect={isModuleCategory} products={productList} showBoardSelect={isModuleCategory} boards={boardList} />
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : items.length === 0 && !showForm ? (
        <div className="text-center py-12 text-muted-foreground">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Henüz tanım eklenmemiş.</p>
          <p className="text-xs mt-1">Yeni Ekle butonuna tıklayarak başlayın.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) =>
            editingItem?.id === item.id ? (
              <DefinitionForm
                key={item.id}
                showColor={showColor}
                showProductSelect={isModuleCategory}
                products={productList}
                showBoardSelect={isModuleCategory}
                boards={boardList}
                initial={item}
                onSave={(d) => updateMutation.mutate({ id: item.id, data: d })}
                onCancel={() => setEditingItem(null)}
              />
            ) : (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 bg-card border border-border/50 rounded-xl hover:border-border transition-colors group">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{item.value}</p>
                </div>
                {isModuleCategory && item.parent_key && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/30 shrink-0">
                    {productList.find(p => p.value === item.parent_key)?.label || item.parent_key}
                  </span>
                )}
                {isModuleCategory && item.board_name && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 dark:bg-teal-950/30 shrink-0">
                    📋 {item.board_name}
                  </span>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                  item.is_active == 1 || item.is_active === true
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30"
                    : "bg-red-50 text-red-500 dark:bg-red-950/30"
                }`}>
                  {item.is_active == 1 || item.is_active === true ? "Aktif" : "Pasif"}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingItem(item)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-orange-500" onClick={() =>
                    updateMutation.mutate({ id: item.id, data: { is_active: (item.is_active == 1 || item.is_active === true) ? 0 : 1 } })
                  }>
                    {item.is_active == 1 || item.is_active === true ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => {
                    if (confirm(`"${item.label}" silinsin mi?`)) deleteMutation.mutate(item.id);
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export function DefinitionsScreen({ groups, categories, title, subtitle }) {
  const [activeCategory, setActiveCategory] = useState(categories[0].key);
  const activeGroup = groups.find(g => categories.filter(c => c.group === g.key).some(c => c.key === activeCategory));
  const activeCategoryObj = categories.find(c => c.key === activeCategory);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          {title}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sol panel — kategori listesi */}
        <div className="lg:col-span-1 space-y-2">
          {groups.map(group => {
            const GroupIcon = group.icon;
            const groupCategories = categories.filter(c => c.group === group.key);
            const isActiveGroup = groupCategories.some(c => c.key === activeCategory);

            return (
              <div key={group.key} className={`rounded-2xl border overflow-hidden ${isActiveGroup ? group.border : "border-border/50"}`}>
                <div className={`flex items-center gap-2 px-4 py-2.5 ${isActiveGroup ? group.bg : "bg-muted/30"}`}>
                  <GroupIcon className={`w-4 h-4 ${isActiveGroup ? group.color : "text-muted-foreground"}`} />
                  <span className={`text-xs font-semibold uppercase tracking-wider ${isActiveGroup ? group.color : "text-muted-foreground"}`}>
                    {group.key}
                  </span>
                </div>
                <div className="divide-y divide-border/30">
                  {groupCategories.map(cat => (
                    <button
                      key={cat.key}
                      onClick={() => setActiveCategory(cat.key)}
                      className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                        activeCategory === cat.key
                          ? `${group.bg} ${group.color} font-medium`
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      {cat.label}
                      {activeCategory === cat.key && <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Sağ panel — içerik */}
        <div className="lg:col-span-3">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm">
            <div className={`flex items-center gap-3 px-6 py-4 border-b border-border/50 rounded-t-2xl ${activeGroup?.bg || ""}`}>
              {activeGroup && <activeGroup.icon className={`w-5 h-5 ${activeGroup.color}`} />}
              <div>
                <h2 className="text-base font-semibold">{activeCategoryObj?.label}</h2>
                <p className="text-xs text-muted-foreground">{activeGroup?.key} grubu</p>
              </div>
            </div>
            <div className="p-6">
              <CategoryPanel key={activeCategory} category={activeCategory} showColor={activeCategory === "aktivite_tipi"} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
