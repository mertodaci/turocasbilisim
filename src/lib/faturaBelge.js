// Fatura ödeme emri raporu yazdırma — yeni pencereye temiz bir belge yazıp
// window.print() çağırır (stokBelge.js ile aynı desen).

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const df = (v) => (v ? String(v).slice(0, 10).split("-").reverse().join(".") : "—");

/**
 * @param {object} fatura  fatura_islemler satırı
 * @param {object} abone   fatura_aboneler satırı (opsiyonel)
 */
export function faturaOdemeEmriYazdir(fatura, abone) {
  if (!fatura) return;
  const info = (lbl, val) => val ? `<div><span class="lbl">${esc(lbl)}</span> ${esc(val)}</div>` : "";

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>${esc(fatura.fatura_no || "Ödeme Emri")}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 12px/1.45 -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .head h1 { font-size: 15px; margin: 0 0 2px; }
  .head .firma { font-size: 16px; font-weight: 700; }
  .head .sub { color: #555; font-size: 11px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; margin: 16px 0; }
  .meta .lbl { color: #666; display: inline-block; min-width: 120px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 5px 8px; font-size: 11px; }
  th { background: #eee; text-align: left; }
  td.r, th.r { text-align: right; }
  tfoot td { font-weight: 700; background: #f4f4f4; }
  .imza { display: flex; gap: 48px; margin-top: 56px; }
  .imza div { flex: 1; border-top: 1px solid #111; padding-top: 4px; text-align: center; color: #444; }
  .note { margin-top: 12px; white-space: pre-wrap; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head><body>
  <div class="head">
    <div>
      <div class="firma">Turkonix — Sınırsız İletişim</div>
      <div class="sub">Fatura Yönetimi</div>
    </div>
    <div style="text-align:right">
      <h1>ÖDEME EMRİ</h1>
      <div class="sub">Fatura No: <b>${esc(fatura.fatura_no || "—")}</b></div>
    </div>
  </div>

  <div class="meta">
    ${info("Fatura Tanımı:", fatura.fatura_tanimi)}
    ${info("Abone:", abone?.abone_adi)}
    ${info("Abone Türü:", abone?.abone_turu)}
    ${info("Tesisat Kullanım Yeri:", abone?.tesisat_kullanim_yeri)}
    ${info("Sözleşme/Mukavele No:", abone?.sozlesme_no)}
    ${info("Fatura Tarihi:", df(fatura.fatura_tarihi))}
    ${info("Son Ödeme Tarihi:", df(fatura.son_odeme_tarihi))}
    ${info("Tüketim Miktarı:", fatura.tuketim_miktari)}
  </div>

  <table>
    <thead><tr><th>Kalem</th><th class="r">Tutar (₺)</th></tr></thead>
    <tbody>
      <tr><td>KDV Hariç Tutar</td><td class="r">${nf(fatura.tutar_kdv_haric)}</td></tr>
      <tr><td>KDV (%${nf(fatura.kdv_orani)})</td><td class="r">${nf(fatura.kdv_tutari)}</td></tr>
      <tr><td>Diğer Bedel / Kesinti</td><td class="r">${nf(fatura.diger_bedel)}</td></tr>
    </tbody>
    <tfoot>
      <tr><td>Ödenecek Tutar</td><td class="r">${nf(fatura.odenecek_tutar)}</td></tr>
      <tr><td>Toplam Tutar</td><td class="r">${nf(fatura.toplam_tutar)}</td></tr>
    </tfoot>
  </table>

  ${fatura.aciklama ? `<div class="note"><b>Açıklama:</b> ${esc(fatura.aciklama)}</div>` : ""}

  <div class="imza">
    <div>Hazırlayan</div>
    <div>Onaylayan</div>
  </div>

  <script>
    (function () {
      function go() { try { window.focus(); window.print(); } catch (e) {} }
      if (document.readyState === "complete") setTimeout(go, 150);
      else window.addEventListener("load", function () { setTimeout(go, 150); });
    })();
  </script>
</body></html>`;

  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) { alert("Yazdırma penceresi açılamadı — tarayıcı pop-up engelini kontrol edin."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* pencere içi script halleder */ } }, 400);
}
