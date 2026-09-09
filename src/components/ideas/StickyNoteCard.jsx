import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const categoryLabels = {
  surec_iyilestirme: "Süreç",
  musteri_deneyimi: "Müşteri",
  urun_gelistirme: "Ürün",
  tasarruf: "Tasarruf",
  motivasyon: "Motivasyon",
  diger: "Diğer",
};

// Sticky note pastel colors — cycling by index via id hash
const NOTE_COLORS = [
  { bg: "bg-yellow-100", header: "bg-yellow-200", border: "border-yellow-300" },
  { bg: "bg-pink-100", header: "bg-pink-200", border: "border-pink-300" },
  { bg: "bg-green-100", header: "bg-green-200", border: "border-green-300" },
  { bg: "bg-blue-100", header: "bg-blue-200", border: "border-blue-300" },
  { bg: "bg-purple-100", header: "bg-purple-200", border: "border-purple-300" },
  { bg: "bg-orange-100", header: "bg-orange-200", border: "border-orange-300" },
  { bg: "bg-teal-100", header: "bg-teal-200", border: "border-teal-300" },
  { bg: "bg-rose-100", header: "bg-rose-200", border: "border-rose-300" },
];

function getColorForId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return NOTE_COLORS[Math.abs(hash) % NOTE_COLORS.length];
}

export default function StickyNoteCard({
  idea, isPrivileged, currentUser, statusConfig,
  onEdit, onDelete, onStatusChange, onNoteSubmit,
}) {
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState(idea.manager_note || "");
  const [showActions, setShowActions] = useState(false);

  const color = getColorForId(idea.id);
  const sc = statusConfig[idea.status] || statusConfig.beklemede;
  const StatusIcon = sc.icon;
  const isOwner = idea.submitted_by_name === (currentUser?.full_name || currentUser?.email);
  const canEdit = isPrivileged || isOwner;

  return (
    <div
      className={cn(
        "rounded-2xl border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5",
        color.bg, color.border
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); }}
    >
      {/* Top strip */}
      <div className={cn("rounded-t-2xl px-4 py-2.5 flex items-center justify-between gap-2", color.header)}>
        <span className={cn("flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full", sc.color)}>
          <StatusIcon className="w-2.5 h-2.5" />
          {sc.label}
        </span>
        <span className="text-[10px] text-foreground/50 bg-white/40 px-2 py-0.5 rounded-full">
          {categoryLabels[idea.category] || idea.category}
        </span>
      </div>

      {/* Body */}
      <div className="px-4 pt-3 pb-2">
        <p className="font-bold text-foreground text-sm leading-snug mb-1.5">{idea.title}</p>
        <p className="text-xs text-foreground/70 leading-relaxed whitespace-pre-wrap">{idea.description}</p>

        {idea.manager_note && (
          <div className="mt-3 bg-white/50 border border-white/80 rounded-xl px-3 py-2 text-xs text-foreground/70">
            <span className="font-semibold text-foreground/80">Not: </span>{idea.manager_note}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 pb-3">
        <div className={cn("flex items-center justify-between pt-2 border-t border-black/10 transition-all")}>
          <span className="text-[10px] text-foreground/50">{idea.submitted_by_name || "—"}</span>
          <div className={cn("flex gap-1 transition-opacity duration-150", showActions ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")}>
            {canEdit && (
              <button
                onClick={onEdit}
                className="p-1.5 rounded-lg hover:bg-black/10 transition-colors"
                title="Düzenle"
              >
                <Pencil className="w-3 h-3 text-foreground/60" />
              </button>
            )}
            {canEdit && (
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg hover:bg-red-200 transition-colors"
                title="Sil"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
              </button>
            )}
          </div>
        </div>

        {/* Manager status & note actions */}
        {isPrivileged && (
          <div className="mt-2 space-y-2">
            <div className="flex gap-1 flex-wrap">
              {["inceleniyor", "onaylandi", "reddedildi"].map((s) => {
                const conf = statusConfig[s];
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(s)}
                    className={cn(
                      "text-[10px] px-2 py-0.5 rounded-full border transition-all font-medium",
                      idea.status === s
                        ? conf.color + " border-transparent"
                        : "border-black/15 text-foreground/50 hover:border-black/30 bg-white/40"
                    )}
                  >
                    {conf.label}
                  </button>
                );
              })}
              <button
                onClick={() => setEditingNote(!editingNote)}
                className="text-[10px] px-2 py-0.5 rounded-full border border-black/15 text-foreground/50 hover:border-black/30 bg-white/40 transition-all font-medium"
              >
                Not
              </button>
            </div>
            {editingNote && (
              <div className="flex gap-1.5">
                <Input
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Yönetici notu..."
                  className="rounded-xl text-xs h-8 bg-white/60 border-black/15"
                />
                <Button
                  size="sm"
                  className="h-8 rounded-xl text-xs shrink-0"
                  onClick={() => { onNoteSubmit(noteText); setEditingNote(false); }}
                >
                  Kaydet
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}