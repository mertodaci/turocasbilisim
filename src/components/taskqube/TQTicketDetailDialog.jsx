import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  User, Calendar, Clock, MessageSquare,
  Send, Lock, Unlock, Tag, CheckCircle2, History, ArrowRight, X, Paperclip, FileText, ExternalLink, Loader2, Maximize2, Minimize2, Pencil, Trash2, Workflow, Flag, ChevronDown
} from "lucide-react";
import TQTicketFormDialog from "./TQTicketFormDialog";
import { cn } from "@/lib/utils";
import { invalidateTicketQueries } from "@/lib/taskqubeQueryUtils";
import { SearchableSelect } from "@/components/ui/SearchableSelect";

const COLOR_BADGE = {
  slate: "bg-slate-100 text-slate-700", purple: "bg-purple-100 text-purple-700",
  blue: "bg-blue-100 text-blue-700", orange: "bg-orange-100 text-orange-700",
  yellow: "bg-yellow-100 text-yellow-700", green: "bg-green-100 text-green-700",
  red: "bg-red-100 text-red-700", pink: "bg-pink-100 text-pink-700", teal: "bg-teal-100 text-teal-700",
};

const COLOR_BAR = {
  slate: "bg-slate-400", purple: "bg-purple-500", blue: "bg-blue-500", orange: "bg-orange-500",
  yellow: "bg-yellow-500", green: "bg-green-500", red: "bg-red-500", pink: "bg-pink-500", teal: "bg-teal-500",
};

// Bölüm kartı pastelleri (tam sınıf adları -- Tailwind JIT taraması icin)
const PASTEL = {
  slate:  "bg-slate-50 border-slate-200/70 dark:bg-slate-900/30 dark:border-slate-800",
  blue:   "bg-blue-50/70 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-900",
  amber:  "bg-amber-50/70 border-amber-200/60 dark:bg-amber-950/20 dark:border-amber-900",
  teal:   "bg-teal-50/70 border-teal-200/60 dark:bg-teal-950/20 dark:border-teal-900",
  violet: "bg-violet-50/70 border-violet-200/60 dark:bg-violet-950/20 dark:border-violet-900",
  indigo: "bg-indigo-50/70 border-indigo-200/60 dark:bg-indigo-950/20 dark:border-indigo-900",
};
const PASTEL_LABEL = {
  slate:  "text-slate-600 dark:text-slate-300",
  blue:   "text-blue-700/80 dark:text-blue-300",
  amber:  "text-amber-700/80 dark:text-amber-300",
  teal:   "text-teal-700/80 dark:text-teal-300",
  violet: "text-violet-700/80 dark:text-violet-300",
  indigo: "text-indigo-700/80 dark:text-indigo-300",
};
// Durum kartı: biletin durum rengine (stColor) hafif tint
const STATUS_TINT = {
  slate:  "bg-slate-50 border-slate-200/70 dark:bg-slate-900/30 dark:border-slate-800",
  purple: "bg-purple-50/70 border-purple-200/60 dark:bg-purple-950/20 dark:border-purple-900",
  blue:   "bg-blue-50/70 border-blue-200/60 dark:bg-blue-950/20 dark:border-blue-900",
  orange: "bg-orange-50/70 border-orange-200/60 dark:bg-orange-950/20 dark:border-orange-900",
  yellow: "bg-yellow-50/70 border-yellow-200/60 dark:bg-yellow-950/20 dark:border-yellow-900",
  green:  "bg-green-50/70 border-green-200/60 dark:bg-green-950/20 dark:border-green-900",
  red:    "bg-red-50/70 border-red-200/60 dark:bg-red-950/20 dark:border-red-900",
  pink:   "bg-pink-50/70 border-pink-200/60 dark:bg-pink-950/20 dark:border-pink-900",
  teal:   "bg-teal-50/70 border-teal-200/60 dark:bg-teal-950/20 dark:border-teal-900",
};

const PRIORITY_CONFIG = {
  dusuk: { label: "Düşük", color: "bg-slate-100 text-slate-600" },
  orta: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  yuksek: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  kritik: { label: "Kritik", color: "bg-red-100 text-red-700" },
};

// İş Akışı sekmesi -- faz (grup) sırası ve etiketleri (diğer TaskQube ekranlarıyla tutarlı)
const FLOW_GROUP_ORDER = ["talep", "analiz", "gelistirme", "test_onay", "tamamlanan", "diger"];
const FLOW_GROUP_LABEL = { talep: "Talep", analiz: "Analiz", gelistirme: "Geliştirme", test_onay: "Test / Onay", tamamlanan: "Tamamlanan", diger: "Diğer" };
const normFlowGroup = (gk) => FLOW_GROUP_ORDER.includes(gk) ? gk : "diger";

const nrm = (x) => String(x || "").trim().toLocaleLowerCase("tr");
// Harcanan Efor: durum fazi -> ekip. gelistirme = Yazilim; analiz + test = Analiz;
// onay (test_onay grubunda adinda "onay" gecen durumlar) = kimseye yazilmaz (Diger).
const PHASE_TEAM = { analiz: "analiz", gelistirme: "yazilim", test_onay: "analiz", talep: "diger", tamamlanan: "diger", diger: "diger" };
// test_onay grubunda: adinda "onay" varsa -> Diger, yoksa (test) -> Analiz
const teamOfPhase = (group, label) => {
  if (group === "test_onay") return nrm(label).includes("onay") ? "diger" : "analiz";
  return PHASE_TEAM[group] || "diger";
};
// Panoya ozel: bir bilet ilgili duruma tasinirken o ekibin elle girilmis
// "Harcanan Zaman"i bossa yumusak uyari (zorunlu degil). "match" = hedef durumun
// key'inde (alt cizgi -> bosluk) YA DA adinda aranan normalize alt dize.
const EFFORT_WARN_BOARDS = [
  { board: "ybs teknik destek", rules: [
    { match: "analiz onay",      team: "analiz",  label: "Analiz" },
    { match: "test",             team: "yazilim", label: "Yazılım" },
  ]},
  { board: "abys om", rules: [
    { match: "analiz tamamland", team: "analiz",  label: "Analiz" },
    { match: "analiz test",      team: "yazilim", label: "Yazılım" },
    { match: "kurum test",       team: "yazilim", label: "Yazılım" },
  ]},
];
const TEAM_LABEL = { analiz: "Analiz", yazilim: "Yazılım", diger: "Diğer" };
const TEAM_TAG = {
  analiz:  "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  yazilim: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  diger:   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};
const fmtDur = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mi = m % 60;
  if (d) return `${d}g ${h}s`;
  if (h) return `${h}s ${mi}d`;
  return `${mi}d`;
};
// Kisi bazinda girilen gercek harcanan zaman -> "1 sa 30 dk" / "45 dk" / "10 sa"
const fmtHours = (h) => {
  const total = Math.round((Number(h) || 0) * 60);
  const hh = Math.floor(total / 60), mm = total % 60;
  if (!hh && !mm) return "0 sa";
  return [hh ? `${hh} sa` : "", mm ? `${mm} dk` : ""].filter(Boolean).join(" ");
};
// hours (REAL) -> { saat, dakika } string alanlari (form icin)
const splitHours = (h) => {
  const total = Math.round((Number(h) || 0) * 60);
  return {
    saat: Math.floor(total / 60) ? String(Math.floor(total / 60)) : "",
    dakika: total % 60 ? String(total % 60) : "",
  };
};
// Merkez ekip uyeligi: position/department metninde "yazilim"/"analiz" geciyor mu
// (TQKanbanBoard.jsx'teki isDeveloper/isAnalyst ile ayni yaklasim).
const empRoleText = (e) => `${e?.position || ""} ${e?.department || ""}`.toLocaleLowerCase("tr");
const isTeamMember = (e, team) => {
  const s = empRoleText(e);
  return team === "yazilim"
    ? (s.includes("yazilim") || s.includes("yazılım"))
    : (s.includes("analiz") || s.includes("analist"));
};
// yyyy-mm-dd -> "dd.MM.yyyy"
const fmtLogDate = (s) => { if (!s) return ""; const d = new Date(s); return Number.isNaN(+d) ? String(s) : format(d, "dd.MM.yyyy"); };



const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:3001" : "");
export default function TQTicketDetailDialog({ ticket, employees, projects, customers = [], open, onOpenChange, isMusteri = false, canEdit = true }) {
  const queryClient = useQueryClient();
  const [commentContent, setCommentContent] = useState("");
  const [selectedParentId, setSelectedParentId] = useState("");
  const [selectedRelatedIds, setSelectedRelatedIds] = useState([]);
  const [parentSearch, setParentSearch] = useState("");
  const [relatedSearch, setRelatedSearch] = useState("");
  const [showRelatedForm, setShowRelatedForm] = useState(false);
  const [effortOpen, setEffortOpen] = useState(false);
  const emptyPlan = { planned_hours: "", assignee_id: "", assignee_name: "", note: "" };
  const [planTeam, setPlanTeam] = useState(null); // 'analiz' | 'yazilim' | null
  const [planForm, setPlanForm] = useState(emptyPlan);
  const emptyLog = { team: null, person_id: "", person_name: "", saat: "", dakika: "", work_date: new Date().toISOString().slice(0, 10), note: "" };
  const [logEditing, setLogEditing] = useState(null); // { id?, team, person_id, person_name, hours, work_date, note } | null

  const linkRelatedMutation = useMutation({
    mutationFn: async ({ parentId, relatedIds }) => {
      // Seçilen ilişkili biletlerin parent_ticket_id'sini ana bilete ayarla
      for (const id of relatedIds) {
        if (id !== parentId) {
          await flowApi.entities.TQTicket.update(id, { parent_ticket_id: parentId });
        }
      }
      // Ana biletin kendi parent'ını temizle
      await flowApi.entities.TQTicket.update(parentId, { parent_ticket_id: "" });
    },
    onSuccess: () => {
      invalidateTicketQueries(queryClient);
      setShowRelatedForm(false);
      setSelectedParentId("");
      setSelectedRelatedIds([]);
      toast.success("İlişkili biletler kaydedildi");
    },
    onError: (err) => {
      toast.error(err?.message || "İşlem başarısız");
    },
  });
  const [previewFile, setPreviewFile] = useState(null); // { url, name, type }
  const [previewText, setPreviewText] = useState(null);
  const [previewZoomed, setPreviewZoomed] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const openPreview = async (att) => {
    const isImage = att.type?.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)$/i.test(att.name);
    const isPdf = att.type === "application/pdf" || /\.pdf$/i.test(att.name);
    const isTxt = att.type === "text/plain" || /\.txt$/i.test(att.name);
    setPreviewZoomed(false);
    if (isImage || isPdf) {
      setPreviewFile(att);
      setPreviewText(null);
    } else if (isTxt) {
      try {
        const res = await fetch(att.url);
        const text = await res.text();
        setPreviewText(text);
        setPreviewFile(att);
      } catch { setPreviewFile(att); setPreviewText("Dosya okunamadı."); }
    } else {
      window.open(att.url, "_blank");
    }
  };

  const closePreview = () => { setPreviewFile(null); setPreviewText(null); setPreviewZoomed(false); };
  const [commentAttachments, setCommentAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData(); fd.append("file", file);
      const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
      const data = await res.json();
      const file_url = `${BASE_URL}${data.url}`;
      setCommentAttachments(prev => [...prev, { name: file.name, url: file_url, type: file.type }]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePaste = async (e) => {
    const items = Array.from(e.clipboardData?.items || []);
    const imageItem = items.find(i => i.type.startsWith("image/"));
    if (!imageItem) return;
    const file = imageItem.getAsFile();
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`${BASE_URL}/api/upload`, { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    const file_url = `${BASE_URL}${data.url}`;
    const name = `ekran-goruntusu-${Date.now()}.png`;
    setCommentAttachments(prev => [...prev, { name, url: file_url, type: file.type }]);
    setUploading(false);
  };

  const removeCommentAttachment = (idx) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== idx));
  };
  const [isInternal, setIsInternal] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  // Local state — ticket prop değişince sıfırla
  const [localStatus, setLocalStatus] = useState(ticket?.status || "");
  const [localBoardId, setLocalBoardId] = useState(ticket?.board_id || "");
  const [localContactName, setLocalContactName] = useState(ticket?.customer_contact_name || "");
  const [localAssignedIds, setLocalAssignedIds] = useState(
    ticket?.assigned_to_ids || (ticket?.assigned_to_id ? [ticket.assigned_to_id] : [])
  );
  const [localAssignedNames, setLocalAssignedNames] = useState(
    ticket?.assigned_to_names || (ticket?.assigned_to_name ? [ticket.assigned_to_name] : [])
  );

  // ticket prop değişince local state'i senkronize et
  useEffect(() => {
    setLocalStatus(ticket?.status || "");
    setLocalBoardId(ticket?.board_id || "");
    setLocalContactName(ticket?.customer_contact_name || "");
    setLocalAssignedIds(ticket?.assigned_to_ids || (ticket?.assigned_to_id ? [ticket.assigned_to_id] : []));
    setLocalAssignedNames(ticket?.assigned_to_names || (ticket?.assigned_to_name ? [ticket.assigned_to_name] : []));
  }, [ticket?.id, ticket?.status, ticket?.assigned_to_ids]);

  const { data: customerContactsList = [] } = useQuery({
    queryKey: ["customer-contacts", ticket?.customer_id],
    queryFn: async () => {
      const all = await flowApi.auth.users();
      return (all || []).filter(u => u.customer_id === ticket.customer_id && u.role === "musteri");
    },
    enabled: !!ticket?.customer_id,
  });
  const { data: statuses = [] } = useQuery({
    queryKey: ["tq-statuses"],
    queryFn: () => flowApi.entities.TQTicketStatus.filter({ is_active: true }, "sort_order", 500),
  });
  const { data: boards = [] } = useQuery({
    queryKey: ["tq-boards"],
    queryFn: () => flowApi.entities.TQKanbanBoard.filter({ is_active: true }),
  });

  // Tekillestirme (getStatusCfg gibi genel kullanim icin - tum statuler)
  const statusesUniq = (() => { const seen = new Set(); return statuses.filter(s => { if (seen.has(s.key)) return false; seen.add(s.key); return true; }); })();
  // DURUM combo: ONCE secili panoya gore filtrele SONRA key'e gore tekillestir.
  // (Her key 8 panoda 8 satir; once filtrelemezsek yanlis satir secilip board_ids tutmaz.)
  const statusesForBoard = (() => {
    const bid = localBoardId || ticket?.board_id;
    const inBoard = statuses.filter(s => {
      const bids = Array.isArray(s.board_ids) ? s.board_ids : [];
      if (bids.length === 0) return true;   // bos = tum panolar
      if (!bid) return true;                // biletin panosu yoksa hepsi
      return bids.includes(bid);
    });
    // Ayni key birden cok satirda olabilir (her pano kendi adini verir).
    // Bu biletin panosuna OZEL satiri, jenerik (board_ids bos) satira tercih et.
    const byKey = new Map();
    const specific = new Set();
    for (const s of inBoard) {
      const bids = Array.isArray(s.board_ids) ? s.board_ids : [];
      const isBoardSpecific = !!(bid && bids.includes(bid));
      if (!byKey.has(s.key) || (isBoardSpecific && !specific.has(s.key))) {
        byKey.set(s.key, s);
        if (isBoardSpecific) specific.add(s.key);
      }
    }
    return [...byKey.values()];
  })();
  const getStatusCfg = (key) => {
    const s = statusesForBoard.find(x => x.key === key) || statusesUniq.find(x => x.key === key);
    if (!s) return { label: key, color: "bg-slate-100 text-slate-700" };
    return { label: s.name, color: COLOR_BADGE[s.color] || "bg-slate-100 text-slate-700" };
  };

  const { data: ticketActivities = [] } = useQuery({
    queryKey: ["activities-by-ticket", ticket?.id],
    queryFn: () => flowApi.entities.Activity.filter({ taskqube_id: ticket?.id }),
    enabled: !!ticket?.id,
  });
  const { data: comments = [] } = useQuery({
    queryKey: ["tq-comments", ticket?.id],
    queryFn: () => flowApi.entities.TQComment.filter({ ticket_id: ticket?.id }),
    enabled: !!ticket?.id,
  });
  const { data: allTickets = [] } = useQuery({
    queryKey: ["tq-tickets"],
    queryFn: () => flowApi.entities.TQTicket.filter({ exclude_archived: 1 }),
    staleTime: 0,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => flowApi.auth.me(),
  });
  // Plan (tq_effort_plans) alt-satiri + Planla dialogu: yalniz yonetici + admin.
  const isPlanManager = currentUser?.role === "admin" || currentUser?.role === "yonetici";

  const { data: effortPlans = [] } = useQuery({
    queryKey: ["tq-effort-plans", ticket?.id],
    queryFn: () => flowApi.entities.TQEffortPlan.filter({ ticket_id: ticket?.id }),
    enabled: !!ticket?.id && isPlanManager,
  });
  const planFor = (team) => effortPlans.find(p => p.team === team) || null;

  const { data: currentEmployee } = useQuery({
    queryKey: ["employee-me", currentUser?.email],
    queryFn: () => flowApi.entities.Employee.filter({ email: currentUser?.email }),
    enabled: !!currentUser?.email,
    select: (data) => data[0],
  });

  const { data: effortLogs = [] } = useQuery({
    queryKey: ["tq-effort-logs", ticket?.id],
    queryFn: () => flowApi.entities.TQEffortLog.filter({ ticket_id: ticket?.id }),
    enabled: !!ticket?.id,
  });
  const myEmployeeId = currentEmployee?.id;
  const isAssignedToTicket = !!myEmployeeId && localAssignedIds.includes(myEmployeeId);
  const logsFor = (team) => effortLogs.filter(l => l.team === team);

  const addCommentMutation = useMutation({
    mutationFn: (data) => flowApi.entities.TQComment.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tq-comments", ticket?.id] });
      setCommentContent("");
      setCommentAttachments([]);
      // Bu mutation, gercek kullanici yorumlari icin oldugu kadar durum
      // degisikligi/sorumlu ekleme-cikarma gibi ic gunluk (audit) kayitlari
      // icin de kullaniliyor (comment_type: "system") -- asagidaki islem
      // gecmisi kaydi ve toast sadece gercek bir yorum eklendiginde calismali,
      // yoksa ör. bir durum degisikligi kendi hakkinda "yorum eklendi" diye
      // ikinci bir gecmis kaydi olustururdu.
      if (variables.comment_type !== "system") {
        // İşlem geçmişine kaydet: belge varsa dosya adiyla, yoksa (duz
        // yorumda da) kisa bir isaretle -- yorumun tam metni Yorumlar
        // sekmesinde zaten okunabiliyor, burada tekrar edilmiyor.
        const hasAttachments = variables.attachments?.length > 0;
        const hasContent = variables.content?.trim();
        let historyMsg = null;
        if (hasAttachments) {
          const fileNames = variables.attachments.map(a => a.name).join(", ");
          historyMsg = hasContent ? `Yorum ve belge eklendi: ${fileNames}` : `Belge eklendi: ${fileNames}`;
        } else if (hasContent) {
          historyMsg = "Yorum eklendi";
        }
        if (historyMsg) {
          flowApi.entities.TQComment.create({
            ticket_id: ticket.id,
            author_id: variables.author_id,
            author_name: variables.author_name,
            content: historyMsg,
            is_internal: variables.is_internal || false,
            comment_type: "system",
          }).then(() => queryClient.invalidateQueries({ queryKey: ["tq-comments", ticket?.id] }));
        }
        toast.success("Yorum eklendi");
      }
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: ({ id, content }) => flowApi.entities.TQComment.update(id, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-comments", ticket?.id] });
      setEditingCommentId(null);
      setEditingCommentText("");
      toast.success("Yorum güncellendi");
    },
    onError: (err) => toast.error(err?.message || "Yorum güncellenemedi"),
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (id) => flowApi.entities.TQComment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-comments", ticket?.id] });
      toast.success("Yorum silindi");
    },
    onError: (err) => toast.error(err?.message || "Yorum silinemedi"),
  });

  const updateTicketMutation = useMutation({
    mutationFn: ({ data }) => flowApi.entities.TQTicket.update(ticket.id, data),
    onError: (err) => toast.error(err?.message || "Guncellenemedi"),
    onSuccess: (_, { data, optimistic }) => {
      invalidateTicketQueries(queryClient);
      if (optimistic?.status !== undefined) setLocalStatus(optimistic.status);
      if (optimistic?.assignedIds !== undefined) {
        setLocalAssignedIds(optimistic.assignedIds);
        setLocalAssignedNames(optimistic.assignedNames);
      }
      toast.success("Bilet güncellendi");
    },
  });

  // Efor planı formunu, seçilen ekibin mevcut kaydından doldur
  useEffect(() => {
    if (!planTeam) return;
    const p = effortPlans.find(x => x.team === planTeam);
    setPlanForm(p ? {
      planned_hours: p.planned_hours ?? "",
      assignee_id: p.assignee_id || "",
      assignee_name: p.assignee_name || "",
      note: p.note || "",
    } : { planned_hours: "", assignee_id: "", assignee_name: "", note: "" });
  }, [planTeam, effortPlans]);

  // Merkez yazılım / analiz ekibi listesi (Planla + Harcanan Zaman dialoglari).
  const teamEmployees = (team) => team
    ? employees
        .filter(e => e.show_in_taskqube == 1 || e.show_in_taskqube === true)
        .filter(e => isTeamMember(e, team))
        .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "tr"))
    : [];
  const planTeamEmployees = teamEmployees(planTeam);

  const savePlanMutation = useMutation({
    mutationFn: () => {
      const existing = planFor(planTeam);
      const payload = {
        ticket_id: ticket.id,
        team: planTeam,
        planned_hours: planForm.planned_hours === "" ? null : Number(planForm.planned_hours),
        planned_start: null,
        assignee_id: planForm.assignee_id || null,
        assignee_name: planForm.assignee_name || null,
        end_at: null,
        note: planForm.note || null,
      };
      return existing
        ? flowApi.entities.TQEffortPlan.update(existing.id, payload)
        : flowApi.entities.TQEffortPlan.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-effort-plans", ticket.id] });
      setPlanTeam(null);
      toast.success("Efor planı kaydedildi");
    },
    onError: (err) => toast.error(err?.message || "Kaydedilemedi"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: () => flowApi.entities.TQEffortPlan.delete(planFor(planTeam).id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-effort-plans", ticket.id] });
      setPlanTeam(null);
      toast.success("Efor planı silindi");
    },
    onError: (err) => toast.error(err?.message || "Silinemedi"),
  });

  const saveLogMutation = useMutation({
    mutationFn: () => {
      const dk = (Number(logEditing.saat) || 0) * 60 + (Number(logEditing.dakika) || 0);
      const payload = {
        ticket_id: ticket.id,
        team: logEditing.team,
        person_id: logEditing.person_id,
        person_name: logEditing.person_name,
        hours: dk > 0 ? dk / 60 : null,
        work_date: logEditing.work_date || null,
        note: logEditing.note || null,
      };
      return logEditing.id
        ? flowApi.entities.TQEffortLog.update(logEditing.id, payload)
        : flowApi.entities.TQEffortLog.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-effort-logs", ticket.id] });
      setLogEditing(null);
      toast.success("Harcanan zaman kaydedildi");
    },
    onError: (err) => toast.error(err?.message || "Kaydedilemedi"),
  });

  const deleteLogMutation = useMutation({
    mutationFn: (id) => flowApi.entities.TQEffortLog.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tq-effort-logs", ticket.id] });
      toast.success("Efor kaydı silindi");
    },
    onError: (err) => toast.error(err?.message || "Silinemedi"),
  });

  const openNewLog = (team) => {
    const plan = planFor(team);
    const isAdmin = currentUser?.role === "admin";
    // Plan atananı yoksa, o ekibe ait Sorumlu Kişi'yi otomatik seç
    const assignedMember = employees.find(
      e => localAssignedIds.includes(e.id) && isTeamMember(e, team)
    );
    const fbId = plan?.assignee_id || assignedMember?.id || "";
    const fbName = plan?.assignee_name || assignedMember?.full_name || "";
    setLogEditing({
      ...emptyLog,
      team,
      person_id: isAdmin ? fbId : (myEmployeeId || ""),
      person_name: isAdmin ? fbName : (currentEmployee?.full_name || ""),
    });
  };

  const handleAddComment = () => {
    if (!commentContent.trim()) return;
    addCommentMutation.mutate({
      ticket_id: ticket.id,
      author_id: currentEmployee?.id || currentUser?.id || "unknown",
      author_name: currentEmployee?.full_name || currentUser?.full_name || "Kullanıcı",
      content: commentContent,
      is_internal: isInternal,
      attachments: commentAttachments,
    });
    setCommentAttachments([]);
  };

  const handleStatusChange = (newStatus) => {
    // Panoya ozel: ilgili ekibin "Harcanan Zaman"i bossa yumusak uyari.
    const boardName = nrm(
      boards.find(b => b.id === (localBoardId || ticket?.board_id))?.name || ticket?.board_name
    );
    const warnCfg = EFFORT_WARN_BOARDS.find(c => boardName.includes(c.board));
    if (warnCfg) {
      const label = getStatusCfg(newStatus).label;
      const nLabel = nrm(label);
      const nKey = nrm(newStatus).replace(/_/g, " ");
      const rule = warnCfg.rules.find(r => nLabel.includes(r.match) || nKey.includes(r.match));
      if (rule && (effortHours[rule.team] || 0) === 0) {
        if (!window.confirm(
          `${rule.label} ekibi için "Harcanan Zaman" girilmemiş. Yine de durumu "${label}" yapmak istiyor musunuz?`
        )) return;
      }
    }
    const finalStatus = statuses.find(s => s.key === newStatus);
    const updateData = { status: newStatus };
    if (finalStatus?.is_final) updateData.resolved_at = new Date().toISOString();
    // Optimistik güncelleme — hemen UI'ı değiştir
    setLocalStatus(newStatus);
    updateTicketMutation.mutate(
      { data: updateData, optimistic: { status: newStatus } },
      {
        onError: () => setLocalStatus(ticket.status), // hata olursa geri al
      }
    );
    addCommentMutation.mutate({
      ticket_id: ticket.id,
      author_id: currentEmployee?.id || "system",
      author_name: currentEmployee?.full_name || "Sistem",
      content: `Durum değiştirildi: ${getStatusCfg(localStatus).label} → ${getStatusCfg(newStatus).label}`,
      is_internal: true,
      comment_type: "system",
    });
  };

  const handleAddAssignee = (empId) => {
    if (!empId || empId === "none" || localAssignedIds.includes(empId)) return;
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;
    const newIds = [...localAssignedIds, empId];
    const newNames = [...localAssignedNames, emp.full_name];
    // Optimistik güncelleme
    setLocalAssignedIds(newIds);
    setLocalAssignedNames(newNames);
    updateTicketMutation.mutate(
      {
        data: {
          assigned_to_ids: newIds,
          assigned_to_names: newNames,
          assigned_to_id: newIds[0] || "",
          assigned_to_name: newNames[0] || "",
          assigned_by_id: currentEmployee?.id || "",
          assigned_by_name: currentEmployee?.full_name || "",
        },
        optimistic: {},
      },
      {
        onError: () => { setLocalAssignedIds(localAssignedIds); setLocalAssignedNames(localAssignedNames); },
      }
    );
    addCommentMutation.mutate({
      ticket_id: ticket.id,
      author_id: currentEmployee?.id || "system",
      author_name: currentEmployee?.full_name || "Sistem",
      content: `${emp.full_name} sorumlu olarak eklendi.`,
      is_internal: true,
      comment_type: "system",
    });
  };

  const handleRemoveAssignee = (empId) => {
    const idx = localAssignedIds.indexOf(empId);
    if (idx === -1) return;
    const removedName = localAssignedNames[idx] || empId;
    const newIds = localAssignedIds.filter(id => id !== empId);
    const newNames = localAssignedNames.filter((_, i) => i !== idx);
    // Optimistik güncelleme
    setLocalAssignedIds(newIds);
    setLocalAssignedNames(newNames);
    updateTicketMutation.mutate(
      {
        data: {
          assigned_to_ids: newIds,
          assigned_to_names: newNames,
          assigned_to_id: newIds[0] || "",
          assigned_to_name: newNames[0] || "",
        },
        optimistic: {},
      },
      {
        onError: () => { setLocalAssignedIds(localAssignedIds); setLocalAssignedNames(localAssignedNames); },
      }
    );
    addCommentMutation.mutate({
      ticket_id: ticket.id,
      author_id: currentEmployee?.id || "system",
      author_name: currentEmployee?.full_name || "Sistem",
      content: `${removedName} sorumlu listesinden çıkarıldı.`,
      is_internal: true,
      comment_type: "system",
    });
  };

  const unassignedEmployees = employees
    .filter(e => !localAssignedIds.includes(e.id))
    .filter(e => e.show_in_taskqube == 1 || e.show_in_taskqube === true)
    .sort((a, b) => String(a.full_name || "").localeCompare(String(b.full_name || ""), "tr"));

  const statusCfg = getStatusCfg(localStatus || ticket?.status);
  const stColor = (statusesForBoard.find(x => x.key === (localStatus || ticket?.status)) || statusesUniq.find(x => x.key === (localStatus || ticket?.status)))?.color || "slate";

  // İş Akışı sekmesi verileri
  const flowCurrentKey = localStatus || ticket?.status;
  const flowCurrentIdx = statusesForBoard.findIndex(s => s.key === flowCurrentKey);
  const flowPath = (() => {
    const re = /Durum değiştirildi:\s*(.+?)\s*→\s*(.+)/;
    const trans = (comments || [])
      .filter(c => c.comment_type === 'system' && (!isMusteri || !c.is_internal))
      .map(c => ({ t: new Date(c.created_date).getTime(), m: String(c.content || "").match(re) }))
      .filter(x => x.m)
      .sort((a, b) => a.t - b.t);
    if (trans.length === 0) return [getStatusCfg(flowCurrentKey).label];
    const path = [trans[0].m[1].trim()];
    for (const x of trans) { const to = x.m[2].trim(); if (to !== path[path.length - 1]) path.push(to); }
    return path;
  })();

  // Harcanan Efor: durum gecmisinden faz bazli sure (takvim suresi) hesabi
  const effort = (() => {
    const nameToGroup = new Map(), keyToGroup = new Map();
    for (const s of statuses) {
      const g = normFlowGroup(s.group_key);
      nameToGroup.set(nrm(s.name), g);
      keyToGroup.set(s.key, g);
    }
    const groupOfLabel = (l) => nameToGroup.get(nrm(l)) || "diger";
    const groupOfKey = (k) => keyToGroup.get(k) || "diger";

    const re = /Durum değiştirildi:\s*(.+?)\s*→\s*(.+)/;
    const trans = (comments || [])
      .filter(c => c.comment_type === 'system')
      .map(c => ({ t: +new Date(c.created_date), m: String(c.content || "").match(re), who: c.author_name }))
      .filter(x => x.m && Number.isFinite(x.t))
      .map(x => ({ t: x.t, fromL: x.m[1].trim(), toL: x.m[2].trim(), who: x.who }))
      .sort((a, b) => a.t - b.t);

    const t0 = +new Date(ticket?.created_date) || (trans[0]?.t ?? Date.now());
    const now = Date.now();
    const curLabel = getStatusCfg(localStatus || ticket?.status).label;

    const bounds = [t0, ...trans.map(x => x.t), now];
    const segments = [];
    for (let i = 0; i < bounds.length - 1; i++) {
      let group, label;
      if (trans.length === 0) { group = groupOfKey(localStatus || ticket?.status); label = curLabel; }
      else if (i === 0) { group = groupOfLabel(trans[0].fromL); label = trans[0].fromL; }
      else { group = groupOfLabel(trans[i - 1].toL); label = trans[i - 1].toL; }
      const dur = Math.max(0, bounds[i + 1] - bounds[i]);
      segments.push({ group, label, dur, team: teamOfPhase(group, label), from: bounds[i], to: bounds[i + 1], who: i > 0 ? trans[i - 1].who : "" });
    }

    const acc = { analiz: 0, yazilim: 0, diger: 0 };
    for (const s of segments) acc[s.team] += s.dur;
    return { analizMs: acc.analiz, yazilimMs: acc.yazilim, digerMs: acc.diger, segments, hasHistory: trans.length > 0 };
  })();

  // Analiz/Yazilim icin artik takvim suresi degil, kisilerin girdigi
  // gercek saatlerin toplami gosterilir. Diger/beklemede otomatik kalir.
  const effortHours = (() => {
    const acc = { analiz: 0, yazilim: 0 };
    for (const l of effortLogs) if (acc[l.team] !== undefined) acc[l.team] += Number(l.hours) || 0;
    return acc;
  })();

  // "Islem Gecmisi" sekmesi icin: gercek sistem yorumlarina ek olarak,
  // biletin ilk olusturuldugu anin da gecmiste gorunmesi icin sentetik bir
  // "Bilet olusturuldu" girdisi eklenir. DB'de ayrica bir satir olarak
  // tutulmuyor -- boylece backend'e/olusturma akisina dokunmadan, mevcut
  // binlerce bilette de geriye donuk calisir.
  const historyEntries = (() => {
    const systemComments = comments.filter(c => c.comment_type === 'system' && (!isMusteri || !c.is_internal));
    if (!ticket?.created_date) return systemComments;
    const creatorEmp = (employees || []).find(e => e.email && ticket.created_by && e.email.toLowerCase() === ticket.created_by.toLowerCase());
    const creatorName = ticket.customer_contact_name || creatorEmp?.full_name || ticket.created_by || 'Bilinmiyor';
    const createdEntry = {
      id: '__ticket_created__',
      content: 'Bilet oluşturuldu',
      author_name: creatorName,
      created_date: ticket.created_date,
      comment_type: 'system',
      is_internal: false,
    };
    return [...systemComments, createdEntry];
  })();

  if (!ticket) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-screen h-[100dvh] max-w-none max-h-none rounded-none border-0 sm:w-[97vw] sm:h-[97vh] sm:max-w-[1600px] sm:rounded-2xl sm:border overflow-hidden p-0 flex flex-col [&>button]:hidden" onInteractOutside={(e) => { if (previewFile) e.preventDefault(); }} onEscapeKeyDown={(e) => { if (previewFile) { e.preventDefault(); closePreview(); } }}>
          {/* Header — sade */}
          <div className="shrink-0 border-b border-border/60 bg-card">
            <div className={`h-1 w-full ${COLOR_BAR[stColor] || "bg-slate-400"}`} />
            <div className="px-4 sm:px-6 pt-3 pb-2.5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {ticket.ticket_number && (
                      <span className="text-sm font-mono font-bold text-muted-foreground">#{ticket.ticket_number}</span>
                    )}
                    <Badge className={`text-xs ${COLOR_BADGE[stColor] || "bg-slate-100 text-slate-700"}`}>{statusCfg.label}</Badge>
                    <Badge className={`text-xs ${PRIORITY_CONFIG[ticket.priority]?.color || "bg-slate-100 text-slate-600"}`}>
                      {PRIORITY_CONFIG[ticket.priority]?.label || ticket.priority}
                    </Badge>
                    {ticket.type && <Badge variant="outline" className="text-xs">{ticket.type}</Badge>}
                  </div>
                  <h2 className="text-lg font-bold text-foreground break-words leading-snug">{ticket.title}</h2>
                  {ticket.customer_name && (
                    <p className="text-xs text-muted-foreground mt-1">📍 {ticket.customer_name} {ticket.project_name && `· ${ticket.project_name}`}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowEditForm(true)}>
                      <Pencil className="w-3.5 h-3.5" /> Düzenle
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => onOpenChange(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden flex flex-col lg:grid lg:grid-cols-[288px_minmax(0,1fr)_312px]">
            {/* SOL sütun: pano / durum / sorumlu / muhatap */}
            <div className="min-w-0 min-h-0 shrink-0 lg:shrink lg:overflow-y-auto p-4 space-y-3 order-2 lg:order-none">
              {!isMusteri && (
                <div className={`rounded-xl border p-3 space-y-2 ${PASTEL.slate}`}>
                  <Label className={`text-[11px] font-semibold uppercase tracking-wide ${PASTEL_LABEL.slate}`}>Pano</Label>
                  <Select
                    value={localBoardId || "none"}
                    onValueChange={(val) => {
                      if (val === "none") return;
                      const b = boards.find(x => x.id === val);
                      setLocalBoardId(val);
                      updateTicketMutation.mutate({ data: { board_id: val, board_name: b?.name || "" } });
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Pano seç..." /></SelectTrigger>
                    <SelectContent>
                      {boards.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {!isMusteri && (
                <div className={`rounded-xl border p-3 space-y-2 ${STATUS_TINT[stColor] || STATUS_TINT.slate}`}>
                  <Label className="text-[11px] font-semibold uppercase tracking-wide text-foreground/70">Durum</Label>
                  <Select value={localStatus} onValueChange={handleStatusChange} disabled={!!ticket.parent_ticket_id}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusesForBoard.map((s) => (
                        <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className={`rounded-xl border p-3 space-y-2 ${PASTEL.blue}`}>
                <Label className={`text-[11px] font-semibold uppercase tracking-wide ${PASTEL_LABEL.blue}`}>Sorumlu Kişiler</Label>
                {localAssignedIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {localAssignedIds.map((id, idx) => (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full"
                      >
                        {localAssignedNames[idx] || id}
                        {!isMusteri && (
                          <button
                            onClick={() => handleRemoveAssignee(id)}
                            className="hover:text-red-500 transition-colors ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {!isMusteri && unassignedEmployees.length > 0 && (
                  <SearchableSelect
                    value=""
                    onChange={handleAddAssignee}
                    options={unassignedEmployees.map((emp) => ({ value: emp.id, label: emp.full_name }))}
                    placeholder="Kişi ekle..."
                    searchPlaceholder="Kişi ara..."
                    emptyText="Kişi bulunamadı"
                    className="h-8 text-xs"
                    fixDialogWheelScroll
                  />
                )}
                {localAssignedIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">Henüz sorumlu atanmamış.</p>
                )}
                {ticket.assigned_by_name && (
                  <p className="text-xs text-muted-foreground">Son atayan: {ticket.assigned_by_name}</p>
                )}
              </div>

              {!isMusteri && ticket.customer_id && (
                <div className={`rounded-xl border p-3 space-y-2 ${PASTEL.teal}`}>
                  <Label className={`text-[11px] font-semibold uppercase tracking-wide ${PASTEL_LABEL.teal}`}>Müşteri Muhatabı</Label>
                  {localContactName && (
                    <p className="text-sm font-medium text-foreground">{localContactName}</p>
                  )}
                  <Select
                    value={ticket.customer_contact_id || "none"}
                    onValueChange={(val) => {
                      if (val === "none") {
                        setLocalContactName("");
                        updateTicketMutation.mutate({ data: { customer_contact_id: "", customer_contact_name: "" } });
                      } else {
                        const c = customerContactsList.find(x => x.id === val);
                        setLocalContactName(c?.full_name || "");
                        updateTicketMutation.mutate({ data: { customer_contact_id: val, customer_contact_name: c?.full_name || "" } });
                      }
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Muhatap seç..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Yok —</SelectItem>
                      {customerContactsList.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.full_name}{c.title ? ` (${c.title})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {customerContactsList.length === 0 && (
                    <p className="text-xs text-muted-foreground">Bu müşteride kayıtlı kişi yok</p>
                  )}
                </div>
              )}
            </div>

            {/* ORTA sütun: açıklama + sekmeler — kendi kaydırması */}
            <div className="min-w-0 min-h-0 shrink-0 lg:shrink lg:overflow-y-auto p-4 space-y-4 order-1 lg:order-none lg:border-l border-border/60">
              {/* Açıklama */}
              {ticket.description && (
                <div className="rounded-xl border border-border/50 bg-muted/30 p-3">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Açıklama</p>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere">{ticket.description}</p>
                </div>
              )}

              {/* Yorumlar & İşlem Geçmişi */}
              <Tabs defaultValue="comments">
                <TabsList className="w-full">
                  <TabsTrigger value="comments" className="flex-1">
                    <MessageSquare className="w-4 h-4 mr-1.5" />
                    Yorumlar
                    {comments.filter(c => c.comment_type !== 'system' && (!isMusteri || !c.is_internal)).length > 0 && (
                      <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {comments.filter(c => c.comment_type !== 'system' && (!isMusteri || !c.is_internal)).length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">
                    <History className="w-4 h-4 mr-1.5" />
                    İşlem Geçmişi
                    {historyEntries.length > 0 && (
                      <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {historyEntries.length}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="activities" className="flex-1"><Calendar className="w-4 h-4 mr-1.5" />Aktiviteler {ticketActivities.length > 0 && <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{ticketActivities.length}</span>}</TabsTrigger>
                  <TabsTrigger value="flow" className="flex-1">
                    <Workflow className="w-4 h-4 mr-1.5" />
                    İş Akışı
                  </TabsTrigger>
                </TabsList>

                {/* Yorumlar Sekmesi */}
                <TabsContent value="comments" className="mt-3">
                  <div className="space-y-3 pr-1">
                    {comments.filter(c => c.comment_type !== 'system' && (!isMusteri || !c.is_internal)).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Henüz yorum yok.</p>
                    )}
                    {comments.filter(c => c.comment_type !== 'system' && (!isMusteri || !c.is_internal))
                      .map((comment) => {
                        const isMine = comment.author_id === (currentEmployee?.id || currentUser?.id)
                          || comment.author_email === currentUser?.email
                          || comment.created_by === currentUser?.email;
                        const canManage = isMine
                          && comment.comment_type !== "system"
                          && currentUser?.role !== "musteri"
                          && !isMusteri;
                        const edited = comment.updated_date && comment.created_date
                          && (new Date(comment.updated_date) - new Date(comment.created_date) > 1000);
                        const isEditing = editingCommentId === comment.id;
                        return (
                        <div key={comment.id} className={`group rounded-xl p-3.5 text-sm border ${comment.is_internal ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20" : "bg-muted/30 border-border/40"}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-xs flex items-center gap-1.5 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-muted-foreground/15 text-[10px] font-semibold flex items-center justify-center shrink-0">
                                {String(comment.author_name || "?").trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase()}
                              </span>
                              <span className="truncate">{comment.author_name}</span>
                              {edited && <span className="font-normal text-muted-foreground shrink-0">(düzenlendi)</span>}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">
                                {comment.created_date ? format(new Date(comment.created_date), "dd.MM.yyyy HH:mm") : ""}
                              </span>
                              {canManage && !isEditing && (
                                <span className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    title="Düzenle"
                                    onClick={() => { setEditingCommentId(comment.id); setEditingCommentText(comment.content || ""); }}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    title="Sil"
                                    onClick={() => { if (window.confirm("Bu yorum silinsin mi?")) deleteCommentMutation.mutate(comment.id); }}
                                    className="text-muted-foreground hover:text-red-600"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </span>
                              )}
                            </div>
                          </div>
                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                className="min-h-[80px] rounded-lg text-sm resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs"
                                  disabled={!editingCommentText.trim() || editCommentMutation.isPending}
                                  onClick={() => editCommentMutation.mutate({ id: comment.id, content: editingCommentText.trim() })}
                                >
                                  Kaydet
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs"
                                  onClick={() => { setEditingCommentId(null); setEditingCommentText(""); }}
                                >
                                  İptal
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="leading-relaxed whitespace-pre-wrap">{comment.content}</p>
                          )}
                          {comment.attachments?.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {comment.attachments.map((att, idx) => (
                                <button key={idx} onClick={() => openPreview(att)}
                                  className="flex items-center gap-1.5 bg-muted px-2 py-1.5 rounded-lg border border-border text-xs hover:bg-muted/80 cursor-pointer">
                                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="max-w-[120px] truncate">{att.name}</span>
                                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                                </button>
                              ))}
                            </div>
                          )}
                          {!isMusteri && (
                            <span className={`mt-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${comment.is_internal ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" : "bg-muted text-muted-foreground"}`}>
                              {comment.is_internal ? <><Lock className="w-2.5 h-2.5" /> Müşteriye kapalı</> : <><Unlock className="w-2.5 h-2.5" /> Müşteriye açık</>}
                            </span>
                          )}
                        </div>
                        );
                      })}
                  </div>

                  {/* Yorum Ekle */}
                  <div className="mt-4 space-y-2 lg:sticky lg:bottom-0 lg:-mx-4 lg:px-4 lg:pt-3 lg:pb-1 lg:bg-background/95 lg:backdrop-blur lg:border-t lg:border-border/40">
                    <Textarea
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                      onPaste={handlePaste}
                      placeholder="Yorum ekle... (ekran görüntüsü için Ctrl+V)"
                      className="min-h-[100px] rounded-xl border-border/60 focus:border-primary/50 resize-none"
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="text-xs"
                      >
                        {uploading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Paperclip className="w-3.5 h-3.5 mr-1" />}
                        Dosya Ekle
                      </Button>
                      <span className="text-xs text-muted-foreground">veya Ctrl+V ile yapıştırın</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {commentAttachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {commentAttachments.map((att, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-muted px-2 py-1.5 rounded-lg border border-border text-xs">
                            <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="max-w-[100px] truncate">{att.name}</span>
                            <button type="button" onClick={() => removeCommentAttachment(idx)} className="text-red-500 hover:text-red-700 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {commentAttachments.length > 0 && !commentContent.trim() && (
                      <p className="text-xs text-amber-600 flex items-center gap-1.5">
                        <Paperclip className="w-3 h-3" /> Dosyayı göndermek için bir yorum yazın.
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      {!isMusteri && <button
                        type="button"
                        onClick={() => setIsInternal(!isInternal)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                          isInternal
                            ? "bg-amber-100 border-amber-300 text-amber-700"
                            : "bg-muted border-border text-muted-foreground"
                        }`}
                      >
                        {isInternal ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {isInternal ? "Müşteriye Kapalı" : "Müşteriye Açık"}
                      </button>}
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        disabled={!commentContent.trim() || addCommentMutation.isPending}
                        className="gap-1.5 px-4"
                      >
                        <Send className="w-3.5 h-3.5" /> Gönder
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                {/* İşlem Geçmişi Sekmesi */}
                <TabsContent value="history" className="mt-3">
                  <div className="space-y-0 pr-1">
                    {historyEntries.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">Henüz işlem kaydı yok.</p>
                    )}
                    <div className="relative">
                      {historyEntries
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map((entry, idx, arr) => {
                          const isStatusChange = entry.content?.includes("Durum değiştirildi:");
                          const isAssignment = entry.content?.includes("sorumlu");

                          let icon = <Clock className="w-3.5 h-3.5 text-slate-500" />;
                          let bgColor = "bg-slate-100";
                          if (isStatusChange) { icon = <ArrowRight className="w-3.5 h-3.5 text-blue-500" />; bgColor = "bg-blue-50"; }
                          if (isAssignment) { icon = <User className="w-3.5 h-3.5 text-green-600" />; bgColor = "bg-green-50"; }

                          return (
                            <div key={entry.id} className="flex gap-3 pb-4 relative">
                              {idx < arr.length - 1 && (
                                <div className="absolute left-4 top-8 w-px h-full bg-border" />
                              )}
                              <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${bgColor} border border-border/50 z-10`}>
                                {icon}
                              </div>
                              <div className="flex-1 min-w-0 pt-1">
                                <p className="text-sm leading-relaxed text-foreground">{entry.content}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-medium text-muted-foreground">{entry.author_name}</span>
                                  <span className="text-xs text-muted-foreground/60">•</span>
                                  <span className="text-xs text-muted-foreground">
                                    {entry.created_date ? format(new Date(entry.created_date), "dd.MM.yyyy HH:mm") : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="activities" className="mt-3">
                  <div className="space-y-2">
                    {ticketActivities.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Henüz aktivite yok</p>
                    ) : (
                      ticketActivities.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{a.employee_name}</p>
                            <p className="text-xs text-muted-foreground">{a.activity_type} — {a.duration_minutes} dk</p>
                            <p className="text-xs text-muted-foreground">{a.date}</p>
                            {a.notes && <p className="text-xs mt-1">{a.notes}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* İş Akışı Sekmesi */}
                <TabsContent value="flow" className="mt-3">
                  {statusesForBoard.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">Bu pano için akış tanımlı değil.</p>
                  ) : (
                    <>
                      <div className="space-y-4 pr-1">
                        {FLOW_GROUP_ORDER.map((gk) => {
                          const items = statusesForBoard
                            .map((s, gi) => ({ s, gi }))
                            .filter(({ s }) => normFlowGroup(s.group_key) === gk);
                          if (items.length === 0) return null;
                          return (
                            <div key={gk}>
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{FLOW_GROUP_LABEL[gk]}</p>
                              <div className="relative">
                                {items.length > 1 && <div className="absolute left-[11px] top-3 bottom-3 w-px bg-border" />}
                                {items.map(({ s, gi }) => {
                                  const done = flowCurrentIdx >= 0 && gi < flowCurrentIdx;
                                  const current = gi === flowCurrentIdx;
                                  const isFinal = s.is_final == 1 || s.is_final === true;
                                  return (
                                    <div key={s.key} className={`flex gap-3 pb-3 last:pb-0 ${(!done && !current) ? "opacity-60" : ""}`}>
                                      <div className="shrink-0 relative z-10 w-6 h-6 rounded-full bg-card flex items-center justify-center">
                                        {done ? (
                                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                                        ) : current ? (
                                          <span className="w-4 h-4 rounded-full bg-primary ring-4 ring-primary/20" />
                                        ) : (
                                          <span className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/40" />
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0 pt-0.5">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className={current ? "text-sm font-bold text-foreground" : "text-sm text-foreground"}>{s.name}</span>
                                          {gi === 0 && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Başlangıç</span>}
                                          {isFinal && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-600 inline-flex items-center gap-0.5">
                                              <Flag className="w-2.5 h-2.5" />Bitiş
                                            </span>
                                          )}
                                          {current && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Şu an buradasınız</span>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {flowCurrentIdx === -1 && (
                        <p className="text-xs mt-2 text-muted-foreground">Şu an: <span className="font-semibold text-foreground">{getStatusCfg(flowCurrentKey).label}</span></p>
                      )}
                      <div className="mt-4 pt-3 border-t border-border/40">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Bu biletin izlediği yol</p>
                        <div className="flex flex-wrap items-center gap-1">
                          {flowPath.map((label, i) => (
                            <span key={i} className="flex items-center gap-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${i === flowPath.length - 1 ? "bg-primary/10 text-primary font-semibold" : "bg-muted text-muted-foreground"}`}>{label}</span>
                              {i < flowPath.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/60" />}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            {/* SAĞ sütun: harcanan efor / ekler / detaylar / ilişkili / etiketler — kendi kaydırması */}
            <div className="min-w-0 min-h-0 shrink-0 lg:shrink lg:overflow-y-auto p-4 flex flex-col gap-3 order-3 lg:order-none lg:border-l border-border/60">
              {/* Harcanan Efor (Analiz/Yazilim: kisilerin girdigi gercek saat; Diger: durum gecmisinden otomatik) -- musteri haric tum ic kullanicilar gorur; Plan yalniz yonetici/admin */}
              {!isMusteri && (
                <div className={`rounded-xl border p-3 space-y-2 order-5 ${PASTEL.indigo}`}>
                  <button
                    type="button"
                    onClick={() => setEffortOpen(o => !o)}
                    className="w-full flex items-center justify-between gap-2"
                  >
                    <span className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${PASTEL_LABEL.indigo}`}>
                      <Clock className="w-3.5 h-3.5" /> Harcanan Efor
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${effortOpen ? "rotate-180" : ""}`} />
                  </button>
                  <div className="space-y-2 text-sm">
                    {[
                      { team: "analiz", emoji: "🔎", label: "Analiz" },
                      { team: "yazilim", emoji: "💻", label: "Yazılım" },
                    ].map((row) => {
                      const p = planFor(row.team);
                      const canLogHere = currentUser?.role === "admin" || isAssignedToTicket;
                      return (
                        <div key={row.team} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1.5">{row.emoji} <span className="text-muted-foreground">{row.label}</span></span>
                            <span className="font-semibold tabular-nums">{fmtHours(effortHours[row.team])}</span>
                          </div>
                          {isPlanManager && (
                            <div className="flex items-center justify-between gap-2 pl-5 text-[11px] text-muted-foreground">
                              <span className="truncate">
                                {p ? (
                                  <>Plan: {p.planned_hours != null && p.planned_hours !== "" ? `${p.planned_hours} sa` : "—"}
                                    {p.assignee_name ? ` · ${p.assignee_name}` : ""}</>
                                ) : "Plan yok"}
                              </span>
                              <button type="button" onClick={() => setPlanTeam(row.team)} className="shrink-0 text-indigo-600 hover:underline">
                                {p ? "Düzenle" : "Planla"}
                              </button>
                            </div>
                          )}
                          <div className="pl-5 space-y-1">
                            {logsFor(row.team).map((l) => {
                              const canManage = currentUser?.role === "admin" || l.person_id === myEmployeeId;
                              return (
                                <div key={l.id} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                  <span className="truncate">
                                    {l.person_name || "—"} · <span className="font-medium text-foreground">{fmtHours(l.hours)}</span>
                                    {l.work_date ? ` · ${fmtLogDate(l.work_date)}` : ""}
                                    {l.note ? ` · ${l.note}` : ""}
                                  </span>
                                  {canManage && (
                                    <span className="flex items-center gap-1 shrink-0">
                                      <button type="button" onClick={() => setLogEditing({ id: l.id, team: l.team, person_id: l.person_id, person_name: l.person_name, ...splitHours(l.hours), work_date: l.work_date || "", note: l.note || "" })}>
                                        <Pencil className="w-3 h-3 hover:text-foreground" />
                                      </button>
                                      <button type="button" onClick={() => deleteLogMutation.mutate(l.id)}>
                                        <Trash2 className="w-3 h-3 hover:text-red-600" />
                                      </button>
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                            {canLogHere && (
                              <button type="button" onClick={() => openNewLog(row.team)} className="text-indigo-600 hover:underline text-[11px]">
                                + Harcanan Zaman
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {effort.digerMs > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Müşteri Talep / Diğer</span>
                        <span className="tabular-nums">{fmtDur(effort.digerMs)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-border/40 font-semibold">
                      <span>Toplam Efor</span>
                      <span className="tabular-nums">{fmtHours((effortHours.analiz || 0) + (effortHours.yazilim || 0))}</span>
                    </div>
                  </div>
                  {effortOpen && (
                    <div className="pt-2 mt-1 border-t border-border/40 space-y-2">
                      {!effort.hasHistory && (
                        <p className="text-xs text-muted-foreground">Henüz durum değişikliği yok — süre mevcut durumda geçiyor.</p>
                      )}
                      {effort.segments.map((s, i) => {
                        const team = s.team;
                        return (
                          <div key={i} className="text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium truncate">{s.label}</span>
                              <span className="tabular-nums shrink-0">{fmtDur(s.dur)}</span>
                            </div>
                            <div className="text-muted-foreground flex items-center flex-wrap gap-1.5 mt-0.5">
                              <span className={`px-1 rounded ${TEAM_TAG[team]}`}>{TEAM_LABEL[team]}</span>
                              <span>
                                {format(new Date(s.from), "dd.MM HH:mm")} → {s.to >= Date.now() - 60000 ? "şimdi" : format(new Date(s.to), "dd.MM HH:mm")}
                              </span>
                              {s.who && <span>· {s.who}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Ekler */}
              {(() => {
                const allAttachments = [
                  ...(ticket.attachments || []),
                  ...comments.flatMap(c => c.attachments || [])
                ];
                return allAttachments.length > 0 ? (
                <div className={`rounded-xl border p-3 space-y-2 order-2 ${PASTEL.amber}`}>
                  <Label className={`text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1.5 ${PASTEL_LABEL.amber}`}>
                    <Paperclip className="w-3.5 h-3.5" /> Ekler ({allAttachments.length})
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {allAttachments.map((att, idx) => (
                      <button key={idx} onClick={() => openPreview(att)}
                        className="flex items-center gap-1.5 bg-muted/50 hover:bg-muted rounded-lg px-2.5 py-1.5 text-xs text-foreground border border-border/50 transition-colors cursor-pointer">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="max-w-[100px] truncate">{att.name}</span>
                        <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
                ) : null;
              })()}

              {/* Bilgiler */}
              <div className={`rounded-xl border p-3 space-y-2 order-1 ${PASTEL.slate}`}>
                <Label className={`text-[11px] font-semibold uppercase tracking-wide ${PASTEL_LABEL.slate}`}>Detaylar</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Müşteri</p>
                      <p className="font-medium">{ticket.customer_name || customers.find(c => c.id === ticket.customer_id)?.company_name || "-"}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Proje</p>
                      <p className="font-medium">{ticket.project_name || "-"}</p>
                    </div>
                  </div>
                  {ticket.product_name && (
                    <div className="flex items-start gap-2">
                      <Tag className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ürün / Modül</p>
                        <p className="font-medium">{ticket.product_name}</p>
                      </div>
                    </div>
                  )}
                  {ticket.created_by && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Oluşturan</p>
                        <p className="font-medium">
                          {(employees || []).find(e => e.email === ticket.created_by)?.full_name || ticket.created_by}
                        </p>
                      </div>
                    </div>
                  )}
                  {ticket.due_date && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Son Tarih</p>
                        <p className="font-medium">{format(new Date(ticket.due_date), "dd.MM.yyyy")}</p>
                      </div>
                    </div>
                  )}
                  {ticket.estimated_hours > 0 && (
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Tahmini Saat</p>
                        <p className="font-medium">{ticket.estimated_hours}s</p>
                      </div>
                    </div>
                  )}
                  {ticket.resolved_at && (
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Çözüm Tarihi</p>
                        <p className="font-medium">{format(new Date(ticket.resolved_at), "dd.MM.yyyy HH:mm")}</p>
                      </div>
                    </div>
                  )}
                  {ticket.created_date && (
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Oluşturulma</p>
                        <p className="font-medium">{format(new Date(ticket.created_date), "dd.MM.yyyy HH:mm")}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* İlişkili Biletler */}
              {!isMusteri && (
                <div className={`rounded-xl border p-3 space-y-2 order-3 ${PASTEL.violet}`}>
                  <div className="flex items-center justify-between">
                    <Label className={`text-[11px] font-semibold uppercase tracking-wide ${PASTEL_LABEL.violet}`}>İlişkili Biletler</Label>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => {
                      setShowRelatedForm(!showRelatedForm);
                      setSelectedParentId(ticket.parent_ticket_id || ticket.id);
                      const currentChildren = allTickets.filter(t => t.parent_ticket_id === (ticket.parent_ticket_id || ticket.id)).map(t => t.id);
                      setSelectedRelatedIds(currentChildren);
                    }}>
                      {showRelatedForm ? "Kapat" : "Düzenle"}
                    </Button>
                  </div>
                  {/* Mevcut ilişki bilgisi */}
                  {ticket.parent_ticket_id && (
                    <p className="text-xs text-amber-600">
                      Bu bilet bir ana bilete bağlı. Durumu ana bilet belirler.
                    </p>
                  )}
                  {allTickets.filter(t => t.parent_ticket_id === ticket.id).length > 0 && (
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">Bu bilete bağlı {allTickets.filter(t => t.parent_ticket_id === ticket.id).length} bilet var.</span>
                    </div>
                  )}
                  {showRelatedForm && (
                    <div className="space-y-2 pt-2">
                      <div>
                        <Label className="text-xs">Ana Bilet</Label>
                        <Input
                          className="h-8 text-xs mb-1 mt-1"
                          placeholder="Bilet no veya başlık ara..."
                          value={parentSearch}
                          onChange={(e) => setParentSearch(e.target.value)}
                        />
                        <div className="max-h-32 overflow-y-auto border rounded-md p-1 space-y-0.5">
                          {allTickets
                            .filter(t => {
                              const q = parentSearch.trim().toLowerCase();
                              return !q || String(t.ticket_number).includes(q) || t.title?.toLowerCase().includes(q);
                            })
                            .map(t => (
                              <label key={t.id} className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1 py-0.5 ${selectedParentId === t.id ? "bg-primary/10 text-primary" : "hover:bg-muted/50"}`}>
                                <input
                                  type="radio"
                                  name="parentTicket"
                                  checked={selectedParentId === t.id}
                                  onChange={() => setSelectedParentId(t.id)}
                                />
                                <span className="truncate">#{t.ticket_number || "?"} - {t.title}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">İlişkili Biletler (ana bilete bağlanacaklar)</Label>
                        <Input
                          className="h-8 text-xs mb-1 mt-1"
                          placeholder="Bilet no veya başlık ara..."
                          value={relatedSearch}
                          onChange={(e) => setRelatedSearch(e.target.value)}
                        />
                        <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                          {allTickets
                            .filter(t => {
                              if (t.id === selectedParentId) return false;
                              const q = relatedSearch.trim().toLowerCase();
                              return !q || String(t.ticket_number).includes(q) || t.title?.toLowerCase().includes(q);
                            })
                            .map(t => (
                              <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedRelatedIds.includes(t.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) setSelectedRelatedIds(prev => [...prev, t.id]);
                                    else setSelectedRelatedIds(prev => prev.filter(id => id !== t.id));
                                  }}
                                />
                                <span className="truncate">#{t.ticket_number || "?"} - {t.title}</span>
                              </label>
                            ))}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs"
                        disabled={!selectedParentId || linkRelatedMutation.isPending}
                        onClick={() => linkRelatedMutation.mutate({ parentId: selectedParentId, relatedIds: selectedRelatedIds })}
                      >
                        Kaydet
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {/* Etiketler */}
              {ticket.tags?.length > 0 && (
                <div className={`rounded-xl border p-3 space-y-2 order-4 ${PASTEL.violet}`}>
                  <Label className={`text-[11px] font-semibold uppercase tracking-wide ${PASTEL_LABEL.violet}`}>Etiketler</Label>
                  <div className="flex flex-wrap gap-1">
                    {ticket.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </div>
        </DialogContent>
      </Dialog>

      {previewFile && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70" onClick={(e) => { e.stopPropagation(); closePreview(); }} style={{pointerEvents: "all"}}>
          <div className={cn("relative bg-card text-card-foreground rounded-xl shadow-2xl w-full mx-4 flex flex-col transition-all", previewZoomed ? "max-w-[96vw] max-h-[96vh]" : "max-w-3xl max-h-[90vh]")} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="text-sm font-medium truncate max-w-[400px]">{previewFile.name}</span>
              <div className="flex items-center gap-2">
                {(/\.(png|jpg|jpeg|gif|webp)$/i.test(previewFile.name) || previewFile.type?.startsWith("image/")) && (
                  <button onClick={(e) => { e.stopPropagation(); setPreviewZoomed((z) => !z); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1" title={previewZoomed ? "Küçült" : "Büyüt"}>
                    {previewZoomed ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />} {previewZoomed ? "Küçült" : "Büyüt"}
                  </button>
                )}
                <button onClick={(e) => { e.stopPropagation(); window.open(previewFile.url, "_blank"); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3.5 h-3.5" /> İndir
                </button>
                <button onClick={(e) => { e.stopPropagation(); closePreview(); }} className="text-muted-foreground hover:text-foreground ml-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="overflow-auto flex-1 p-2 flex items-center justify-center">
              {previewText !== null ? (
                <pre className="text-xs whitespace-pre-wrap w-full p-4 bg-muted rounded-lg max-h-[70vh] overflow-auto">{previewText}</pre>
              ) : /\.(png|jpg|jpeg|gif|webp)$/i.test(previewFile.name) || previewFile.type?.startsWith("image/") ? (
                <img src={previewFile.url} alt={previewFile.name} className={cn("max-w-full object-contain rounded-lg", previewZoomed ? "max-h-[88vh]" : "max-h-[70vh]")} />
              ) : (
                <iframe src={previewFile.url} className="w-full h-[70vh] rounded-lg border-0" title={previewFile.name} />
              )}
            </div>
          </div>
        </div>
      , document.body)}
      {!isMusteri && showEditForm && (
        <TQTicketFormDialog
          ticket={ticket}
          projects={projects}
          customers={customers}
          employees={employees}
          open={showEditForm}
          onOpenChange={setShowEditForm}
        />
      )}

      {!isMusteri && isPlanManager && planTeam && (
        <Dialog open onOpenChange={(o) => { if (!o) setPlanTeam(null); }}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>{planTeam === "analiz" ? "Analiz" : "Yazılım"} Ekibi — Efor Planı</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-1">
              <div>
                <Label>Planlanan Efor (saat)</Label>
                <Input type="number" min="0" step="0.5" className="mt-1"
                  value={planForm.planned_hours}
                  onChange={(e) => setPlanForm(f => ({ ...f, planned_hours: e.target.value }))} />
              </div>
              <div>
                <Label>Çalışan</Label>
                <Select
                  value={planForm.assignee_id || "none"}
                  onValueChange={(v) => {
                    if (v === "none") { setPlanForm(f => ({ ...f, assignee_id: "", assignee_name: "" })); }
                    else {
                      const emp = planTeamEmployees.find(e => e.id === v);
                      setPlanForm(f => ({ ...f, assignee_id: v, assignee_name: emp?.full_name || "" }));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seç..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Yok —</SelectItem>
                    {planTeamEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {planTeamEmployees.length === 0 && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {planTeam === "analiz" ? "Analiz" : "Yazılım"} ekibinde TaskQube'de görünen çalışan yok
                    (Çalışanlar ekranında pozisyon/departman bilgisi "{planTeam === "analiz" ? "analiz" : "yazılım"}" içermeli).
                  </p>
                )}
              </div>

              <div>
                <Label>Not (ops.)</Label>
                <Textarea className="mt-1 min-h-[60px]"
                  value={planForm.note}
                  onChange={(e) => setPlanForm(f => ({ ...f, note: e.target.value }))} />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                {planFor(planTeam) ? (
                  <Button variant="ghost" className="text-red-600 hover:text-red-700"
                    onClick={() => deletePlanMutation.mutate()} disabled={deletePlanMutation.isPending}>
                    Sil
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setPlanTeam(null)}>İptal</Button>
                  <Button onClick={() => savePlanMutation.mutate()} disabled={savePlanMutation.isPending}>Kaydet</Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {logEditing && (
        <Dialog open onOpenChange={(o) => { if (!o) setLogEditing(null); }}>
          <DialogContent className="max-w-sm rounded-2xl">
            <DialogHeader>
              <DialogTitle>{logEditing.team === "analiz" ? "Analiz" : "Yazılım"} — Harcanan Zaman</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-1">
              <div>
                <Label>Kişi</Label>
                {currentUser?.role === "admin" ? (() => {
                  const opts = teamEmployees(logEditing.team);
                  const list = logEditing.person_id && !opts.some(e => e.id === logEditing.person_id)
                    ? [{ id: logEditing.person_id, full_name: logEditing.person_name || logEditing.person_id }, ...opts]
                    : opts;
                  return (
                    <Select
                      value={logEditing.person_id || "none"}
                      onValueChange={(v) => {
                        if (v === "none") { setLogEditing(f => ({ ...f, person_id: "", person_name: "" })); }
                        else {
                          const emp = list.find(e => e.id === v);
                          setLogEditing(f => ({ ...f, person_id: v, person_name: emp?.full_name || "" }));
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Seç..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Seç —</SelectItem>
                        {list.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  );
                })() : (
                  <p className="text-sm font-medium mt-1.5">{logEditing.person_name || currentEmployee?.full_name}</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Saat</Label>
                  <Input type="number" min="0" step="1" className="mt-1"
                    value={logEditing.saat}
                    onChange={(e) => setLogEditing(f => ({ ...f, saat: e.target.value }))} />
                </div>
                <div>
                  <Label>Dakika</Label>
                  <Input type="number" min="0" max="59" step="5" className="mt-1"
                    value={logEditing.dakika}
                    onChange={(e) => setLogEditing(f => ({ ...f, dakika: e.target.value }))} />
                </div>
                <div>
                  <Label>Tarih</Label>
                  <Input type="date" className="mt-1"
                    value={logEditing.work_date}
                    onChange={(e) => setLogEditing(f => ({ ...f, work_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Not (ops.)</Label>
                <Textarea className="mt-1 min-h-[60px]"
                  value={logEditing.note}
                  onChange={(e) => setLogEditing(f => ({ ...f, note: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {logEditing.id ? (
                  <Button variant="ghost" className="text-red-600 hover:text-red-700"
                    onClick={() => { deleteLogMutation.mutate(logEditing.id); setLogEditing(null); }} disabled={deleteLogMutation.isPending}>
                    Sil
                  </Button>
                ) : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setLogEditing(null)}>İptal</Button>
                  <Button
                    onClick={() => saveLogMutation.mutate()}
                    disabled={saveLogMutation.isPending || !logEditing.person_id || !((Number(logEditing.saat) || 0) || (Number(logEditing.dakika) || 0))}
                  >
                    Kaydet
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}