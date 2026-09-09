import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityTypes, outcomeLabels } from "@/lib/activityHelpers";
import { CheckCircle2, Building2, Home, MapPin, Link2, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function AddActivity() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [success, setSuccess] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const parentId = urlParams.get("parent_id") || "";

  const [form, setForm] = useState({
    employee_id: "",
    activity_type: urlParams.get("activity_type") || "",
    location: urlParams.get("location") || "ofis",
    duration_minutes: "",
    date: urlParams.get("date") || format(new Date(), "yyyy-MM-dd"),
    start_time: "",
    end_time: "",
    customer_id: urlParams.get("customer_id") || "",
    customer_name: urlParams.get("customer_name") || "",
    notes: urlParams.get("notes") || "",
    outcome: "",
    note_type: "",
    next_visit_date: "",
    parent_activity_id: parentId,
    job_ticket_id: "",
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  // Giriş yapan kullanıcıyla eşleşen çalışanı otomatik seç
  useEffect(() => {
    if (!user || form.employee_id || employees.length === 0) return;
    const matched = employees.find((e) => e.email === user.email);
    if (matched) setForm((f) => ({ ...f, employee_id: matched.id }));
  }, [employees, user]);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: "aktif" }),
  });

  const { data: activityTypeOptions = [] } = useQuery({
    queryKey: ["definitions", "aktivite_tipi"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "aktivite_tipi", is_active: true }),
  });

  const { data: locationOptions = [] } = useQuery({
    queryKey: ["definitions", "lokasyon"],
    queryFn: () => flowApi.entities.Definition.filter({ category: "lokasyon", is_active: true }),
  });

  const currentEmployee = employees.find((e) => e.email === user?.email);
  // Atama adi iki formatta olabilir: email prefix'i (or. devrim.elbir) VEYA tam ad (or. Mert Odaci).
  // Her iki adayla da sorgulayip sonuclari birlestiriyoruz.
  const myPrefix = user?.email ? user.email.split("@")[0] : null;
  const myFullName = user?.full_name || null;
  const myEmpName = currentEmployee?.full_name || null;
  const { data: jtByPrefix = [] } = useQuery({
    queryKey: ["tq-tickets-mine-prefix", myPrefix],
    queryFn: () => flowApi.entities.JTTicket.filter({ assigned_to_name: myPrefix }, "-created_date", 200),
    enabled: !!myPrefix,
  });
  const { data: jtByName = [] } = useQuery({
    queryKey: ["tq-tickets-mine-name", myFullName],
    queryFn: () => flowApi.entities.JTTicket.filter({ assigned_to_name: myFullName }, "-created_date", 200),
    enabled: !!myFullName && myFullName !== myPrefix,
  });
  const { data: jtByEmpName = [] } = useQuery({
    queryKey: ["tq-tickets-mine-empname", myEmpName],
    queryFn: () => flowApi.entities.JTTicket.filter({ assigned_to_name: myEmpName }, "-created_date", 200),
    enabled: !!myEmpName && myEmpName !== myPrefix && myEmpName !== myFullName,
  });
  const jtTickets = (() => {
    const seen = new Set();
    const out = [];
    for (const t of [...jtByPrefix, ...jtByName, ...jtByEmpName]) {
      if (t && t.id && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
    }
    return out;
  })();
  const activeTickets = jtTickets.filter(t => !["sonuclanan", "iptal", "arsivlendi"].includes(t.status));
  const selectedEmployee = employees.find((e) => e.id === form.employee_id);

  const createMutation = useMutation({
    mutationFn: (data) => flowApi.entities.Activity.create(data),
    onError: (err) => {
      toast.error("Aktivite kaydedilemedi: " + (err?.message || "Bilinmeyen hata"));
    },
    onSuccess: async (savedActivity) => {
      if (savedActivity?.job_ticket_id) {
        try {
          await flowApi.entities.JTComment.create({
            ticket_id: savedActivity.job_ticket_id,
            content: `Aktivite kaydedildi: ${savedActivity.employee_name} — ${savedActivity.duration_minutes} dk (${new Date(savedActivity.date).toLocaleDateString("tr-TR")})`,
            author_name: user?.full_name || savedActivity.employee_name,
            author_email: user?.email,
            comment_type: "activity",
          });
        } catch(e) {}
      }
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      setSuccess(true);
      toast.success("Aktivite kaydedildi");
      setTimeout(() => {
        if (parentId) {
          navigate(`/aktivite/${parentId}`);
        } else {
          setSuccess(false);
          setForm({
            employee_id: form.employee_id,
            activity_type: "",
            location: "ofis",
            duration_minutes: "",
            date: format(new Date(), "yyyy-MM-dd"),
            start_time: "",
            end_time: "",
            customer_id: "",
            customer_name: "",
            notes: "",
            outcome: "",
            parent_activity_id: "",
            job_ticket_id: "",
          });
        }
      }, 1500);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.activity_type || !form.duration_minutes || !form.outcome) {
      toast.error("Aktivite tipi, sure ve sonuc alanlari zorunludur!");
      return;
    }
    const selectedCustomer = customers.find((c) => c.id === form.customer_id);
    const payload = {
      ...form,
      employee_name: selectedEmployee?.full_name || "",
      duration_minutes: Number(form.duration_minutes),
      customer_name: selectedCustomer?.company_name || form.customer_name || "",
      customer_id: form.customer_id || "",
    };
    createMutation.mutate(payload);
  };

  const isJobTracking = form.activity_type === "is_takibi";

  // Baslangic-bitis saatinden dakika farki (gece yarisini gecerse +24s)
  const calcDuration = (start, end) => {
    if (!start || !end) return "";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => isNaN(n))) return "";
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) diff += 24 * 60; // gece yarisini gecen vardiya
    return String(diff);
  };
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          {parentId ? "Ek Aktivite Ekle" : "Aktivite Ekle"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {parentId ? "Orijinal aktivitenin devamı olarak kaydedin" : "Çalışan aktivitelerini kaydedin"}
        </p>
      </div>

      {parentId && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Link2 className="w-4 h-4 shrink-0" />
          <span>Bu aktivite bir önceki aktiviteye bağlı olarak kaydedilecek.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl p-6 border border-border/50 shadow-sm space-y-5">
        {/* Employee - Display Only */}
        {selectedEmployee && (
          <div className="space-y-2">
            <Label>Çalışan</Label>
            <div className="px-4 py-3 rounded-xl bg-muted border border-border/50 text-sm font-medium text-foreground">
              {selectedEmployee.full_name}
            </div>
          </div>
        )}

        {/* Activity Type */}
        <div className="space-y-2">
          <Label>Aktivite Tipi *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(activityTypeOptions.length > 0 ? activityTypeOptions : Object.entries(activityTypes).map(([k, v]) => ({ value: k, label: v.label }))).map((opt) => {
              const key = opt.value;
              const staticDef = activityTypes[key];
              const Icon = staticDef?.icon || MoreHorizontal;
              const isSelected = form.activity_type === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, activity_type: key, job_ticket_id: key !== "is_takibi" ? "" : form.job_ticket_id })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                    isSelected
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-center leading-tight">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isJobTracking && (
          <div className="space-y-2">
            <Label>İş Takibi Bileti</Label>
            <Select value={form.job_ticket_id} onValueChange={(v) => { const t = activeTickets.find(t => t.id === v); setForm({ ...form, job_ticket_id: v, customer_id: t?.customer_id || form.customer_id, customer_name: t?.customer_name || form.customer_name }); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Bilet seçin..." /></SelectTrigger>
              <SelectContent>
                {activeTickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2 max-w-[520px]">
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">#{t.ticket_number}</span>
                      <span className="truncate">{t.customer_name ? `[${t.customer_name}] ` : ""}{t.title}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {/* Location */}

        {/* Location */}
        <div className="space-y-2">
          <Label>Çalışma Lokasyonu *</Label>
          <div className="grid grid-cols-3 gap-2">
            {(locationOptions.length > 0
              ? locationOptions
              : [
                  { value: "ofis", label: "Ofis" },
                  { value: "evden", label: "Evden" },
                  { value: "saha", label: "Saha" },
                ]
            ).map((opt) => {
              const key = opt.value;
              const staticIcons = { ofis: Building2, evden: Home, saha: MapPin };
              const Icon = staticIcons[key] || MapPin;
              const staticColors = {
                ofis: { color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-300" },
                evden: { color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-300" },
                saha: { color: "text-orange-500", bg: "bg-orange-50", border: "border-orange-300" },
              };
              const style = staticColors[key] || { color: "text-slate-500", bg: "bg-slate-50", border: "border-slate-300" };
              const isSelected = form.location === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setForm({ ...form, location: key })}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium",
                    isSelected ? `${style.border} ${style.bg} ${style.color}` : "border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date & Time & Duration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Tarih *</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Süre (dk) *</Label>
            <Input
              type="number"
              value={form.duration_minutes}
              readOnly
              placeholder="Saatlerden hesaplanır"
              className="rounded-xl bg-muted/50 cursor-not-allowed"
              title="Başlangıç ve bitiş saatinden otomatik hesaplanır"
            />
            <p className="text-xs text-muted-foreground">Başlangıç ve bitiş saatine göre otomatik hesaplanır.</p>
          </div>
          <div className="space-y-2">
            <Label>Başlangıç Saati</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => {
                const start_time = e.target.value;
                setForm((prev) => ({ ...prev, start_time, duration_minutes: calcDuration(start_time, prev.end_time) }));
              }}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label>Bitiş Saati</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => {
                const end_time = e.target.value;
                setForm((prev) => ({ ...prev, end_time, duration_minutes: calcDuration(prev.start_time, end_time) }));
              }}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Customer & Outcome */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Müşteri</Label>
            <Select
              value={form.customer_id || "none"}
              onValueChange={(v) => setForm({ ...form, customer_id: v === "none" ? "" : v })}
            >
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Müşteri seçiniz (opsiyonel)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Seçilmedi —</SelectItem>
                {[...customers].sort((a, b) => (a.company_name || "").localeCompare(b.company_name || "", "tr")).map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Sonuç *</Label>
            <Select value={form.outcome} onValueChange={(v) => setForm({ ...form, outcome: v })}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Seçiniz (zorunlu)" /></SelectTrigger>
              <SelectContent>
                {Object.entries(outcomeLabels).map(([key, val]) => (
                  <SelectItem key={key} value={key}>{val.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notlar</Label>
          <Textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Aktivite hakkında notlar..."
            className="rounded-xl h-20"
          />
        </div>

        <Button
          type="submit"
          className="w-full rounded-xl h-12 text-base"
          disabled={!form.activity_type || !form.duration_minutes || !form.outcome || createMutation.isPending}
        >
          {success ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" /> Kaydedildi!
            </span>
          ) : createMutation.isPending ? (
            "Kaydediliyor..."
          ) : (
            "Aktiviteyi Kaydet"
          )}
        </Button>
      </form>
    </div>
  );
}