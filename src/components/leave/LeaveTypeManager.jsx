import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Pencil, Trash2, Check, X, ToggleRight, ToggleLeft } from "lucide-react";
import { toast } from "sonner";

const ENTITLEMENT_LABELS = {
  yillik: "Yıllık",
  her_talep_icin: "Her Talep İçin",
  hak_bazi: "Hak Bazlı",
};

function LeaveTypeRow({ item, onEdit, onDelete, onToggle }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/50 rounded-xl">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{item.name}</p>
          {item.is_default && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">Varsayılan</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{item.description || "-"}</p>
      </div>
      <div className="text-xs space-y-1 min-w-[140px]">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.is_paid ? "bg-emerald-50 text-emerald-600" : "bg-orange-50 text-orange-600"}`}>
            {item.is_paid ? "Ücretli" : "Ücretsiz"}
          </span>
        </div>
        <p className="text-muted-foreground">{ENTITLEMENT_LABELS[item.entitlement_type]}</p>
      </div>
      <div className="text-xs space-y-1 min-w-[100px] text-right">
        <p><span className="text-muted-foreground">Min:</span> {item.min_days} gün</p>
        <p><span className="text-muted-foreground">Max:</span> {item.max_days || "∞"} gün</p>
        {item.annual_limit && <p><span className="text-muted-foreground">Yıllık:</span> {item.annual_limit} gün</p>}
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(item)}>
          <Pencil className="w-3.5 h-3.5" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-orange-500" onClick={() => onToggle(item)}>
          {item.is_active !== false ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

function LeaveTypeForm({ onSave, onCancel, initial }) {
  const [name, setName] = useState(initial?.name || "");
  const [isPaid, setIsPaid] = useState(initial?.is_paid ?? true);
  const [entitlementType, setEntitlementType] = useState(initial?.entitlement_type || "yillik");
  const [minDays, setMinDays] = useState(initial?.min_days || 1);
  const [maxDays, setMaxDays] = useState(initial?.max_days || "");
  const [annualLimit, setAnnualLimit] = useState(initial?.annual_limit || "");
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [description, setDescription] = useState(initial?.description || "");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name) { toast.error("Izin turu adi zorunludur!"); return; }
    onSave({
      name,
      is_paid: isPaid,
      entitlement_type: entitlementType,
      min_days: Number(minDays),
      max_days: maxDays === "" ? null : Number(maxDays),
      annual_limit: annualLimit === "" ? null : Number(annualLimit),
      is_default: isDefault,
      description,
      is_active: initial?.is_active ?? true,
      sort_order: initial?.sort_order ?? 0,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-muted/40 border border-border/50 rounded-xl px-4 py-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">İzin Türü Adı</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="örn: Yıllık İzin" className="h-9 text-sm" required />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Açıklama</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Kurallar..." className="h-9 text-sm" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Ücret Durumu</Label>
          <div className="flex items-center gap-2 h-9">
            <Checkbox id="is_paid" checked={isPaid} onCheckedChange={setIsPaid} />
            <label htmlFor="is_paid" className="text-sm">Ücretli İzin</label>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hak Ediş Şekli</Label>
          <select
            value={entitlementType}
            onChange={(e) => setEntitlementType(e.target.value)}
            className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          >
            <option value="yillik">Yıllık</option>
            <option value="her_talep_icin">Her Talep İçin</option>
            <option value="hak_bazi">Hak Bazlı</option>
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Varsayılan</Label>
          <div className="flex items-center gap-2 h-9">
            <Checkbox id="is_default" checked={isDefault} onCheckedChange={setIsDefault} />
            <label htmlFor="is_default" className="text-sm">Varsayılan Tür</label>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Min Gün</Label>
          <Input type="number" value={minDays} onChange={(e) => setMinDays(e.target.value)} placeholder="1" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max Gün (opsiyonel)</Label>
          <Input type="number" value={maxDays} onChange={(e) => setMaxDays(e.target.value)} placeholder="∞" className="h-9 text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Yıllık Limit (opsiyonel)</Label>
          <Input type="number" value={annualLimit} onChange={(e) => setAnnualLimit(e.target.value)} placeholder="∞" className="h-9 text-sm" />
        </div>
      </div>
      <div className="flex items-end gap-2 pt-2">
        <Button type="submit" size="sm">
          <Check className="w-3.5 h-3.5 mr-1" /> Kaydet
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    </form>
  );
}

export default function LeaveTypeManager() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const { data: items = [] } = useQuery({
    queryKey: ["leave-types"],
    queryFn: () => flowApi.entities.LeaveType.list("-sort_order"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.LeaveType.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      setShowForm(false);
      toast.success("İzin türü eklendi");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.LeaveType.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      setEditingItem(null);
      toast.success("İzin türü güncellendi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.LeaveType.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leave-types"] });
      toast.success("İzin türü silindi");
    },
  });

  const handleToggle = (item) => {
    updateMutation.mutate({ id: item.id, data: { is_active: !item.is_active } });
  };

  const groupedItems = items.reduce((acc, item) => {
    const key = item.is_paid ? "paid" : "unpaid";
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">İzin Türleri ve Kurallar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length} izin türü · {groupedItems.paid?.length || 0} ücretli · {groupedItems.unpaid?.length || 0} ücretsiz
          </p>
        </div>
        <Button onClick={() => { setShowForm(true); setEditingItem(null); }}>
          <Plus className="w-4 h-4 mr-1" /> Yeni İzin Türü
        </Button>
      </div>

      {showForm || editingItem ? (
        <LeaveTypeForm
          onSave={(data) => {
            if (editingItem) {
              updateMutation.mutate({ id: editingItem.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
          initial={editingItem}
        />
      ) : null}

      <div className="space-y-4">
        {groupedItems.paid?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Ücretli İzinler</h3>
            <div className="space-y-2">
              {groupedItems.paid.map((item) => (
                <LeaveTypeRow
                  key={item.id}
                  item={item}
                  onEdit={(i) => { setEditingItem(i); setShowForm(false); }}
                  onToggle={handleToggle}
                  onDelete={(i) => deleteMutation.mutate(i.id)}
                />
              ))}
            </div>
          </div>
        )}
        {groupedItems.unpaid?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Ücretsiz İzinler</h3>
            <div className="space-y-2">
              {groupedItems.unpaid.map((item) => (
                <LeaveTypeRow
                  key={item.id}
                  item={item}
                  onEdit={(i) => { setEditingItem(i); setShowForm(false); }}
                  onToggle={handleToggle}
                  onDelete={(i) => deleteMutation.mutate(i.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}