// Atlas Görünümü — skor/öncelik/öneri motoru. Saf fonksiyonlar, veri
// çekme yok; tüm girdiler AdminDashboard.jsx'in zaten kullandığı hook/
// endpoint çıktılarıdır (ikData, stokUyari, exec, summary, contractAlerts).

function gunFarkiMetni(tarihStr) {
  if (!tarihStr) return null;
  const fark = Math.floor((Date.now() - new Date(tarihStr).getTime()) / 86400000);
  if (fark <= 0) return "bugün";
  if (fark === 1) return "1 gün önce";
  return `${fark} gün önce`;
}

function scoreModule({ label, factors, subtitle, healthyText }) {
  let score = 100;
  const active = [];
  for (const f of factors) {
    if (f.count > 0) {
      const deduction = Math.min(f.count * f.penalty, f.cap);
      score -= deduction;
      active.push({ key: f.key, label: f.label, count: f.count, detail: f.detail || null, deduction });
    }
  }
  active.sort((a, b) => b.deduction - a.deduction);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const healthLabel = score >= 90 ? "İyi durumda" : score >= 75 ? "Normal akış" : score >= 50 ? "Takip gerekli" : "Kritik";
  const orbitSubtitle = subtitle || (active[0] ? `${active[0].count} ${active[0].label}` : (healthyText || healthLabel));
  return { label, score, healthLabel, orbitSubtitle, factors: active };
}

const DONEM_METIN = { taslak: "Dönem taslak", onayli: "Dönem onaylı", kapali: "Dönem kapandı", yok: "Dönem oluşmadı" };

export function computeAtlasData({ ikData, stokUyari, exec, summary, contractAlerts, devriyeRapor = [], correspondences = [] }) {
  const ik = ikData?.kpi || {};
  const donem = ikData?.bordro_donem || {};
  const su = stokUyari || {};
  const contracts = exec?.contracts || {};
  const sales = exec?.sales || {};
  const { expired = [], upcoming = [] } = contractAlerts || {};

  const modules = {
    ik: scoreModule({
      label: "İnsan Kaynakları",
      factors: [
        { key: "tutarsiz_personel", count: ik.tutarsiz_personel || 0, penalty: 3, cap: 9, label: "personel kaydı tutarsız" },
        { key: "eksik_evrakli_izin", count: ik.eksik_evrakli_izin || 0, penalty: 1, cap: 5, label: "izin evrakı eksik" },
        { key: "pending_leave", count: summary?.pendingLeaves || 0, penalty: 1, cap: 6, label: "izin talebi onay bekliyor" },
        { key: "pending_expense", count: summary?.pendingExpenses || 0, penalty: 1, cap: 6, label: "harcama talebi onay bekliyor" },
      ],
      healthyText: `${ik.aktif_personel ?? 0} aktif personel`,
    }),
    stok: scoreModule({
      label: "Stok / Depo",
      factors: [
        { key: "kritik", count: su.kritik?.length || 0, penalty: 3, cap: 15, label: "kritik stok ürünü",
          detail: su.kritik?.[0]?.urun_adi ? `En yüksek etki: ${su.kritik[0].urun_adi}` : null },
        { key: "bekleyen_fis", count: su.bekleyen_fis || 0, penalty: 1, cap: 8, label: "stok fişi onay bekliyor",
          detail: su.bekleyen_fis_en_eski_tarih ? `En eski kayıt: ${gunFarkiMetni(su.bekleyen_fis_en_eski_tarih)}` : null },
        { key: "skt_gecen", count: su.skt_gecen?.length || 0, penalty: 4, cap: 16, label: "SKT geçen parti" },
        { key: "geciken_zimmet", count: su.geciken_zimmet || 0, penalty: 3, cap: 12, label: "geciken zimmet" },
      ],
    }),
    sozlesme: scoreModule({
      label: "Sözleşmeler",
      factors: [
        { key: "expired", count: expired.length, penalty: 5, cap: 15, label: "süresi dolmuş sözleşme" },
        { key: "upcoming", count: upcoming.length, penalty: 2, cap: 10, label: "30 gün içinde sona erecek sözleşme" },
      ],
      healthyText: `${(contracts.stats || []).find((s) => s.status === "aktif")?.c || 0} aktif sözleşme`,
    }),
    musteri: scoreModule({
      label: "Müşteriler",
      factors: [],
      subtitle: `${sales.totalCustomers || 0} aktif`,
      healthyText: `${sales.totalCustomers || 0} aktif`,
    }),
    bordro: scoreModule({
      label: "Bordro",
      factors: [
        { key: "bekleyen_mesai", count: ik.bekleyen_mesai || 0, penalty: 2, cap: 10, label: "mesai kaydı onay bekliyor" },
        { key: "donem_acik", count: donem.durum && donem.durum !== "kapali" && donem.durum !== "yok" ? 1 : 0, penalty: 5, cap: 5, label: "dönem henüz kapatılmadı" },
      ],
      subtitle: DONEM_METIN[donem.durum] || null,
      healthyText: DONEM_METIN[donem.durum] || "Dönem oluşmadı",
    }),
    is_takibi: scoreModule({
      label: "İş Takip",
      factors: [
        { key: "overdue", count: summary?.overdueTickets || 0, penalty: 3, cap: 15, label: "geciken bilet" },
        { key: "open", count: summary?.openCount || 0, penalty: 0, cap: 0, label: "açık bilet" },
      ],
      subtitle: (summary?.overdueTickets || 0) > 0 ? null : `${summary?.openCount || 0} bekleyen iş`,
      healthyText: `${summary?.openCount || 0} bekleyen iş`,
    }),
    devriye: scoreModule({
      label: "Devriye",
      factors: [
        { key: "gec_plan_disi", count: (devriyeRapor || []).filter((r) => r.durum === "gec" || r.durum === "plan_disi").length, penalty: 2, cap: 12, label: "geciken/plan dışı devriye okuması" },
      ],
      healthyText: "Devriye rotaları normal",
    }),
    ebys: scoreModule({
      label: "Evrak Yönetimi",
      factors: [
        { key: "kep_hata", count: (correspondences || []).filter((c) => c.kep_durum === "hata").length, penalty: 4, cap: 12, label: "KEP gönderim hatası" },
        { key: "eimza_bekleyen", count: (correspondences || []).filter((c) => c.eimza_durum === "beklemede").length, penalty: 1, cap: 8, label: "bekleyen e-imza" },
      ],
      healthyText: "Evrak akışı normal",
    }),
  };

  const keys = Object.keys(modules);
  const overall = Math.round(keys.reduce((sum, k) => sum + modules[k].score, 0) / keys.length);
  return { overall, modules };
}

// ── Bugünün Kararları — sayı > 0 olan aksiyon maddeleri, etki büyüğüne göre ──
export function computeAtlasDecisions({ contractAlerts, stokUyari, summary }) {
  const su = stokUyari || {};
  const { upcoming = [], nameOf } = contractAlerts || {};
  const items = [
    upcoming.length > 0 && {
      key: "sozlesme_yenileme",
      title: `${upcoming.length} sözleşme yenilemesi`,
      detail: `${upcoming.slice(0, 2).map((c) => nameOf(c.customer_id)).join(" ve ")} için süreç başlatılmalı.`,
      cta: "Gündemi aç", to: "/sozlesmeler", weight: upcoming.length,
    },
    (su.bekleyen_fis || 0) > 0 && {
      key: "stok_fis_onay",
      title: `${su.bekleyen_fis} stok fişi onay bekliyor`,
      detail: su.bekleyen_fis_en_eski_tarih ? `Onay kuyruğundaki en eski kayıt ${gunFarkiMetni(su.bekleyen_fis_en_eski_tarih)} bekliyor.` : "Onay kuyruğu birikmeye başladı.",
      cta: "Onaylara git", to: "/stok/fisler", weight: su.bekleyen_fis,
    },
    (summary?.overdueTickets || 0) > 0 && {
      key: "geciken_bilet",
      title: `${summary.overdueTickets} bilet gecikmiş durumda`,
      detail: "İş Takibi kuyruğunda gecikmiş bilet(ler) var.",
      cta: "Biletlere git", to: "/is-takibi/tickets", weight: summary.overdueTickets,
    },
    (summary?.pendingLeaves || 0) > 0 && {
      key: "izin_onay",
      title: `${summary.pendingLeaves} izin talebi onay bekliyor`,
      detail: "İzin Yönetimi ekranından onaylanabilir.",
      cta: "Onaylara git", to: "/ik-izin-yonetimi", weight: summary.pendingLeaves,
    },
    (summary?.pendingExpenses || 0) > 0 && {
      key: "harcama_onay",
      title: `${summary.pendingExpenses} harcama talebi onay bekliyor`,
      detail: "Harcama Yönetimi ekranından onaylanabilir.",
      cta: "Onaylara git", to: "/ik-harcama-yonetimi", weight: summary.pendingExpenses,
    },
  ].filter(Boolean);
  items.sort((a, b) => b.weight - a.weight);
  return items;
}

// ── Kural tabanlı "Akıllı Öneri" — LLM yok, veriye dayalı şablon metin ──
export function suggestionFor(moduleKey, { stokUyari, contractAlerts, ikData, summary, devriyeRapor, correspondences } = {}) {
  const su = stokUyari || {};
  switch (moduleKey) {
    case "devriye": {
      const sorunlu = (devriyeRapor || []).filter((r) => r.durum === "gec" || r.durum === "plan_disi");
      if (sorunlu.length === 0) {
        return { title: "Devriye tarafı sakin.", text: "Geciken veya plan dışı okuma yok.", cta: null, to: null };
      }
      return { title: "Geciken/plan dışı devriye okumalarını incele.", text: `${sorunlu.length} okuma son 7 günde geç veya plan dışı gerçekleşti.`, cta: "Raporlara git", to: "/devriye/raporlar" };
    }
    case "ebys": {
      const hata = (correspondences || []).filter((c) => c.kep_durum === "hata");
      const bekleyen = (correspondences || []).filter((c) => c.eimza_durum === "beklemede");
      if (hata.length > 0) {
        return { title: "KEP gönderim hatalarını kontrol et.", text: `${hata.length} evrakta KEP gönderimi hatalı görünüyor.`, cta: "Evraklara git", to: "/ebys/evraklar" };
      }
      if (bekleyen.length > 0) {
        return { title: "Bekleyen e-imzaları tamamla.", text: `${bekleyen.length} evrak e-imza bekliyor.`, cta: "Evraklara git", to: "/ebys/evraklar" };
      }
      return { title: "Evrak tarafı sakin.", text: "KEP hatası veya bekleyen e-imza yok.", cta: null, to: null };
    }
    case "stok": {
      const kritik = su.kritik || [];
      if (kritik.length === 0) {
        return { title: "Stok tarafı sakin.", text: "Şu an kritik seviyede ürün bulunmuyor.", cta: null, to: null };
      }
      const byDepo = {};
      kritik.forEach((k) => { byDepo[k.depo_adi || "Bilinmeyen depo"] = (byDepo[k.depo_adi || "Bilinmeyen depo"] || 0) + 1; });
      const sorted = Object.entries(byDepo).sort((a, b) => b[1] - a[1]);
      const top2 = sorted.slice(0, 2);
      const top2Sum = top2.reduce((s, [, n]) => s + n, 0);
      if (sorted.length >= 2 && top2Sum / kritik.length >= 0.5) {
        return {
          title: "İki depo arasında transfer planla.",
          text: `${top2.map(([d]) => d).join(" ve ")} depolarındaki kritik ürünler, toplam riskin %${Math.round((top2Sum / kritik.length) * 100)}'ini oluşturuyor.`,
          cta: "Aksiyon planını oluştur", to: "/stok/fisler",
        };
      }
      return {
        title: "Kritik stok kalemlerini gözden geçir.",
        text: `${kritik.length} ürün kritik seviyede; en yüksek etkili ürün: ${kritik[0]?.urun_adi || "—"}.`,
        cta: "Kritik listesine git", to: "/stok",
      };
    }
    case "sozlesme": {
      const upcoming = contractAlerts?.upcoming || [];
      const expired = contractAlerts?.expired || [];
      if (expired.length > 0) {
        return { title: "Süresi dolmuş sözleşmeleri kapat veya yenile.", text: `${expired.length} sözleşme süresi geçmiş durumda bekliyor.`, cta: "Sözleşmelere git", to: "/sozlesmeler" };
      }
      if (upcoming.length > 0) {
        return { title: "Yenileme sürecini şimdiden başlat.", text: `${upcoming.length} sözleşme önümüzdeki 30 gün içinde sona eriyor.`, cta: "Sözleşmelere git", to: "/sozlesmeler" };
      }
      return { title: "Sözleşme tarafı sakin.", text: "Yaklaşan bir sözleşme bitişi yok.", cta: null, to: null };
    }
    case "bordro": {
      const donem = ikData?.bordro_donem || {};
      if (donem.durum && donem.durum !== "kapali" && donem.durum !== "yok") {
        return { title: "Bordro dönemini kapatmayı unutma.", text: `${donem.ay ? String(donem.ay).padStart(2, "0") + "/" + donem.yil : "Bu dönem"} hâlâ ${DONEM_METIN[donem.durum]?.toLowerCase() || "açık"} durumda.`, cta: "Bordroya git", to: "/ik/bordro" };
      }
      if ((ikData?.kpi?.bekleyen_mesai || 0) > 0) {
        return { title: "Bekleyen mesai kayıtlarını onayla.", text: `${ikData.kpi.bekleyen_mesai} mesai kaydı onay bekliyor.`, cta: "Mesaiye git", to: "/ik/mesai" };
      }
      return { title: "Bordro tarafı sakin.", text: "Bekleyen bir işlem görünmüyor.", cta: null, to: null };
    }
    case "is_takibi": {
      if ((summary?.overdueTickets || 0) > 0) {
        return { title: "Gecikmiş biletleri önceliklendir.", text: `${summary.overdueTickets} bilet gecikmiş durumda.`, cta: "Biletlere git", to: "/is-takibi/tickets" };
      }
      return { title: "İş Takip tarafı sakin.", text: "Gecikmiş bilet bulunmuyor.", cta: null, to: null };
    }
    case "ik": {
      if ((ikData?.kpi?.tutarsiz_personel || 0) > 0) {
        return { title: "Tutarsız personel kayıtlarını düzelt.", text: `${ikData.kpi.tutarsiz_personel} personel kaydı bordro için eksik bilgi içeriyor.`, cta: "Çalışanlara git", to: "/calisanlar?f=bordro" };
      }
      if ((summary?.pendingLeaves || 0) > 0) {
        return { title: "Bekleyen izin taleplerini onayla.", text: `${summary.pendingLeaves} izin talebi onay bekliyor.`, cta: "İzin Yönetimine git", to: "/ik-izin-yonetimi" };
      }
      return { title: "İK tarafı sakin.", text: "Bekleyen bir işlem görünmüyor.", cta: null, to: null };
    }
    default:
      return { title: "Bu modülde öne çıkan bir şey yok.", text: "Veriler normal seyrinde.", cta: null, to: null };
  }
}
