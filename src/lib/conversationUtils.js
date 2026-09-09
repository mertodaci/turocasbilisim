// Sohbet gorunurluk/okunmamislik kurallari -- ConversationList.jsx ve
// NotificationContext.jsx (menu/sidebar rozeti) BURADAN paylasir. Ayri
// ayri yazilirsa (daha once oldugu gibi) birbirinden sapip tutarsiz
// sayilar gosterebiliyorlar.

export function isConversationArchivedForUser(conv, email) {
  return (conv.archived_by || []).includes(email);
}

// Kisisel silme: sildigim andan (deleted_by[email]) SONRA yeni mesaj
// gelmediyse hala benden gizli. Grup silme ise status='deleted' ile
// herkes icin gecerli.
export function isConversationDeletedForUser(conv, email) {
  if (conv.status === "deleted") return true;
  const ts = conv.deleted_by?.[email];
  if (!ts) return false;
  return !conv.last_message_at || conv.last_message_at <= ts;
}

export function isConversationVisibleForUser(conv, email) {
  return !!conv.participants?.includes(email) && !isConversationDeletedForUser(conv, email);
}

// Arsivlenmis ve silinmis sohbetler ne Mesajlar ekranindaki ne de
// menudeki okunmamis sayacina dahil edilir.
export function isConversationUnreadForUser(conv, email) {
  if (!isConversationVisibleForUser(conv, email)) return false;
  if (isConversationArchivedForUser(conv, email)) return false;
  if (conv.last_message_sender_email === email) return false;
  if (!conv.last_message) return false;
  const myLastRead = conv.last_read_message_id_by_user?.[email];
  if (conv.last_message_id) return myLastRead !== conv.last_message_id;
  return !myLastRead;
}
