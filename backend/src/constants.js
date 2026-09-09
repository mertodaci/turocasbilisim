// Ortak sabitler.

const crypto = require('crypto');

// GUVENLIK: sabit/paylasilan bir varsayilan sifre yerine (herkes tarafindan
// bilinebilecek, frontend kaynagina gomulu bir string), her yeni hesap icin
// rastgele, tek seferlik bir sifre uretilir. Hesap must_change_password=1 ile
// acilir; kullanici ilk giriste kendi sifresini belirler. Uretilen sifre,
// cagiran islem (yeni kullanici / yeni calisan) tarafindan bir kerelik admin'e
// gosterilmek uzere donus degerinde tasinir -- hicbir yerde sabit deger olarak durmaz.
function generateDefaultPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let out = '';
  for (let g = 0; g < 3; g++) {
    if (g > 0) out += '-';
    for (let i = 0; i < 4; i++) out += alphabet[crypto.randomInt(alphabet.length)];
  }
  return out;
}

// Farkli panolarin ayni "musteri/kurum onayi bekleniyor" adimini farkli
// key'lerle modellemesi: YBS Teknik Destek panosunda "musteri_onay", ABYS
// OMIS panosunda "kurum_test". Ikisi de ayni davranisi tetiklemeli (onayla/
// reddet paneli, 15 gun otomatik kapatma, alt-bilet durum kilidi vb.).
const CUSTOMER_APPROVAL_STATUSES = ['musteri_onay', 'kurum_test'];

module.exports = { generateDefaultPassword, CUSTOMER_APPROVAL_STATUSES };
