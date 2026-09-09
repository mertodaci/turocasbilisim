const { db } = require('./db');

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

// NOT: bu otomatik kapatma sadece musteri_onay icin gecerli -- kurum_test
// bilerek DAHIL EDILMIYOR (musteri_onay/kurum_test'in genel esitlenmesinden
// -- onayla/reddet butonlari, musteri dashboard'u, alt-bilet kilidi --
// istisna olarak, kullanici talebiyle cikarildi).
const AUTO_CLOSE_STATUSES = ['musteri_onay'];

function runTicketCronJobs() {
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    // 1. musteri_onay → sonuclanan (15 gün güncellenmemiş)
    const placeholders = AUTO_CLOSE_STATUSES.map(() => '?').join(', ');
    const musteriOnayTickets = db.prepare(`
      SELECT id, ticket_number, title, updated_date
      FROM tq_tickets
      WHERE status IN (${placeholders}) AND (is_deleted = 0 OR is_deleted IS NULL)
    `).all(...AUTO_CLOSE_STATUSES);

    let movedToSonuclanan = 0;
    for (const ticket of musteriOnayTickets) {
      const updatedAt = new Date(ticket.updated_date);
      if (now - updatedAt >= FIFTEEN_DAYS_MS) {
        db.prepare(`UPDATE tq_tickets SET status = 'sonuclanan', updated_date = ? WHERE id = ?`)
          .run(nowIso, ticket.id);

        // Sistem yorumu ekle
        const commentId = require('crypto').randomUUID();
        db.prepare(`
          INSERT INTO tq_comments (id, ticket_id, content, author_name, is_internal, comment_type, created_date, updated_date)
          VALUES (?, ?, ?, ?, 0, 'system', ?, ?)
        `).run(
          commentId,
          ticket.id,
          '🤖 Otomatik: 15 gün boyunca müşteri onay beklendiğinden bilet sonuçlanan listesine taşındı.',
          'Sistem',
          nowIso,
          nowIso
        );

        movedToSonuclanan++;
      }
    }

    // 2. sonuclanan → arsivlendi (5 gün güncellenmemiş)
    const sonuclananTickets = db.prepare(`
      SELECT id, ticket_number, title, updated_date
      FROM tq_tickets
      WHERE status = 'sonuclanan' AND (is_deleted = 0 OR is_deleted IS NULL)
    `).all();

    let archived = 0;
    for (const ticket of sonuclananTickets) {
      const updatedAt = new Date(ticket.updated_date);
      if (now - updatedAt >= FIVE_DAYS_MS) {
        db.prepare(`UPDATE tq_tickets SET status = 'arsivlendi', updated_date = ? WHERE id = ?`)
          .run(nowIso, ticket.id);

        // Sistem yorumu ekle
        const commentId = require('crypto').randomUUID();
        db.prepare(`
          INSERT INTO tq_comments (id, ticket_id, content, author_name, is_internal, comment_type, created_date, updated_date)
          VALUES (?, ?, ?, ?, 0, 'system', ?, ?)
        `).run(
          commentId,
          ticket.id,
          '🤖 Otomatik: Sonuçlanan listesinde 5 gün kaldığından bilet arşivlendi.',
          'Sistem',
          nowIso,
          nowIso
        );

        archived++;
      }
    }

    if (movedToSonuclanan > 0 || archived > 0) {
      console.log(`⏰ Cron: ${movedToSonuclanan} bilet sonuçlana taşındı, ${archived} bilet arşivlendi.`);
    }
  } catch (err) {
    console.error('Cron job hatası:', err);
  }
}

// OTURUM YONETIMI: her aksam 21:00'de tum aktif oturumlar toplu iptal
// edilir -- herkes bir sonraki isteginde tekrar giris yapmak zorunda kalir.
function killAllSessions() {
  try {
    const info = db.prepare("UPDATE sessions SET revoked = 1 WHERE revoked = 0").run();
    if (info.changes > 0) console.log(`⏰ Cron: ${info.changes} oturum sonlandırıldı (günlük 21:00 kill).`);
  } catch (err) {
    console.error('Oturum kill cron hatası:', err);
  }
}

// Her gun belirtilen saat:dakikada bir fn'i calistirir (sunucu ayaga
// kalkinca hemen degil -- sadece ilk hedef saate kadar bekler, sonra 24
// saatte bir tekrarlar).
function scheduleDaily(hour, minute, fn) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  const delay = next - now;
  setTimeout(() => {
    fn();
    setInterval(fn, 24 * 60 * 60 * 1000);
  }, delay);
}

function startCronJobs() {
  // Sunucu başlayınca bir kez çalıştır
  runTicketCronJobs();

  scheduleDaily(2, 0, runTicketCronJobs);
  scheduleDaily(21, 0, killAllSessions);
  console.log('⏰ Cron job başlatıldı (bilet temizliği 02:00, oturum kill 21:00)');
}

module.exports = { startCronJobs };
