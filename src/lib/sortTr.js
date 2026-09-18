// Combobox/Select seçeneklerini Türkçe alfabetik sıraya sokar.
// SQLite'ın varsayılan BINARY collation'ı Ç/Ş/Ğ/İ/Ö/Ü'yü doğru
// sıralamadığı için (Şube/Bölüm gibi backend'de "sıralı" dönen listelerde
// bile) client-side'da localeCompare("tr") ile düzeltiliyor.
export function sortTr(list, key = "label") {
  return [...(list || [])].sort((a, b) =>
    String(a?.[key] ?? "").localeCompare(String(b?.[key] ?? ""), "tr", { sensitivity: "base" })
  );
}
