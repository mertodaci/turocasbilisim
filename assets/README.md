# Android uygulama ikonu / splash kaynakları

Bu klasöre aşağıdaki dosyaları koyarsan GitHub Actions ("Android APK" workflow'u)
`@capacitor/assets` ile tüm boyutları otomatik üretip APK'ya gömer. Dosya yoksa
varsayılan Capacitor ikonu kullanılır (APK yine de üretilir).

| Dosya | Boyut | Not |
|-------|-------|-----|
| `icon.png` | en az 1024×1024, kare, PNG | Uygulama ikonu. Şeffaf zemin + ortada logo iyi olur (adaptive icon kenarlardan kırpar). |
| `splash.png` | 2732×2732, kare, PNG | Açılış ekranı. Logo ortada, geniş boşluklu. Opsiyonel. |

İND / TaskQube logosundan üretim örneği (herhangi bir görsel düzenleyiciyle):
- Kare tuval aç, logoyu ortala, `icon.png` olarak dışa aktar (1024×1024).
- Aynısını daha büyük tuvalde `splash.png` yap (2732×2732).

Yerelde denemek istersen:
```
npx @capacitor/assets generate --android
```
