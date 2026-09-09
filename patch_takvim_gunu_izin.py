# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_takvim_gunu_izin.py
# Dogum Izni ve Babalik Izni takvim gunu uzerinden hesaplansin.
# Sebep: bu turlerin min/max degerleri (56 ve 10) takvim gunu olarak
# tanimlanmis; countBusinessDays hafta sonlarini eledigi icin kural
# asla saglanamiyor ve talep gonderilemiyordu.

import os

ROOT = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(ROOT, "src/components/leave/LeaveRequestForm.jsx")

with open(P, encoding="utf-8") as f:
    s = f.read()

ISARET = "CALENDAR_DAY_TYPES"
if ISARET in s:
    print("ATLANDI (zaten var): takvim gunu hesabi")
else:
    ESKI = """  const isSingleDay = !!form.start_date && form.start_date === form.end_date;
  const isHalfDay = isSingleDay && !!form.half_day_period;
  const rawDayCount = form.start_date && form.end_date
    ? countBusinessDays(form.start_date, form.end_date)
    : 0;
  const dayCount = isHalfDay && rawDayCount > 0 ? 0.5 : rawDayCount;"""

    YENI = """  const isSingleDay = !!form.start_date && form.start_date === form.end_date;
  const isHalfDay = isSingleDay && !!form.half_day_period;
  // Dogum ve Babalik izinleri takvim gunu uzerinden hesaplanir
  // (min/max degerleri takvim gunu olarak tanimli: 56 ve 10).
  const CALENDAR_DAY_TYPES = ["Do\u011fum \u0130zni", "Babal\u0131k \u0130zni"];
  const isCalendarDayType = CALENDAR_DAY_TYPES.includes(form.leave_type);
  const rawDayCount = form.start_date && form.end_date
    ? isCalendarDayType
      ? Math.max(
          0,
          Math.round(
            (new Date(form.end_date) - new Date(form.start_date)) / 86400000
          ) + 1
        )
      : countBusinessDays(form.start_date, form.end_date)
    : 0;
  const dayCount = isHalfDay && rawDayCount > 0 ? 0.5 : rawDayCount;"""

    assert s.count(ESKI) == 1, "ANCHOR BULUNAMADI/COKLU: dayCount hesabi"
    s = s.replace(ESKI, YENI)
    print("TAMAM: takvim gunu hesabi eklendi")

# Toplam satirinin altina aciklama
ISARET2 = "takvim g\u00fcn\u00fc"
if ISARET2 in s:
    print("ATLANDI (zaten var): takvim gunu notu")
else:
    ESKI2 = """              {leaveAllowance === null && ("""
    YENI2 = """              {isCalendarDayType && (
                <p className="text-xs text-muted-foreground">
                  Bu izin t\u00fcr\u00fc takvim g\u00fcn\u00fc \u00fczerinden hesaplan\u0131r (hafta sonlar\u0131 dahil).
                </p>
              )}
              {leaveAllowance === null && ("""
    assert s.count(ESKI2) == 1, "ANCHOR BULUNAMADI/COKLU: toplam blogu"
    s = s.replace(ESKI2, YENI2)
    print("TAMAM: takvim gunu notu")

with open(P, "w", encoding="utf-8") as f:
    f.write(s)

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
