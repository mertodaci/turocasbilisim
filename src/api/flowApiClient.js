// base44Client.js'nin yerini alan yeni API istemcisi
// Tüm flowApi.entities.X.list(), .create(), .update(), .delete() çağrılarını karşılar

const BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');

function authHeaders() {
  return { 'Content-Type': 'application/json' };
}

// ── Gercek zamanli guncellemeler (SSE) ──────────────────────────────
// Backend /api/events uzerinden tum baglantida olan kullanicilara, bir
// tabloda degisiklik oldugunda { type: 'refresh', counts } yayinliyor
// (3 saniyede bir kontrol). Tum entity.subscribe() cagrilari, sayfa
// basina tek paylasilan bir EventSource baglantisini kullanir.
let _sseSource = null;
const _sseSubscribers = new Set();

function ensureSSEConnection() {
  if (_sseSource || typeof EventSource === 'undefined') return;
  _sseSource = new EventSource(`${BASE_URL}/api/events`, { withCredentials: true });
  _sseSource.onmessage = (e) => {
    let data;
    try { data = JSON.parse(e.data); } catch { return; }
    _sseSubscribers.forEach((cb) => {
      try { cb(data); } catch (err) { console.error('SSE subscriber hatasi:', err); }
    });
  };
  _sseSource.onerror = () => {
    // EventSource tarayici tarafindan otomatik olarak yeniden baglanir, ek islem gerekmiyor
  };
}

async function handleResponse(res) {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || 'İstek başarısız');
    error.status = res.status;
    throw error;
  }
  return res.json();
}

// Entity isimini URL'e çevir (CamelCase → snake_case + çoğul)
const ENTITY_MAP = {
  Employee:         'employees',
  Customer:         'customers',
  LeaveRequest:     'leave_requests',
  Todo:             'todos',
  CustomerContact:  'customer_contacts',
  CustomerContract: 'customer_contracts',
  CustomerModule:   'customer_modules',
  Correspondence:   'correspondences',
  Conversation:     'conversations',
  Message:          'messages',
  LeaveAllowance:   'leave_allowances',
  LeaveType:        'leave_types',
  Hakedis:          'hakedisler',
  Definition:       'definitions',
  Announcement:     'announcements',
  ExpenseReport:    'expense_reports',
  ExpenseItem:      'expense_items',
  User:             'users',
  CustomerProject:  'customer_projects',
  JTProject:        'job_projects',
  JTTicket:         'job_tickets',
  JTTicketStatus:   'job_ticket_statuses',
  JTComment:        'job_comments',
  JTEffortPlan:     'job_effort_plans',
  JTEffortLog:      'job_effort_logs',
  JTKanbanBoard:    'job_kanban_boards',
  CardLog:          'card_logs',
  Role:             'roles',
  RolePermission:   'role_permissions',
  // ── Stok / Depo Yönetimi ──
  StokUrun:          'stok_urunler',
  StokUrunGrup:      'stok_urun_gruplari',
  StokUrunBarkod:    'stok_urun_barkodlari',
  StokDepo:          'stok_depolar',
  StokRaf:           'stok_raflar',
  StokUrunRaf:       'stok_urun_raf',
  StokSaha:          'stok_sahalar',
  StokTeslimatAdres: 'stok_teslimat_adresleri',
  StokFis:           'stok_fisler',
  StokFisSatir:      'stok_fis_satirlari',
  StokHareket:       'stok_hareketler',
  StokParti:         'stok_partiler',
  StokPartiTahsis:   'stok_parti_tahsis',
  StokSayim:         'stok_sayimlar',
  StokSayimSatir:    'stok_sayim_satirlari',
  StokUrunTedarikci: 'stok_urun_tedarikci',
  StokFiyatGecmisi:  'stok_fiyat_gecmisi',
  StokZimmetYeri:    'stok_zimmet_yerleri',
  StokEtiketFis:     'stok_etiket_fisleri',
  StokExcelYukleme:  'stok_excel_yuklemeler',
  StokQnbAyar:       'stok_qnb_ayarlar',
  StokQnbBelge:      'stok_qnb_belgeler',
  StokQnbLog:        'stok_qnb_loglar',
  StokQnbCariSorgu:  'stok_qnb_cari_sorgu',
  // ── İK / Özlük / Bordro ──
  IkSube:            'ik_subeler',
  IkBolum:           'ik_bolumler',
  IkUcretGecmisi:    'ik_ucret_gecmisi',
  IkVardiya:         'ik_vardiyalar',
  IkVardiyaAtama:    'ik_vardiya_atamalari',
  IkVardiyaPlan:     'ik_vardiya_planlari',
  IkResmiTatil:      'ik_resmi_tatiller',
  IkPuantaj:         'ik_puantaj',
  IkPuantajLog:      'ik_puantaj_duzeltme_log',
  IkMesai:           'ik_mesai_kayitlari',
  IkHakedisAyar:     'ik_hakedis_genel_ayar',
  IkHakedisTanim:    'ik_hakedis_tanim',
  IkBordroYemekKural: 'ik_bordro_yemek_kural',
  IkKesintiPlan:     'ik_kesinti_planlari',
  IkKesinti:         'ik_kesintiler',
  IkIcBorc:          'ik_ic_borclar',
  IkIcBorcTahsilat:  'ik_ic_borc_tahsilat',
  IkPersonelMasraf:  'ik_personel_masraf',
  IkBordroDonem:     'ik_bordro_donemleri',
  IkBordroSatir:     'ik_bordro_satirlari',
  IkSirket:          'ik_sirket_bilgileri',
  IkTopluYukleme:    'ik_toplu_yukleme',
  IkOzlukEvrak:      'ik_ozluk_evraklari',
  IkTutanak:         'ik_tutanaklar',
  IkIlan:            'ik_ilanlar',
  IkIzinEvrak:       'ik_izin_evraklari',
  IkVergiAyar:       'ik_vergi_ayarlari',
  IkGelirVergisiDilim: 'ik_gelir_vergisi_dilimleri',
};

function createEntityClient(entityName) {
  const path = ENTITY_MAP[entityName];
  // MERKEZI: employees listelerinden musteri-rollu ve silinmis kayitlari her zaman ayikla
  // (tek kisi cekenler email filtresiyle gelir, dizi degilse dokunulmaz)
  function _scrubEmployees(p, data) {
    if (p !== 'employees' || !Array.isArray(data)) return data;
    return data.filter(e => e && e.app_role !== 'musteri' && e.is_deleted !== 1 && e.is_deleted !== true);
  }
  if (!path) throw new Error(`Bilinmeyen entity: ${entityName}`);
  const url = `${BASE_URL}/api/entities/${path}`;

  return {
    // flowApi.entities.X.list(sort?, limit?)
    async list(sort, limit) {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', String(limit));
      const query = params.toString() ? `?${params}` : '';
      const _res = handleResponse(await fetch(`${url}${query}`, { headers: authHeaders(), credentials: 'include' }));
      return _scrubEmployees(path, await _res);
    },

    // flowApi.entities.X.filter({ key: value, ... })
    async filter(filters = {}, sort, limit) {
      // URLSearchParams her degeri oldugu gibi string'e cevirir -- undefined/null
      // bir filtre degeri "field=undefined" gibi anlamsiz bir sorgu parametresine
      // donusurdu, sessizce yanlis/bos sonuc dondururdu. Bu degerler once elenir.
      const cleanFilters = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== undefined && v !== null));
      const params = new URLSearchParams(cleanFilters);
      if (sort) params.set("sort", sort); if (limit) params.set("limit", String(limit));
      const _res = handleResponse(await fetch(`${url}?${params}`, { headers: authHeaders(), credentials: 'include' }));
      return _scrubEmployees(path, await _res);
    },

    // flowApi.entities.X.get(id)
    async get(id) {
      return handleResponse(await fetch(`${url}/${id}`, { headers: authHeaders(), credentials: 'include' }));
    },

    // flowApi.entities.X.create(data)
    async create(data) {
      return handleResponse(await fetch(url, {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      }));
    },

    // flowApi.entities.X.update(id, data)
    async update(id, data) {
      return handleResponse(await fetch(`${url}/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        credentials: 'include',
        body: JSON.stringify(data),
      }));
    },

    // flowApi.entities.X.delete(id)
    async delete(id) {
      return handleResponse(await fetch(`${url}/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
        credentials: 'include',
      }));
    },

    // Gercek zamanli guncelleme: paylasilan SSE baglantisina abone olur.
    // Backend hangi tabloda degisiklik oldugunu satir bazinda degil, tablo
    // sayaci degisimi olarak bildiriyor (bkz. index.js pollDB) -- bu yuzden
    // callback her 'refresh' olayinda cagrilir, filtreleme cagiran tarafta yapilir.
    subscribe(callback) {
      ensureSSEConnection();
      const handler = (data) => {
        if (data?.type !== 'refresh') return;
        callback(data);
      };
      _sseSubscribers.add(handler);
      return () => { _sseSubscribers.delete(handler); };
    },
  };
}

// flowApi.auth karşılıkları
export const auth = {
  async me() {
    return handleResponse(
      await fetch(`${BASE_URL}/api/auth/me`, { headers: authHeaders(), credentials: 'include' })
    );
  },
  async login(email, password) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await handleResponse(res);
    return data;
  },
  async register(email, password, full_name, role) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name, role }),
    });
    const data = await handleResponse(res);
    return data;
  },
  async logout() {
    await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    window.location.href = '/landing';
  },
  async users() {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/users`, { headers: authHeaders(), credentials: 'include' }));
  },
  async updateUser(id, data) {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/users/${id}`, { method: 'PUT', headers: authHeaders(), credentials: 'include', body: JSON.stringify(data) }));
  },
  async createUser(data) {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/users`, { method: 'POST', headers: authHeaders(), credentials: 'include', body: JSON.stringify(data) }));
  },
  async getFavorites() {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/favorites`, { headers: authHeaders(), credentials: 'include' }));
  },
  async updateFavorites(favorites) {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/favorites`, { method: 'PUT', headers: authHeaders(), credentials: 'include', body: JSON.stringify({ favorites }) }));
  },
  async deleteUser(id) {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/users/${id}`, { method: 'DELETE', headers: authHeaders(), credentials: 'include' }));
  },
  async sessions() {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/sessions`, { headers: authHeaders(), credentials: 'include' }));
  },
  async revokeSession(id) {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/sessions/${id}/revoke`, { method: 'POST', headers: authHeaders(), credentials: 'include' }));
  },
  async changePassword({ currentPassword, newPassword }) {
    return handleResponse(await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'PUT',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }));
  },
  redirectToLogin() {
    window.location.href = '/landing';
  },
};

// Stok / Depo Yönetimi — özel (transactional) uç noktalar
const _sjson = (method, body) => ({
  method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
  ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
});
export const stok = {
  async createFis(fis, satirlar) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis`, _sjson('POST', { fis, satirlar }))); },
  async getFis(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis/${id}`, { credentials: 'include' })); },
  async updateFis(id, fis, satirlar) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis/${id}`, _sjson('PUT', { fis, satirlar }))); },
  async onayla(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis/${id}/onayla`, _sjson('POST'))); },
  async iptal(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis/${id}/iptal`, _sjson('POST'))); },
  async fisTaslagaAl(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis/${id}/taslaga-al`, _sjson('POST'))); },
  async stokDurum(urun_id, depo_id, raf_id) {
    const p = new URLSearchParams({ urun_id, depo_id });
    if (raf_id) p.set('raf_id', raf_id);
    return handleResponse(await fetch(`${BASE_URL}/api/stok/stok-durum?${p}`, { credentials: 'include' }));
  },
  async fisOzet() { return handleResponse(await fetch(`${BASE_URL}/api/stok/fis-ozet`, { credentials: 'include' })); },
  async partiler(filtre = {}) {
    const p = new URLSearchParams(Object.entries(filtre).filter(([, v]) => v != null && v !== ''));
    return handleResponse(await fetch(`${BASE_URL}/api/stok/partiler?${p}`, { credentials: 'include' }));
  },
  async partiOzet() { return handleResponse(await fetch(`${BASE_URL}/api/stok/parti-ozet`, { credentials: 'include' })); },
  async fifoYenidenHesapla() { return handleResponse(await fetch(`${BASE_URL}/api/stok/fifo-yeniden-hesapla`, _sjson('POST'))); },
  async fifoTutarlilik() { return handleResponse(await fetch(`${BASE_URL}/api/stok/fifo-tutarlilik`, { credentials: 'include' })); },
  async uyarilar() { return handleResponse(await fetch(`${BASE_URL}/api/stok/uyarilar`, { credentials: 'include' })); },
  async cariEkstre(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/stok/cari-ekstre?${qs}`, { credentials: 'include' })); },
  async barkodCoz({ kod, q } = {}) { const qs = new URLSearchParams({ ...(kod ? { kod } : {}), ...(q ? { q } : {}) }).toString(); return handleResponse(await fetch(`${BASE_URL}/api/stok/barkod-coz?${qs}`, { credentials: 'include' })); },
  async sayimOlustur(body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/sayim`, _sjson('POST', body))); },
  async sayimGetir(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/sayim/${id}`, { credentials: 'include' })); },
  async sayimKaydet(id, body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/sayim/${id}`, _sjson('PUT', body))); },
  async sayimTamamla(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/sayim/${id}/tamamla`, _sjson('POST'))); },
  async sayimOzet() { return handleResponse(await fetch(`${BASE_URL}/api/stok/sayim-ozet`, { credentials: 'include' })); },
  async rapor(ad, filtre = {}) {
    const p = new URLSearchParams(Object.entries(filtre).filter(([, v]) => v != null && v !== ''));
    return handleResponse(await fetch(`${BASE_URL}/api/stok/rapor/${ad}?${p}`, { credentials: 'include' }));
  },
  async satinalma(ad, filtre = {}) {
    const p = new URLSearchParams(Object.entries(filtre).filter(([, v]) => v != null && v !== ''));
    return handleResponse(await fetch(`${BASE_URL}/api/stok/satinalma/${ad}?${p}`, { credentials: 'include' }));
  },
  async satinalmaRapor(tip, filtre = {}) {
    const p = new URLSearchParams({ tip, ...Object.fromEntries(Object.entries(filtre).filter(([, v]) => v != null && v !== '')) });
    return handleResponse(await fetch(`${BASE_URL}/api/stok/satinalma/rapor?${p}`, { credentials: 'include' }));
  },
  async fiyatGecmisi(filtre = {}) {
    const p = new URLSearchParams(Object.entries(filtre).filter(([, v]) => v != null && v !== ''));
    return handleResponse(await fetch(`${BASE_URL}/api/stok/fiyat-gecmisi?${p}`, { credentials: 'include' }));
  },
  async zimmetle(body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/zimmet`, _sjson('POST', body))); },
  async zimmetIade(id, body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/zimmet/${id}/iade`, _sjson('POST', body || {}))); },
  async zimmetOzet() { return handleResponse(await fetch(`${BASE_URL}/api/stok/zimmet-ozet`, { credentials: 'include' })); },
  async zimmetGetir(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/zimmet/${id}`, { credentials: 'include' })); },
  async zimmetSeriNoListesi(urun_id, depo_id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/zimmet/seri-no-listesi?urun_id=${urun_id}&depo_id=${depo_id}`, { credentials: 'include' })); },
  async zimmetList(filtre = {}) {
    const p = new URLSearchParams(Object.entries(filtre).filter(([, v]) => v != null && v !== ''));
    return handleResponse(await fetch(`${BASE_URL}/api/stok/zimmet?${p}`, { credentials: 'include' }));
  },
  async excelYukle(body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/excel-yukle`, _sjson('POST', body))); },
  async excelGeriAl(id) { return handleResponse(await fetch(`${BASE_URL}/api/stok/excel-yukle/${id}/geri-al`, _sjson('POST'))); },
  async dashboard() { return handleResponse(await fetch(`${BASE_URL}/api/stok/dashboard`, { credentials: 'include' })); },
  async qnbPanel() { return handleResponse(await fetch(`${BASE_URL}/api/stok/qnb/panel`, { credentials: 'include' })); },
  async qnbGelenAktar(body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/qnb/gelen-aktar`, _sjson('POST', body))); },
  async qnbTaslak(fis_id, tur) { return handleResponse(await fetch(`${BASE_URL}/api/stok/qnb/taslak`, _sjson('POST', { fis_id, tur }))); },
  async fiyatArastirUygula(body) { return handleResponse(await fetch(`${BASE_URL}/api/stok/fiyat-arastir/uygula`, _sjson('POST', body))); },
};

// ── İK / Özlük / Bordro ──
export const ik = {
  async zamUygula(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/zam-uygula`, _sjson('POST', body))); },
  async cikisVer(id, body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/personel/${id}/cikis`, _sjson('POST', body))); },
  async ucretSenkron(id) { return handleResponse(await fetch(`${BASE_URL}/api/ik/personel/${id}/ucret-senkron`, _sjson('POST'))); },
  async vardiyaTransfer(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/vardiya-transfer`, _sjson('POST', body))); },
  async tatilTakvimi(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/tatil-takvimi?${qs}`, { credentials: 'include' })); },
  async puantajHesapla(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/puantaj/hesapla`, _sjson('POST', body))); },
  async puantajCetvel(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/puantaj/cetvel?${qs}`, { credentials: 'include' })); },
  async puantajDuzelt(id, body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/puantaj/${id}`, _sjson('PUT', body))); },
  async puantajToplu(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/puantaj/toplu`, _sjson('POST', body))); },
  async puantajRapor(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/puantaj/rapor?${qs}`, { credentials: 'include' })); },
  async mesaiAdaylar(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/mesai/adaylar?${qs}`, { credentials: 'include' })); },
  async mesaiEkle(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/mesai`, _sjson('POST', body))); },
  async mesaiTopluOnay(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/mesai/toplu-onay`, _sjson('POST', body))); },
  async hakedisListe() { return handleResponse(await fetch(`${BASE_URL}/api/ik/hakedis/liste`, { credentials: 'include' })); },
  async hakedisToplu(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/hakedis/toplu`, _sjson('POST', body))); },
  async kesintiPlan(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/kesinti/plan`, _sjson('POST', body))); },
  async kesintiDonemUret(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/kesinti/donem-uret`, _sjson('POST', body))); },
  async kesintiDonem(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/kesinti/donem?${qs}`, { credentials: 'include' })); },
  async bordroHesapla(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/bordro/hesapla`, _sjson('POST', body))); },
  async bordroListe(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/bordro/liste?${qs}`, { credentials: 'include' })); },
  async bordroSatirDuzelt(id, body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/bordro/satir/${id}`, _sjson('PUT', body))); },
  async bordroOnayla(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/bordro/onayla`, _sjson('POST', body))); },
  async bordroKapat(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/bordro/kapat`, _sjson('POST', body))); },
  sgkCsvUrl(yil, ay, sube_id) { const qs = new URLSearchParams({ yil, ay, ...(sube_id ? { sube_id } : {}) }).toString(); return `${BASE_URL}/api/ik/bordro/sgk-csv?${qs}`; },
  async ozlukEvrakOnizle(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/ozluk-evrak/eslesme-onizle`, _sjson('POST', body))); },
  async ozlukEvrakTopluUygula(body) { return handleResponse(await fetch(`${BASE_URL}/api/ik/ozluk-evrak/toplu-uygula`, _sjson('POST', body))); },
  async hareketRapor(p = {}) { const qs = new URLSearchParams(p).toString(); return handleResponse(await fetch(`${BASE_URL}/api/ik/hareket-rapor?${qs}`, { credentials: 'include' })); },
  async dashboard() { return handleResponse(await fetch(`${BASE_URL}/api/ik/dashboard`, { credentials: 'include' })); },
};

// base44 nesnesi — tüm kullanımlar flowApi.entities.X veya flowApi.auth.X şeklinde
export const flowApi = {
  auth,
  stok,
  ik,
  health: () => fetch(`${BASE_URL}/api/health`).then(r => { if (!r.ok) throw new Error('unhealthy'); return r.json(); }),
  entities: new Proxy({}, {
    get(_, entityName) {
      return createEntityClient(entityName);
    }
  }),
};
