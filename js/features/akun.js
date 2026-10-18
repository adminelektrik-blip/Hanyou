/* akun.js v2 — modal akun: info login, ubah nama, ganti password, verifikasi email */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const authObj = () => (window.MMPFirebase && window.MMPFirebase.auth) || null;
  const curUser = () => { const a = authObj(); return a && a.currentUser; };
  const isLocal = () => !!(window.MMP_LOCAL_PREVIEW || (typeof MMP_LOCAL_PREVIEW !== 'undefined' && MMP_LOCAL_PREVIEW));
  const fmtDate = (v, withTime) => {
    if (!v) return '-'; const d = new Date(v); if (isNaN(d)) return '-';
    const day = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    if (!withTime) return day;
    return day + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
  };
  const msg = (el, text, type) => { el.textContent = text || ''; el.className = 'acc-msg' + (type ? ' ' + type : ''); };
  const err = e => (typeof authFriendlyError === 'function' ? authFriendlyError(e) : (e && e.message) || 'Terjadi kesalahan.');
  const providerInfo = u => {
    const ids = (u.providerData || []).map(p => p.providerId);
    const google = ids.includes('google.com'), pw = ids.includes('password');
    return { google, pw, label: google && pw ? 'Google + Email' : google ? 'Google' : pw ? 'Email & Password' : 'Lainnya' };
  };
  const rows = { name: ['accEditNameBtn', 'accNameForm'], pw: ['accChangePwBtn', 'accPwForm'], detail: ['accDetailBtn', 'accDetail'] };
  function closeAll() {
    Object.values(rows).forEach(([btn, panel]) => { $(btn).classList.remove('open'); $(btn).setAttribute('aria-expanded', 'false'); const p = $(panel); p.hidden = true; if (p.reset) p.reset(); });
    ['accNameMsg', 'accPwMsg'].forEach(id => msg($(id)));
    ['accPwCurrent', 'accPwNew', 'accPwNew2'].forEach(id => { $(id).type = 'password'; });
  }
  function openOnly(key) {
    const [btn, panel] = rows[key]; const wasOpen = !$(panel).hidden;
    closeAll();
    if (wasOpen) return;
    $(btn).classList.add('open'); $(btn).setAttribute('aria-expanded', 'true'); $(panel).hidden = false;
    const i = $(panel).querySelector('input'); if (i && key !== 'detail') setTimeout(() => i.focus(), 30);
  }
  function render() {
    if (!$('accountModal')) return;
    closeAll();
    const u = curUser();
    const setTop = (name, email) => { $('accountName').textContent = name; $('accountEmail').textContent = email; $('accAvatar').textContent = ((name || 'A').trim()[0] || 'A').toUpperCase(); };
    if (isLocal() || !u) {
      setTop('Mode Uji Lokal', 'Data hanya tersimpan di perangkat ini');
      $('accAccountGroup').hidden = true; $('accLocalNote').hidden = true;
      return;
    }
    $('accAccountGroup').hidden = false; $('accLocalNote').hidden = true;
    const pi = providerInfo(u);
    const name = (u.displayName || '').trim() || 'Pengguna';
    setTop(name, u.email || '-');
    $('accRowName').textContent = u.displayName ? u.displayName : 'Belum diatur';
    $('accRowEmail').textContent = u.email || '-';
    $('accVerifiedIcon').hidden = !u.emailVerified;
    $('accVerifyBox').hidden = !!u.emailVerified || !u.email;
    $('accChangePwBtn').hidden = !pi.pw;
    $('accRowProvider').textContent = pi.label;
    $('accRowCreated').textContent = fmtDate(u.metadata && u.metadata.creationTime, false);
    $('accRowLast').textContent = fmtDate(u.metadata && u.metadata.lastSignInTime, true);
    const sn = (u.displayName || u.email || 'Pengguna').trim();
    if ($('sidebarProfileName')) $('sidebarProfileName').textContent = sn;
    if ($('sidebarProfileSub')) $('sidebarProfileSub').textContent = u.email || 'Akun & pengaturan';
    if ($('sidebarProfileAvatar')) $('sidebarProfileAvatar').textContent = (sn[0] || 'A').toUpperCase();
  }
  window.hanyouRenderAccount = render;

  ['settingsBtn', 'profileNav'].forEach(id => { const b = $(id); if (b) b.addEventListener('click', () => setTimeout(render, 0)); });
  const a0 = authObj();
  if (a0 && a0.onAuthStateChanged) a0.onAuthStateChanged(() => { if ($('accountModal').classList.contains('open')) render(); });
  $('accountClose').addEventListener('click', closeAll);

  $('accEditNameBtn').addEventListener('click', () => { const u = curUser(); if (!u) return; const wasOpen = !$('accNameForm').hidden; if (!wasOpen) { openOnly('name'); $('accNameInput').value = u.displayName || ''; } else openOnly('name'); });
  $('accChangePwBtn').addEventListener('click', () => openOnly('pw'));
  $('accDetailBtn').addEventListener('click', () => openOnly('detail'));
  document.querySelectorAll('[data-acc-cancel]').forEach(b => b.addEventListener('click', () => closeAll()));
  $('accPwShow').addEventListener('change', e => ['accPwCurrent', 'accPwNew', 'accPwNew2'].forEach(id => { $(id).type = e.target.checked ? 'text' : 'password'; }));

  // ubah nama
  $('accNameForm').addEventListener('submit', async e => {
    e.preventDefault();
    const u = curUser(); if (!u) return;
    const name = $('accNameInput').value.trim(), m = $('accNameMsg'), btn = e.currentTarget.querySelector('.acc-primary');
    if (!name) { msg(m, 'Nama tidak boleh kosong.', 'error'); return; }
    btn.disabled = true; msg(m, 'Menyimpan...');
    try { await u.updateProfile({ displayName: name }); render(); if (typeof toast === 'function') toast('Nama berhasil diubah.'); }
    catch (er) { msg(m, err(er), 'error'); }
    finally { btn.disabled = false; }
  });

  // ganti password (re-autentikasi dulu)
  $('accPwForm').addEventListener('submit', async e => {
    e.preventDefault();
    const u = curUser(); if (!u) return;
    const cur = $('accPwCurrent').value, n1 = $('accPwNew').value, n2 = $('accPwNew2').value, m = $('accPwMsg'), btn = e.currentTarget.querySelector('.acc-primary');
    if (!cur) { msg(m, 'Isi password saat ini.', 'error'); return; }
    if (n1.length < 6) { msg(m, 'Password baru minimal 6 karakter.', 'error'); return; }
    if (n1 !== n2) { msg(m, 'Konfirmasi password baru tidak sama.', 'error'); return; }
    if (n1 === cur) { msg(m, 'Password baru harus berbeda dari yang lama.', 'error'); return; }
    btn.disabled = true; msg(m, 'Memproses...');
    try {
      await u.reauthenticateWithCredential(firebase.auth.EmailAuthProvider.credential(u.email, cur));
      await u.updatePassword(n1);
      msg(m, 'Password berhasil diganti.', 'ok');
      setTimeout(closeAll, 1400);
    } catch (er) {
      const c = er && er.code;
      msg(m, (c === 'auth/wrong-password' || c === 'auth/invalid-credential') ? 'Password saat ini salah.' : c === 'auth/requires-recent-login' ? 'Sesi sudah lama. Keluar lalu masuk lagi, kemudian coba lagi.' : err(er), 'error');
    } finally { btn.disabled = false; }
  });

  // verifikasi email
  let verifyTimer = null;
  const cooldown = (sec) => {
    const btn = $('accVerifySendBtn'), val = $('accVerifyVal'); clearInterval(verifyTimer); let left = sec; btn.disabled = true;
    const tick = () => { if (left <= 0) { clearInterval(verifyTimer); btn.disabled = false; val.textContent = 'Kirim ulang'; } else { val.textContent = left + ' dtk'; left--; } };
    tick(); verifyTimer = setInterval(tick, 1000);
  };
  $('accVerifySendBtn').addEventListener('click', async () => {
    const u = curUser(), m = $('accVerifyMsg'), btn = $('accVerifySendBtn'); if (!u) return;
    btn.disabled = true; $('accVerifySub').hidden = false; msg(m, 'Mengirim...');
    try { await u.sendEmailVerification(); msg(m, 'Link dikirim ke ' + u.email + '. Cek inbox atau spam, buka link-nya, lalu ketuk Segarkan status.', 'ok'); cooldown(60); }
    catch (er) { msg(m, err(er), 'error'); btn.disabled = false; }
  });
  $('accVerifyRefreshBtn').addEventListener('click', async () => {
    const u = curUser(), m = $('accVerifyMsg'), btn = $('accVerifyRefreshBtn'); if (!u) return;
    btn.disabled = true;
    try {
      await u.reload(); const nu = curUser();
      if (nu && nu.emailVerified) { render(); if (typeof toast === 'function') toast('Email sudah terverifikasi.'); }
      else msg(m, 'Email belum terverifikasi. Pastikan kamu sudah membuka link di email.', 'error');
    } catch (er) { msg(m, err(er), 'error'); }
    finally { btn.disabled = false; }
  });

  // lupa password -> kirim link reset
  $('accPwResetBtn').addEventListener('click', async () => {
    const a = authObj(), u = curUser(), m = $('accPwMsg'); if (!a || !u || !u.email) return;
    try { await a.sendPasswordResetEmail(u.email); msg(m, 'Link reset dikirim ke ' + u.email + '.', 'ok'); }
    catch (er) { msg(m, err(er), 'error'); }
  });
})();
