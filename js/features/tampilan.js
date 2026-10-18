/* tampilan.js — tema & ukuran teks di menu akun */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const KEY = 'hanyou_fontscale';
  const SCALES = [0.9, 1, 1.15, 1.3];
  const read = () => { try { const v = parseFloat(localStorage.getItem(KEY)); return SCALES.includes(v) ? v : 1; } catch (e) { return 1; } };
  const write = v => { try { localStorage.setItem(KEY, String(v)); } catch (e) {} };
  let scale = read();
  const mq = q => window.matchMedia(q).matches;
  // nilai dasar sama persis dengan aturan CSS bawaan (breakpoint 640 / 1024 / 1440)
  const baseRoot = () => mq('(min-width:1440px)') ? 1.24 : mq('(min-width:1024px)') ? 1.16 : mq('(min-width:640px)') ? 1.08 : 1;
  const baseLat = () => mq('(min-width:1024px)') ? 1.1 : mq('(min-width:640px)') ? 1.05 : 1;
  let styleEl = null;
  function applyScale() {
    const root = document.documentElement;
    if (scale === 1) {
      root.style.removeProperty('--fs');
      if (styleEl) styleEl.textContent = '';
    } else {
      root.style.setProperty('--fs', (baseRoot() * scale).toFixed(3));
      if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'userFontScale'; document.head.appendChild(styleEl); }
      styleEl.textContent = '#latihanSessionBody{--fs:' + (baseLat() * scale).toFixed(3) + '!important}';
    }
    document.querySelectorAll('[data-acc-fs]').forEach(b => b.setAttribute('aria-pressed', String(parseFloat(b.dataset.accFs) === scale)));
  }
  function syncTheme() {
    const t = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    document.querySelectorAll('[data-acc-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.accTheme === t)));
  }
  document.querySelectorAll('[data-acc-fs]').forEach(b => b.addEventListener('click', () => {
    scale = parseFloat(b.dataset.accFs); write(scale); applyScale();
    if (typeof toast === 'function') toast('Ukuran teks: ' + b.textContent.trim());
  }));
  document.querySelectorAll('[data-acc-theme]').forEach(b => b.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    if (cur !== b.dataset.accTheme) { const t = $('themeBtn'); if (t) t.click(); }
    syncTheme();
  }));
  new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('resize', () => { if (scale !== 1) applyScale(); });
  applyScale(); syncTheme();
})();
