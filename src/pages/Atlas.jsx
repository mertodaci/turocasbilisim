import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { useAuth } from "@/lib/AuthContext";
import { useStokAlerts } from "@/lib/NotificationContext";
import { useContractAlerts } from "@/lib/useContractAlerts";
import { useSetBreadcrumbLabel } from "@/lib/BreadcrumbContext";
import { computeAtlasData, computeAtlasDecisions, suggestionFor } from "@/lib/atlasScore";
import { cn } from "@/lib/utils";
import {
  Users, Boxes, ScrollText, Building2, Wallet, ClipboardList,
  ArrowLeft, ArrowUpRight, Sparkles, History,
} from "lucide-react";

const ICONS = { ik: Users, stok: Boxes, sozlesme: ScrollText, musteri: Building2, bordro: Wallet, is_takibi: ClipboardList };

const NODES = [
  { key: "ik", pos: { top: "6%", left: "50%" }, popoverPos: { top: "16%", left: "50%" } },
  { key: "sozlesme", pos: { top: "32%", left: "9%" }, popoverPos: { top: "32%", left: "27%" } },
  { key: "stok", pos: { top: "32%", left: "91%" }, popoverPos: { top: "32%", left: "55%" } },
  { key: "is_takibi", pos: { top: "80%", left: "17%" }, popoverPos: { top: "64%", left: "30%" } },
  { key: "musteri", pos: { top: "80%", left: "83%" }, popoverPos: { top: "64%", left: "55%" } },
  { key: "bordro", pos: { top: "97%", left: "50%" }, popoverPos: { top: "80%", left: "50%" } },
];

const SCORE_LEVEL = (score) => (score >= 90 ? "emerald" : score >= 75 ? "blue" : score >= 50 ? "amber" : "red");
const SCORE_BG = { emerald: "bg-emerald-500", blue: "bg-blue-500", amber: "bg-amber-500", red: "bg-red-500" };

export default function Atlas() {
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);

  useSetBreadcrumbLabel("Atlas");

  const { stokUyari } = useStokAlerts();
  const contractAlerts = useContractAlerts();

  const { data: summary } = useQuery({
    queryKey: ["admin-summary"],
    queryFn: () => fetch("/api/dashboard/admin-summary", { credentials: "include" }).then((r) => r.json()),
    staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000,
  });
  const { data: exec } = useQuery({
    queryKey: ["dashboard-executive"],
    queryFn: () => fetch("/api/dashboard/executive", { credentials: "include" }).then((r) => r.json()),
    staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false,
  });
  const { data: ikData } = useQuery({
    queryKey: ["ik-dashboard-admin"],
    queryFn: () => flowApi.ik.dashboard(),
    staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false,
  });
  const { data: stokPanel } = useQuery({
    queryKey: ["stok-dashboard-atlas"],
    queryFn: () => flowApi.stok.dashboard(),
    staleTime: 60 * 1000, refetchInterval: 10 * 60 * 1000, retry: false,
    enabled: selected === "stok",
  });

  const isPrivileged = user?.role === "admin" || user?.role === "yonetici";
  const dataReady = summary && exec && ikData;

  const { overall, modules } = dataReady
    ? computeAtlasData({ ikData, stokUyari, exec, summary, contractAlerts })
    : { overall: null, modules: {} };
  const decisions = dataReady ? computeAtlasDecisions({ contractAlerts, stokUyari, summary }) : [];
  const [showAllDecisions, setShowAllDecisions] = useState(false);
  const visibleDecisions = showAllDecisions ? decisions : decisions.slice(0, 3);

  if (!isPrivileged) {
    return <Navigate to="/" replace />;
  }

  const selectedModule = selected ? modules[selected] : null;
  const selectedSuggestion = selected ? suggestionFor(selected, { stokUyari, contractAlerts, ikData, summary }) : null;

  return (
    <div className="space-y-1">
      <div>
        <h1 className="text-xl font-bold text-foreground">Operasyon Atlası</h1>
        <p className="text-sm text-muted-foreground mt-1">Bir modül seçerek bugünkü sinyallerini incele.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr_320px] gap-5 items-start mt-4">

        {/* SOL — Bugünün Kararları */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 order-2 xl:order-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bugünün Kararları</h3>
            {decisions.length > 3 && (
              <button onClick={() => setShowAllDecisions((v) => !v)} className="text-xs text-indigo-500 hover:text-indigo-600 flex items-center gap-1">
                {showAllDecisions ? "Daha az" : "Tümü"} <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>
          {!dataReady ? (
            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
          ) : visibleDecisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Bugün için bekleyen bir karar yok.</p>
          ) : (
            <div className="space-y-3">
              {visibleDecisions.map((d) => (
                <div key={d.key} className="rounded-xl border border-border/50 bg-muted/20 p-3">
                  <p className="text-sm font-semibold text-foreground">{d.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{d.detail}</p>
                  <Link to={d.to} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-2">
                    {d.cta} <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ORTA — Atlas orbit */}
        <div className="order-1 xl:order-2 flex items-center justify-center py-6">
          <div className="relative w-full max-w-[480px] aspect-square">
            {/* dekoratif halkalar */}
            <div className="absolute inset-[8%] rounded-full border border-dashed border-border/60" />
            <div className="absolute inset-[24%] rounded-full border border-dashed border-border/40" />

            {/* merkez skor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full bg-gradient-to-br from-violet-600 to-purple-700 shadow-lg shadow-purple-500/30 flex flex-col items-center justify-center text-white z-10">
              <span className="text-3xl font-black">{overall ?? "—"}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wide opacity-90 text-center px-2">Operasyon Skoru</span>
            </div>

            {/* modül düğümleri */}
            {NODES.map((n) => {
              const m = modules[n.key];
              const Icon = ICONS[n.key];
              const isSelected = selected === n.key;
              return (
                <button
                  key={n.key}
                  disabled={!dataReady}
                  onClick={() => setSelected(isSelected ? null : n.key)}
                  style={{ top: n.pos.top, left: n.pos.left }}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 bg-card border rounded-xl px-3 py-2 shadow-sm hover:shadow-md transition-all text-left min-w-[128px] z-20",
                    isSelected ? "border-primary ring-2 ring-primary/30" : "border-border/60"
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold truncate">{m?.label || "—"}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{m?.orbitSubtitle || "..."}</p>
                </button>
              );
            })}

            {/* seçili düğümün küçük bilgi balonu */}
            {selected && selectedModule && (
              <div
                style={{ top: NODES.find((n) => n.key === selected).popoverPos.top, left: NODES.find((n) => n.key === selected).popoverPos.left }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-30 w-64 bg-card border border-border rounded-xl shadow-xl p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground">{selectedModule.label}</p>
                  <span className="text-[10px] font-medium text-muted-foreground">{selectedModule.healthLabel}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedModule.factors[0]?.detail || selectedModule.orbitSubtitle}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* SAĞ — Nabız / Modül Detayı */}
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-4 order-3 space-y-4">
          {!selected || !selectedModule ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nabız</h3>
                <span className="text-sm font-bold text-foreground">{overall ?? "—"} / 100</span>
              </div>
              <div className="space-y-1.5">
                {NODES.map((n) => {
                  const m = modules[n.key];
                  return (
                    <button
                      key={n.key}
                      onClick={() => setSelected(n.key)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left"
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", SCORE_BG[SCORE_LEVEL(m?.score ?? 0)])} />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm truncate">{m?.label}</span>
                        <span className="block text-[11px] text-muted-foreground truncate">{m?.orbitSubtitle}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-3.5 h-3.5" /> Atlas'a dön
              </button>

              <div className="flex items-center gap-2.5">
                {(() => { const Icon = ICONS[selected]; return (
                  <span className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </span>
                ); })()}
                <div>
                  <p className="text-sm font-bold text-foreground">{selectedModule.label}</p>
                  <p className="text-[11px] text-muted-foreground">Bugünkü durum ve önerilen aksiyon</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-muted-foreground">Operasyon seviyesi</span>
                  <span className="text-xs font-bold">{selectedModule.healthLabel}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", SCORE_BG[SCORE_LEVEL(selectedModule.score)])} style={{ width: `${selectedModule.score}%` }} />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{selectedModule.score} / 100</p>
              </div>

              {selectedSuggestion?.title && (
                <div className="rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 text-white p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Akıllı Öneri</span>
                  </div>
                  <p className="text-sm font-semibold">{selectedSuggestion.title}</p>
                  <p className="text-xs text-white/85 mt-1">{selectedSuggestion.text}</p>
                  {selectedSuggestion.cta && selectedSuggestion.to && (
                    <Link to={selectedSuggestion.to} className="inline-flex items-center gap-1 mt-2.5 text-xs font-semibold bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-2.5 py-1.5">
                      {selectedSuggestion.cta} <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              )}

              {selectedModule.factors.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Öncelikler</h4>
                  <div className="space-y-1.5">
                    {selectedModule.factors.map((f) => (
                      <div key={f.key} className="flex items-start gap-2 px-2.5 py-2 rounded-xl bg-muted/30">
                        <span className="text-sm flex-1 min-w-0">
                          <span className="block font-medium truncate">{f.count} {f.label}</span>
                          {f.detail && <span className="block text-[11px] text-muted-foreground truncate">{f.detail}</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected === "stok" && (stokPanel?.son_hareket?.length > 0) && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5" /> Son Hareketler
                  </h4>
                  <div className="space-y-1.5">
                    {stokPanel.son_hareket.slice(0, 5).map((h, i) => (
                      <div key={i} className="px-2.5 py-2 rounded-xl bg-muted/30">
                        <p className="text-xs font-medium truncate">
                          {{ giris: "Stok girişi yapıldı", cikis: "Stok çıkışı yapıldı", transfer: "Transfer yapıldı", iade: "İade yapıldı" }[h.tip] || h.tip}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">{h.urun_adi} · {h.depo_adi}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
