# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_izin_iptal.py
# IK Izin Yonetimi: onaylanmis/reddedilmis izinleri admin ve ik rolleri
# "Iptal Edildi" durumuna alabilsin (kayit silinmez, izlenebilir kalir).
# Bakiye hesabi sadece status='onaylandi' saydigi icin iptal otomatik duser.

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

# ---------- 1) Import: XCircle + AlertDialog ----------
patch("src/pages/IKLeaveRequests.jsx",
    'import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";',
    'import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";\n'
    'import { Ban } from "lucide-react";\n'
    'import {\n'
    '  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,\n'
    '  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,\n'
    '} from "@/components/ui/alert-dialog";',
    'import { Ban } from "lucide-react";',
    "IKLeaveRequests importlar")

# ---------- 2) State + mutation ----------
patch("src/pages/IKLeaveRequests.jsx",
    "  const queryClient = useQueryClient();",
    """  const queryClient = useQueryClient();
  const [toCancel, setToCancel] = useState(null);
  const canCancelLeave = user?.role === "admin" || user?.role === "ik";
  const cancelLeaveMutation = useMutation({
    mutationFn: (leave) =>
      flowApi.entities.LeaveRequest.update(leave.id, {
        status: "iptal_edildi",
        approval_note: "IK tarafindan iptal edildi",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-leave-requests"] });
      queryClient.invalidateQueries({ queryKey: ["leave-allowance-form"] });
      setToCancel(null);
    },
  });""",
    "const canCancelLeave =",
    "IKLeaveRequests state + mutation")

# ---------- 3) Islem sutununa iptal butonu ----------
patch("src/pages/IKLeaveRequests.jsx",
    """                      {(leave.status === "ik_onayi_bekliyor" || leave.status === "yonetici_onayi_bekliyor") && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedLeave(leave)}>""",
    """                      {canCancelLeave &&
                        (leave.status === "onaylandi" || leave.status === "reddedildi") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setToCancel(leave)}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            \u0130ptal Et
                          </Button>
                        )}
                      {(leave.status === "ik_onayi_bekliyor" || leave.status === "yonetici_onayi_bekliyor") && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedLeave(leave)}>""",
    "\u0130ptal Et",
    "IKLeaveRequests iptal butonu")

# ---------- 4) Onay dialogu ----------
patch("src/pages/IKLeaveRequests.jsx",
    """      {showHistory && (
        <LeaveApprovalHistoryDialog
          leave={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}
    </div>""",
    """      {showHistory && (
        <LeaveApprovalHistoryDialog
          leave={showHistory}
          onClose={() => setShowHistory(null)}
        />
      )}

      <AlertDialog open={!!toCancel} onOpenChange={(v) => !v && setToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>\u0130zin iptal edilsin mi?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toCancel?.employee_full_name || "-"}</strong> adl\u0131 \u00e7al\u0131\u015fan\u0131n
              {" "}{toCancel?.start_date} - {toCancel?.end_date} tarihli izni
              {" "}<strong>\u0130ptal Edildi</strong> durumuna al\u0131nacak.
              Kay\u0131t silinmez, ge\u00e7mi\u015fte g\u00f6r\u00fcn\u00fcr ve izin bakiyesine geri eklenir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Vazge\u00e7</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelLeaveMutation.mutate(toCancel)}
              className="bg-red-600 hover:bg-red-700"
            >
              \u0130ptal Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>""",
    "toCancel?.employee_full_name",
    "IKLeaveRequests onay dialogu")

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
