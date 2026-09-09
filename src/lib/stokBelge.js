// Stok fiş / sevk irsaliyesi yazdırma — yeni pencereye temiz bir belge yazıp
// window.print() çağırır. jspdf/html2canvas'a göre daha güvenilir ve seçilebilir metin.

const TIP_LBL = { giris: "STOK GİRİŞ FİŞİ", cikis: "STOK ÇIKIŞ FİŞİ", transfer: "DEPO TRANSFER FİŞİ", sayim: "SAYIM DÜZELTME FİŞİ", talep: "MALZEME TALEP FİŞİ" };
const DURUM_LBL = { taslak: "TASLAK", onay_bekliyor: "ONAY BEKLİYOR", onayli: "ONAYLI", iptal: "İPTAL" };

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/**
 * @param {object} fis  flowApi.stok.getFis() sonucu (satirlar dahil)
 * @param {object} opt  { belgeTuru: 'fis' | 'irsaliye' }
 */
export function fisBelgeYazdir(fis, opt = {}) {
  if (!fis) return;
  const irsaliye = opt.belgeTuru === "irsaliye";
  const baslik = irsaliye ? "SEVK İRSALİYESİ" : (TIP_LBL[fis.tip] || "STOK FİŞİ");
  const satirlar = fis.satirlar || [];
  const seriVar = satirlar.some((s) => s.seri_no);
  const toplamTutar = satirlar.reduce((a, s) => a + (Number(s.miktar_ana_birim) || 0) * (Number(s.birim_fiyat) || 0), 0);

  const satirRows = satirlar.map((s, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(s.urun_kodu || "")}</td>
      <td>${esc(s.urun_adi || "")}${s.lot_no ? ` <span class="mut">(Lot: ${esc(s.lot_no)})</span>` : ""}${s.skt ? ` <span class="mut">SKT ${esc(String(s.skt).slice(0, 10))}</span>` : ""}</td>
      ${seriVar ? `<td>${esc(s.seri_no || "")}</td>` : ""}
      <td>${esc(s.hedef_raf_adi || s.kaynak_raf_adi || "GENEL RAF")}</td>
      <td class="r">${nf(s.miktar)} ${esc(s.birim || "")}</td>
      <td class="r">${nf(s.miktar_ana_birim)}</td>
      <td class="r">${nf(s.birim_fiyat)}</td>
      <td class="r">${nf((Number(s.miktar_ana_birim) || 0) * (Number(s.birim_fiyat) || 0))}</td>
    </tr>`).join("");

  const info = (lbl, val) => val ? `<div><span class="lbl">${esc(lbl)}</span> ${esc(val)}</div>` : "";

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>${esc(fis.fis_no || baslik)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 12px/1.45 -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; }
  .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 10px; }
  .head h1 { font-size: 15px; margin: 0 0 2px; }
  .head .firma { font-size: 16px; font-weight: 700; }
  .head .sub { color: #555; font-size: 11px; }
  .durum { border: 1px solid #111; padding: 2px 8px; font-weight: 700; font-size: 11px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 24px; margin: 12px 0; }
  .meta .lbl { color: #666; display: inline-block; min-width: 92px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #999; padding: 4px 6px; font-size: 11px; }
  th { background: #eee; text-align: left; }
  td.r, th.r { text-align: right; }
  td.c { text-align: center; }
  .mut { color: #777; font-size: 10px; }
  tfoot td { font-weight: 700; background: #f4f4f4; }
  .imza { display: flex; gap: 48px; margin-top: 48px; }
  .imza div { flex: 1; border-top: 1px solid #111; padding-top: 4px; text-align: center; color: #444; }
  .note { margin-top: 10px; white-space: pre-wrap; }
  @media print { body { margin: 12mm; } .noprint { display: none; } }
</style></head><body>
  <div class="head">
    <div>
      <div class="firma">Turocas Bilişim</div>
      <div class="sub">Depo / Stok / Zimmet Yönetimi</div>
    </div>
    <div style="text-align:right">
      <h1>${esc(baslik)}</h1>
      <div class="sub">Fiş No: <b>${esc(fis.fis_no || "—")}</b></div>
      <div class="durum">${esc(DURUM_LBL[fis.durum] || fis.durum || "")}</div>
    </div>
  </div>

  <div class="meta">
    ${info("Tarih:", fis.tarih)}
    ${info("Firma / Cari:", fis.cari_adi)}
    ${info("Kaynak Depo:", fis.kaynak_depo_adi)}
    ${info("Hedef:", fis.hedef_saha_adi || fis.hedef_depo_adi)}
    ${info("Fatura No:", fis.fatura_no)}
    ${info("İrsaliye No:", fis.irsaliye_no)}
    ${info("Belge / Talep No:", fis.belge_no)}
    ${info("Teslim Eden:", fis.teslim_eden)}
    ${info("Teslim Alan:", fis.teslim_alan)}
    ${info("Gönderim Adresi:", fis.gonderim_adresi)}
    ${info("Oluşturan:", fis.olusturan)}
    ${info("Onaylayan:", fis.onaylayan)}
  </div>

  <table>
    <thead><tr>
      <th class="c">#</th><th>Ürün Kodu</th><th>Ürün Adı</th>
      ${seriVar ? "<th>Seri No</th>" : ""}
      <th>Raf</th><th class="r">Miktar</th><th class="r">Ana Birim</th><th class="r">B.Fiyat</th><th class="r">Tutar</th>
    </tr></thead>
    <tbody>${satirRows || `<tr><td colspan="${seriVar ? 9 : 8}" class="c mut">Satır yok</td></tr>`}</tbody>
    <tfoot><tr><td colspan="${seriVar ? 8 : 7}" class="r">TOPLAM</td><td class="r">${nf(toplamTutar)}</td></tr></tfoot>
  </table>

  ${fis.aciklama ? `<div class="note"><b>Açıklama:</b> ${esc(fis.aciklama)}</div>` : ""}

  <div class="imza">
    <div>Teslim Eden</div>
    <div>Teslim Alan</div>
    ${irsaliye ? "<div>Taşıyıcı</div>" : ""}
  </div>

  <script>window.onload = function () { window.print(); };</script>
</body></html>`;

  const w = window.open("", "_blank", "width=900,height=1000");
  if (!w) { alert("Yazdırma penceresi açılamadı — tarayıcı pop-up engelini kontrol edin."); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
