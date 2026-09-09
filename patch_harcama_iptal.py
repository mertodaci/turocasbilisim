# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_harcama_iptal.py
# IK Harcama Yonetimi: admin ve ik rolleri harcama taleplerini
# "Iptal Edildi" durumuna alabilsin (kayit silinmez, izlenebilir kalir).
# Izin ekranindaki desenin aynisi.

import os

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

# ---------- 1) STATUS_CONFIG: iptal_edildi ----------
patch("src/pages/IKExpenseRequests.jsx",
    '  reddedildi: { label: "Reddedildi", color: "bg-red-100 text-red-800" },\n};',
    '  reddedildi: { label: "Reddedildi", color: "bg-red-100 text-red-800" },\n'
    '  iptal_edildi: { label: "\u0130ptal Edildi", color: "bg-gray-100 text-gray-600" },\n};',
    'iptal_edildi: { label: "\u0130ptal Edildi"',
    "STATUS_CONFIG iptal_edildi")

# ---------- 2) Importlar ----------
patch("src/pages/IKExpenseRequests.jsx",
    'import { useState } from "react";',
    'import { useState } from "react";\n'
    'import { useAuth } from "@/lib/AuthContext";\n'
    'import { Ban } from "lucide-react";\n'
    'import {\n'
    '  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,\n'
    '  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,\n'
    '} from "@/components/ui/alert-dialog";',
    'import { Ban } from "lucide-react";',
    "IKExpenseRequests importlar")

# ---------- 3) State + mutation ----------
patch("src/pages/IKExpenseRequests.jsx",
    "  const queryClient = useQueryClient();\n  const [selectedReport, setSelectedReport] = useState(null);",
    """  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState(null);
  const [toCancel, setToCancel] = useState(null);
  const canCancelExpense = user?.role === "admin" || user?.role === "ik";
  const cancelExpenseMutation = useMutation({
    mutationFn: (report) =>
      flowApi.entities.ExpenseReport.update(report.id, {
        status: "iptal_edildi",
        approval_note: "IK tarafindan iptal edildi",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-expense-reports"] });
      setToCancel(null);
    },
  });""",
    "const canCancelExpense =",
    "IKExpenseRequests state + mutation")

# ---------- 4) Islem sutununa iptal butonu ----------
patch("src/pages/IKExpenseRequests.jsx",
    """                    <td className="px-4 py-3">
                      {(r.status === "yonetici_onayi_bekliyor" || r.status === "ik_onayi_bekliyor") && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedReport(r)}>
                          <Eye className="w-3 h-3 mr-1" />
                          \u0130ncele
                        </Button>
                      )}
                    </td>""",
    """                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {(r.status === "yonetici_onayi_bekliyor" || r.status === "ik_onayi_bekliyor") && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedReport(r)}>
                            <Eye className="w-3 h-3 mr-1" />
                            \u0130ncele
                          </Button>
                        )}
                        {canCancelExpense && r.status !== "iptal_edildi" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setToCancel(r)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            \u0130ptal Et
                          </Button>
                        )}
                      </div>
                    </td>""",
    "canCancelExpense && r.status !==",
    "IKExpenseRequests iptal butonu")

# ---------- 5) Onay dialogu ----------
patch("src/pages/IKExpenseRequests.jsx",
    """      {selectedReport && (
        <ExpenseApprovalDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSuccess={() => {
            setSelectedReport(null);
            queryClient.invalidateQueries({ queryKey: ["all-expense-reports"] });
          }}
        />
      )}
    </div>""",
    """      {selectedReport && (
        <ExpenseApprovalDialog
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onSuccess={() => {
            setSelectedReport(null);
            queryClient.invalidateQueries({ queryKey: ["all-expense-reports"] });
          }}
        />
      )}

      <AlertDialog open={!!toCancel} onOpenChange={(v) => !v && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Harcama talebi iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toCancel?.employee_name || "-"}</strong> adl\u0131 \u00e7al\u0131\u015fan\u0131n
              {toCancel?.project_name ? ` "${toCancel.project_name}" ` : " "}
              harcama talebi <strong>\u0130ptal Edildi</strong> durumuna al\u0131nacak.
              Kay\u0131t silinmez, ge\u00e7mi\u015fte g\u00f6r\u00fcn\u00fcr.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazge\u00e7</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelExpenseMutation.mutate(toCancel)}
              className="bg-red-600 hover:bg-red-700"
            >
              \u0130ptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>""",
    "Harcama talebi iptal edilsin mi",
    "IKExpenseRequests onay dialogu")

print("")
print("NOT: dosyada useMutation import edilmis olmali. Kontrol:")
print("  grep -n 'useMutation' src/pages/IKExpenseRequests.jsx | head -2")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
