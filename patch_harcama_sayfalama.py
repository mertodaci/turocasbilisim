# -*- coding: utf-8 -*-
# Kullanim: /home/rootori/turocas dizininde -> python3 patch_harcama_sayfalama.py
# IK Harcama Yonetimi listesine sayfalama ekler (varsayilan 10 kayit/sayfa).
# Izin Yonetimi ekranindaki desenin aynisi.

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

# ---------- 1) State ----------
patch("src/pages/IKExpenseRequests.jsx",
    '  const [searchQuery, setSearchQuery] = useState("");',
    '  const [searchQuery, setSearchQuery] = useState("");\n'
    '  const [currentPage, setCurrentPage] = useState(1);\n'
    '  const [pageSize, setPageSize] = useState(10);',
    "const [currentPage, setCurrentPage] = useState(1);",
    "sayfalama state")

# ---------- 2) Liste dilimi ----------
patch("src/pages/IKExpenseRequests.jsx",
    "              {filtered.map((r, i) => {",
    "              {filtered\n"
    "                .slice((currentPage - 1) * pageSize, currentPage * pageSize)\n"
    "                .map((r, i) => {",
    ".slice((currentPage - 1) * pageSize",
    "liste dilimi")

# ---------- 3) Sayfalama kontrolleri ----------
patch("src/pages/IKExpenseRequests.jsx",
    """            </tbody>
          </table>
        )}
      </div>""",
    """            </tbody>
          </table>
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Sayfa ba\u015f\u0131na:</span>
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                className="border border-border/50 rounded-lg px-2 py-1 text-xs bg-background"
              >
                {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
              <span>{filtered.length} kay\u0131t</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium"
              >
                \u2190 \u00d6nceki
              </button>
              <span className="text-xs text-muted-foreground font-medium">
                {currentPage} / {Math.max(1, Math.ceil(filtered.length / pageSize))}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.max(1, Math.ceil(filtered.length / pageSize)), p + 1)
                  )
                }
                disabled={currentPage >= Math.ceil(filtered.length / pageSize)}
                className="px-3 py-1.5 rounded-lg border border-border/50 disabled:opacity-30 hover:bg-muted transition-colors text-xs font-medium"
              >
                Sonraki \u2192
              </button>
            </div>
          </div>
        )}
      </div>""",
    "Sayfa ba\u015f\u0131na:",
    "sayfalama kontrolleri")

# ---------- 4) Filtre sekmesi degisince sayfa 1 ----------
patch("src/pages/IKExpenseRequests.jsx",
    "              onClick={() => setFilterStatus(key)}",
    "              onClick={() => { setFilterStatus(key); setCurrentPage(1); }}",
    "setFilterStatus(key); setCurrentPage(1);",
    "durum sekmesi sayfa sifirlama")

# ---------- 5) Arama degisince sayfa 1 ----------
patch("src/pages/IKExpenseRequests.jsx",
    "            onChange={(e) => setSearchQuery(e.target.value)}",
    "            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}",
    "setSearchQuery(e.target.value); setCurrentPage(1);",
    "arama sayfa sifirlama")

print("")
print("BITTI. Simdi: npm run build && sudo systemctl restart nginx")
