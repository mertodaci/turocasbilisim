import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Yazdırma pencerelerine document.write ile basılan HTML'lerde serbest metin
// alanlarını (ürün adı/kodu, barkod, sicil no, raf adı vb.) güvenli hale
// getirir -- kullanıcı bu alanlara "<"/">" gibi karakterler girerse etiket
// düzeni bozulmasın diye.
export function escHtml(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Turkiye cep/sabit telefon formatlama: rakam disindaki her seyi atar, en
// fazla 11 haneyi (basindaki 0 dahil) "0(5xx) xxx xx xx" seklinde diziyor.
// Kullanici yazarken canli cagrilmak uzere tasarlandi (onChange handler).
export function formatTrPhone(value) {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  const parts = [digits.slice(0, 1), digits.slice(1, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)];
  let out = parts[0];
  if (parts[1]) out += `(${parts[1]}`;
  if (parts[1] && parts[1].length === 3) out += ")";
  if (parts[2]) out += ` ${parts[2]}`;
  if (parts[3]) out += ` ${parts[3]}`;
  if (parts[4]) out += ` ${parts[4]}`;
  return out;
}
