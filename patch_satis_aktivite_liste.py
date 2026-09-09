# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_satis_aktivite_liste.py
#
# 1) entityRouter: sales_activities -> 'satis' modul eslemesi
#    (su an eslemesiz oldugu icin admin disinda HERKES 403 aliyor)
# 2) role_permissions: satis rolune can_delete=1 (satis modulu)
# 3) AddSalesActivity.jsx: formun altina liste (ozet kartlar + arama/filtre
#    + sayfalama + admin/satis icin silme)

import os, sqlite3, uuid

ROOT = os.path.dirname(os.path.abspath(__file__))

def patch(path, old, new, isaret, etiket):
    p = os.path.join(ROOT, path)
    with open(p, encoding="utf-8") as f:
        s = f.read()
    if isaret in s:
        print("ATLANDI (zaten var): " + etiket)
        return
    assert old in s and s.count(old) == 1, "ANCHOR BULUNAMADI/COKLU: " + etiket
    s = s.replace(old, new)
    with open(p, "w", encoding="utf-8") as f:
        f.write(s)
    print("TAMAM: " + etiket)

# ---------- 1) TABLE_TO_MODULE ----------
patch("backend/src/entityRouter.js",
    "  customer_projects: 'customer_projects',\n};",
    "  customer_projects: 'customer_projects',\n  sales_activities: 'satis',\n};",
    "sales_activities: 'satis'",
    "entityRouter TABLE_TO_MODULE")

# ---------- 2) role_permissions: satis rolu silme yetkisi ----------
DBP = os.path.join(ROOT, "backend", "database.sqlite")
con = sqlite3.connect(DBP)
row = con.execute(
    "SELECT id, can_delete FROM role_permissions WHERE role_name='satis' AND module='satis'"
).fetchone()
if row is None:
    con.execute(
        "INSERT INTO role_permissions (id, role_name, module, can_view, can_add, can_edit, can_delete) "
        "VALUES (?, 'satis', 'satis', 1, 1, 1, 1)", (str(uuid.uuid4()),)
    )
    print("TAMAM: satis rolu yetkisi olusturuldu")
elif row[1] != 1:
    con.execute(
        "UPDATE role_permissions SET can_delete=1, updated_date=datetime('now') WHERE id=?", (row[0],)
    )
    print("TAMAM: satis rolu can_delete=1")
else:
    print("ATLANDI (zaten var): satis rolu can_delete")
con.commit()
con.close()

# ---------- 3) Frontend: importlar ----------
patch("src/pages/AddSalesActivity.jsx",
    'import { CheckCircle2, Building2, Home, MapPin, Link2, MoreHorizontal, FileText } from "lucide-react";',
    'import { CheckCircle2, Building2, Home, MapPin, Link2, MoreHorizontal, FileText, Search, Trash2, Activity as ActivityIcon } from "lucide-react";\n'
    'import { useMemo } from "react";\n'
    'import {\n'
    '  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,\n'
    '  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,\n'
    '} from "@/components/ui/alert-dialog";',
    "Trash2, Activity as ActivityIcon",
    "AddSalesActivity importlar")

# ---------- 4) Frontend: liste state + veri ----------
patch("src/pages/AddSalesActivity.jsx",
    "  const [success, setSuccess] = useState(false);",
    """  const [success, setSuccess] = useState(false);
  // --- liste state ---
  const [listSearch, setListSearch] = useState("");
  const [listType, setListType] = useState("all");
  const [listPage, setListPage] = useState(1);
  const [listPageSize, setListPageSize] = useState(10);
  const [toDelete, setToDelete] = useState(null);
  const canDelete = user?.role === "admin" || user?.role === "satis";
  const { data: salesList = [] } = useQuery({
    queryKey: ["sales_activities", "list"],
    queryFn: () => flowApi.entities.SalesActivity.list("-date", 500),
  });
  const listFiltered = useMemo(() => salesList.filter((a) => {
    if (listType !== "all" && a.activity_type !== listType) return false;
    if (listSearch) {
      const q = listSearch.toLowerCase();
      if (!a.customer_name?.toLowerCase().includes(q) &&
          !a.employee_name?.toLowerCase().includes(q) &&
          !a.notes?.toLowerCase().includes(q) &&
          !a.title?.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [salesList, listType, listSearch]);
  const listStats = useMemo(() => ({
    total: listFiltered.length,
    teklif: listFiltered.filter((a) => a.activity_type === "teklif_sunumu").length,
    ziyaret: listFiltered.filter((a) => (a.activity_type || "").includes("ziyaret")).length,
    planned: listFiltered.filter((a) => a.next_visit_date).length,
  }), [listFiltered]);
  const listTotalPages = Math.max(1, Math.ceil(listFiltered.length / listPageSize));
  const listPaginated = listFiltered.slice((listPage - 1) * listPageSize, listPage * listPageSize);
  const listTypeOptions = useMemo(
    () => [...new Set(salesList.map((a) => a.activity_type).filter(Boolean))],
    [salesList]
  );
  const deleteSalesMutation = useMutation({
    mutationFn: (id) => flowApi.entities.SalesActivity.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });
      setToDelete(null);
      toast.success("Aktivite silindi");
    },
    onError: (e) => toast.error(e?.message || "Silme basarisiz"),
  });""",
    'const [listSearch, setListSearch] = useState("");',
    "AddSalesActivity liste state")

# ---------- 5) Frontend: liste JSX ----------
patch("src/pages/AddSalesActivity.jsx",
    """      </form>
    </div>
  );
}""",
    """      </form>

      {/* ---- SATIS AKTIVITELERI LISTESI ---- */}
      <div className="mt-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">Sat\u0131\u015f Aktiviteleri</h2>
          <span className="text-xs text-muted-foreground">{listFiltered.length} kay\u0131t</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Toplam", value: listStats.total, cls: "text-indigo-600" },
            { label: "Teklif", value: listStats.teklif, cls: "text-emerald-600" },
            { label: "Ziyaret", value: listStats.ziyaret, cls: "text-amber-600" },
            { label: "Ziyaret Plan\u0131", value: listStats.planned, cls: "text-purple-600" },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border/50 rounded-2xl p-4">
              <div className={cn("text-2xl font-black", s.cls)}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={listSearch}
              onChange={(e) => { setListSearch(e.target.value); setListPage(1); }}
              placeholder="M\u00fc\u015fteri, \u00e7al\u0131\u015fan veya not ara..."
              className="pl-9 rounded-xl"
            />
          </div>
          <Select value={listType} onValueChange={(v) => { setListType(v); setListPage(1); }}>
            <SelectTrigger className="w-full sm:w-56 rounded-xl">
              <SelectValue placeholder="T\u00fcm T\u00fcrler" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">T\u00fcm T\u00fcrler</SelectItem>
              {listTypeOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {activityTypes?.find?.((x) => x.value === t)?.label || t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {listFiltered.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-2xl border border-border/50">
            <ActivityIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">Aktivite bulunamad\u0131</p>
          </div>
        ) : (
          <div className="space-y-2">
            {listPaginated.map((a) => (
              <div key={a.id} className="bg-card border border-border/50 rounded-2xl px-4 py-3 hover:shadow-sm transition-all">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-foreground">
                        {a.customer_name || "-"}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {activityTypes?.find?.((x) => x.value === a.activity_type)?.label || a.activity_type}
                      </span>
                      {a.employee_name && (
                        <span className="text-xs text-muted-foreground">{a.employee_name}</span>
                      )}
                      {a.activity_type === "teklif_sunumu" && a.amount ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {parseFloat(a.amount).toLocaleString("tr-TR")} {a.currency || "TRY"}
                        </span>
                      ) : null}
                    </div>
                    {a.notes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5 max-w-lg">{a.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-foreground">{a.date || ""}</div>
                    {a.duration_minutes ? (
                      <div className="text-[10px] text-muted-foreground">{a.duration_minutes}dk</div>
                    ) : null}
                  </div>
                  {canDelete && (
                    <button
                      onClick={() => setToDelete(a)}
                      className="text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {listFiltered.length > 0 && (
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sayfa ba\u015f\u0131na:</span>
              <select
                value={listPageSize}
                onChange={(e) => { setListPageSize(Number(e.target.value)); setListPage(1); }}
                className="border border-border/50 rounded-lg px-2 py-1 text-xs bg-background"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                disabled={listPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium"
              >
                \u2190 \u00d6nceki
              </button>
              <span className="text-xs text-muted-foreground font-medium">{listPage} / {listTotalPages}</span>
              <button
                onClick={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
                disabled={listPage === listTotalPages}
                className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium"
              >
                Sonraki \u2192
              </button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Aktivite silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.customer_name || "-"}</strong> kayd\u0131 silinecek
              ({toDelete?.date || "-"}). Kay\u0131t geri getirilebilir \u015fekilde saklan\u0131r.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazge\u00e7</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteSalesMutation.mutate(toDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}""",
    "SATIS AKTIVITELERI LISTESI",
    "AddSalesActivity liste JSX")

print("")
print("BITTI. Simdi: pm2 restart flowmetric-backend && npm run build && sudo systemctl restart nginx")
