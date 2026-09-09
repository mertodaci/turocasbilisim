import { activityTypes } from "@/lib/activityHelpers";
import { cn } from "@/lib/utils";

const TYPE_COLORS = {
  telefon_gorusmesi: "bg-blue-400",
  ofis_toplantisi: "bg-purple-400",
  musteri_toplantisi: "bg-emerald-400",
  saha_ziyareti: "bg-orange-400",
  rapor_yazimi: "bg-slate-400",
  email_yazisma: "bg-cyan-400",
  egitim: "bg-amber-400",
  sunum: "bg-pink-400",
  diger: "bg-gray-400",
};

export default function CalendarEventDot({ activity }) {
  const typeInfo = activityTypes[activity.activity_type] || activityTypes.diger;
  const dotColor = TYPE_COLORS[activity.activity_type] || "bg-gray-400";

  return (
    <div className="flex items-center gap-1 px-1 py-0.5 rounded text-[9px] bg-muted/60 overflow-hidden">
      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColor)} />
      <span className="truncate text-foreground/70 leading-tight">
        {activity.employee_name?.split(" ")[0]} · {typeInfo.label.split(" ")[0]}
      </span>
    </div>
  );
}