// İK / Bordro hesap motoru — index.js ve test harness'i tarafından paylaşılır.
// Tüm fonksiyonlar `db` (better-sqlite3 wrapper) alır; global state tutmaz.
const crypto = require('crypto');
const _uuid = () => crypto.randomUUID();

// Dönem kaydını getir; yoksa taslak olarak oluştur.
function ikDonemGetirYaOlustur(db, yil, ay, email) {
  let d = db.prepare('SELECT * FROM ik_bordro_donemleri WHERE yil=? AND ay=?').get(yil, ay);
  if (!d) {
    const id = _uuid(), now = new Date().toISOString();
    db.prepare("INSERT INTO ik_bordro_donemleri (id, yil, ay, durum, olusturan, created_date, updated_date) VALUES (?,?,?, 'taslak', ?, ?, ?)").run(id, yil, ay, email, now, now);
    d = db.prepare('SELECT * FROM ik_bordro_donemleri WHERE id=?').get(id);
  }
  return d;
}

// Bir personelin bir dönem bordro satırını hesapla (AŞAMA A hesap zinciri 1-11).
function ikBordroSatirHesapla(db, emp, yil, ay, ctx = {}) {
  const t1 = `${yil}-${String(ay).padStart(2, '0')}-01`;
  const t2 = `${yil}-${String(ay).padStart(2, '0')}-31`;

  // Puantaj: devam kodu bazında gün sayıları
  const pnt = db.prepare(`SELECT
      SUM(CASE WHEN durum_kodu='N' THEN 1 ELSE 0 END) n_gun,
      SUM(CASE WHEN durum_kodu='U' THEN 1 ELSE 0 END) u_gun,
      SUM(CASE WHEN durum_kodu='E' THEN 1 ELSE 0 END) e_gun,
      SUM(CASE WHEN durum_kodu='I' THEN 1 ELSE 0 END) i_gun,
      SUM(CASE WHEN durum_kodu='R' THEN 1 ELSE 0 END) r_gun,
      SUM(CASE WHEN durum_kodu='M' THEN 1 ELSE 0 END) m_gun,
      SUM(CASE WHEN durum_kodu='CT' THEN 1 ELSE 0 END) ct_gun
    FROM ik_puantaj WHERE personel_id=? AND tarih>=? AND tarih<=?`).get(emp.id, t1, t2)
    || {};
  const p = { n: pnt.n_gun || 0, u: pnt.u_gun || 0, e: pnt.e_gun || 0, i: pnt.i_gun || 0, r: pnt.r_gun || 0, m: pnt.m_gun || 0, ct: pnt.ct_gun || 0 };

  // Kişi bazlı cumartesi kuralı — CT günlerinin nereden kesileceği
  const cKural = db.prepare("SELECT kesinti_tipi FROM ik_bordro_yemek_kural WHERE personel_id=? AND aktif=1").get(emp.id);
  const cTip = cKural ? cKural.kesinti_tipi : 'her_ikisi';   // her_ikisi (vars.) | hic | yol | yemek | maas
  const ctYol = (cTip === 'her_ikisi' || cTip === 'yol') ? p.ct : 0;
  const ctYemek = (cTip === 'her_ikisi' || cTip === 'yemek') ? p.ct : 0;
  const ctMaas = cTip === 'maas' ? p.ct : 0;

  // Hak günü azaltan gün sayısı (tür bazlı): E + İ + R + Ü + M + (CT kurala göre)
  const kesOrtak = p.e + p.i + p.r + p.u + p.m;
  const kesYol = kesOrtak + ctYol;
  const kesYemek = kesOrtak + ctYemek;
  // Maaş eksik günü: ücretsiz izin + gelmedi (+ cumartesi kuralı 'maas' ise CT). İ/R maaşı etkilemez.
  let eksikGun = p.u + p.e + ctMaas;

  // Ay ortası işe giriş / işten çıkış → dönem içi kısmi gün (giriş öncesi / çıkış sonrası maaşsız)
  const ayIlk = `${yil}-${String(ay).padStart(2, '0')}-01`;
  const ayGunSayisi = new Date(Number(yil), Number(ay), 0).getDate();
  const aySon = `${yil}-${String(ay).padStart(2, '0')}-${String(ayGunSayisi).padStart(2, '0')}`;
  if (emp.hire_date && emp.hire_date > ayIlk && emp.hire_date <= aySon) {
    eksikGun += (new Date(emp.hire_date + 'T00:00:00') - new Date(ayIlk + 'T00:00:00')) / 86400000;
  }
  if (emp.exit_date && emp.exit_date >= ayIlk && emp.exit_date < aySon) {
    eksikGun += (new Date(aySon + 'T00:00:00') - new Date(emp.exit_date + 'T00:00:00')) / 86400000;
  }
  eksikGun = Math.round(eksikGun * 100) / 100;
  const calisilanGun = Math.max(0, 30 - eksikGun);

  const aylik = Number(emp.aylik_ucret) || 0;
  const resmiMaas = eksikGun > 0 ? +(aylik * calisilanGun / 30).toFixed(2) : aylik;
  const maasPuantajKes = +(aylik - resmiMaas).toFixed(2);

  // Onaylı mesai kayıtları
  const mesai = db.prepare(`SELECT
      SUM(CASE WHEN tur='fazla' THEN tutar ELSE 0 END) fazla,
      SUM(CASE WHEN tur='tatil' THEN tutar ELSE 0 END) bayram
    FROM ik_mesai_kayitlari WHERE personel_id=? AND donem_yil=? AND donem_ay=? AND onay='onayli' AND is_deleted!=1`).get(emp.id, yil, ay)
    || { fazla: 0, bayram: 0 };

  // Ticket için ayrı kesilecek gün (genel ayar checkbox'larına göre)
  const ay0 = ctx.ticketAyar || {};
  const on = (v, dv = 1) => (v === undefined || v === null ? dv : v);
  let ticketKesilecek = p.u; // ücretsiz her zaman keser
  if (on(ay0.ticket_e_kes)) ticketKesilecek += p.e;
  if (on(ay0.ticket_izin_rapor_kes)) ticketKesilecek += p.i + p.r;
  ticketKesilecek += p.m + ctYemek; // mazeret + cumartesi (yemek kuralıyla aynı)

  // Yol/Yemek/Ticket hak edişi: günlük × hak gün
  const kesByTur = { yol: kesYol, yemek: kesYemek, ticket: ticketKesilecek };
  const tanimlar = db.prepare("SELECT tur, aktif, baz_gun, aylik_tutar FROM ik_hakedis_tanim WHERE personel_id=? AND aktif=1").all(emp.id);
  const hak = { yol: 0, yemek: 0, ticket: 0, yol_hak_gun: 0, yemek_hak_gun: 0, ticket_hak_gun: 0, yol_kes: 0, yemek_kes: 0, ticket_kes: 0 };
  for (const tn of tanimlar) {
    const bazGun = tn.baz_gun > 0 ? tn.baz_gun : (ctx.varsayilanBazGun || 26);
    const kesGun = kesByTur[tn.tur] ?? kesOrtak;
    const hakGun = Math.max(0, bazGun - kesGun);
    const gunluk = bazGun > 0 ? tn.aylik_tutar / bazGun : 0;
    hak[tn.tur] = +(gunluk * hakGun).toFixed(2);
    hak[`${tn.tur}_hak_gun`] = hakGun;
    hak[`${tn.tur}_kes`] = +(gunluk * Math.min(kesGun, bazGun)).toFixed(2);  // bilgi amaçlı: hak edişte uygulanan kesinti
  }

  const prim = Number(ctx.prim) || 0;
  const resmiToplam = +(resmiMaas + (mesai.bayram || 0) + (mesai.fazla || 0) + prim + hak.yol + hak.yemek + hak.ticket).toFixed(2);
  const resmiNet = resmiToplam; // SGK/gelir vergisi tevkifatı yok

  // Kesintiler (dönem — ik_kesintiler; kesinti/donem-uret ile üretilmiş olmalı)
  const kes = db.prepare(`SELECT
      SUM(CASE WHEN tur='avans' THEN tutar ELSE 0 END) avans,
      SUM(CASE WHEN tur='icra' THEN tutar ELSE 0 END) icra,
      SUM(CASE WHEN tur='bes' THEN tutar ELSE 0 END) bes,
      SUM(CASE WHEN tur='diger' THEN tutar ELSE 0 END) diger,
      SUM(CASE WHEN tur='gun_kes' THEN tutar ELSE 0 END) gun_kes
    FROM ik_kesintiler WHERE personel_id=? AND donem_yil=? AND donem_ay=? AND is_deleted!=1`).get(emp.id, yil, ay)
    || { avans: 0, icra: 0, bes: 0, diger: 0, gun_kes: 0 };

  // Personel masrafı (bu dönem, "sadece_not" hariç net'ten düşer)
  const masrafRows = db.prepare("SELECT tutar, kesinti_kaynagi FROM ik_personel_masraf WHERE personel_id=? AND donem_yil=? AND donem_ay=? AND is_deleted!=1").all(emp.id, yil, ay);
  const personelMasrafi = +masrafRows.filter((m) => m.kesinti_kaynagi !== 'sadece_not').reduce((a, m) => a + (m.tutar || 0), 0).toFixed(2);

  // İç borç tahsilatı (bu dönem — kesinti/donem-uret üretir). Kaynağa göre maaş / yol-yemek-ticket ayrımı.
  const borcT = db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN kaynak='maas' THEN tutar ELSE 0 END),0) maas,
      COALESCE(SUM(CASE WHEN kaynak!='maas' THEN tutar ELSE 0 END),0) yyt,
      COALESCE(SUM(tutar),0) toplam
    FROM ik_ic_borc_tahsilat WHERE personel_id=? AND donem_yil=? AND donem_ay=?`).get(emp.id, yil, ay)
    || { maas: 0, yyt: 0, toplam: 0 };
  const borcMaas = +Number(borcT.maas).toFixed(2);
  const borcYyt = +Number(borcT.yyt).toFixed(2);
  const borcToplam = +Number(borcT.toplam).toFixed(2);

  const sahsiNet = emp.sahsi_hesap_aktif ? (Number(emp.sahsi_hesap_tutar) || 0) : 0;

  // Genel Net = Resmî Net + Şahsi − Avans − İcra − BES − Diğer − Masraf − İç Borç.
  // (Yol/Yemek/Ticket gün kesintisi hak edişte uygulandı → net'ten TEKRAR düşülmez.)
  const genelNet = +(resmiNet + sahsiNet - (kes.avans || 0) - (kes.icra || 0) - (kes.bes || 0) - (kes.diger || 0) - personelMasrafi - borcToplam).toFixed(2);

  return {
    personel_id: emp.id, personel_adi: emp.full_name, sube_id: emp.sube_id || null, tc: emp.tc || null,
    gorev: emp.position || emp.meslek_kodu || null,
    aylik_ucret: aylik, saatlik_ucret: Number(emp.saatlik_ucret) || 0, dakikalik_ucret: Number(emp.dakikalik_ucret) || 0,
    calisilan_gun: calisilanGun, eksik_gun: eksikGun,
    resmi_maas: resmiMaas, bayram: mesai.bayram || 0, fazla_mesai: mesai.fazla || 0, prim,
    yol: hak.yol, yemek: hak.yemek, ticket: hak.ticket,
    yol_hak_gun: hak.yol_hak_gun, yemek_hak_gun: hak.yemek_hak_gun, ticket_hak_gun: hak.ticket_hak_gun,
    resmi_toplam: resmiToplam, resmi_net: resmiNet,
    avans: kes.avans || 0, icra: kes.icra || 0, bes: kes.bes || 0, diger_kesinti: kes.diger || 0,
    maas_puantaj_kes: maasPuantajKes, yol_kes: hak.yol_kes, yemek_kes: hak.yemek_kes, ticket_kes: hak.ticket_kes,
    personel_masrafi: personelMasrafi,
    borc_maas: borcMaas, borc_yyt: borcYyt, borc_toplam: borcToplam,
    sahsi_hesap_net: sahsiNet, genel_net: genelNet,
  };
}

// Bir dönem için: aktif plan taksitleri + puantaj kaynaklı gün kesintileri + iç borç
// aylık taksiti → ik_kesintiler / ik_ic_borc_tahsilat. (Elle avans/diğer korunur.)
function ikKesintiDonemUret(db, { yil, ay, email }) {
  yil = Number(yil); ay = Number(ay);
  const now = new Date().toISOString();
  let planN = 0, gunN = 0, borcN = 0;
  db.transaction(() => {
    db.prepare("DELETE FROM ik_kesintiler WHERE donem_yil=? AND donem_ay=? AND kaynak IN ('plan','puantaj')").run(yil, ay);

    // 1) Aktif planlar → taksit (icra: aylık max maaş/4, son taksit bakiye)
    for (const p of db.prepare("SELECT * FROM ik_kesinti_planlari WHERE aktif=1 AND (is_deleted=0 OR is_deleted IS NULL)").all()) {
      const gecenAy = (yil - p.baslangic_yil) * 12 + (ay - p.baslangic_ay);
      if (gecenAy < 0 || gecenAy >= p.taksit_sayisi) continue;
      const buTaksit = Math.min(p.aylik_taksit, Math.max(0, p.toplam_tutar - gecenAy * p.aylik_taksit));
      if (buTaksit <= 0) continue;
      db.prepare(`INSERT INTO ik_kesintiler (id, personel_id, personel_adi, donem_yil, donem_ay, tur, tutar, plan_id, taksit_no, aciklama, kaynak, tarih, created_by, created_date, updated_date)
        VALUES (?,?,?,?,?,?,?,?,?,?, 'plan', ?, ?, ?, ?)`).run(
        _uuid(), p.personel_id, p.personel_adi, yil, ay, p.tur, +buTaksit.toFixed(2), p.id, gecenAy + 1,
        `${p.tur.toUpperCase()} taksit ${gecenAy + 1}/${p.taksit_sayisi}`, now.slice(0, 10), email, now, now);
      planN++;
    }

    // 2) Puantaj devam kodları → yol/yemek gün kesintisi (bilgi amaçlı; net'ten tekrar düşülmez)
    const t1 = `${yil}-${String(ay).padStart(2, '0')}-01`, t2 = `${yil}-${String(ay).padStart(2, '0')}-31`;
    for (const g of db.prepare(`SELECT personel_id, MAX(personel_adi) personel_adi,
        SUM(CASE WHEN durum_kodu IN ('E','I','R','U','M','CT') THEN 1 ELSE 0 END) kesilecek
      FROM ik_puantaj WHERE tarih>=? AND tarih<=? GROUP BY personel_id`).all(t1, t2)) {
      if (!g.kesilecek) continue;
      let toplamKes = 0; const parcalar = [];
      for (const t of db.prepare("SELECT tur, baz_gun, aylik_tutar FROM ik_hakedis_tanim WHERE personel_id=? AND aktif=1").all(g.personel_id)) {
        if (t.tur === 'ticket') continue;
        const gunluk = t.baz_gun > 0 ? t.aylik_tutar / t.baz_gun : 0;
        const kes = +(gunluk * g.kesilecek).toFixed(2);
        if (kes > 0) { toplamKes += kes; parcalar.push(`${t.tur}:${kes}`); }
      }
      if (toplamKes > 0) {
        db.prepare(`INSERT INTO ik_kesintiler (id, personel_id, personel_adi, donem_yil, donem_ay, tur, tutar, aciklama, kaynak, tarih, created_by, created_date, updated_date)
          VALUES (?,?,?,?,?, 'gun_kes', ?, ?, 'puantaj', ?, ?, ?, ?)`).run(
          _uuid(), g.personel_id, g.personel_adi, yil, ay, +toplamKes.toFixed(2),
          `${g.kesilecek} gün yol/yemek kesintisi (${parcalar.join(', ')})`, now.slice(0, 10), email, now, now);
        gunN++;
      }
    }

    // 3) İç borç aylık taksiti → ik_ic_borc_tahsilat (bordro motoru genel net'ten düşer)
    const doW = yil * 12 + ay;
    db.prepare("DELETE FROM ik_ic_borc_tahsilat WHERE donem_yil=? AND donem_ay=?").run(yil, ay);
    for (const bc of db.prepare("SELECT * FROM ik_ic_borclar WHERE durum='acik' AND (is_deleted=0 OR is_deleted IS NULL)").all()) {
      const onceki = db.prepare("SELECT COALESCE(SUM(tutar),0) t FROM ik_ic_borc_tahsilat WHERE borc_id=? AND (donem_yil*12 + donem_ay) < ?").get(bc.id, doW)?.t || 0;
      const kalanOnce = +(Number(bc.acilis_tutar) - onceki).toFixed(2);
      if (kalanOnce <= 0) { db.prepare("UPDATE ik_ic_borclar SET kalan_bakiye=0, durum='kapali', updated_date=? WHERE id=?").run(now, bc.id); continue; }
      const taksit = Number(bc.aylik_taksit) > 0 ? Math.min(Number(bc.aylik_taksit), kalanOnce) : kalanOnce;
      if (taksit <= 0) continue;
      db.prepare(`INSERT INTO ik_ic_borc_tahsilat (id, borc_id, personel_id, donem_yil, donem_ay, tutar, kaynak, created_by, created_date)
        VALUES (?,?,?,?,?,?,?,?,?)`).run(_uuid(), bc.id, bc.personel_id, yil, ay, +taksit.toFixed(2), bc.varsayilan_kaynak || 'maas', email, now);
      const kalanSonra = +(kalanOnce - taksit).toFixed(2);
      db.prepare("UPDATE ik_ic_borclar SET kalan_bakiye=?, durum=?, updated_date=? WHERE id=?").run(kalanSonra, kalanSonra <= 0 ? 'kapali' : 'acik', now, bc.id);
      borcN++;
    }
  })();
  return { plan_taksiti: planN, gun_kesintisi: gunN, ic_borc_tahsilat: borcN };
}

// Bir dönemin tüm (veya tek) personel bordro satırlarını hesaplayıp yaz.
function ikBordroHesapla(db, { yil, ay, personel_id, force, email, sync }) {
  const donem = ikDonemGetirYaOlustur(db, Number(yil), Number(ay), email);
  if (donem.durum === 'kapali') { const e = new Error('Kapalı dönem yeniden hesaplanamaz'); e.code = 400; throw e; }
  // sync: bordrodan önce kesinti/plan/borç kayıtlarını döneme çek
  if (sync && !personel_id) { try { ikKesintiDonemUret(db, { yil, ay, email }); } catch (e) { console.error('[ikBordro] sync:', e.message); } }

  const genelAyar = db.prepare('SELECT * FROM ik_hakedis_genel_ayar WHERE id=1').get() || {};
  const ctx = { varsayilanBazGun: genelAyar.varsayilan_baz_gun || 26, ticketAyar: genelAyar };

  const cond = ["(is_deleted=0 OR is_deleted IS NULL)", "app_role != 'musteri'"];
  const params = [];
  if (personel_id) { cond.push('id=?'); params.push(personel_id); }
  else cond.push("(status IS NULL OR status != 'pasif')");
  const emps = db.prepare(`SELECT id, full_name, sube_id, tc, position, meslek_kodu, aylik_ucret, saatlik_ucret, dakikalik_ucret, sahsi_hesap_aktif, sahsi_hesap_tutar, hire_date, exit_date FROM employees WHERE ${cond.join(' AND ')}`).all(...params);

  const ins = db.prepare(`INSERT INTO ik_bordro_satirlari
    (id, donem_id, personel_id, personel_adi, sube_id, tc, gorev, aylik_ucret, saatlik_ucret, dakikalik_ucret, calisilan_gun, eksik_gun,
     resmi_maas, bayram, fazla_mesai, prim, yol, yemek, ticket, yol_hak_gun, yemek_hak_gun, ticket_hak_gun, resmi_toplam, resmi_net,
     avans, icra, bes, diger_kesinti, maas_puantaj_kes, yol_kes, yemek_kes, ticket_kes, personel_masrafi, borc_maas, borc_yyt, borc_toplam,
     sahsi_hesap_net, genel_net, created_date, updated_date)
    VALUES (@id,@donem_id,@personel_id,@personel_adi,@sube_id,@tc,@gorev,@aylik_ucret,@saatlik_ucret,@dakikalik_ucret,@calisilan_gun,@eksik_gun,
     @resmi_maas,@bayram,@fazla_mesai,@prim,@yol,@yemek,@ticket,@yol_hak_gun,@yemek_hak_gun,@ticket_hak_gun,@resmi_toplam,@resmi_net,
     @avans,@icra,@bes,@diger_kesinti,@maas_puantaj_kes,@yol_kes,@yemek_kes,@ticket_kes,@personel_masrafi,@borc_maas,@borc_yyt,@borc_toplam,
     @sahsi_hesap_net,@genel_net,@now,@now)
    ON CONFLICT(donem_id, personel_id) DO UPDATE SET
      aylik_ucret=excluded.aylik_ucret, saatlik_ucret=excluded.saatlik_ucret, dakikalik_ucret=excluded.dakikalik_ucret,
      calisilan_gun=excluded.calisilan_gun, eksik_gun=excluded.eksik_gun, resmi_maas=excluded.resmi_maas, bayram=excluded.bayram,
      fazla_mesai=excluded.fazla_mesai, yol=excluded.yol, yemek=excluded.yemek, ticket=excluded.ticket,
      yol_hak_gun=excluded.yol_hak_gun, yemek_hak_gun=excluded.yemek_hak_gun, ticket_hak_gun=excluded.ticket_hak_gun,
      resmi_toplam=excluded.resmi_toplam, resmi_net=excluded.resmi_net, avans=excluded.avans, icra=excluded.icra, bes=excluded.bes,
      diger_kesinti=excluded.diger_kesinti, maas_puantaj_kes=excluded.maas_puantaj_kes,
      yol_kes=excluded.yol_kes, yemek_kes=excluded.yemek_kes, ticket_kes=excluded.ticket_kes,
      personel_masrafi=excluded.personel_masrafi,
      borc_maas=excluded.borc_maas, borc_yyt=excluded.borc_yyt, borc_toplam=excluded.borc_toplam,
      sahsi_hesap_net=excluded.sahsi_hesap_net, genel_net=excluded.genel_net, updated_date=excluded.updated_date
    WHERE ik_bordro_satirlari.manuel_override=0 ${force ? "OR 1=1" : ""}`);

  // "Zorla Yeniden Hesapla": mevcut satırdaki ELLE girilen prim + tazminat + özel sigorta
  // kolonları ON CONFLICT SET'te güncellenmez (korunur). Ama genel_net/resmi_toplam bu
  // kalemleri içermeli — yoksa satır tutarsız kalır (tazminat kolonu dolu, net'e girmemiş).
  const mevSat = force
    ? db.prepare(`SELECT s.personel_id, s.prim, s.fesih_tazminati, s.ihbar_tazminati, s.kasa_tazminati, s.ozel_sigorta, s.ozel_sigorta_es_cocuk
         FROM ik_bordro_satirlari s WHERE s.donem_id=?`).all(donem.id).reduce((m, r) => (m[r.personel_id] = r, m), {})
    : {};

  const now = new Date().toISOString();
  let n = 0;
  db.transaction(() => {
    for (const emp of emps) {
      const row = ikBordroSatirHesapla(db, emp, Number(yil), Number(ay), ctx);
      const mv = mevSat[emp.id];
      if (mv) {
        const ekPrim = Number(mv.prim) || 0;
        const taz = (Number(mv.fesih_tazminati) || 0) + (Number(mv.ihbar_tazminati) || 0) + (Number(mv.kasa_tazminati) || 0)
          + (Number(mv.ozel_sigorta) || 0) + (Number(mv.ozel_sigorta_es_cocuk) || 0);
        row.prim = ekPrim;
        row.resmi_toplam = +(row.resmi_toplam + ekPrim).toFixed(2);
        row.resmi_net = row.resmi_toplam;
        row.genel_net = +(row.genel_net + ekPrim + taz).toFixed(2);
      }
      ins.run({ ...row, id: _uuid(), donem_id: donem.id, now });
      n++;
    }
  })();
  return { ok: true, donem_id: donem.id, satir: n };
}

module.exports = { ikDonemGetirYaOlustur, ikBordroSatirHesapla, ikBordroHesapla, ikKesintiDonemUret };
