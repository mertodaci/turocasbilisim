export default function AppVersion() {
  const version = "4.0";
  const releaseDate = "1 Eylül 2026";

  const changelog = [
    {
      version: "4.0",
      date: "1 Eylül 2026",
      badge: "latest",
      changes: [
        "TaskQube: müşteriler artık kendilerine ait tüm biletleri, hangi aşamada olursa olsun görebiliyor — önceden sadece belirli durumlardaki biletler gösteriliyordu.",
        "TaskQube pano (Kanban) görünümü: bilet kartlarında ürün/modül bilgisi gösteriliyor, kolonlar sürükle-bırakla yeniden sıralanabiliyor, seçili pano sayfa yenilense bile açık kalıyor.",
        "TaskQube Biletler ekranına çoklu durum seçimi, sorumlu kişi ve oluşturma tarihi aralığı filtreleri eklendi; arama kutusundaki baştaki/sondaki boşluk artık filtrelemeyi bozmuyor.",
        "TaskQube: bir bileti düzenleyip kaydettikten sonra açık pencerede değişiklik anında görünüyor — önceden pencereyi kapatıp tekrar açmak gerekiyordu.",
        "TaskQube: bilet eklerindeki görsel önizlemesine, indirmeden ekran içinde büyütme seçeneği eklendi.",
        "TaskQube e-posta bildirimleri yeniden tasarlandı — yorum içeriği, değişen alanlar ve eklenen dosya adları artık mail içeriğinde görünüyor; sistem kaynaklı hatalı/fazladan mailler giderildi.",
        "Mesajlar: grup sohbetlerinde katılımcı listesi görüntülenebiliyor ve katılımcı çıkarılabiliyor.",
        "Mesajlar: sohbet arşivleme artık kişiye özel — biri arşivlerse yalnızca kendi görünümünden kalkıyor, diğer katılımcıları etkilemiyor.",
        "Mesajlar: sohbet silme eklendi — birebir sohbetlerde herkes kendi adına, grup sohbetlerinde ise yalnızca grubu oluşturan kişi herkes için silebiliyor.",
        "Mesajlar: mesaj yanıtlama özelliği eklendi — hangi mesaja yanıt verildiği net şekilde gösteriliyor.",
        "Mesajlar: okunmamış mesaj sayaçları ve canlı güncelleme sorunları giderildi — mesaj gönderiminde/alımında ekran artık anında güncelleniyor.",
        "Satış rolü: kişisel takvim ve panel ekranları artık gerçek satış aktivitelerinden besleniyor.",
      ]
    },
    {
      version: "3.5",
      date: "31 Ağustos 2026",
      badge: null,
      changes: [
        "taskqube.com adresine geçiş tamamlandı (SSL dahil).",
        "TaskQube için e-posta bildirim altyapısı kuruldu.",
      ]
    },
    {
      version: "3.2",
      date: "25 Ağustos 2026",
      badge: null,
      changes: [
        "Çalışan Detay sayfasına İzin Mutabakat Formu ve onaylı izin hareketleri tablosu eklendi.",
        "İzin talebi formu netleştirildi (\"İşe Dönüş Tarihi\" girişi), izin bakiyesi hesaplaması tüm ekranlarda tutarlı hale getirildi.",
        "TaskQube: müşteri biletleri artık ürün üzerinden otomatik olarak doğru panoya atanıyor.",
      ]
    },
    {
      version: "3.1",
      date: "17 Ağustos 2026",
      badge: null,
      changes: [
        "Güvenlik ve veri gizliliği (KVKK) sertleştirmesi yapıldı — kişisel veriler ve iç notlar yalnızca yetkili rollere gösteriliyor.",
        "Otomatik dağıtım (deploy) altyapısı kuruldu.",
        "Gerçek zamanlı bildirimler (SSE) düzeltildi.",
      ]
    },
    {
      version: "3.0",
      date: "7 Temmuz 2026",
      badge: null,
      changes: [
        "Bildirim penceresi art\u0131k sayfa i\u00e7eri\u011finin \u00fczerinde net g\u00f6r\u00fcn\u00fcyor \u2014 \u015feffaf g\u00f6r\u00fcnme ve alttaki yaz\u0131larla \u00fcst \u00fcste binme sorunu giderildi.",
        "Kullan\u0131c\u0131lar kendi izin taleplerini olu\u015fturabiliyor ve y\u00f6netici onay\u0131ndan \u00f6nce silebiliyor; onaylanm\u0131\u015f talepler korunuyor, ba\u015fka kullan\u0131c\u0131n\u0131n talebi silinemiyor.",
        "Harcama ve Proje Planlama formlar\u0131ndaki m\u00fc\u015fteri se\u00e7im listesi kullan\u0131c\u0131lar i\u00e7in yeniden \u00e7al\u0131\u015f\u0131yor.",
        "Aktivite ve Sat\u0131\u015f Aktivitesi ekranlar\u0131nda TaskQube bilet listesi ki\u015fiye atanm\u0131\u015f biletleri do\u011fru getiriyor; tamamlanan, iptal ve ar\u015fivlenen biletler listelenmiyor.",
        "Operasyon Merkezi'nde 'Son 7 G\u00fcn Bilet Hareketi' grafi\u011fi ile M\u00fc\u015fteri Haritas\u0131 yan yana yerle\u015ftirildi.",
        "M\u00fc\u015fteri Haritas\u0131 aday m\u00fc\u015fterileri de g\u00f6steriyor (turuncu i\u015faret); Toplam sayac\u0131 yaln\u0131zca aktif m\u00fc\u015fterileri say\u0131yor.",
        "Y\u00f6netici Masas\u0131 'Bu Ay \u00c7\u00f6z\u00fclen' sayac\u0131 ger\u00e7ek \u00e7\u00f6z\u00fclme tarihine g\u00f6re hesaplan\u0131yor \u2014 senkron kaynakl\u0131 \u015fi\u015fme giderildi.",
        "Tekrarlayan 'Geri D\u00f6n' ba\u011flant\u0131lar\u0131 kald\u0131r\u0131ld\u0131; sayfalarda tek bir genel Geri butonu kullan\u0131l\u0131yor.",
      ]
    },
    {
      version: "2.9",
      date: "1 Temmuz 2026",
      badge: null,
      changes: [
        "Giriş ekranı yenilendi — modern cam efektli (glassmorphism) tasarım, net okunabilir alanlar ve Türkçe metin düzeltmeleri",
        "Şirket Takvimi bilet sayacı düzeltildi — bilet sayımı artık created_date bazında; güncel aydaki tüm biletler doğru görüntüleniyor (artık sıfır görünmüyor)",
        "Ayrılan personel güvenlik kontrolü — çalışan pasife alındığında kullanıcı hesabı otomatik pasife çekiliyor; işten ayrılan personelin sistem erişimi kendiliğinden kapanıyor (müşteri hesapları haricı)",
        "Mesajlaşma kişi listesi iyileştirildi — yalnızca aktif IND ekibi listeleniyor; müşteri, pasif ve işten ayrılmış kullanıcılar gizleniyor, liste Türkçe A-Z sıralı",
        "Koyu tema iyileştirmeleri — giriş uyarı kutusu, TaskQube bilet penceresi, hata ekranları ve 404 sayfası koyu temada düzgün görüntüleniyor",
        "Satış Teklifleri sayfasındaki çift yönlendirme (route) temizlendi",
        "Kullanılmayan tablolar ve ölü kod temizliği — daha temiz ve hızlı uygulama derlemesi",
        "Müşteri harita konumlandırması doğrulandı — il bazında çevrimdışı (offline) koordinat sistemi, internet gerektirmeden çalışıyor",
      ]
    },
    {
      version: "2.8",
      date: "21 Haziran 2026",
      badge: null,
      changes: [
        "TaskQube v3 modülü — proje, bilet, kanban pano ve durum yönetimi tek çatı altında; müşteri bazlı aktivasyon",
        "Yönetici Masası (C-Level Dashboard) — İK, Satış, TaskQube, Aktivite ve Harcama verilerini tek ekranda sunar; tıklanabilir kartlar, 10 dakikada bir otomatik yenileme",
        "Şirket Takvimi — Ay/Hafta/Liste görünümleri; aktivite, izin, bilet, teklif ve ziyaret planlarından besleniyor",
        "Aktiviteler ekranı yenilendi — istatistik kartları, gelişmiş filtreler, arama kutusu ve zengin kart tasarımı",
        "Kullanıcılar sayfası yenilendi — rol bazlı özet kartlar, sol liste sağ detay panel tasarımı",
        "Yetkilendirme ekranı yenilendi — sol panel roller, sağ panel yetki matrisi; kategori bazlı aktif modül sayacı",
        "Satış sekmesi (Müşteri Detayı) detaylandırıldı — tüm aktiviteler, başarı istatistikleri, outcome badge ve detay gösterimi",
        "Harcama kategori analizi — konaklama, ulaşım, yakıt, yemek ve diğer kategorileri donut grafikle gösteriliyor",
        "Güvenlik sertleştirmesi — JWT HttpOnly Cookie, backend validasyon, dosya yükleme güvenliği",
        "Session timeout — 60 dakika hareketsizlik sonrası uyarı ve otomatik çıkış",
        "SSE (Server-Sent Events) — gerçek zamanlı bildirimler",
        "SQLite otomatik yedekleme — gece 03:00'te cron job",
        "Proje Planlama — Gantt chart ile kurulum/eğitim aşamaları takibi",
        "IK Harcama/İzin Yönetimi yetki düzeltmeleri — IK rolü onaylama işlemlerini yapabiliyor",
        "Bilet filtreleme düzeltildi, müşteri rolü bilet düzenleme kısıtlaması",
        "Destek Merkezi menüsü yeniden yapılandırıldı — tüm operasyonel menüler tek çatı altında",
        "Çalışanlara fotoğraf yükleme, departman/pozisyon okunabilir etiket gösterimi",
        "İzin onay dialogunda bakiye kontrol ve uyarı sistemi",
      ]
    },
    {
      version: "2.5",
      date: "12 Haziran 2026",
      badge: null,
      changes: [
        "Sidebar menü düzeni ve isimlendirmesi yeniden yapılandırıldı",
        "Harcamalar modülü eklendi — saha ziyareti gider raporları",
        "İzin yönetimi bildirim sistemi optimize edildi",
        "Gerçek zamanlı bildirim rozetleri iyileştirildi",
        "Rol tabanlı menü erişim kontrolleri güçlendirildi",
      ]
    },
    {
      version: "2.0",
      date: "Mayıs 2026",
      badge: null,
      changes: [
        "İş Takip (WorkTasks) modülü eklendi",
        "Mesajlaşmaya Google Meet entegrasyonu eklendi",
        "Kişisel takvim sayfası eklendi",
        "Çalışan raporu Excel/CSV dışa aktarma özelliği eklendi",
        "Müşteri haritası (CustomerMap) eklendi",
      ]
    },
    {
      version: "1.0",
      date: "Mayıs 2026",
      badge: null,
      changes: [
        "İlk yayın",
        "Aktivite yönetimi",
        "Çalışan yönetimi",
        "Müşteri yönetimi",
        "İzin talepleri",
        "Yapılacaklar listesi",
        "Mesajlaşma modülü",
        "Fikir kutusu",
      ]
    },
  ];

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Uygulama Versiyonu</h1>
        <p className="text-sm text-muted-foreground mt-1">FlowMetrics sürüm geçmişi ve değişiklik notları</p>
      </div>

      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
          <span className="text-white font-black text-xl">v{version}</span>
        </div>
        <div>
          <p className="text-indigo-200 text-xs uppercase tracking-widest font-semibold">Mevcut Versiyon</p>
          <p className="text-white text-3xl font-black">{version}</p>
          <p className="text-indigo-200 text-sm mt-0.5">{releaseDate}</p>
        </div>
      </div>

      <div className="space-y-4">
        {changelog.map((entry) => (
          <div key={entry.version} className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2.5">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${entry.version === version ? "bg-indigo-600 text-white border-indigo-600" : "bg-muted text-muted-foreground border-border"}`}>
                  v{entry.version}
                </span>
                {entry.badge === "latest" && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">SON SÜRÜM</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground">{entry.date}</span>
            </div>
            <ul className="px-5 py-4 space-y-2">
              {entry.changes.map((change, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"/>
                  <span className="text-foreground leading-relaxed">{change}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
