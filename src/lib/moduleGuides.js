// Yardım ekranındaki modül-modül kullanım kılavuzlarının içeriği. Her girdi
// navItems.js'teki bir üst-seviye labelKey'e karşılık gelir — ilgili ekranlar
// listesi navItems.js'ten otomatik türetildiği için burada yalnızca modülün
// ne işe yaradığı ve temel iş akışı elle yazılır.
//
// BAKIM NOTU: bir modülde kullanıcı-görünür bir değişiklik (yeni bir temel
// akış, isim değişikliği, kaldırılan bir adım) yapıldığında bu dosyadaki
// ilgili `summary`/`steps` de güncellenmeli — ekran/route eklenmesi ayrıca
// bir şey gerektirmez, "İlgili Ekranlar" listesi navItems.js'ten otomatik gelir.

export const MODULE_GUIDES = {
  dashboard: {
    summary:
      "Uygulamaya girince karşılanan ana ekran. Bekleyen onaylar, bugünkü izinli/doğum günü olan personel, duyurular, sözleşme/stok/bilet uyarıları ve son 7 günün bilet hareketi tek bakışta özetlenir. Widget'lar sürükle-bırak ile yeniden düzenlenebilir, istenmeyenler kapatılıp \"Gizli Widget'lar\"dan geri eklenebilir.",
    steps: [
      "Üstteki \"Dikkat Gerektirenler\" şeridinde kırmızı/turuncu uyarılar varsa önce onlara bakın (geciken bilet, kritik stok, süresi dolan sözleşme vb.).",
      "KPI kartlarına tıklayarak (Aktif Sözleşme, Açık Bilet, Kritik Stok...) ilgili listeye doğrudan gidebilirsiniz.",
      "Sağ üstteki \"Widget'ları Düzenle\" ikonuyla düzeni değiştirebilir, gereksiz widget'ları kapatabilirsiniz.",
      "\"Atlas\" sekmesi aynı verileri operasyon-sağlığı odaklı, modül bazlı bir görselle sunar.",
    ],
  },
  insan_kaynaklari: {
    summary:
      "Çalışan kayıtlarının, organizasyon şemasının, özlük evraklarının, izin/harcama taleplerinin ve zam işlemlerinin yönetildiği modül. Genel Tanımlar (departman/pozisyon/izin türleri), Çalışanlar listesi ve raporlar buradan yönetilir.",
    steps: [
      "Yeni bir çalışan eklemeden önce Genel Tanımlar'da departman/pozisyon/izin türü gibi ihtiyaç duyacağınız tanımların girili olduğundan emin olun.",
      "Çalışanlar ekranından yeni kayıt açın; çalışan detay sayfasındaki \"Düzenle\" sekmesinden bilgileri güncelleyin.",
      "Personelin izin/harcama talepleri İzin Yönetimi ve Harcama Yönetimi ekranlarından onaylanır.",
      "Zam/ücret değişiklikleri Özlük & Zam ekranından işlenir — bu değişiklikler ücret geçmişine kaydedilir.",
      "Çalışan Raporu ve Hızlı Raporlama ekranları, seçtiğiniz alanlarla özel raporlar üretmenizi sağlar.",
    ],
  },
  pdks_vardiya: {
    summary:
      "Kart/PDKS geçişlerinin (giriş-çıkış saatleri) izlendiği ve vardiya atamalarının yapıldığı modül. Kart Yönetimi ham geçiş kayıtlarını, Vardiya Transferi personel vardiya değişimlerini yönetir.",
    steps: [
      "PDKS Tanımları'nda vardiya saatlerini ve kartlara ait temel kuralları tanımlayın.",
      "Kart Yönetimi ekranında personelin gerçek giriş-çıkış kayıtlarını inceleyin; gerekirse elle düzeltme yapın.",
      "Vardiya Transferi ile bir personelin vardiyasını değiştirin — bu, bordro puantajına da yansır.",
      "Personel Hareketleri, aynı ham kart geçişlerini farklı bir görünümde (rapor amaçlı) sunar.",
    ],
  },
  devriye_yonetimi: {
    summary:
      "Güvenlik devriye/checkpoint takibi: lokasyon ve QR noktalarının tanımlandığı, güvenlik personelinin vardiyaya atandığı ve sahada QR okutarak devriye kaydı oluşturduğu modül.",
    steps: [
      "Tanımlar'dan lokasyon ve her lokasyonun QR noktalarını oluşturun (her nokta kendi QR kodunu üretir).",
      "Personel ekranından güvenlik rolündeki kullanıcıları tanımlayın, ardından Atama ile onları bir lokasyon+vardiyaya bağlayın.",
      "Güvenlik personeli QR Saha ekranından kamerayla noktaları okutur; sistem zamanında/geç/erken/plan dışı olarak kaydeder.",
      "Raporlar ve Saat Raporu ekranlarından hangi noktanın ne zaman okutulduğunu, eksik/gecikmiş devriyeleri görebilirsiniz.",
      "QR Yazdır ekranından tüm noktaların QR kodlarını toplu yazdırabilir, kamerayla test edebilirsiniz.",
    ],
  },
  maas_bordro: {
    summary:
      "Aylık bordro hesaplamasının uçtan uca yapıldığı modül: puantaj üretiminden, mesai onayına, kesintilere, bordro hesaplama/onaylamaya ve ay kapanışına kadar sıralı bir iş akışı izler. Gelir vergisi kümülatif hesaplandığı için aylar SIRAYLA işlenmelidir.",
    steps: [
      "Her ay için önce Puantaj Cetveli'nden o ayın puantajını üretin ve devam kodlarını (E/İ/R/T vb.) kontrol edin.",
      "Varsa fazla/tatil mesailerini Mesai ekranından onaylayın — onaylanmayan mesai bordroya girmez.",
      "Kesinti ekranından avans/icra/BES/masraf gibi dönem kesintilerini üretin veya elle girin.",
      "Bordrolama ekranında \"Hesapla\" ile bordro satırlarını oluşturun, kontrol edip onaylayın.",
      "Ay Kapanışı ile dönemi kilitleyin — kapalı bir dönem yalnızca \"Kilidi Aç\" ile tekrar düzenlenebilir.",
      "Maaş Özet raporundan personel bazlı ödeme dökümünü alabilirsiniz.",
    ],
  },
  stok_yonetimi: {
    summary:
      "Ürün/depo/raf tanımlarından stok giriş-çıkış-transfer fişlerine, FIFO parti takibine, sayım ve zimmete kadar tüm depo operasyonlarının yönetildiği kapsamlı bir modül.",
    steps: [
      "Genel Tanımlar'dan ürünleri, depoları, rafları ve tedarikçileri tanımlayın.",
      "Stok Fişleri ekranından Giriş/Çıkış/Transfer/İade fişi oluşturun — girişler otomatik olarak FIFO partisi üretir.",
      "Kritik/azalan stok uyarıları Yönetim Merkezi ve Stok Kontrol Paneli'nde otomatik görünür.",
      "Fiziksel Sayım ile sistem-gerçek stok farkını tespit edip otomatik düzeltme fişi oluşturabilirsiniz.",
      "El Aletleri/Zimmet ekranından demirbaşları personele zimmetleyip iade takibini yapabilirsiniz.",
      "Raporlar bölümünden stok durumu, hareket ve parti/SKT raporlarını Excel olarak alabilirsiniz.",
    ],
  },
  is_takibi: {
    summary:
      "Müşteri taleplerinin (bilet) açılıp takip edildiği, proje/kanban panolarıyla iş akışının yönetildiği destek/proje takip modülü. Bilet durumları ve tipleri kendi tanım ekranından özelleştirilebilir.",
    steps: [
      "Genel Tanımlar'dan bilet durumlarını (Talep/Analiz/Geliştirme/Test/Tamamlandı vb.) ve tiplerini kendi iş akışınıza göre düzenleyin.",
      "Biletler ekranından yeni bir talep açın veya mevcut bir bileti güncelleyin; müşteri portalından gelen talepler otomatik burada görünür.",
      "Kanban panosunda biletleri sürükle-bırak ile durumdan duruma taşıyabilirsiniz.",
      "Kontrol Paneli, geciken/açık bilet sayıları ve ekip yükü gibi özet metrikleri gösterir.",
    ],
  },
  musteriler_menu: {
    summary:
      "Müşteri (cari) kayıtlarının, müşteri portalı kullanıcılarının ve müşteriye özel tanımların (müşteri tipi, şehir vb.) yönetildiği modül.",
    steps: [
      "Genel Tanımlar'dan müşteri tipi/detayı/şehir gibi seçilebilecek tanımları önceden girin.",
      "Müşteriler ekranından yeni firma kaydı oluşturun; müşteri detay sayfasında Sözleşmeler, Hakediş, Modüller, İş Takibi ve Evraklar sekmeleri bulunur.",
      "Müşteri Kullanıcıları ekranından o firmanın portal üzerinden giriş yapacak kişilerini tanımlayın.",
      "Müşteri detayındaki \"Evraklar\" sekmesinden ilgili dosyaları (sözleşme, kimlik vb.) yükleyip saklayabilirsiniz — bu dosyalar Arşiv'de de görünür.",
    ],
  },
  sozlesme_yonetimi: {
    summary:
      "Müşterilerle yapılan sözleşmelerin ve bu sözleşmelere bağlı hakediş (ödeme planı) takibinin yapıldığı modül. Sözleşme türü/ürün/modül gibi seçim listeleri kendi tanım ekranından yönetilir.",
    steps: [
      "Genel Tanımlar'dan sözleşme türlerini, ürünleri ve modülleri tanımlayın.",
      "Sözleşmeler ekranından yeni bir sözleşme oluşturun; müşteri, tarih aralığı ve tutar bilgilerini girin.",
      "Süresi yaklaşan/dolan sözleşmeler Yönetim Merkezi'nde otomatik uyarı olarak görünür; süresi dolanlar Arşiv'e düşer.",
      "Hakediş ekranından sözleşmeye bağlı ödeme/gerçekleşme takibini yapabilirsiniz.",
    ],
  },
  ebys: {
    summary:
      "Kurum içi/dışı yazışmaların (gelen-giden evrak) kayıt altına alındığı elektronik belge yönetim modülü. KEP (Kayıtlı Elektronik Posta) ve e-imza altyapısı hazırlık aşamasında — gerçek sağlayıcı bağlantısı henüz yok.",
    steps: [
      "Evrak Tanımları'ndan kullanacağınız evrak türlerini (yazı, sözleşme eki, resmi yazışma vb.) tanımlayın.",
      "Gelen/Giden Evrak ekranından yeni bir evrak kaydı oluşturun; evrak numarası yıl bazlı olarak otomatik atanır.",
      "İlgili müşteri, alıcılar ve ekleri (dosya) kayda ekleyebilirsiniz.",
      "Ayarlar ekranından KEP kullanıcı adı / e-imza sağlayıcı bilgisi girilmeden, evrak kayıtlarındaki KEP/e-imza durumu \"bağlantı tamamlanmadı\" gösterir — yalnızca admin bu ayarı değiştirebilir.",
    ],
  },
  arsiv_yonetimi: {
    summary:
      "Silinmemiş ama artık aktif kullanılmayan/kapanmış kayıtların (süresi dolan sözleşmeler, ayrılmış personel evrakları, kapanmış bilet ve bordro dönemleri, müşteri evrak arşivi) tek yerden görüntülendiği, salt-okunur bir modül.",
    steps: [
      "Özet sayfasındaki 5 karttan her biri ilgili arşiv kaynağına gider.",
      "Sözleşmeler: süresi dolmuş/iptal edilmiş sözleşmeleri listeler.",
      "Müşteri Evrakları: müşteri detayındaki \"Evraklar\" sekmesinden yüklenen tüm dosyaları toplu gösterir.",
      "İnsan Kaynakları: ayrılmış (pasif) personelin özlük evrakı ve tutanaklarını listeler.",
      "Bordro: kapatılmış bordro dönemlerini listeler — pusulalar dosya olarak saklanmaz, ihtiyaç halinde Bordrolama ekranından anlık üretilir.",
    ],
  },
  system_admin: {
    summary:
      "Uygulamanın idari yönetim ekranları: kullanıcı hesapları, rol bazlı yetkilendirme, oturum yönetimi, duyurular, çöp kutusu, denetim kaydı ve sunucu sağlığı. Çoğu ekran yalnızca admin/yönetici rolüne açıktır.",
    steps: [
      "Kullanıcılar ekranından yeni hesap açın veya mevcut kullanıcının rolünü/şifresini yönetin.",
      "Yetkilendirme ekranından her rolün hangi modülleri görebileceğini/düzenleyebileceğini (Göster/Ekle/Düzenle/Sil) ayarlayın — bu, tüm menü görünürlüğünün TEK kaynağıdır.",
      "Duyurular ekranından tüm kullanıcılara (veya belirli bir şube/bölüme) duyuru yayınlayın; Yönetim Merkezi'nde otomatik görünür.",
      "Çöp Kutusu'ndan yanlışlıkla silinen kayıtları geri alın; Denetim Kaydı'ndan kimin ne zaman ne değiştirdiğini inceleyin.",
      "Sunucu Sağlığı ekranı disk/bellek/uptime gibi teknik durum bilgisini gösterir (yalnızca admin).",
    ],
  },
  support_center: {
    summary:
      "Kullanıcıların günlük iş akışını destekleyen kişisel araçlar: iç mesajlaşma, yapılacaklar listesi, harcama talepleri, izin talepleri ve kişisel takvim.",
    steps: [
      "Mesajlar ekranından diğer kullanıcılarla iç yazışma yapabilirsiniz.",
      "Yapılacaklar ekranı kendi görev listenizi yönetmenizi sağlar.",
      "Harcamalar ve İzinlerim ekranlarından kendi taleplerinizi oluşturup onay durumunu takip edebilirsiniz.",
      "Kişisel Takvim, izinlerinizi, görevlerinizi ve serbest eklediğiniz etkinlikleri tek takvimde gösterir.",
    ],
  },
};
