#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Yeni "Kart Yonetimi" sayfasini (CardManagement.jsx) route'a, sol menuye ve
# dil dosyasina baglar. CardManagement.jsx'in src/pages/ altina zaten
# kopyalanmis olmasi gerekir (bu script sadece App.jsx/Sidebar.jsx/
# LanguageContext.jsx icini duzenler, dosya kopyalamaz).
#
# /home/rootori/turocas icinden:
#   python3 patch_pdks_menu.py
import io

changed_any = False

# ---- App.jsx: lazy import + route ----
apath = "src/App.jsx"
with io.open(apath, "r", encoding="utf-8") as f:
    ab = f.read()

if "CardManagement" in ab:
    print("App.jsx: ZATEN UYGULANMIS, atlaniyor.")
else:
    old_import = "const PersonnelMovements = lazy(() => import('./pages/PersonnelMovements'));"
    assert old_import in ab and ab.count(old_import) == 1, "ANCHOR (PersonnelMovements lazy import) BULUNAMADI"
    ab = ab.replace(old_import, old_import + "\nconst CardManagement = lazy(() => import('./pages/CardManagement'));")

    old_route = '<Route path="/personel-hareketleri" element={guard("personel_hareketleri", <PersonnelMovements />)} />'
    assert old_route in ab and ab.count(old_route) == 1, "ANCHOR (personel-hareketleri route) BULUNAMADI"
    new_route = old_route + '\n        <Route path="/kart-yonetimi" element={guard("personel_hareketleri", <CardManagement />)} />'
    ab = ab.replace(old_route, new_route)

    with io.open(apath, "w", encoding="utf-8") as f:
        f.write(ab)
    print("OK App.jsx: CardManagement route eklendi (/kart-yonetimi)")
    changed_any = True

# ---- Sidebar.jsx: ikon import + menu item ----
spath = "src/components/layout/Sidebar.jsx"
with io.open(spath, "r", encoding="utf-8") as f:
    sb = f.read()

if "pdks_kart_yonetimi" in sb:
    print("Sidebar.jsx: ZATEN UYGULANMIS, atlaniyor.")
else:
    old_icon_import = "ScrollText, Clock } from \"lucide-react\";"
    assert old_icon_import in sb and sb.count(old_icon_import) == 1, "ANCHOR (lucide-react import) BULUNAMADI"
    sb = sb.replace(old_icon_import, "ScrollText, Clock, CreditCard } from \"lucide-react\";")

    old_menu = '{ labelKey: "personel_hareketleri", path: "/personel-hareketleri", icon: Clock, roles: ["admin", "yonetici", "ik"] },'
    assert old_menu in sb and sb.count(old_menu) == 1, "ANCHOR (personel_hareketleri menu item) BULUNAMADI"
    new_menu = old_menu + '\n    { labelKey: "pdks_kart_yonetimi", path: "/kart-yonetimi", icon: CreditCard, roles: ["admin", "yonetici", "ik"] },'
    sb = sb.replace(old_menu, new_menu)

    with io.open(spath, "w", encoding="utf-8") as f:
        f.write(sb)
    print("OK Sidebar.jsx: 'Kart Yonetimi' menu ogesi eklendi")
    changed_any = True

# ---- LanguageContext.jsx: TR + EN metinleri ----
lpath = "src/lib/LanguageContext.jsx"
with io.open(lpath, "r", encoding="utf-8") as f:
    lb = f.read()

if "pdks_kart_yonetimi" in lb:
    print("LanguageContext.jsx: ZATEN UYGULANMIS, atlaniyor.")
else:
    old_tr = 'personel_hareketleri: "Personel Hareketleri",'
    assert old_tr in lb and lb.count(old_tr) == 1, "ANCHOR (TR personel_hareketleri) BULUNAMADI"
    lb = lb.replace(old_tr, old_tr + '\n    pdks_kart_yonetimi: "Kart Yönetimi",')

    old_en = 'personel_hareketleri: "Personnel Movements",'
    assert old_en in lb and lb.count(old_en) == 1, "ANCHOR (EN personel_hareketleri) BULUNAMADI"
    lb = lb.replace(old_en, old_en + '\n    pdks_kart_yonetimi: "Card Management",')

    with io.open(lpath, "w", encoding="utf-8") as f:
        f.write(lb)
    print("OK LanguageContext.jsx: TR/EN metinleri eklendi")
    changed_any = True

if changed_any:
    print("\nTamamlandi. Simdi: npm run build")
