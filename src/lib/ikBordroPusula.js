// Ücret Pusulası — yeni pencereye temiz yazdırılabilir bordro pusulası (Turocas Bilişim antetli).
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = (v) => (Number(v) || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ucretPusulasiYazdir(satir, donem) {
  if (!satir) return;
  const r = (l, v) => `<tr><td>${esc(l)}</td><td class="r">${nf(v)} ₺</td></tr>`;
  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Ücret Pusulası — ${esc(satir.personel_adi)}</title>
<style>
  body { font: 12px/1.5 -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; margin: 24px; }
  .head { display:flex; justify-content:space-between; border-bottom:2px solid #111; padding-bottom:8px; }
  .firma { font-size:16px; font-weight:700; }
  h1 { font-size:14px; margin:0; }
  .meta { margin:12px 0; color:#555; }
  table { width:100%; border-collapse:collapse; margin-top:8px; }
  th,td { border:1px solid #999; padding:4px 8px; }
  th { background:#eee; text-align:left; }
  td.r { text-align:right; }
  .grp { background:#f4f4f4; font-weight:700; }
  .net { font-size:14px; font-weight:700; background:#e8f5e9; }
  .imza { display:flex; gap:60px; margin-top:48px; }
  .imza div { flex:1; border-top:1px solid #111; padding-top:4px; text-align:center; color:#444; }
  @media print { body { margin:12mm; } }
</style></head><body>
  <div class="head">
    <div><div class="firma">Turocas Bilişim</div><div style="color:#555">İnsan Kaynakları · Ücret Pusulası</div></div>
    <div style="text-align:right"><h1>${esc(donem?.ay || "")}/${esc(donem?.yil || "")} Dönemi</h1></div>
  </div>
  <div class="meta">
    <b>${esc(satir.personel_adi)}</b> · TC: ${esc(satir.tc || "—")} · ${esc(satir.sube_adi || "")}<br>
    Görev: ${esc(satir.gorev || "—")} · Çalışılan gün: ${esc(satir.calisilan_gun)} · Eksik gün: ${esc(satir.eksik_gun)}
  </div>
  <table>
    <tr class="grp"><td colspan="2">RESMÎ HAK EDİŞLER</td></tr>
    ${r("Maaş", satir.resmi_maas)}${r("Bayram / Tatil Mesai", satir.bayram)}${r("Fazla Mesai", satir.fazla_mesai)}${r("Prim", satir.prim)}
    ${r(`Yol (${satir.yol_hak_gun} gün)`, satir.yol)}${r(`Yemek (${satir.yemek_hak_gun} gün)`, satir.yemek)}${r(`Ticket (${satir.ticket_hak_gun} gün)`, satir.ticket)}
    <tr class="grp"><td>Resmî Toplam</td><td class="r">${nf(satir.resmi_toplam)} ₺</td></tr>
    <tr class="grp"><td colspan="2">YASAL KESİNTİLER</td></tr>
    ${r("SGK Primi (İşçi Payı)", satir.sgk_isci)}${r("İşsizlik Sigortası (İşçi Payı)", satir.issizlik_isci)}${r("Gelir Vergisi", satir.gelir_vergisi)}${r("Damga Vergisi", satir.damga_vergisi)}
    <tr class="grp"><td>Resmî Net</td><td class="r">${nf(satir.resmi_net)} ₺</td></tr>
    <tr class="grp"><td colspan="2">KESİNTİLER</td></tr>
    ${r("Avans", satir.avans)}${r("İcra", satir.icra)}${r("BES", satir.bes)}${r("Diğer Kesinti", satir.diger_kesinti)}
    ${r("Yol/Yemek Gün Kesintisi", satir.yol_kes)}${r("Personel Masrafı", satir.personel_masrafi)}${r("İç Borç Tahsilatı", satir.borc_toplam)}
    ${(satir.fesih_tazminati || satir.ihbar_tazminati || satir.kasa_tazminati || satir.ozel_sigorta) ? `
    <tr class="grp"><td colspan="2">EK KALEMLER</td></tr>
    ${r("Kıdem (Fesih) Tazminatı", satir.fesih_tazminati)}${r("İhbar Tazminatı", satir.ihbar_tazminati)}${r("Kasa Tazminatı", satir.kasa_tazminati)}${r("Özel Sigorta", satir.ozel_sigorta)}${r("Özel Sigorta (Eş-Çocuk)", satir.ozel_sigorta_es_cocuk)}` : ""}
    ${r("Şahsi Hesap Net", satir.sahsi_hesap_net)}
    <tr class="net"><td>GENEL NET ÖDENECEK</td><td class="r">${nf(satir.genel_net)} ₺</td></tr>
  </table>
  ${satir.hesap_notu ? `<p style="margin-top:10px"><b>Not:</b> ${esc(satir.hesap_notu)}</p>` : ""}
  <div class="imza"><div>İşveren</div><div>Personel</div></div>
  <script>(function(){function go(){try{window.focus();window.print();}catch(e){}}if(document.readyState==="complete")setTimeout(go,150);else window.addEventListener("load",function(){setTimeout(go,150);});})();</script>
</body></html>`;
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) { alert("Yazdırma penceresi açılamadı — pop-up engelini kontrol edin."); return; }
  w.document.open(); w.document.write(html); w.document.close();
  setTimeout(() => { try { w.focus(); w.print(); } catch (e) { /* pencere içi script halleder */ } }, 400);
}
