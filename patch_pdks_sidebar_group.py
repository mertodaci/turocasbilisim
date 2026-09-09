#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# Sol menude "Personel Hareketleri" + "Kart Yonetimi" oglerini, Insan Kaynaklari
# altinda ayri bir "PDKS" alt-basligi altinda toplar. Ayrica Sidebar bilesenine
# coklu-seviye (nested) alt-menu render destegi ekler.
#
# /home/rootori/turocas icinden:
#   python3 patch_pdks_sidebar_group.py
import io

# ==================== Sidebar.jsx ====================
spath = "src/components/layout/Sidebar.jsx"
with io.open(spath, "r", encoding="utf-8") as f:
    sb = f.read()

if 'labelKey: "pdks",' in sb:
    print("Sidebar.jsx: ZATEN UYGULANMIS, atlaniyor.")
else:
    # 1) personel_hareketleri + pdks_kart_yonetimi -> "pdks" alt-grubu
    old_two = (
        '    { labelKey: "personel_hareketleri", path: "/personel-hareketleri", icon: Clock, roles: ["admin", "yonetici", "ik"] },\n'
        '    { labelKey: "pdks_kart_yonetimi", path: "/kart-yonetimi", icon: CreditCard, roles: ["admin", "yonetici", "ik"] },'
    )
    assert old_two in sb and sb.count(old_two) == 1, "ANCHOR (personel_hareketleri + pdks_kart_yonetimi satirlari) BULUNAMADI"
    new_group = (
        '    {\n'
        '      labelKey: "pdks", path: null, icon: Clock, roles: ["admin", "yonetici", "ik"],\n'
        '      children: [\n'
        '        { labelKey: "personel_hareketleri", path: "/personel-hareketleri", icon: Clock, roles: ["admin", "yonetici", "ik"] },\n'
        '        { labelKey: "pdks_kart_yonetimi", path: "/kart-yonetimi", icon: CreditCard, roles: ["admin", "yonetici", "ik"] },\n'
        '      ]\n'
        '    },'
    )
    sb = sb.replace(old_two, new_group)

    # 2) getAllLeafItems() -> recursive (coklu seviye favoriler icin)
    old_leaf = """function getAllLeafItems() {
  const items = [];
  for (const item of allNavItems) {
    if (item.children) {
      for (const child of item.children) {
        items.push(child);
      }
    } else {
      items.push(item);
    }
  }
  return items;
}"""
    assert old_leaf in sb and sb.count(old_leaf) == 1, "ANCHOR (getAllLeafItems) BULUNAMADI"
    new_leaf = """function getAllLeafItems() {
  const items = [];
  function walk(list) {
    for (const item of list) {
      if (item.children) {
        walk(item.children);
      } else {
        items.push(item);
      }
    }
  }
  walk(allNavItems);
  return items;
}"""
    sb = sb.replace(old_leaf, new_leaf)

    # 3) navItems filtreleme -> coklu seviye (recursive) izin filtresi
    old_filter = """  const navItems = allNavItems
    .map((item) => ({
      ...item,
      // Grup başlıklarının (path=null) çocuklarını önce filtrele
      children: item.children?.filter((child) => canViewModule(child.labelKey)),
    }))
    .filter((item) => {
      // Yaprak öğe: DB izni belirler
      if (item.path) return canViewModule(item.labelKey);
      // Grup başlığı: en az bir çocuğu görünüyorsa göster
      return item.children && item.children.length > 0;
    });"""
    assert old_filter in sb and sb.count(old_filter) == 1, "ANCHOR (navItems filtreleme) BULUNAMADI"
    new_filter = """  function filterNavTree(items) {
    return items
      .map((item) => ({
        ...item,
        children: item.children ? filterNavTree(item.children) : undefined,
      }))
      .filter((item) => {
        if (item.children) return item.children.length > 0;
        return canViewModule(item.labelKey);
      });
  }
  const navItems = filterNavTree(allNavItems);"""
    sb = sb.replace(old_filter, new_filter)

    # 4) renderNavChild -> renderChildLink'ten sonra, coklu seviye render icin
    # (satir bazli, bosluklara/girintiye tamamen toleranslu arama: sadece
    # icerik "};" hemen ardindan "return (" gelen VE yakininda
    # "renderChildLink" tanimi olan yeri bulur)
    raw_lines = sb.split("\n")
    strip_lines = [ln.strip() for ln in raw_lines]
    idx4 = None  # "return (" satirinin index'i
    close_idx = None  # onun oncesindeki "};" satirinin index'i (arada bos satir olabilir)
    for i in range(len(raw_lines)):
        if strip_lines[i] != "return (":
            continue
        j = i - 1
        while j >= 0 and strip_lines[j] == "":
            j -= 1
        if j >= 0 and strip_lines[j] == "};":
            window_start = max(0, j - 40)
            nearby = " ".join(strip_lines[window_start:j])
            if "renderChildLink" in nearby:
                idx4 = i
                close_idx = j
                break
    assert idx4 is not None, "ANCHOR (renderChildLink sonu / return, satir bazli) BULUNAMADI"
    prev_line = raw_lines[close_idx]
    base = prev_line[: len(prev_line) - len(prev_line.lstrip())]  # "};" satirinin girintisi
    insert_block = [
        f"{base}const renderNavChild = (child) => {{",
        f"{base}  const hasKids = child.children && child.children.length > 0;",
        f"{base}  if (!hasKids) return renderChildLink(child);",
        f"{base}  const isSubExpanded = expandedMenus[child.labelKey];",
        f"{base}  return (",
        f'{base}    <div key={{child.labelKey}}>',
        f'{base}      <button onClick={{() => toggleMenu(child.labelKey)}}',
        f'{base}        className={{cn(',
        f'{base}          "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative",',
        f'{base}          isSubExpanded ? "text-sidebar-foreground bg-sidebar-accent/60" : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"',
        f'{base}        )}}>',
        f'{base}        <child.icon className="w-4 h-4 shrink-0" />',
        f'{base}        <span className="flex-1 text-left">{{t(child.labelKey)}}</span>',
        f'{base}        <ChevronDown className={{cn("w-3.5 h-3.5 transition-transform shrink-0", isSubExpanded && "rotate-180")}} />',
        f'{base}      </button>',
        f'{base}      {{isSubExpanded && (',
        f'{base}        <div className="space-y-1 pl-4 mt-1 border-l-2 border-sidebar-accent">',
        f'{base}          {{child.children.map(renderNavChild)}}',
        f'{base}        </div>',
        f'{base}      )}}',
        f'{base}    </div>',
        f'{base}  );',
        f"{base}}};",
    ]
    raw_lines[idx4:idx4] = insert_block
    sb = "\n".join(raw_lines)

    # 5) alt-menu render'inda renderChildLink -> renderNavChild
    old_use = "{item.children.map(renderChildLink)}"
    assert old_use in sb and sb.count(old_use) == 1, "ANCHOR (item.children.map(renderChildLink)) BULUNAMADI"
    sb = sb.replace(old_use, "{item.children.map(renderNavChild)}")

    with io.open(spath, "w", encoding="utf-8") as f:
        f.write(sb)
    print("OK Sidebar.jsx: 'PDKS' alt-grubu olusturuldu, coklu-seviye alt-menu destegi eklendi")

# ==================== LanguageContext.jsx ====================
lpath = "src/lib/LanguageContext.jsx"
with io.open(lpath, "r", encoding="utf-8") as f:
    lb = f.read()

if 'pdks: "PDKS"' in lb:
    print("LanguageContext.jsx: ZATEN UYGULANMIS, atlaniyor.")
else:
    old_tr = 'personel_hareketleri: "Personel Hareketleri",'
    assert old_tr in lb and lb.count(old_tr) == 1, "ANCHOR (TR personel_hareketleri) BULUNAMADI"
    lb = lb.replace(old_tr, 'pdks: "PDKS",\n    ' + old_tr)

    old_en = 'personel_hareketleri: "Personnel Movements",'
    assert old_en in lb and lb.count(old_en) == 1, "ANCHOR (EN personel_hareketleri) BULUNAMADI"
    lb = lb.replace(old_en, 'pdks: "PDKS",\n    ' + old_en)

    with io.open(lpath, "w", encoding="utf-8") as f:
        f.write(lb)
    print("OK LanguageContext.jsx: 'pdks' basligi icin TR/EN metinleri eklendi")

print("\nTamamlandi. Simdi: npm run build")
