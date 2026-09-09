# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/flowmetric dizininde -> python3 patch_yarim_gun_izin.py
#
# Yarim gun izin destegi:
# 1) leave_requests.half_day_period kolonu (ogleden_once / ogleden_sonra)
# 2) db.js alterations + entityRouter ALLOWED_COLUMNS
# 3) LeaveRequestForm: tek gunluk izinlerde "Yarim gun" secenegi, dayCount=0.5
#    (min_days kurali yarim gunde atlanir)
# 4) LeaveFormPrint: ciktida yarim gun ibaresi

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

# ---------- 1) DB kolonu ----------
DBP = os.path.join(ROOT, "backend", "database.sqlite")
con = sqlite3.connect(DBP)
cols = [r[1] for r in con.execute("PRAGMA table_info(leave_requests)")]
if "half_day_period" not in cols:
    con.execute("ALTER TABLE leave_requests ADD COLUMN half_day_period TEXT")
    con.commit()
    print("TAMAM: half_day_period kolonu eklendi")
else:
    print("ATLANDI (zaten var): half_day_period kolonu")
con.close()

# ---------- 2) db.js alterations ----------
patch("backend/src/db.js",
    '    "ALTER TABLE sales_activities ADD COLUMN is_deleted INTEGER DEFAULT 0",',
    '    "ALTER TABLE sales_activities ADD COLUMN is_deleted INTEGER DEFAULT 0",\n    "ALTER TABLE leave_requests ADD COLUMN half_day_period TEXT",',
    "ALTER TABLE leave_requests ADD COLUMN half_day_period",
    "db.js alterations")

# ---------- 3) entityRouter ALLOWED_COLUMNS ----------
patch("backend/src/entityRouter.js",
    "  'priority','ticket_number','total_amount','day_count','offer_date','valid_until',",
    "  'priority','ticket_number','total_amount','day_count','half_day_period','offer_date','valid_until',",
    "'day_count','half_day_period'",
    "entityRouter ALLOWED_COLUMNS")

# ---------- 4) Form: baslangic state ----------
patch("src/components/leave/LeaveRequestForm.jsx",
    '    reason: leave?.reason || "",\n  });',
    '    reason: leave?.reason || "",\n    half_day_period: leave?.half_day_period || "",\n  });',
    'half_day_period: leave?.half_day_period',
    "Form baslangic state")

# ---------- 5) Form: dayCount hesabi ----------
patch("src/components/leave/LeaveRequestForm.jsx",
    """  const dayCount = form.start_date && form.end_date
    ? countBusinessDays(form.start_date, form.end_date)
    : 0;""",
    """  const isSingleDay = !!form.start_date && form.start_date === form.end_date;
  const isHalfDay = isSingleDay && !!form.half_day_period;
  const rawDayCount = form.start_date && form.end_date
    ? countBusinessDays(form.start_date, form.end_date)
    : 0;
  const dayCount = isHalfDay && rawDayCount > 0 ? 0.5 : rawDayCount;""",
    "const isHalfDay = isSingleDay",
    "Form dayCount hesabi")

# ---------- 5) Form: min_days kurali yarim gunde atlanir ----------
patch("src/components/leave/LeaveRequestForm.jsx",
    "  const violatesMinDays = selectedLeaveType?.min_days && dayCount < selectedLeaveType.min_days;",
    "  const violatesMinDays = !isHalfDay && selectedLeaveType?.min_days && dayCount < selectedLeaveType.min_days;",
    "!isHalfDay && selectedLeaveType?.min_days",
    "Form min_days istisnasi")

# ---------- 6) Form: bitis tarihi degisince yarim gun sifirlanir ----------
patch("src/components/leave/LeaveRequestForm.jsx",
    """                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>""",
    """                onChange={(e) => setForm({ ...form, end_date: e.target.value, half_day_period: e.target.value === form.start_date ? form.half_day_period : "" })}
                className="mt-1"
              />
            </div>
          </div>

          {isSingleDay && (
            <div className="rounded-xl border border-border/60 p-3 space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.half_day_period}
                  onChange={(e) =>
                    setForm({ ...form, half_day_period: e.target.checked ? "ogleden_once" : "" })
                  }
                  className="w-4 h-4 rounded border-border"
                />
                <span className="text-sm font-medium">Yar\\u0131m g\\u00fcn izin</span>
              </label>
              {!!form.half_day_period && (
                <div className="flex gap-2 pl-6">
                  {[
                    { v: "ogleden_once", l: "\\u00d6\\u011fleden \\u00f6nce" },
                    { v: "ogleden_sonra", l: "\\u00d6\\u011fleden sonra" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setForm({ ...form, half_day_period: o.v })}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                        form.half_day_period === o.v
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 hover:bg-muted"
                      }`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}""",
    "Yar\\u0131m g\\u00fcn izin",
    "Form yarim gun secenegi")

# ---------- 7) Form: toplam metni ----------
patch("src/components/leave/LeaveRequestForm.jsx",
    '<p className={`text-sm font-medium ${hasRuleViolation ? "text-red-600" : "text-primary"}`}>Toplam: {dayCount} g\u00fcn</p>',
    '<p className={`text-sm font-medium ${hasRuleViolation ? "text-red-600" : "text-primary"}`}>\n'
    '                Toplam: {String(dayCount).replace(".", ",")} g\u00fcn\n'
    '                {isHalfDay && (form.half_day_period === "ogleden_once" ? " (\u00f6\u011fleden \u00f6nce)" : " (\u00f6\u011fleden sonra)")}\n'
    '              </p>',
    'String(dayCount).replace(".", ",")',
    "Form toplam metni")

# ---------- 8) Ciktida yarim gun ibaresi ----------
patch("src/components/leave/LeaveFormPrint.jsx",
    '  const days = leave?.day_count || "\u2014";',
    '  const days = leave?.day_count\n'
    '    ? String(leave.day_count).replace(".", ",") +\n'
    '      (leave.half_day_period\n'
    '        ? leave.half_day_period === "ogleden_once"\n'
    '          ? " (\u00f6\u011fleden \u00f6nce)"\n'
    '          : " (\u00f6\u011fleden sonra)"\n'
    '        : "")\n'
    '    : "\u2014";',
    'leave.half_day_period === "ogleden_once"',
    "LeaveFormPrint yarim gun ibaresi")

print("")
print("NOT: form state'inde half_day_period yoksa asagidaki ile kontrol et:")
print("     grep -n 'useState({' -A 12 src/components/leave/LeaveRequestForm.jsx")
print("BITTI. Simdi: pm2 restart flowmetric-backend && npm run build && sudo systemctl restart nginx")
