// Ortak sabitler.

// Yeni olusturulan giris (users) hesaplarinin varsayilan sifresi.
// Hem "Yeni Kullanici" ekranindan sifresiz olusturmada, hem de yeni calisan
// kaydiyla otomatik acilan hesapta kullanilir. Bu hesaplar must_change_password=1
// ile isaretlenir; kullanici ilk giriste kendi sifresini belirler.
const DEFAULT_USER_PASSWORD = 'Turocas2026x';

// Farkli panolarin ayni "musteri/kurum onayi bekleniyor" adimini farkli
// key'lerle modellemesi: YBS Teknik Destek panosunda "musteri_onay", ABYS
// OMIS panosunda "kurum_test". Ikisi de ayni davranisi tetiklemeli (onayla/
// reddet paneli, 15 gun otomatik kapatma, alt-bilet durum kilidi vb.).
const CUSTOMER_APPROVAL_STATUSES = ['musteri_onay', 'kurum_test'];

module.exports = { DEFAULT_USER_PASSWORD, CUSTOMER_APPROVAL_STATUSES };
