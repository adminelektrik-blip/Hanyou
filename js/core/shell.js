/* shell.js */
/* HANYOU - perilaku kerangka UI (sidebar, tema, keluar akun, modal akun, PWA).
   Menggantikan skrip tambalan v9, v10, v13 dan beberapa blok inline sebelumnya. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);

  (function () { // modal akun: tombol, klik latar, Esc
    const modal = $('accountModal'), close = $('accountClose');
    if (!modal || !close) return;
    const shut = () => modal.classList.remove('open');
    close.addEventListener('click', shut);
    modal.addEventListener('click', e => { if (e.target === modal) shut(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) shut(); });
    $('profileNav')?.addEventListener('click', () => { window.hanyouSyncRefreshUI && window.hanyouSyncRefreshUI(); });
  })();

  (function () { // batas kata baru per hari (select di modal akun)
    const sel = $('newPerDaySel'); if (!sel) return;
    const sync = () => { sel.value = String(SRS.limit()); };
    sync(); $('settingsBtn')?.addEventListener('click', sync); $('profileNav')?.addEventListener('click', sync);
    sel.addEventListener('change', () => {
      DB.settings.newPerDay = Number(sel.value); save(); buildQueue();
      toast('Batas kata baru: ' + (sel.value === '0' ? 'tanpa batas' : sel.value + ' per hari'));
    });
  })();

  (function () { // tombol tema sidebar -> tombol tema utama; ikon mengikuti tema
    const side = $('sidebarThemeBtn'), top = $('themeBtn');
    if (!side) return;
    side.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (top) top.click();
      else document.documentElement.setAttribute('data-theme', document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
    const sync = () => {
      const dark = document.documentElement.getAttribute('data-theme') !== 'light';
      side.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#' + (dark ? 'i-sun' : 'i-moon') + '"/></svg>';
      side.setAttribute('aria-label', dark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
    };
    sync();
    new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  })();

  (function () { // penanda sidebar terbuka (dipakai CSS)
    const side = $('mainSidebar'), app = $('app');
    if (!side || !app) return;
    const sync = () => side.setAttribute('data-sidebar-open', app.classList.contains('sidebar-open') ? '1' : '0');
    sync(); new MutationObserver(sync).observe(app, { attributes: true, attributeFilter: ['class'] });
  })();

  (function () { // konfirmasi keluar akun
    const side = $('sidebarLogoutBtn'), modal = $('logoutConfirmModal'), cancel = $('logoutCancelBtn'), ok = $('logoutConfirmBtn');
    if (!side || !modal || !cancel || !ok) return;
    const open = () => modal.classList.add('open'), shut = () => modal.classList.remove('open');
    side.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); open(); }, true);
    cancel.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); shut(); }, true);
    ok.addEventListener('click', async e => {
      e.preventDefault(); e.stopImmediatePropagation(); shut();
      try {
        if (window.MMP_LOCAL_PREVIEW) { toast('Mode uji lokal: tidak ada sesi akun untuk dikeluarkan.'); return; }
        const auth = window.MMPFirebase && window.MMPFirebase.auth;
        if (!auth) { toast('Sesi akun belum tersedia.'); return; }
        await auth.signOut();
        $('accountModal')?.classList.remove('open');
        toast('Anda sudah keluar.');
      } catch (err) { toast(typeof authFriendlyError === 'function' ? authFriendlyError(err) : 'Gagal keluar. Silakan coba lagi.'); }
    }, true);
    modal.addEventListener('click', e => { if (e.target === modal) shut(); });
  })();

  (function () { // scrollTo lama diarahkan ke container .app
    const orig = window.scrollTo.bind(window);
    window.scrollTo = function (a, b) {
      const app = $('app');
      if (app) { if (a && typeof a === 'object') app.scrollTo(a); else app.scrollTo(a || 0, b || 0); }
      try { orig.apply(null, arguments); } catch (e) {}
    };
  })();

  // PWA: service worker (hanya lewat http/https)
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w && w.addEventListener('statechange', () => {
          if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Versi baru siap. Tutup dan buka lagi aplikasi untuk memakainya.');
        });
      });
    }).catch(e => console.warn('[HANYOU] service worker gagal', e));
  }
  if (typeof window.hideSplash === 'function') window.hideSplash();
})();
