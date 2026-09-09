const { db } = require('./db');
const { sendMail } = require('./mailer');

// Musteriye mail giden 3 ozel durum + hareket etiketi
const CUSTOMER_STATUS_LABELS = {
  musteri_onay: 'Onayınıza gönderildi',
  cevap_bekleniyor: 'Cevabınız bekleniyor',
  kurum_test: 'Kurum içi teste alındı',
};

// Guncelleme maillerinde eski/yeni degeri karsilastirilan alanlar.
const FIELD_LABELS = {
  title: 'Başlık',
  description: 'Açıklama',
  priority: 'Öncelik',
  due_date: 'Termin',
  product_name: 'Ürün',
  type: 'Tür',
};

function kv(label, value, width) {
  return `${label.padEnd(width)}: ${value}`;
}

// Her mailin altina eklenen sabit bilet baglami (eski taskpad'deki
// Urun/Proje/Bilet Tipi/Bilet Detay bloguyla ayni mantik). "Bilet Detay"in
// bizde karsiligi yok -- Aciklama alani onun yerini de tutuyor.
function buildContextBlock(ticket) {
  const num = ticket.ticket_number || ticket.id;
  const width = 14;
  const lines = [kv('Bilet No', num, width), kv('Bilet Başlık', ticket.title || '(boş)', width)];
  if (ticket.product_name) lines.push(kv('Ürün', ticket.product_name, width));
  if (ticket.project_name) lines.push(kv('Proje', ticket.project_name, width));
  if (ticket.type) lines.push(kv('Bilet Tipi', ticket.type, width));
  if (ticket.priority) lines.push(kv('Öncelik', ticket.priority, width));
  lines.push(kv('Açıklama', ticket.description || '(boş)', width));
  return lines.join('\n');
}

// actionLines: [["Bilet Hareketi", "..."], ["Hareketi Gerçekleştiren Kullanıcı", actorName], ...]
function buildMail(actionLines, ticket) {
  const width = Math.max(...actionLines.map(([label]) => label.length)) + 1;
  const actionBlock = actionLines.map(([label, value]) => kv(label, value, width)).join('\n');
  return `${actionBlock}\n\n${buildContextBlock(ticket)}`;
}

function fieldDiffLines(existing, updated) {
  const lines = [];
  for (const [key, label] of Object.entries(FIELD_LABELS)) {
    const oldVal = existing[key] ?? '';
    const newVal = updated[key] ?? '';
    if (String(oldVal) !== String(newVal)) {
      lines.push(`${label}: ${oldVal || '(boş)'} → ${newVal || '(boş)'}`);
    }
  }
  return lines;
}

function newAttachmentNames(existing, updated) {
  const oldNames = new Set((Array.isArray(existing.attachments) ? existing.attachments : []).map((a) => a.name));
  const newAtts = Array.isArray(updated.attachments) ? updated.attachments : [];
  return newAtts.filter((a) => !oldNames.has(a.name)).map((a) => a.name);
}

function resolveCustomerEmail(ticket) {
  // GUVENLIK/DOGRULUK: ticket.customer_contact_id aslinda her zaman bir
  // users.id (musteri rolundeki portal hesabi) -- hem musterinin kendi
  // bileti actigi otomatik atama (JTTicketFormDialog.jsx) hem de analistin
  // "Musteri Muhatabi" dropdown'u (JTTicketDetailDialog.jsx) flowApi.auth.users()
  // uzerinden doldurulur, customer_contacts tablosundan degil. Eskiden burada
  // customer_contacts'ta aranıyordu -- ID uzaylari farkli oldugu icin bu arama
  // hep bos donuyor, sessizce asagidaki "customer_id'nin en eski kaydi" yedegine
  // dusup mailin yanlis (o firmaya ait ilk kaydedilen) kisiye gitmesine yol aciyordu.
  if (ticket.customer_contact_id) {
    const u = db.prepare('SELECT email FROM users WHERE id = ?').get(ticket.customer_contact_id);
    if (u && u.email) return u.email;
  }
  if (ticket.customer_id) {
    const c = db
      .prepare("SELECT email FROM customer_contacts WHERE customer_id = ? AND email IS NOT NULL AND email != '' ORDER BY created_date ASC LIMIT 1")
      .get(ticket.customer_id);
    if (c && c.email) return c.email;
  }
  return null;
}

function assignedIds(ticket) {
  let ids = Array.isArray(ticket.assigned_to_ids) ? ticket.assigned_to_ids : [];
  if (!ids.length && ticket.assigned_to_id) ids = [ticket.assigned_to_id];
  return ids;
}

// Biletin assigned_to_ids (employees.id) listesindeki herkesin email'i,
// guncellemeyi yapan kisi (excludeEmail) haric. excludeIds verilirse o
// id'lere sahip kisiler de listeden cikarilir (ör. zaten kendi ozel
// "sana atandi" mailini alan kisileri genel guncelleme mailinden haric
// tutmak icin).
function assignedEmployeeEmails(ticket, excludeEmail, excludeIds = []) {
  const ids = assignedIds(ticket);
  const emails = [];
  for (const id of ids) {
    if (excludeIds.includes(id)) continue;
    const emp = db.prepare('SELECT email FROM employees WHERE id = ?').get(id);
    if (emp && emp.email && emp.email !== excludeEmail) emails.push(emp.email);
  }
  return [...new Set(emails)];
}

// TEST MODU: JOB_TRACKING_MAIL_TEST_TICKET .env'de tanimliysa, mail SADECE o
// bilet numarasi icin gonderilir, digerleri sessizce atlanir. Testi
// bitirince bu satiri .env'den silmek yeterli -- herkes icin aktif olur.
function isTestModeBlocked(ticketNumber) {
  const testTicket = process.env.JOB_TRACKING_MAIL_TEST_TICKET;
  if (!testTicket) return false;
  return String(ticketNumber) !== String(testTicket);
}

function notifyTicketUpdate(existing, updated, actorUser) {
  const num = updated.ticket_number || updated.id;
  if (isTestModeBlocked(num)) {
    console.log(`[jobTrackingNotify] test modu aktif (JOB_TRACKING_MAIL_TEST_TICKET=${process.env.JOB_TRACKING_MAIL_TEST_TICKET}), bilet #${num} atlandi`);
    return;
  }
  const actorName = actorUser?.full_name || actorUser?.email || 'Bir kullanıcı';

  const statusChanged = existing.status !== updated.status;

  // Arsivleme, aksiyon gerektirmeyen bir temizlik islemi -- tek tek de olsa,
  // "Tumunu Arsivle" gibi toplu bir islemle onlarca/yuzlerce bilet birden
  // de arsivlense, kimseye mail gitmiyor (aksi halde toplu arsivleme aninda
  // atanan kisilerin gelen kutusuna onlarca mail dusebilirdi).
  if (statusChanged && updated.status === 'arsivlendi') return;

  // Musteriye giden ozel durum degisikligi, sorumlu eklenmesinden bagimsiz
  // her zaman once kontrol edilir (farkli bir alici kitlesi, oncelikli).
  const customerLabel = statusChanged ? CUSTOMER_STATUS_LABELS[updated.status] : null;
  if (customerLabel) {
    const email = resolveCustomerEmail(updated);
    if (email) {
      const text = buildMail([
        ['Bilet Hareketi', customerLabel],
        ['Hareketi Gerçekleştiren Kullanıcı', actorName],
      ], updated);
      sendMail({ to: email, subject: `Bilet #${num} güncellemesi`, text });
    } else {
      console.warn(`[jobTrackingNotify] bilet #${num} için müşteri e-postası bulunamadı (customer_contact_id/customer_id eksik veya kayıtlı kişide email yok)`);
    }
    return; // musteriye giden bir durum degisikligi ise, ayni anda analistlere gitmiyor
  }

  // Yeni sorumlu eklendiyse -- kim ekledigi (kendini/baskasini) mesaj
  // metnini degistirmiyor, sadece kendine mail gitmemesini saglıyor:
  //   - eklenen kisi actor'un kendisi degilse: o kisiye "sana atandi" gider
  //   - biletteki ONCEDEN atanmis diger herkese, tek/genel bir "yeni
  //     sorumlu eklendi" bilgilendirmesi gider (kim eklendi ayrintisina
  //     girmeden).
  // Bu, kendi basina tam bir olay sayilir -- asagidaki genel "guncellendi"
  // kovasiyla ayni update icin cift mail atilmasin diye o kova atlanir.
  const newlyAddedIds = assignedIds(updated).filter((id) => !assignedIds(existing).includes(id));
  if (newlyAddedIds.length) {
    for (const id of newlyAddedIds) {
      if (id === undefined) continue;
      const emp = db.prepare('SELECT email FROM employees WHERE id = ?').get(id);
      if (emp && emp.email && emp.email !== actorUser?.email) {
        const text = buildMail([
          ['Bilet Hareketi', 'Sorumlu olarak eklendiniz'],
          ['Hareketi Gerçekleştiren Kullanıcı', actorName],
        ], updated);
        sendMail({ to: emp.email, subject: `Bilet #${num} size atandı`, text });
      }
    }

    const existingEmails = assignedEmployeeEmails(existing, actorUser?.email, newlyAddedIds);
    const notifyText = buildMail([
      ['Bilet Hareketi', 'Bilete yeni bir sorumlu eklendi'],
      ['Hareketi Gerçekleştiren Kullanıcı', actorName],
    ], updated);
    for (const email of existingEmails) {
      sendMail({ to: email, subject: `Bilet #${num} - sorumlu eklendi`, text: notifyText });
    }
    return;
  }

  const emails = assignedEmployeeEmails(updated, actorUser?.email);
  if (!emails.length) return;

  let actionLines;
  if (statusChanged) {
    const statusRow = db.prepare('SELECT name FROM job_ticket_statuses WHERE key = ? LIMIT 1').get(updated.status);
    actionLines = [
      ['Bilet Hareketi', `Durum "${statusRow?.name || updated.status}" olarak değiştirildi`],
      ['Hareketi Gerçekleştiren Kullanıcı', actorName],
    ];
  } else {
    const newNames = newAttachmentNames(existing, updated);
    if (newNames.length) {
      actionLines = [
        ['Bilet Hareketi', 'Belge/ek eklendi'],
        ['Hareketi Gerçekleştiren Kullanıcı', actorName],
        ['Eklenen Dosya(lar)', newNames.join(', ')],
      ];
    } else {
      const diffLines = fieldDiffLines(existing, updated);
      // GUVENLIK/DOGRULUK: durum, ek, sorumlu ya da izlenen alanlarin
      // (FIELD_LABELS) HICBIRI degismediyse mail atma -- ör. kanban'da
      // suruklenen bir bilet, aynı kolondaki DIGER biletlerin sirasini
      // (board_sort) degistirebiliyor; bu sessiz, gorsel bir yeniden
      // siralama, izlenen hicbir alanı degistirmiyor ama eskiden yine de
      // "Bilet guncellendi" maili gidiyordu -- boyle bosuna mail spam'i
      // yaratiyordu.
      if (!diffLines.length) return;
      actionLines = [
        ['Bilet Hareketi', 'Bilet güncellendi'],
        ['Hareketi Gerçekleştiren Kullanıcı', actorName],
        ['Değişen Alanlar', diffLines.join(' | ')],
      ];
    }
  }

  const text = buildMail(actionLines, updated);
  for (const email of emails) {
    sendMail({ to: email, subject: `Bilet #${num} güncellendi`, text });
  }
}

function notifyNewComment(comment, ticket, actorUser) {
  const num = ticket.ticket_number || ticket.id;
  if (isTestModeBlocked(num)) {
    console.log(`[jobTrackingNotify] test modu aktif (JOB_TRACKING_MAIL_TEST_TICKET=${process.env.JOB_TRACKING_MAIL_TEST_TICKET}), bilet #${num} atlandi`);
    return;
  }
  // Arayuz, sorumlu ekleme/cikarma ve durum degisikliginde gercek
  // guncellemenin yaninda ayrica comment_type="system" ile bir
  // "islem gecmisi" (audit-log) satiri da yazıyor -- bu gercek bir
  // kullanici yorumu degil, ilgili guncelleme zaten notifyTicketUpdate
  // uzerinden kendi mailini gonderiyor. Burada tekrar mail atmayalim.
  if (comment.comment_type === 'system') return;
  const actorName = actorUser?.full_name || actorUser?.email || 'Bir kullanıcı';
  const emails = assignedEmployeeEmails(ticket, actorUser?.email);
  if (!emails.length) return;

  const actionLines = [
    ['Bilet Hareketi', 'Yeni yorum eklendi'],
    ['Hareketi Gerçekleştiren Kullanıcı', actorName],
  ];
  if (comment.content) actionLines.push(['Yorum', comment.content]);
  const commentAttachmentNames = (Array.isArray(comment.attachments) ? comment.attachments : []).map((a) => a.name).filter(Boolean);
  if (commentAttachmentNames.length) actionLines.push(['Eklenen Dosya(lar)', commentAttachmentNames.join(', ')]);

  const text = buildMail(actionLines, ticket);
  for (const email of emails) {
    sendMail({ to: email, subject: `Bilet #${num} - yeni yorum`, text });
  }
}

module.exports = { notifyTicketUpdate, notifyNewComment };
