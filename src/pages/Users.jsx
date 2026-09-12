import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { flowApi } from "@/api/flowApiClient";
import { Users as UsersIcon, Search, UserCheck, Trash2, UserPlus, ShieldCheck, Shield, User, Briefcase, GraduationCap, X, ToggleLeft, ToggleRight, Radar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/AuthContext";
import CreateUserDialog from "@/components/users/CreateUserDialog";

const ROLE_CONFIG = {
  admin:    { label:"Admin",     bg:"bg-red-500",    light:"bg-red-50 border-red-200 text-red-700",     icon: ShieldCheck },
  yonetici: { label:"Yönetici",  bg:"bg-purple-500", light:"bg-purple-50 border-purple-200 text-purple-700", icon: Shield },
  ik:       { label:"IK",        bg:"bg-pink-500",   light:"bg-pink-50 border-pink-200 text-pink-700",   icon: Briefcase },
  kullanici:{ label:"Kullanıcı", bg:"bg-blue-500",   light:"bg-blue-50 border-blue-200 text-blue-700",   icon: User },
  stajer:   { label:"Stajer",    bg:"bg-green-500",  light:"bg-green-50 border-green-200 text-green-700", icon: GraduationCap },
  musteri:  { label:"Müşteri",   bg:"bg-orange-500", light:"bg-orange-50 border-orange-200 text-orange-700", icon: UsersIcon },
  guvenlik: { label:"Güvenlik",  bg:"bg-slate-500",  light:"bg-slate-50 border-slate-200 text-slate-700", icon: Radar },
};

const getInitials = (name) => name?.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase() || "?";

const AVATAR_COLORS = ["bg-indigo-500","bg-purple-500","bg-pink-500","bg-blue-500","bg-teal-500","bg-green-500","bg-orange-500","bg-red-500"];

export default function Users() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all"); // all | aktif | pasif
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const canCreateUser = currentUser?.role === "admin" || currentUser?.role === "yonetici";
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users-list"],
    queryFn: () => flowApi.auth.users(),
  });
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: () => flowApi.entities.Customer.filter({ status: 'aktif' }),
  });
  const { data: employees = [] } = useQuery({
    queryKey: ["employees-for-users"],
    queryFn: () => flowApi.entities.Employee.list(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => flowApi.auth.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      toast.success("Kullanıcı güncellendi");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => flowApi.auth.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-list"] });
      setSelectedUser(null);
      toast.success("Kullanıcı silindi");
    },
  });

  const createEmployeeMutation = useMutation({
    mutationFn: (user) => flowApi.entities.Employee.create({
      full_name: user.full_name || user.email,
      email: user.email,
      department: "yonetim",
      status: "aktif",
      hire_date: new Date().toISOString().split("T")[0],
      next_leave_entitlement_date: new Date(new Date().setFullYear(new Date().getFullYear()+1)).toISOString().split("T")[0],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees-for-users"] });
      toast.success("Çalışan kaydı oluşturuldu");
    },
  });

  const employeeEmails = new Set(employees.map(e=>e.email).filter(Boolean));

  const roleCounts = Object.keys(ROLE_CONFIG).reduce((acc, role) => {
    acc[role] = users.filter(u=>u.role===role && u.status !== 'pasif').length;
    return acc;
  }, {});

  const pasifCount = users.filter(u => u.status === 'pasif').length;
  const filteredSorted = [...users].sort((a,b) => {
    const aP = a.status === 'pasif' ? 1 : 0;
    const bP = b.status === 'pasif' ? 1 : 0;
    return aP - bP;
  });
  const filtered = filteredSorted.filter(u => {
    const matchSearch = !search || u.full_name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === "all" || u.role === filterRole;
    const matchStatus = filterStatus === "all" || (filterStatus === "pasif" ? u.status === "pasif" : u.status !== "pasif");
    return matchSearch && matchRole && matchStatus;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const selectedUserData = selectedUser ? users.find(u=>u.id===selectedUser.id) || selectedUser : null;

  return (
    <div className="flex gap-6 max-w-[1200px]">
      {/* SOL PANEL */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* BAŞLIK */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><UsersIcon className="w-6 h-6 text-indigo-500"/>Kullanıcılar</h1>
            {canCreateUser && (
              <button onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors font-medium">
                <UserPlus className="w-4 h-4"/> Yeni Kullanıcı
              </button>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">{users.length} kayıtlı kullanıcı{pasifCount > 0 && <span className="text-amber-500 ml-1">({pasifCount} pasif)</span>}</p>
          </div>
        </div>

        {/* ROL ÖZET KARTLARI */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(ROLE_CONFIG).slice(0,4).map(([key,cfg])=>(
            <button key={key} onClick={()=>setFilterRole(filterRole===key?"all":key)}
              className={cn("p-3 rounded-xl border text-left transition-all", filterRole===key?cfg.light+" border-2":"bg-card border-border/50 hover:border-indigo-200")}>
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1 rounded-lg",cfg.bg)}><cfg.icon className="w-3 h-3 text-white"/></div>
                <span className="text-lg font-bold">{roleCounts[key]||0}</span>
              </div>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(ROLE_CONFIG).slice(4).map(([key,cfg])=>(
            <button key={key} onClick={()=>setFilterRole(filterRole===key?"all":key)}
              className={cn("p-3 rounded-xl border text-left transition-all", filterRole===key?cfg.light+" border-2":"bg-card border-border/50 hover:border-indigo-200")}>
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("p-1 rounded-lg",cfg.bg)}><cfg.icon className="w-3 h-3 text-white"/></div>
                <span className="text-lg font-bold">{roleCounts[key]||0}</span>
              </div>
              <p className="text-xs text-muted-foreground">{cfg.label}</p>
            </button>
          ))}
        </div>

        {/* ARAMA & FİLTRE */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ad veya e-posta ile ara..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-card border border-border/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"/>
          </div>
          {/* Pasif/Aktif filtresi */}
          <div className="flex rounded-xl border border-border/50 overflow-hidden text-sm">
            <button onClick={()=>setFilterStatus("all")}
              className={cn("px-3 py-2 transition-colors", filterStatus==="all"?"bg-indigo-600 text-white":"bg-card text-muted-foreground hover:bg-muted/30")}>
              Tümü
            </button>
            <button onClick={()=>setFilterStatus("aktif")}
              className={cn("px-3 py-2 transition-colors border-l border-border/50", filterStatus==="aktif"?"bg-emerald-600 text-white":"bg-card text-muted-foreground hover:bg-muted/30")}>
              Aktif
            </button>
            <button onClick={()=>setFilterStatus("pasif")}
              className={cn("px-3 py-2 transition-colors border-l border-border/50", filterStatus==="pasif"?"bg-amber-500 text-white":"bg-card text-muted-foreground hover:bg-muted/30")}>
              Pasif
            </button>
          </div>
          {filterRole !== "all" && (
            <button onClick={()=>setFilterRole("all")} className="flex items-center gap-1 text-xs px-3 py-2 rounded-xl border border-border/50 text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3"/>{ROLE_CONFIG[filterRole]?.label}
            </button>
          )}
        </div>

        {/* KULLANICI LİSTESİ */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"/>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-20"/>
            <p className="text-sm text-muted-foreground">Kullanıcı bulunamadı</p>
          </div>
        ) : (
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-border/30">
              {paginated.map((u, idx) => {
                const rcfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.kullanici;
                const RIcon = rcfg.icon;
                const initials = getInitials(u.full_name);
                const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                const isSelected = selectedUser?.id === u.id;
                const isEmployee = employeeEmails.has(u.email);
                const isPasif = u.status === 'pasif';

                return (
                  <div key={u.id} onClick={()=>setSelectedUser(isSelected?null:u)}
                    className={cn("flex items-center gap-3 px-4 py-3 cursor-pointer transition-all hover:bg-muted/30 group",
                      isSelected&&"bg-indigo-50 dark:bg-indigo-950/20 border-l-2 border-indigo-500",
                      isPasif&&"opacity-50")}>
                    <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0", isPasif?"bg-gray-400":avatarColor)}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{u.full_name || "—"}</p>
                        {isEmployee && <span className="text-[10px] bg-emerald-100 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full font-semibold">Çalışan</span>}
                        {isPasif && <span className="text-[10px] bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">Pasif</span>}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className={cn("text-[10px] font-semibold px-2 py-1 rounded-full border flex items-center gap-1 shrink-0", rcfg.light)}>
                      <RIcon className="w-2.5 h-2.5"/>{rcfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                <span className="text-xs text-muted-foreground">{filtered.length} kullanıcı · Sayfa {currentPage}/{totalPages}</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1}
                    className="px-3 py-1 text-xs rounded-lg border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors">← Önceki</button>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages}
                    className="px-3 py-1 text-xs rounded-lg border border-border/50 disabled:opacity-40 hover:bg-muted transition-colors">Sonraki →</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* SAĞ PANEL - DETAY */}
      {selectedUserData && (() => {
        const u = selectedUserData;
        const rcfg = ROLE_CONFIG[u.role] || ROLE_CONFIG.kullanici;
        const RIcon = rcfg.icon;
        const initials = getInitials(u.full_name);
        const isEmployee = employeeEmails.has(u.email);
        const isMusteri = u.role === "musteri";
        const isPasif = u.status === 'pasif';

        return (
          <div className="w-72 shrink-0">
            <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm sticky top-4">
              {/* Profil Başlık */}
              <div className={cn("p-5 text-center relative", isPasif ? "bg-gray-400" : rcfg.bg)}>
                <button onClick={()=>setSelectedUser(null)} className="absolute top-3 right-3 text-white/70 hover:text-white">
                  <X className="w-4 h-4"/>
                </button>
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-2">
                  {initials}
                </div>
                <h3 className="text-white font-bold text-base">{u.full_name || "—"}</h3>
                <p className="text-white/70 text-xs mt-0.5">{u.email}</p>
                <div className="flex items-center justify-center gap-1 mt-2 bg-white/20 rounded-xl px-3 py-1 w-fit mx-auto">
                  <RIcon className="w-3.5 h-3.5 text-white"/>
                  <span className="text-white text-xs font-semibold">{rcfg.label}</span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Kayıt Tarihi */}
                {u.created_at && (
                  <div className="bg-muted/30 rounded-xl px-3 py-2">
                    <p className="text-xs text-muted-foreground">Kayıt Tarihi</p>
                    <p className="text-sm font-medium mt-0.5">{format(new Date(u.created_at),"d MMMM yyyy",{locale:tr})}</p>
                  </div>
                )}

                {/* Aktif / Pasif Toggle */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Hesap Durumu</p>
                  <button
                    onClick={() => updateMutation.mutate({ id: u.id, data: { status: isPasif ? 'aktif' : 'pasif' } })}
                    disabled={updateMutation.isPending}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2.5 rounded-xl border font-medium text-sm transition-colors",
                      isPasif
                        ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                    )}>
                    <span className="flex items-center gap-2">
                      {isPasif
                        ? <ToggleLeft className="w-4 h-4"/>
                        : <ToggleRight className="w-4 h-4"/>}
                      {isPasif ? "Pasif — Giriş yapamaz" : "Aktif — Giriş yapabilir"}
                    </span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold",
                      isPasif ? "bg-amber-200 text-amber-800" : "bg-emerald-200 text-emerald-800")}>
                      {isPasif ? "PASİF" : "AKTİF"}
                    </span>
                  </button>
                </div>

                {/* Rol Değiştir */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">Rol Değiştir</p>
                  <Select value={u.role||"kullanici"} onValueChange={(role)=>updateMutation.mutate({id:u.id,data:{role}})}>
                    <SelectTrigger className="rounded-xl text-sm h-9">
                      <SelectValue/>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_CONFIG).map(([key,cfg])=>(
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Müşteri Bağla */}
                {isMusteri && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1.5">Bağlı Müşteri</p>
                    <Select value={u.customer_id||"none"} onValueChange={(v)=>updateMutation.mutate({id:u.id,data:{customer_id:v==="none"?null:v}})}>
                      <SelectTrigger className="rounded-xl text-sm h-9">
                        <SelectValue placeholder="Müşteri seçin..."/>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Seçilmedi</SelectItem>
                        {customers.map(c=><SelectItem key={c.id} value={c.id}>{c.company_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {!u.customer_id && <p className="text-xs text-amber-600 mt-1">⚠️ Müşteri atanmadı</p>}
                  </div>
                )}

                {/* Çalışan Yap */}
                {!isEmployee && (
                  <button onClick={()=>createEmployeeMutation.mutate(u)} disabled={createEmployeeMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 text-sm font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl py-2 transition-colors">
                    <UserPlus className="w-4 h-4"/>
                    {createEmployeeMutation.isPending?"Oluşturuluyor...":"Çalışan Kaydı Oluştur"}
                  </button>
                )}
                {isEmployee && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    <UserCheck className="w-4 h-4 text-emerald-600"/>
                    <span className="text-xs font-semibold text-emerald-700">Çalışan kaydı mevcut</span>
                  </div>
                )}

                {/* Sil */}
                <button onClick={()=>{ if(confirm(`"${u.full_name||u.email}" kullanıcısını silmek istediğinize emin misiniz?`)) deleteMutation.mutate(u.id); }}
                  className="w-full flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl py-2 transition-colors">
                  <Trash2 className="w-4 h-4"/>Kullanıcıyı Sil
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      {showCreateDialog && (
        <CreateUserDialog
          onClose={() => setShowCreateDialog(false)}
          customers={customers}
          currentUserRole={currentUser?.role}
        />
      )}
    </div>
  );
}
