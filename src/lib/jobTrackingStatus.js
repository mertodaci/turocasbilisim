// Farklı panolar, aynı "müşteri/kurum onayı bekleniyor" adımını farklı
// key'lerle modelliyor: YBS Teknik Destek panosunda "musteri_onay", ABYS
// OMIS panosunda "kurum_test". İkisi de aynı davranışı tetiklemeli
// (onayla/reddet paneli, müşteri dashboard'u, kanban varsayılan kapalı
// kolon vb.) — bkz. backend/src/constants.js'teki eşleniği.
export const CUSTOMER_APPROVAL_STATUSES = ["musteri_onay", "kurum_test"];
