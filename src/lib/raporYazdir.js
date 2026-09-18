// Herhangi bir liste/tablo raporunu (Excel export'u zaten var olan ekranlarda)
// yazdırılabilir bir PDF'e çevirir — stokBelge.js/ikBordroPusula.js ile aynı
// desen (yeni pencere + document.write + window.print). jspdf/html2canvas
// kasıtlı olarak kullanılmıyor: bu desen daha güvenilir/seçilebilir metin
// üretiyor ve projede zaten kanıtlanmış standart.

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/**
 * @param {object} opt
 * @param {string} opt.baslik       Rapor adı (örn. "Çalışan Raporu")
 * @param {string} [opt.altBaslik]  Kısa alt bilgi (örn. "128 çalışan")
 * @param {Array<{key:string, label?:string, align?:'right'}>} opt.kolonlar
 * @param {Array<object>} opt.satirlar  Her satır, kolonlar[].key alanlarını taşıyan düz obje
 */
export function raporYazdir({ baslik, altBaslik, kolonlar, satirlar }) {
  const tarih = new Date().toLocaleDateString("tr-TR");
  const theadHtml = kolonlar.map((k) => `<th${k.align === "right" ? ' class="r"' : ""}>${esc(k.label || k.key)}</th>`).join("");
  const bodyHtml = (satirlar || []).map((row) => `<tr>${kolonlar.map((k) => `<td${k.align === "right" ? ' class="r"' : ""}>${esc(row[k.key])}</td>`).join("")}</tr>`).join("");

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>${esc(baslik)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 11px/1.4 -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 20px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 12px; }
  .head .firma { font-size: 15px; font-weight: 700; }
  .head .sub { color: #555; font-size: 11px; }
  .head h1 { font-size: 15px; margin: 0 0 2px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #999; padding: 3px 6px; font-size: 10px; white-space: nowrap; }
  th { background: #eee; text-align: left; }
  td.r, th.r { text-align: right; }
  @media print { @page { size: A4 landscape; margin: 10mm; } body { margin: 0; } }
</style></head><body>
  <div class="head">
    <div>
      <div class="firma">Turkonix — Sınırsız İletişim</div>
      <div class="sub">${esc(tarih)}${altBaslik ? " · " + esc(altBaslik) : ""}</div>
    </div>
    <div style="text-align:right"><h1>${esc(baslik)}</h1></div>
  </div>
  <table>
    <thead><tr>${theadHtml}</tr></thead>
    <tbody>${bodyHtml || `<tr><td colspan="${kolonlar.length}" style="text-align:center;color:#777">Kayıt yok</td></tr>`}</tbody>
  </table>
  <script>
    (function () {
      function go() { try { window.focus(); window.print(); } catch (e) {} }
      if (document.readyState === "complete") setTimeout(go, 150);
      else window.addEventListener("load", function () { setTimeout(go, 150); });
    })();
  </script>
</body></html>`;

  const w = window.open("", "_blank", "width=1100,height=800");
  if (!w) { alert("Yazdırma penceresi açılamadı — tarayıcı pop-up engelini kontrol edin."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* pencere içi script halleder */ } }, 400);
}
