# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_departman_etiket.py
#
# Departman alanlari ekranlarda ham slug olarak gorunuyordu
# (abys_yazilim_ekibi). definitions tablosunda category='departman'
# altinda label/value ciftleri zaten var; ekranlar artik label basacak.
# VERIYE DOKUNULMUYOR - sadece gosterim duzeliyor.

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

# ================= IKLeaveRequests.jsx =================

# 1) definitions sorgusu + deptLabel yardimcisi
patch("src/pages/IKLeaveRequests.jsx",
    '  const [filterDepartment, setFilterDepartment] = useState("tumu");',
    '  const [filterDepartment, setFilterDepartment] = useState("tumu");\n'
    '  const { data: departmentDefs = [] } = useQuery({\n'
    '    queryKey: ["definitions", "departman"],\n'
    '    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),\n'
    '  });\n'
    '  const deptLabel = (v) => departmentDefs.find((d) => d.value === v)?.label || v || "\u2014";',
    "const deptLabel = (v) => departmentDefs",
    "IKLeaveRequests deptLabel")

# 2) Tablo hucresi
patch("src/pages/IKLeaveRequests.jsx",
    '<td className="px-4 py-3 text-muted-foreground">{leave.employee_department}</td>',
    '<td className="px-4 py-3 text-muted-foreground">{deptLabel(leave.employee_department)}</td>',
    "{deptLabel(leave.employee_department)}",
    "IKLeaveRequests tablo hucresi")

# 3) Filtre dropdown
patch("src/pages/IKLeaveRequests.jsx",
    "            {departments.map(dept => (\n              <SelectItem key={dept} value={dept}>{dept}</SelectItem>\n            ))}",
    "            {departments.map(dept => (\n              <SelectItem key={dept} value={dept}>{deptLabel(dept)}</SelectItem>\n            ))}",
    "value={dept}>{deptLabel(dept)}",
    "IKLeaveRequests filtre dropdown")

# ================= LeaveRequests.jsx =================

# 1) definitions sorgusu + deptLabel yardimcisi
patch("src/pages/LeaveRequests.jsx",
    '  const [filterStatus, setFilterStatus] = useState("tumu");',
    '  const [filterStatus, setFilterStatus] = useState("tumu");\n'
    '  const { data: departmentDefs = [] } = useQuery({\n'
    '    queryKey: ["definitions", "departman"],\n'
    '    queryFn: () => flowApi.entities.Definition.filter({ category: "departman" }),\n'
    '  });\n'
    '  const deptLabel = (v) => departmentDefs.find((d) => d.value === v)?.label || v || "\u2014";',
    "const deptLabel = (v) => departmentDefs",
    "LeaveRequests deptLabel tanimi")

# 2) Tablo hucresi
patch("src/pages/LeaveRequests.jsx",
    '<p className="text-xs text-muted-foreground">{leave.employee_department}</p>',
    '<p className="text-xs text-muted-foreground">{deptLabel(leave.employee_department)}</p>',
    "{deptLabel(leave.employee_department)}",
    "LeaveRequests tablo hucresi")

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
