/**
 * SUNUCUDA MIYIZ?
 * ============================================================================
 * `scripts/prerender.ts` bileşenleri Node içinde render ediyor; orada `window`
 * yok. Bu sabit tek başına küçük görünüyor ama iki yerde taşıyıcı:
 *
 * 1) `motion` bileşenleri `initial` stillerini SUNUCU ÇIKTISINA YAZIYOR.
 *    Guard konmazsa paket ızgarası (yani fiyatlar), "Neden Biz" ızgarası ve
 *    TrustBar prerender HTML'ine `style="opacity:0"` ile iniyor — sayfa dolu
 *    görünüyor ama tarayıcı içeriği görmüyor. Tam olarak kaçınmaya çalıştığımız
 *    durumun sessiz hâli. Çağrı noktalarında `initial={IS_SERVER ? false : {…}}`
 *    kalıbı kullanılıyor: `false`, motion'a "animasyonu atla, hedef değerden
 *    başla" demek.
 *
 * 2) `createRoot` (hydrate DEĞİL — bkz. src/main.tsx) kullandığımız için
 *    istemci ağacı sıfırdan kuruyor, yani gerçek kullanıcılar animasyonları
 *    bugünkü gibi görmeye devam ediyor. Animasyonsuz son hâli yalnızca
 *    tarayıcı görüyor.
 *
 * `host.ts` "window.location'ı okuyan tek yer" disiplinini taşıyor; burası da
 * window'un VARLIĞINI sorgulayan tek yer olsun diye ayrı bir modül.
 */
export const IS_SERVER = typeof window === 'undefined';
