import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarDays, CheckSquare, Umbrella, Activity, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";

const activityTypeLabels = {
  telefon_gorusmesi: "Telefon Görüşmesi",
  ofis_toplantisi: "Ofis Toplantısı",
  musteri_toplantisi: "Müşteri Toplantısı",
  saha_ziyareti: "Saha Ziyareti",
  rapor_yazimi: "Rapor Yazımı",
  email_yazisma: "E-posta Yazışma",
  egitim: "Eğitim",
  sunum: "Sunum",
  is_takibi: "İş Takibi",
  test: "Test",
  analiz: "Analiz",
  diger: "Diğer",
};

const leaveTypeLabels = {
  yillik_izin: "Yıllık İzin",
  hastalik_izni: "Hastalık İzni",
  mazeret_izni: "Mazeret İzni",
  ucretsiz_izin: "Ücretsiz İzin",
  dogum_izni: "Doğum İzni",
  babalik_izni: "Babalık İzni",
  egitim_izni: "Eğitim İzni",
  dugun_izni: "Düğün İzni",
  olum_izni: "Vefat İzni",
};

const todoStatusLabels = {
  yapilacak: "Yapılacak",
  devam_ediyor: "Devam Ediyor",
  tamamlandi: "Tamamlandı",
  ertelendi: "Ertelendi",
};

const todoPriorityColors = {
  yuksek: "text-red-600",
  orta: "text-amber-600",
  dusuk: "text-green-600",
};

const workTaskStatusLabels = {
  beklemede: "Beklemede",
  devam_ediyor: "Devam Ediyor",
  onay_bekliyor: "Onay Bekliyor",
  tamamlandi: "Tamamlandı",
  iptal: "İptal",
};

export default function PersonalCalendarDayDetail({ date, activities = [], todos = [], leaves = [], workTasks = [] }) {
  const hasEvents = activities.length > 0 || todos.length > 0 || leaves.length > 0 || workTasks.length > 0;

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 space-y-4 h-fit">
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <CalendarDays className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-foreground capitalize text-sm">
          {format(date, "d MMMM yyyy, EEEE", { locale: tr })}
        </h3>
      </div>

      {!hasEvents && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Bu gün için etkinlik bulunmuyor.
        </p>
      )}

      {/* Aktiviteler */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Aktiviteler</span>
          </div>
          <div className="space-y-2">
            {activities.map((a) => (
              <div key={a.id} className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {activityTypeLabels[a.activity_type] || a.activity_type}
                </p>
                {a.duration_minutes && (
                  <p className="text-xs text-muted-foreground">{a.duration_minutes} dk</p>
                )}
                {a.notes && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{a.notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yapılacaklar */}
      {todos.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">Yapılacaklar</span>
          </div>
          <div className="space-y-2">
            {todos.map((t) => (
              <div key={t.id} className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
                <p className={cn("text-sm font-medium", t.status === "tamamlandi" && "line-through text-muted-foreground")}>
                  {t.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{todoStatusLabels[t.status]}</span>
                  {t.priority && (
                    <span className={cn("text-xs font-medium", todoPriorityColors[t.priority])}>
                      {t.priority === "yuksek" ? "Yüksek" : t.priority === "orta" ? "Orta" : "Düşük"}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İzinler */}
      {leaves.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Umbrella className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Onaylı İzin</span>
          </div>
          <div className="space-y-2">
            {leaves.map((l) => (
              <div key={l.id} className="rounded-xl bg-green-50 border border-green-100 px-3 py-2">
                <p className="text-sm font-medium text-foreground">
                  {leaveTypeLabels[l.leave_type] || l.leave_type}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.start_date} → {l.end_date} · {l.day_count} gün
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* İş Görevleri */}
      {workTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <ClipboardList className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">İş Görevleri</span>
          </div>
          <div className="space-y-2">
            {workTasks.map((t) => (
              <div key={t.id} className="rounded-xl bg-purple-50 border border-purple-100 px-3 py-2">
                <p className={cn("text-sm font-medium text-foreground", t.status === "tamamlandi" && "line-through text-muted-foreground")}>
                  {t.title}
                </p>
                <p className="text-xs text-muted-foreground">{workTaskStatusLabels[t.status] || t.status}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}