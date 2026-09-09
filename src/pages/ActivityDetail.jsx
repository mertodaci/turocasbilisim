import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { ArrowLeft, Pencil, Trash2, PlusCircle, Clock, Calendar, MapPin, User, Building2, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { activityTypes, formatDuration, outcomeLabels } from "@/lib/activityHelpers";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useState } from "react";
import ActivityEditDialog from "@/components/activities/ActivityEditDialog";
import { useAuth } from "@/lib/AuthContext";

const locationLabels = {
  ofis: { label: "Ofis", icon: Building2, color: "text-blue-500" },
  evden: { label: "Evden", icon: Building2, color: "text-emerald-500" },
  saha: { label: "Saha", icon: MapPin, color: "text-orange-500" },
};

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editActivity, setEditActivity] = useState(null);
  const { user } = useAuth();

  const { data: activity, isLoading } = useQuery({
    queryKey: ["activity", id],
    queryFn: () => flowApi.entities.Activity.get(id),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => flowApi.entities.Employee.filter({ status: "aktif" }),
  });

  const { data: parentActivity } = useQuery({
    queryKey: ["activity", activity?.parent_activity_id],
    queryFn: () => flowApi.entities.Activity.get(activity.parent_activity_id),
    enabled: !!activity?.parent_activity_id,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.entities.Activity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities-list"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      toast.success("Aktivite silindi");
      navigate("/aktiviteler");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.entities.Activity.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity", id] });
      queryClient.invalidateQueries({ queryKey: ["activities-list"] });
      setEditActivity(null);
      toast.success("Aktivite güncellendi");
    },
  });

  const handleFollowUp = () => {
    const params = new URLSearchParams({
      parent_id: activity.id,
      employee_id: activity.employee_id,
      employee_name: activity.employee_name || "",
      activity_type: activity.activity_type,
      location: activity.location || "ofis",
      customer_id: activity.customer_id || "",
      customer_name: activity.customer_name || "",
      notes: activity.notes || "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    navigate(`/aktivite-ekle?${params.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-7 h-7 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="text-center py-16 text-muted-foreground">Aktivite bulunamadı</div>
    );
  }

  const typeInfo = activityTypes[activity.activity_type] || activityTypes.diger;
  const Icon = typeInfo.icon;
  const outcome = activity.outcome ? outcomeLabels[activity.outcome] : null;
  const locInfo = locationLabels[activity.location] || locationLabels.ofis;
  const LocIcon = locInfo.icon;

  // Kullanıcının kendi aktivitesi mi kontrol et
  const currentEmployee = employees.find((e) => e.email === user?.email);
  const isOwnActivity = currentEmployee?.id === activity.employee_id;
  const isAdmin = user?.role === "admin" || user?.role === "yonetici";
  const canEdit = isOwnActivity || isAdmin;

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Aktivite Detayı</h1>
          <p className="text-xs text-muted-foreground">
            {format(new Date(activity.date), "d MMMM yyyy", { locale: tr })}
          </p>
        </div>
      </div>

      {/* Parent Activity Link */}
      {parentActivity && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Link2 className="w-4 h-4 shrink-0" />
          <span>Bu aktivite, </span>
          <Link to={`/aktivite/${parentActivity.id}`} className="font-semibold underline underline-offset-2">
            {parentActivity.employee_name} — {activityTypes[parentActivity.activity_type]?.label}
          </Link>
          <span> aktivitesinin devamıdır.</span>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6 space-y-5">
        {/* Type & Outcome */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", typeInfo.bg)}>
              <Icon className={cn("w-6 h-6", typeInfo.color)} />
            </div>
            <div>
              <p className="font-semibold text-foreground">{typeInfo.label}</p>
              <p className="text-sm text-muted-foreground">{activity.employee_name}</p>
            </div>
          </div>
          {outcome && (
            <Badge className={cn("text-xs", outcome.bg, outcome.color)}>{outcome.label}</Badge>
          )}
        </div>

        <div className="border-t border-border/40" />

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Tarih</p>
              <p className="font-medium">{format(new Date(activity.date), "d MMM yyyy", { locale: tr })}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Süre</p>
              <p className="font-medium">{formatDuration(activity.duration_minutes)}</p>
            </div>
          </div>
          {activity.start_time && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Başlangıç</p>
                <p className="font-medium">{activity.start_time}</p>
              </div>
            </div>
          )}
          {activity.end_time && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Bitiş</p>
                <p className="font-medium">{activity.end_time}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm">
            <LocIcon className={cn("w-4 h-4", locInfo.color)} />
            <div>
              <p className="text-xs text-muted-foreground">Lokasyon</p>
              <p className="font-medium">{locInfo.label}</p>
            </div>
          </div>
          {activity.customer_name && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Müşteri</p>
                <p className="font-medium">{activity.customer_name}</p>
              </div>
            </div>
          )}
          {activity.taskqube_id && (
            <div className="flex items-center gap-2 text-sm">
              <Link2 className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Taskqube ID</p>
                <p className="font-medium text-violet-600">{activity.taskqube_id}</p>
              </div>
            </div>
          )}
        </div>

        {activity.notes && (
          <>
            <div className="border-t border-border/40" />
            <div className="flex items-start gap-2 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Notlar</p>
                <p className="text-foreground leading-relaxed">{activity.notes}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {canEdit && (
          <Button
            variant="outline"
            className="flex-1 rounded-xl gap-2"
            onClick={() => setEditActivity(activity)}
          >
            <Pencil className="w-4 h-4" /> Düzenle
          </Button>
        )}
        {isOwnActivity && (
          <Button
            className="flex-1 rounded-xl gap-2"
            onClick={handleFollowUp}
          >
            <PlusCircle className="w-4 h-4" /> Ek Aktivite Ekle
          </Button>
        )}
        {canEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => deleteMutation.mutate(activity.id)}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <ActivityEditDialog
        activity={editActivity}
        employees={employees}
        onClose={() => setEditActivity(null)}
        onSubmit={(data) => updateMutation.mutate({ id: editActivity.id, data })}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}