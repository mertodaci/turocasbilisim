# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_teklif_silme2.py
# v2: duplicate kontrolu ayri bir "isaret" dizesine bakar (v1'de yanlis atlama vardi)

import os, sqlite3

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

# ---------- 1) db.js alterations ----------
patch("backend/src/db.js",
    '    "ALTER TABLE employees ADD COLUMN is_deleted INTEGER DEFAULT 0",',
    '    "ALTER TABLE employees ADD COLUMN is_deleted INTEGER DEFAULT 0",\n    "ALTER TABLE sales_activities ADD COLUMN is_deleted INTEGER DEFAULT 0",',
    'ALTER TABLE sales_activities ADD COLUMN is_deleted',
    "db.js alterations")

# ---------- 2) entityRouter SOFT_DELETE_TABLES ----------
patch("backend/src/entityRouter.js",
    "const SOFT_DELETE_TABLES = ['customers','tq_tickets','tq_projects','employees'];",
    "const SOFT_DELETE_TABLES = ['customers','tq_tickets','tq_projects','employees','sales_activities'];",
    "'employees','sales_activities']",
    "entityRouter SOFT_DELETE_TABLES")

# ---------- 3) entityRouter ALLOWED_COLUMNS ----------
patch("backend/src/entityRouter.js",
    "'deal_status','products','amount','currency'],",
    "'deal_status','products','amount','currency','is_deleted'],",
    "'amount','currency','is_deleted']",
    "entityRouter ALLOWED_COLUMNS")

# ---------- 4) OffersPage: importlar ----------
patch("src/pages/OffersPage.jsx",
    'import { FileText, Building2, Search, TrendingUp, CheckCircle2, MessageSquare, ExternalLink } from "lucide-react";',
    'import { FileText, Building2, Search, TrendingUp, CheckCircle2, MessageSquare, ExternalLink, Trash2 } from "lucide-react";\n'
    'import { useMutation, useQueryClient } from "@tanstack/react-query";\n'
    'import { useAuth } from "@/contexts/AuthContext";\n'
    'import {\n'
    '  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,\n'
    '  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,\n'
    '} from "@/components/ui/alert-dialog";',
    'MessageSquare, ExternalLink, Trash2 }',
    "OffersPage importlar")

# ---------- 5) OffersPage: state + mutation ----------
patch("src/pages/OffersPage.jsx",
    '  const [search, setSearch] = useState("");\n  const [filterStatus, setFilterStatus] = useState("all");',
    '  const [search, setSearch] = useState("");\n'
    '  const [filterStatus, setFilterStatus] = useState("all");\n'
    '  const [toDelete, setToDelete] = useState(null);\n'
    '  const { user } = useAuth();\n'
    '  const isAdmin = user?.role === "admin";\n'
    '  const queryClient = useQueryClient();\n'
    '  const deleteMutation = useMutation({\n'
    '    mutationFn: (id) => flowApi.entities.SalesActivity.delete(id),\n'
    '    onSuccess: () => {\n'
    '      queryClient.invalidateQueries({ queryKey: ["sales_activities"] });\n'
    '      setToDelete(null);\n'
    '    },\n'
    '  });',
    'const [toDelete, setToDelete] = useState(null);',
    "OffersPage state + mutation")

# ---------- 6) OffersPage: silme butonu ----------
patch("src/pages/OffersPage.jsx",
    """                    <td className="px-4 py-3">
                      {o.customer_id && (
                        <div className="flex justify-end">
                          <Link
                            to={`/musteri/${o.customer_id}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="M\u00fc\u015fteriye git"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        </div>
                      )}
                    </td>""",
    """                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-2">
                        {o.customer_id && (
                          <Link
                            to={`/musteri/${o.customer_id}`}
                            className="text-muted-foreground hover:text-primary transition-colors"
                            title="M\u00fc\u015fteriye git"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => setToDelete(o)}
                            className="text-muted-foreground hover:text-red-600 transition-colors"
                            title="Teklifi sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>""",
    'onClick={() => setToDelete(o)}',
    "OffersPage silme butonu")

# ---------- 7) OffersPage: onay dialogu ----------
patch("src/pages/OffersPage.jsx",
    "        </table>",
    """        </table>
      {/* teklif-silme-dialog */}
      <AlertDialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Teklif silinsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.title || "-"}</strong> ba\u015fl\u0131kl\u0131 teklif ({toDelete?.customer_name || "-"}) silinecek.
              Bu i\u015flem ilgili sat\u0131\u015f aktivitesini de kald\u0131r\u0131r. Kay\u0131t geri getirilebilir \u015fekilde saklan\u0131r.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazge\u00e7</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(toDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>""",
    'teklif-silme-dialog',
    "OffersPage onay dialogu")

# ---------- 8) DB kolonu (v1'de eklendi, yine de guvence) ----------
DBP = os.path.join(ROOT, "backend", "database.sqlite")
con = sqlite3.connect(DBP)
cols = [r[1] for r in con.execute("PRAGMA table_info(sales_activities)")]
if "is_deleted" not in cols:
    con.execute("ALTER TABLE sales_activities ADD COLUMN is_deleted INTEGER DEFAULT 0")
    print("TAMAM: is_deleted kolonu eklendi")
else:
    print("ATLANDI (zaten var): is_deleted kolonu")
con.execute("UPDATE sales_activities SET is_deleted = 0 WHERE is_deleted IS NULL")
con.commit()
con.close()

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx && pm2 restart turocas-backend")
