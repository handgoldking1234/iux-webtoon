/* 웹툰보드 브리지 — 편집기(editor/studio.html)와 서버(회원 · 클라우드 저장 · AI)를 잇는 얇은 층
 * 편집기 코드는 그대로 두고, 저장 · AI · 계정이 닿는 곳만 window.__WB로 불러요.
 * - local 모드(DB 연동 전): 브라우저 저장만, 글 AI · 이미지 AI는 서버 키가 있으면 사용
 * - cloud 모드: 작품 JSON · 그림을 Supabase Storage로 올리고, 다른 기기에서 열면 받아와요
 */
(function () {
  'use strict';
  var boot = window.__WB_BOOT || { mode: 'local', user: { id: 'local', name: '로컬 작가' }, isAdmin: true, quota: { text: { used: 0, limit: 30 }, image: { used: 0, limit: 10 } }, ai: { text: false, image: false } };
  var cloud = boot.mode === 'cloud';
  var uid = boot.user && boot.user.id;

  /* ---------- 작은 도우미 ---------- */
  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opt.json !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opt.json); }
    return fetch(path, init).then(function (r) {
      var ct = r.headers.get('content-type') || '';
      if (!r.ok) return (ct.indexOf('json') >= 0 ? r.json() : Promise.resolve({})).then(function (j) { var e = new Error(j.message || ('HTTP ' + r.status)); e.code = j.code || ('http_' + r.status); e.status = r.status; throw e; });
      return ct.indexOf('json') >= 0 ? r.json() : r;
    });
  }
  function say(t) { try { if (typeof toast === 'function') toast(t); } catch (_) {} }
  function setQuota(q) { if (q) { boot.quota = q; } }
  function idbReq(db, store, mode, fn) {
    return new Promise(function (res, rej) {
      try { var tx = db.transaction(store, mode), rq = fn(tx.objectStore(store)); tx.oncomplete = function () { res(rq && rq.result); }; tx.onerror = function () { rej(tx.error); }; } catch (e) { rej(e); }
    });
  }
  var LS = { get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} } };
  var syncKey = 'wb-sync:' + uid, synced = LS.get(syncKey, {});
  function markSynced(id, t) { synced[id] = t; LS.set(syncKey, synced); }
  function hhmm() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function status(t, ok) { try { if (typeof saveState === 'function') saveState(t, ok !== false); } catch (_) {} }

  /* ---------- 클라우드 저장 ---------- */
  var DB = null, upQueue = Promise.resolve(), blobQ = new Set(), blobT = null, worksT = null, lastWorks = null;

  // 시작할 때: 서버 작품 목록과 브라우저 목록을 맞춰요 (더 최근 것 우선)
  function sync(db) {
    DB = db;
    if (!cloud) return Promise.resolve();
    status('클라우드에서 불러오는 중…', true);
    return Promise.all([api('/api/projects'), idbReq(db, 'kv', 'readonly', function (s) { return s.get('works'); })]).then(function (r) {
      var list = r[0].projects || [], local = []; try { local = JSON.parse(r[1] || '[]') || []; } catch (_) {}
      var byId = {}; local.forEach(function (w) { byId[w.id] = w; });
      var cloudIds = {};
      var jobs = list.map(function (p) {
        cloudIds[p.id] = 1;
        var w = byId[p.id], cu = (p.meta && p.meta.updated) || Date.parse(p.updated_at) || 0;
        if (w && (w.updated || 0) >= cu) return Promise.resolve();
        return api('/api/projects/' + encodeURIComponent(p.id)).then(function (j) {
          if (!j.url) return;
          return fetch(j.url).then(function (x) { return x.text(); }).then(function (txt) {
            return idbReq(db, 'kv', 'readwrite', function (s) { return s.put(txt, 'project:' + p.id); });
          }).then(function () { byId[p.id] = Object.assign({ id: p.id, title: p.title, created: Date.parse(p.created_at) || cu }, p.meta || {}, { updated: cu }); markSynced(p.id, cu); });
        }).catch(function () {});
      });
      return Promise.all(jobs).then(function () {
        // 다른 기기에서 지운 작품은 여기서도 빼요 (한 번이라도 올렸던 것만)
        Object.keys(byId).forEach(function (id) { if (!cloudIds[id] && synced[id]) { delete byId[id]; delete synced[id]; } });
        LS.set(syncKey, synced);
        var merged = Object.keys(byId).map(function (k) { return byId[k]; });
        return idbReq(db, 'kv', 'readwrite', function (s) { return s.put(JSON.stringify(merged), 'works'); }).then(function () {
          status('클라우드와 맞췄어요 ' + hhmm(), true);
          setTimeout(function () { pushWorks(merged, db); }, 1500);
        });
      });
    }).catch(function (e) { status('클라우드 연결 안 됨 · 이 브라우저에 저장 중', false); console.warn('[웹툰보드] sync', e); });
  }

  // 작품 목록이 저장될 때마다: 바뀐 작품만 올려요
  function pushWorks(WI, db) {
    if (!cloud) return;
    DB = db || DB; lastWorks = (WI || []).map(function (w) { return Object.assign({}, w); });
    clearTimeout(worksT);
    worksT = setTimeout(function () {
      var todo = lastWorks.filter(function (w) { return (synced[w.id] || 0) < (w.updated || w.created || 1); });
      todo.forEach(function (w) { upQueue = upQueue.then(function () { return uploadProject(w); }).catch(function (e) { console.warn('[웹툰보드] upload', e); status('클라우드 저장 실패 · 잠시 뒤 다시 해요', false); }); });
    }, 1200);
  }

  function uploadProject(w) {
    if (!DB) return Promise.resolve();
    return idbReq(DB, 'kv', 'readonly', function (s) { return s.get('project:' + w.id); }).then(function (txt) {
      if (!txt) return;
      var P; try { P = JSON.parse(txt); } catch (_) { return; }
      var keys = []; try { if (typeof projKeys === 'function') keys = Array.from(projKeys(P)); } catch (_) {}
      return ensureBlobs(keys).then(function () {
        return api('/api/projects/' + encodeURIComponent(w.id) + '/upload', { method: 'POST', json: { bytes: txt.length } });
      }).then(function (j) {
        return fetch(j.url, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-upsert': 'true' }, body: txt }).then(function (r) { if (!r.ok) throw new Error('storage ' + r.status); });
      }).then(function () {
        var eps = (P.episodes || []).filter(function (e) { return e.kind !== 'cover'; }).length, cuts = (P.episodes || []).reduce(function (a, e) { return a + (e.cuts || []).length; }, 0);
        return api('/api/projects/' + encodeURIComponent(w.id), { method: 'POST', json: { title: w.title || '새 작품', meta: w, bytes: txt.length, episodes: eps, cuts: cuts } });
      }).then(function () { markSynced(w.id, w.updated || Date.now()); status('클라우드 저장됨 ' + hhmm(), true); });
    });
  }

  function deleteProject(id) {
    if (!cloud) return;
    delete synced[id]; LS.set(syncKey, synced);
    api('/api/projects/' + encodeURIComponent(id), { method: 'DELETE' }).catch(function () {});
  }

  /* 그림: 올린 키는 브라우저 DB(kv 'wb-up')에 기억해 두고 한 번만 올려요 */
  var upKeys = null;
  function loadUpKeys() {
    if (upKeys) return Promise.resolve(upKeys);
    return idbReq(DB, 'kv', 'readonly', function (s) { return s.get('wb-up'); }).then(function (v) { upKeys = new Set(v ? JSON.parse(v) : []); return upKeys; }).catch(function () { upKeys = new Set(); return upKeys; });
  }
  function saveUpKeys() { if (DB && upKeys) idbReq(DB, 'kv', 'readwrite', function (s) { return s.put(JSON.stringify(Array.from(upKeys)), 'wb-up'); }).catch(function () {}); }
  function uploadBlob(k, b) {
    return api('/api/assets/sign', { method: 'POST', json: { key: k, mime: b.type || 'application/octet-stream', bytes: b.size } }).then(function (j) {
      if (j.exists) return;
      return fetch(j.url, { method: 'PUT', headers: { 'content-type': b.type || 'application/octet-stream', 'x-upsert': 'true' }, body: b }).then(function (r) { if (!r.ok) throw new Error('asset ' + r.status); });
    }).then(function () { upKeys.add(k); saveUpKeys(); });
  }
  function ensureBlobs(keys) {
    if (!cloud || !DB || !keys.length) return Promise.resolve();
    return loadUpKeys().then(function () {
      var p = Promise.resolve();
      keys.filter(function (k) { return !upKeys.has(k); }).forEach(function (k) {
        p = p.then(function () { return idbReq(DB, 'blobs', 'readonly', function (s) { return s.get(k); }); }).then(function (b) { if (b) return uploadBlob(k, b); }).catch(function () {});
      });
      return p;
    });
  }
  function putBlob(k, b) {
    if (!cloud || !b) return;
    blobQ.add(k); clearTimeout(blobT);
    blobT = setTimeout(function () { var ks = Array.from(blobQ); blobQ.clear(); upQueue = upQueue.then(function () { return ensureBlobs(ks); }); }, 800);
  }
  function getBlob(k, db) {
    if (!cloud) return Promise.resolve(null);
    return api('/api/assets/' + encodeURIComponent(k)).then(function (j) {
      return fetch(j.url).then(function (r) { if (!r.ok) throw 0; return r.blob(); });
    }).then(function (b) {
      return idbReq(db || DB, 'blobs', 'readwrite', function (s) { return s.put(b, k); }).then(function () { if (upKeys) upKeys.add(k); return b; });
    }).catch(function () { return null; });
  }

  /* ---------- 글 AI (Claude) — 편집기는 window.claude.use('sample').json(prompt)로 불러요 ---------- */
  if (boot.ai.text) {
    window.claude = window.claude || {};
    window.claude.use = function () {
      return Promise.resolve({
        json: function (prompt) {
          return api('/api/ai/text', { method: 'POST', json: { prompt: String(prompt) } }).then(function (j) { setQuota(j.quota); return j.data; }).catch(function (e) { if (e.code === 'quota_exceeded') { setQuota(Object.assign({}, boot.quota, { text: { used: boot.quota.text.limit, limit: boot.quota.text.limit } })); } throw { code: e.code || 'upstream_error', message: e.message }; });
        },
      });
    };
  }
  function txtAi() { var q = boot.quota.text; if (boot.isAdmin) return { used: q.used, left: 9999 }; return { used: q.used, left: Math.max(0, q.limit - q.used) }; }
  function imgLeft() { var q = boot.quota.image; return boot.isAdmin ? 9999 : Math.max(0, q.limit - q.used); }

  /* ---------- 이미지 AI (Gemini · 나노바나나) ---------- */
  function shrink(blob) {
    return createImageBitmap(blob).then(function (bm) {
      var s = Math.min(1, 768 / Math.max(bm.width, bm.height)), c = document.createElement('canvas');
      c.width = Math.round(bm.width * s); c.height = Math.round(bm.height * s); c.getContext('2d').drawImage(bm, 0, 0, c.width, c.height);
      return new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.85); });
    }).then(function (b) {
      return new Promise(function (res) { var fr = new FileReader(); fr.onload = function () { res({ mime: 'image/jpeg', data: String(fr.result).split(',')[1] }); }; fr.readAsDataURL(b); });
    });
  }
  function image(prompt, W, H, refKeys) {
    var map = (typeof blobs !== 'undefined' && blobs) || new Map();
    var refs = (refKeys || []).filter(function (k, i, a) { return k && a.indexOf(k) === i && map.has(k); }).slice(0, 3);
    var model = '', res = '';
    try { model = (S.settings.aiModel || '').indexOf('Pro') >= 0 ? 'pro' : ''; res = S.settings.sbRes === undefined ? '2K' : (S.settings.sbRes || ''); } catch (_) {}
    return Promise.all(refs.map(function (k) { return shrink(map.get(k)).catch(function () { return null; }); })).then(function (R) {
      return fetch('/api/ai/image', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: prompt, width: Math.round(W), height: Math.round(H), model: model, res: res, refs: R.filter(Boolean) }) });
    }).then(function (r) {
      var q = r.headers.get('x-wb-quota'); if (q) try { setQuota(JSON.parse(q)); } catch (_) {}
      if (r.ok && (r.headers.get('content-type') || '').indexOf('image/') === 0) return r.blob();
      return r.json().catch(function () { return {}; }).then(function (j) {
        var m = { budget_exceeded: '이번 달 AI 사용량이 많아 잠시 멈췄어요', image_quota: 'AI 이미지를 다 썼어요', not_configured: '이미지 AI가 아직 연결되지 않았어요', blocked: 'AI가 이 장면은 그릴 수 없다고 했어요 · 설명을 바꿔 보세요', suspended: '이용이 정지된 계정이에요' }[j.code];
        say((m || j.message || '이미지를 만들지 못했어요') + ' · 사용 횟수는 줄지 않았어요');
        if (j.code === 'image_quota' && typeof paywall === 'function') setTimeout(function () { paywall('img'); }, 300);
        return null;
      });
    }).catch(function () { say('이미지를 만들지 못했어요 · 네트워크를 확인해 주세요'); return null; });
  }
  function style() { try { return S.settings.sbStyle || SB_STYLE; } catch (_) { return ''; } }
  function refPrompt(kind, o) {
    if (kind === 'ch') return 'Character reference sheet for a Korean webtoon. Character: ' + o.name + '. Full-body front view, side view, back view and three facial expressions (neutral, smile, angry) on a plain light-grey background, consistent design across views. Appearance: ' + (o.look || 'infer from the name') + '. ' + (o.outfit ? 'Fixed outfit: ' + o.outfit + '. ' : '') + 'Art style: ' + style() + '. No text, no labels.';
    return 'Background location art for a Korean vertical webtoon: ' + o.name + '. ' + (o.desc || '') + ' Wide establishing view, no people. Art style: ' + style() + '. No text.';
  }
  function sbPrompt(c) {
    var p = (c.sb && c.sb.prompt) || ''; if (!p) p = style() + '. ' + ((c.sb && c.sb.scene) || '');
    return p + '\nSingle vertical webtoon panel. Do not draw speech bubbles, captions or any text.';
  }
  function refsFor(c) {
    var st = S.settings, t = ((c.sb && c.sb.prompt) || '') + ' ' + ((c.sb && c.sb.scene) || ''), out = [];
    (st.sbCharList || []).forEach(function (ch) { if (ch.name && (ch.refs || [])[0] && t.indexOf(ch.name) >= 0) out.push(ch.refs[0]); });
    (st.sbStyleRefs || []).slice(0, 1).forEach(function (k) { out.push(k); });
    return out.slice(0, 3);
  }

  /* ---------- 계정 표시 ---------- */
  function applyUser() {
    try {
      if (typeof USER === 'undefined') return;
      USER = { name: boot.user.name || '작가', email: boot.user.email || '', provider: boot.user.provider || 'email' };
      if (typeof renderAcct === 'function') renderAcct();
    } catch (_) {}
  }
  /* ---------- 공지 띠 (관리자 › 공지) ---------- */
  function showNotices() {
    var list = (boot.notices || []).filter(function (n) { return LS.get('wb-notice-x', []).indexOf(n.id) < 0; });
    if (!list.length) return;
    var css = document.createElement('style');
    css.textContent = '.wbn{position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:9999;display:flex;align-items:center;gap:10px;max-width:min(720px,calc(100% - 24px));padding:10px 12px 10px 16px;border-radius:12px;background:#121212;color:#fff;font:600 13px/1.45 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)}.wbn.warn{background:#7a3d00}.wbn.event{background:#13863c}.wbn small{display:block;font-weight:400;opacity:.85}.wbn a{color:inherit;text-decoration:underline}.wbn button{margin-left:auto;border:0;background:rgba(255,255,255,.15);color:inherit;width:26px;height:26px;border-radius:7px;cursor:pointer;flex:none}';
    document.head.appendChild(css);
    var n = list[0], el = document.createElement('div');
    el.className = 'wbn ' + (n.level || 'info'); el.setAttribute('role', 'status');
    var t = document.createElement('div'); var b = document.createElement('b'); b.textContent = n.title; t.appendChild(b);
    if (n.body) { var sm = document.createElement('small'); sm.textContent = n.body; t.appendChild(sm); }
    if (n.link && /^https?:\/\//.test(n.link)) { var a = document.createElement('a'); a.href = n.link; a.target = '_blank'; a.rel = 'noopener'; a.textContent = '자세히'; t.appendChild(a); }
    var x = document.createElement('button'); x.setAttribute('aria-label', '공지 닫기'); x.textContent = '✕';
    x.onclick = function () { var d = LS.get('wb-notice-x', []); d.push(n.id); LS.set('wb-notice-x', d.slice(-50)); el.remove(); };
    el.appendChild(t); el.appendChild(x); document.body.appendChild(el);
  }
  document.addEventListener('DOMContentLoaded', function () { setTimeout(applyUser, 0); setTimeout(showNotices, 600); });
  if (cloud) fetch('/api/me', { method: 'POST', credentials: 'same-origin' }).catch(function () {});

  window.__WBX = boot.ai.image ? '' : undefined;
  window.__WB = {
    boot: boot, dbSuffix: cloud ? ':' + uid : '',
    sync: sync, pushWorks: pushWorks, deleteProject: deleteProject, putBlob: putBlob, getBlob: getBlob,
    txtAi: txtAi, imgLeft: imgLeft, image: image, refPrompt: refPrompt, sbPrompt: sbPrompt, refsFor: refsFor,
  };
})();
