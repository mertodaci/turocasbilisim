// İşlem Sebebi (hareket nedeni) listeleri — Giriş/Çıkış/Tedarikçiye İade fişlerinde
// gösterilir (Transfer'de hiç gösterilmez, çünkü zaten atomik bir fiş tipi).
// FisForm.jsx (masaüstü) ve StokMobil.jsx (mobil hızlı işlem) aynı listeyi kullanır.
export const SEBEP_LISTESI = {
  giris: [
    { value: "satin_alma", label: "Satın Alma" },
    { value: "sayim_fazlasi", label: "Sayım Fazlası" },
    { value: "acilis_devir", label: "Açılış Bakiyesi / Devir" },
  ],
  cikis: [
    { value: "sarf_kullanim", label: "Sarf / Kullanım" },
    { value: "numune_test", label: "Numune / Test" },
    { value: "hurdaya_ayirma", label: "Hurdaya Ayırma" },
    { value: "kayip_calinti", label: "Kayıp / Çalıntı" },
    { value: "sayim_eksigi", label: "Sayım Eksiği" },
  ],
  iade: [
    { value: "arizali_urun", label: "Arızalı Ürün" },
    { value: "yanlis_urun", label: "Yanlış Ürün Gönderildi" },
    { value: "fazla_siparis", label: "Fazla Sipariş" },
    { value: "diger", label: "Diğer" },
  ],
};
