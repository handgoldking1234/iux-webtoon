/* 바로웹툰 브리지 — 편집기(editor/studio.html)와 서버(회원 · 클라우드 저장 · AI)를 잇는 얇은 층
 * 편집기 코드는 그대로 두고, 저장 · AI · 계정이 닿는 곳만 window.__WB로 불러요.
 * - local 모드(DB 연동 전): 브라우저 저장만, 글 AI · 이미지 AI는 서버 키가 있으면 사용
 * - cloud 모드: 작품 JSON · 그림을 Supabase Storage로 올리고, 다른 기기에서 열면 받아와요
 */
(function () {
  'use strict';
  var boot = window.__WB_BOOT || { mode: 'local', user: { id: 'local', name: '로컬 작가' }, isAdmin: true, quota: { text: { used: 0, limit: 30 }, image: { used: 0, limit: 10 } }, ai: { text: false, image: false } };
  var cloud = boot.mode === 'cloud';
  var guest = boot.mode === 'guest';
  var uid = boot.user && boot.user.id;

  /* ---------- 작은 도우미 ---------- */
  var aiCtl = [];
  function abortAI() { var L = aiCtl; aiCtl = []; L.forEach(function (c) { try { c.abort(); } catch (_) {} }); return L.length; }
  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', headers: {}, credentials: 'same-origin' };
    if (opt.json !== undefined) { init.headers['content-type'] = 'application/json'; init.body = JSON.stringify(opt.json); }
    /* 글 AI 요청은 「취소」로 바로 끊을 수 있게 해요 */
    var ctl = null;
    if (path.indexOf('/api/ai/text') === 0 && typeof AbortController === 'function') { ctl = new AbortController(); init.signal = ctl.signal; aiCtl.push(ctl); }
    var done = function () { if (ctl) aiCtl = aiCtl.filter(function (c) { return c !== ctl; }); };
    return fetch(path, init).catch(function (e) { done(); if (e && e.name === 'AbortError') { var a = new Error('취소했어요'); a.code = 'cancelled'; throw a; } throw e; }).then(function (r) {
      done();
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
    return adoptGuest(db).then(function () { return Promise.all([api('/api/projects'), idbReq(db, 'kv', 'readonly', function (s) { return s.get('works'); })]).then(function (r) {
      var list = r[0].projects || [], local = []; try { local = JSON.parse(r[1] || '[]') || []; } catch (_) {}
      var byId = {}; local.forEach(function (w) { byId[w.id] = w; });
      var cloudIds = {};
      var jobs = list.map(function (p) {
        cloudIds[p.id] = 1;
        var w = byId[p.id], cu = (p.meta && p.meta.updated) || Date.parse(p.updated_at) || 0;
        if (w && (w.updated || 0) >= cu) return Promise.resolve();
        return api('/api/projects/' + encodeURIComponent(p.id)).then(function (j) {
          if (!j.url) return;
          var info = {};
          return fetch(j.url).then(function (x) { return x.text(); }).then(function (txt) {
            // 작품 파일 안의 제목 · 회차 · 컷 수를 목록에 써요 (목록 정보가 빠진 작품도 제목이 제대로 보이게)
            try {
              var P = JSON.parse(txt), eps = (P.episodes || []);
              var t = P.settings && typeof P.settings.workTitle === 'string' ? P.settings.workTitle.trim() : '';
              if (t) info.title = t;
              info.eps = eps.filter(function (e) { return e.kind !== 'cover'; }).length;
              info.cuts = eps.reduce(function (a, e) { return a + (e.cuts || []).length; }, 0);
            } catch (_) {}
            return idbReq(db, 'kv', 'readwrite', function (s) { return s.put(txt, 'project:' + p.id); });
          }).then(function () { byId[p.id] = Object.assign({ id: p.id, title: p.title, created: Date.parse(p.created_at) || cu }, p.meta || {}, info, { updated: cu }); markSynced(p.id, cu); });
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
    }); }).catch(function (e) { status('클라우드 연결 안 됨 · 이 브라우저에 저장 중', false); console.warn('[바로웹툰] sync', e); });
  }

  /* 가입 전에(손님으로) 이 브라우저에서 만든 작품을 내 계정으로 옮겨요 — 한 작품은 한 번만 */
  function adoptGuest(db) {
    var moved = LS.get('wb-guest-moved', {});
    return new Promise(function (done) {
      var rq; try { rq = indexedDB.open('webtoon-cut-studio', 1); } catch (_) { return done(); }
      rq.onupgradeneeded = function () { try { rq.transaction.abort(); } catch (_) {} };
      rq.onerror = function () { done(); };
      rq.onsuccess = function () {
        var g = rq.result, fin = function () { try { g.close(); } catch (_) {} done(); };
        if (!g.objectStoreNames.contains('kv') || !g.objectStoreNames.contains('blobs')) return fin();
        Promise.all([idbReq(g, 'kv', 'readonly', function (s) { return s.get('works'); }), idbReq(db, 'kv', 'readonly', function (s) { return s.get('works'); })]).then(function (r) {
          var gw = [], mine = []; try { gw = JSON.parse(r[0] || '[]') || []; } catch (_) {} try { mine = JSON.parse(r[1] || '[]') || []; } catch (_) {}
          var have = {}; mine.forEach(function (w) { have[w.id] = 1; });
          var todo = gw.filter(function (w) { return w && w.id && !have[w.id] && !moved[w.id]; });
          if (!todo.length) return;
          var p = Promise.resolve(), n = 0;
          todo.forEach(function (w) {
            p = p.then(function () { return idbReq(g, 'kv', 'readonly', function (s) { return s.get('project:' + w.id); }); }).then(function (txt) {
              if (!txt) return;
              var keys = []; try { if (typeof projKeys === 'function') keys = Array.from(projKeys(JSON.parse(txt))); } catch (_) {}
              var q = Promise.resolve();
              keys.forEach(function (k) { q = q.then(function () { return idbReq(g, 'blobs', 'readonly', function (s) { return s.get(k); }); }).then(function (b) { if (b) return idbReq(db, 'blobs', 'readwrite', function (s) { return s.put(b, k); }); }).catch(function () {}); });
              return q.then(function () { return idbReq(db, 'kv', 'readwrite', function (s) { return s.put(txt, 'project:' + w.id); }); }).then(function () { mine.push(Object.assign({}, w, { updated: Date.now() })); moved[w.id] = Date.now(); n++; });
            }).catch(function () {});
          });
          return p.then(function () {
            if (!n) return;
            LS.set('wb-guest-moved', moved);
            return idbReq(db, 'kv', 'readwrite', function (s) { return s.put(JSON.stringify(mine), 'works'); }).then(function () { setTimeout(function () { say('가입 전에 만든 작품 ' + n + '개를 내 계정으로 옮겼어요'); }, 1800); });
          });
        }).then(fin, fin);
      };
    });
  }

  // 작품 목록이 저장될 때마다: 바뀐 작품만 올려요
  function pushWorks(WI, db) {
    if (!cloud) return;
    DB = db || DB; lastWorks = (WI || []).map(function (w) { return Object.assign({}, w); });
    clearTimeout(worksT);
    worksT = setTimeout(function () {
      var todo = lastWorks.filter(function (w) { return (synced[w.id] || 0) < (w.updated || w.created || 1); });
      todo.forEach(function (w) { upQueue = upQueue.then(function () { return uploadProject(w); }).catch(function (e) { console.warn('[바로웹툰] upload', e); status('클라우드 저장 실패 · 잠시 뒤 다시 해요', false); }); });
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
    var aiFail = function (e) { var why = { busy: 1, bad_key: 1, rate_limited: 1, budget_exceeded: 1, not_configured: 1, pro_only: 1, refused: 1 }[e.code] && e.message; if (why) setTimeout(function () { say(why); }, 600); if (e.code === 'quota_exceeded') { setQuota(Object.assign({}, boot.quota, { text: { used: boot.quota.text.limit, limit: boot.quota.text.limit } })); } throw { code: e.code || 'upstream_error', message: e.message }; };
    /* 스트림으로 받은 글에서 JSON만 읽기 */
    var looseJson = function (t) { t = String(t || '').trim(); var f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) t = f[1]; try { return JSON.parse(t); } catch (_) {} var s = t.indexOf('{'), e = t.lastIndexOf('}'); if (s >= 0 && e > s) { try { return JSON.parse(t.slice(s, e + 1)); } catch (_) {} } throw { code: 'invalid_json' }; };
    window.claude.use = function () {
      return Promise.resolve({
        json: function (prompt) {
          return api('/api/ai/text', { method: 'POST', json: { prompt: String(prompt) } }).then(function (j) { setQuota(j.quota); if (j.truncated) setTimeout(function () { say('AI 답이 길어서 뒷부분이 잘렸어요 · 받은 데까지만 넣었어요. 컷 수를 줄이거나 나머지를 한 번 더 만들어 주세요'); }, 600); return j.data; }).catch(aiFail);
        },
        /* 여러 조각을 동시에 물어요 — 서버가 한꺼번에 처리하고 사용 횟수는 1회예요 */
        jsonAll: function (prompts) {
          return api('/api/ai/text', { method: 'POST', json: { prompts: prompts.map(String) } }).then(function (j) { setQuota(j.quota); return j.datas || [j.data]; }).catch(aiFail);
        },
        /* 쓰는 대로 받아요 — onText(지금까지 받은 글) · 끝나면 읽은 JSON을 돌려줘요 */
        stream: function (prompt, onText) {
          return api('/api/ai/text', { method: 'POST', json: { prompt: String(prompt), stream: true } }).then(function (r) {
            if (!r || !r.body || typeof r.body.getReader !== 'function') { setQuota(r && r.quota); return r && r.data; }
            try { setQuota(JSON.parse(r.headers.get('x-quota') || 'null')); } catch (_) {}
            var rd = r.body.getReader(), dec = new TextDecoder(), all = '';
            var step = function () { return rd.read().then(function (x) { if (x.done) return; all += dec.decode(x.value, { stream: true }); try { if (onText) onText(all); } catch (_) {} return step(); }); };
            return step().then(function () { return looseJson(all); });
          }).catch(aiFail);
        },
      });
    };
  }
  /* AI를 쓸 수 없을 때: 왜 안 되는지 알려 주고(가입 · 유료 · 준비 중) 갈 곳을 안내해요 */
  var blockedAt = 0;
  function loginUrl() { return '/login?next=' + encodeURIComponent('/studio'); }

  /* 손님(로그인 안 됨)이면 작품 목록 위에 알려 줘요 — 캐시를 지우면 로그인도 풀려서 작품이 없어진 것처럼 보이기 때문 */
  function guestBanner() {
    if (!guest || document.getElementById('wbGuest')) return;
    var list = document.getElementById('hList'); if (!list) return;
    var d = document.createElement('div');
    d.id = 'wbGuest';
    d.setAttribute('role', 'status');
    d.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:0 0 14px;padding:14px 16px;border-radius:12px;border:1px solid #f0c36d;background:#fff7e0;color:#5a4300;font-size:13.5px;line-height:1.5';
    d.innerHTML = '<span style="flex:1 1 220px"><b style="display:block;font-size:14.5px;margin-bottom:2px">로그인하지 않은 상태예요 · 지금은 이 브라우저에만 저장돼요</b>로그인하면 작품이 내 계정에 저장돼 다른 기기에서도 이어서 작업할 수 있고, AI 이미지 10장을 무료로 받아요. 지금 만든 작품도 그대로 올라가요. 이미 가입했다면 저장해 둔 작품을 바로 불러와요.</span><a href="' + loginUrl() + '" style="flex:none;display:inline-flex;align-items:center;height:38px;padding:0 18px;border-radius:999px;background:#1db954;color:#fff;font-weight:800;text-decoration:none">로그인하고 저장하기</a>';
    list.parentNode.insertBefore(d, list);
  }
  /* 손님으로 열면 한 번(탭을 닫을 때까지) 알려 줘요 — 이미 가입한 사람이 캐시를 지운 뒤 작품이 사라졌다고 놀라지 않게 */
  function guestAsk() {
    if (!guest) return;
    try { if (sessionStorage.getItem('wb-guest-asked')) return; sessionStorage.setItem('wb-guest-asked', '1'); } catch (_) {}
    if (typeof confirmBox !== 'function') return;
    confirmBox({ title: '로그인하면 작품이 저장돼요', body: '지금은 손님으로 둘러보는 중이라 작품이 <b>이 브라우저에만</b> 저장돼요. 캐시를 지우면 사라질 수 있어요.<br>로그인하면 내 계정에 저장되고 <b>AI 이미지 10장</b>을 무료로 받아요. 지금 만든 작품도 그대로 올라가요.<br>이미 가입했다면 저장해 둔 작품을 바로 불러와요.', ok: '로그인하고 저장하기', danger: false, cancel: '먼저 둘러볼게요' })
      .then(function (y) { if (y) location.href = loginUrl(); });
  }
  function guestStart() { guestBanner(); setTimeout(guestAsk, 900); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', guestStart); else guestStart();
  function aiBlocked() {
    if (Date.now() - blockedAt < 2500 || document.getElementById('mConfirm')) return;
    blockedAt = Date.now();
    var need = boot.aiNeed;
    if (need === 'login' || need === 'setup') {
      if (typeof confirmBox !== 'function') { location.href = loginUrl(); return; }
      confirmBox({ title: 'AI는 로그인을 해야 이용할 수 있어요', body: '편집기는 로그인 없이 그대로 쓸 수 있어요. AI 기획 · 콘티 · 이미지는 로그인하면 열려요. 지금까지 만든 작품은 로그인한 뒤에도 그대로 이어져요.', ok: '로그인하러 가기', danger: false }).then(function (y) { if (y) location.href = loginUrl(); });
    } else if (need === 'pro') {
      if (typeof paywall === 'function') paywall('txt'); else say('AI는 유료 회원만 쓸 수 있어요');
    } else say('AI 키가 서버에 없어요 · 관리자: ANTHROPIC_API_KEY를 넣고 다시 배포해 주세요');
  }
  var noKeyAt = 0;
  function noImageKey() { if (Date.now() - noKeyAt < 8000) return; noKeyAt = Date.now(); say('이미지 AI 키가 서버에 없어서 예시 그림을 넣었어요 · 관리자: GEMINI_API_KEY를 넣고 다시 배포해 주세요'); }
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
  /* AI 그림은 PNG로 와서 한 장이 몇 MB예요 — 화질은 그대로 두고 WebP(안 되면 JPEG)로 바꿔 저장 · 올리기를 가볍게 해요 */
  function slim(b) {
    if (!b || b.size < 900 * 1024 || typeof createImageBitmap !== 'function') return b;
    return createImageBitmap(b).then(function (bm) {
      var c = document.createElement('canvas'); c.width = bm.width; c.height = bm.height; c.getContext('2d').drawImage(bm, 0, 0);
      return new Promise(function (res) { c.toBlob(function (w) { if (w && w.type === 'image/webp' && w.size < b.size) return res(w); c.toBlob(function (j) { res(j && j.size < b.size ? j : b); }, 'image/jpeg', 0.92); }, 'image/webp', 0.92); });
    }).catch(function () { return b; });
  }
  function image(prompt, W, H, refKeys) {
    var map = (typeof blobs !== 'undefined' && blobs) || new Map();
    var refs = (refKeys || []).filter(function (k, i, a) { return k && a.indexOf(k) === i && map.has(k); }).slice(0, 3);
    var model = '', res = '';
    try { var am = S.settings.aiModel || '나노바나나 2.1'; model = am.indexOf('GPT') >= 0 ? 'gpt' : am.indexOf('Pro') >= 0 ? 'pro' : ''; res = S.settings.sbRes === undefined ? '1K' : (S.settings.sbRes || ''); } catch (_) {}
    return Promise.all(refs.map(function (k) { return shrink(map.get(k)).catch(function () { return null; }); })).then(function (R) {
      return fetch('/api/ai/image', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: prompt, width: Math.round(W), height: Math.round(H), model: model, res: res, refs: R.filter(Boolean) }) });
    }).then(function (r) {
      var q = r.headers.get('x-wb-quota'); if (q) try { setQuota(JSON.parse(q)); } catch (_) {}
      if (r.ok && (r.headers.get('content-type') || '').indexOf('image/') === 0) return r.blob().then(slim);
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
      if (!boot.user) { USER = null; if (typeof renderAcct === 'function') renderAcct(); return; }
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

  /* ---------- 연재하기 — 팝업에서 작품 · 작가 · 스토리 · 연재 이미지를 모두 채워야 올라가요
   * 이미지는 네이버 · WEBTOON 양식: 정사각형 대표 1080×1080 · 세로 대표 1080×1920 · 회차 썸네일 202×90(2배 404×180로 저장)
   * 연재관과는 /read/api/* 로만 이야기해요 (연재관을 다른 사이트로 떼어 내도 그대로 쓰게) */
  var READ_API = '/read/api/';
  var ART = { sq: { w: 1080, h: 1080, l: '정사각형 대표 이미지', d: '1080×1080 · 목록 · 검색에 보여요' }, vt: { w: 1080, h: 1920, l: '세로 대표 이미지', d: '1080×1920 · 작품 페이지 · 추천 칸에 보여요' }, ep: { w: 404, h: 180, l: '회차 썸네일', d: '202×90 비율 · 회차 목록에 보여요' } };
  function pubCuts(e) { return (e.cuts || []).filter(function (c) { return c.kind !== 'blank' || (c.items && c.items.length); }); }
  function escH(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); }
  /** 그림(캔버스 · 이미지)을 W×H에 꽉 차게 가운데 자르기 → JPEG */
  function fitArt(src, W, H, top) {
    var sw = src.naturalWidth || src.width, sh = src.naturalHeight || src.height;
    var s = Math.max(W / sw, H / sh), dw = sw * s, dh = sh * s;
    var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    var x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    x.drawImage(src, (W - dw) / 2, top ? 0 : (H - dh) / 2, dw, dh);
    return new Promise(function (r) { cv.toBlob(r, 'image/jpeg', 0.88); });
  }
  function blobImg(b) { return new Promise(function (ok, no) { var u = URL.createObjectURL(b), im = new Image(); im.onload = function () { ok(im); }; im.onerror = no; im.src = u; }); }
  function pubCss() {
    if (document.getElementById('wbPubCss')) return;
    var st = document.createElement('style'); st.id = 'wbPubCss';
    st.textContent = '.pubsheet{width:min(760px,100%)}.pubsheet h4{margin:20px 0 8px;font-size:14px;font-weight:800;display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 8px}.pubsheet h4 small{font-weight:500;color:var(--muted);font-size:12px}'
      + '.pubsheet .pf{display:grid;grid-template-columns:110px 1fr;gap:6px 12px;align-items:start;margin:8px 0;font-size:13px}.pubsheet .pf>span{color:var(--muted);padding-top:9px;font-weight:600}.pubsheet .pf>span b{color:var(--danger,#e5484d);margin-left:2px}'
      + '.pubsheet input[type=text],.pubsheet input[type=datetime-local],.pubsheet select,.pubsheet textarea{width:100%;min-height:36px;border:1px solid transparent;border-radius:6px;background:var(--panel2);padding:7px 10px;font:inherit;font-size:13px;color:var(--ink)}.pubsheet textarea{min-height:76px;resize:vertical;line-height:1.55}'
      + '.pubsheet .bad input,.pubsheet .bad textarea,.pubsheet .bad select,.pubsheet .bad .artbox{border-color:var(--danger,#e5484d)!important}.pubsheet .cnt{font-size:11.5px;color:var(--muted);margin-top:3px}.pubsheet .cnt.ok{color:#13863c}'
      + '.pubsheet .pseg{display:flex;flex-wrap:wrap;gap:6px}.pubsheet .pseg label{display:inline-flex;align-items:center;gap:5px;padding:6px 10px;border-radius:999px;background:var(--panel2);cursor:pointer;font-size:12.5px}.pubsheet .pseg label:has(input:checked){background:color-mix(in srgb,var(--accent) 16%,var(--panel));color:#13863c;font-weight:700}'
      + '.pubsheet .pas{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start}.pubsheet .pa{display:flex;flex-direction:column;gap:6px;min-width:0;text-align:left}.pubsheet .pa-sq{width:170px}.pubsheet .pa-vt{width:110px}.pubsheet .pa-ep{width:300px;max-width:100%}.pubsheet .pa b{font-size:12.5px}.pubsheet .pa b i{color:var(--danger,#e5484d);font-style:normal}.pubsheet .pa small{color:var(--muted);font-size:11px;line-height:1.4}'
      + '.pubsheet .pabox{position:relative;width:100%;box-sizing:border-box;border:1.5px dashed var(--line);border-radius:8px;background:var(--panel2) center/cover no-repeat;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px;overflow:hidden}.pubsheet .pabox.has{border-style:solid;border-color:var(--line)}'
      + '.pubsheet .pabtn{display:flex;flex-wrap:wrap;gap:4px}.pubsheet .pabtn button,.pubsheet .pabtn select{height:28px;font-size:11.5px;padding:0 8px;border-radius:6px;border:1px solid var(--line);background:var(--panel);color:var(--ink);cursor:pointer;max-width:100%}'
      + '.pubsheet .agree label{display:flex;gap:8px;align-items:flex-start;font-size:13px;margin:6px 0;cursor:pointer}.pubsheet .agree input{margin-top:3px}'
      + '.pubsheet .pfoot{position:sticky;bottom:-24px;background:var(--panel);margin:18px -24px -24px;padding:12px 24px 16px;border-top:1px solid var(--line);display:flex;align-items:center;gap:8px;flex-wrap:wrap}.pubsheet .pfoot .left{flex:1;min-width:160px;font-size:12.5px;color:var(--muted)}.pubsheet .pfoot .left b{color:var(--danger,#e5484d)}'
      + '.pick .pkgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;max-height:56vh;overflow:auto;padding:2px}.pick .pkgrid button{position:relative;border:2px solid transparent;border-radius:8px;padding:0;background:#000;cursor:pointer;aspect-ratio:3/4;overflow:hidden}.pick .pkgrid button:hover{border-color:var(--accent)}.pick .pkgrid img,.pick .pkgrid canvas{width:100%;height:100%;object-fit:cover;display:block}.pick .pkgrid span{position:absolute;left:4px;bottom:4px;font-size:11px;font-weight:800;background:rgba(0,0,0,.7);color:#fff;padding:2px 5px;border-radius:4px}'
      + '@media (max-width:640px){.pubsheet .pf{grid-template-columns:1fr}.pubsheet .pf>span{padding-top:0}.pubsheet .pa-ep{width:100%}}';
    document.head.appendChild(st);
  }

  function publish() {
    var e = null; try { e = ep(); } catch (_) {}
    if (guest) { if (typeof confirmBox === 'function') confirmBox({ title: '연재는 회원만 할 수 있어요', body: '무료로 가입하면 이 회차를 연재관에 바로 올릴 수 있어요. 지금까지 만든 작품은 그대로 이어져요.', ok: '가입 · 로그인', danger: false }).then(function (y) { if (y) location.href = '/login?next=/studio'; }); return; }
    if (!e || e.kind === 'cover') { say('연재할 회차를 열어 주세요'); return; }
    var cuts = pubCuts(e);
    if (!cuts.length) { say('이 회차에는 올릴 컷이 없어요'); return; }
    api(READ_API + 'mine').then(function (cfg) { pubForm(e, cuts, cfg); }).catch(function (err) { say((err && err.message) || '연재관에 연결하지 못했어요 · 잠시 뒤 다시 해 주세요'); });
  }

  function pubForm(e, cuts, cfg) {
    pubCss();
    var P = {}; try { P = plan() || {}; } catch (_) {}
    var st = (typeof S !== 'undefined' && S.settings) || {};
    var series = cfg.series || [];
    var cover = (typeof S !== 'undefined' && S.episodes || []).filter(function (x) { return x.kind === 'cover'; })[0];
    var coverCuts = cover ? pubCuts(cover) : [];
    var F = {
      target: series[0] ? series[0].id : 'new',
      title: st.workTitle || '', author: cfg.penName || '', genre: (cfg.genres || []).indexOf(P.genre) >= 0 ? P.genre : '', age: '', desc: P.logline || '',
      epTitle: e.title && !/^\d+화$/.test(e.title) && e.title !== '새 회차' ? e.title : '', note: '',
      apply: false, days: [], when: 'now', at: '', ai: cuts.some(function (c) { return c.sb && c.sb.aiModel; }) ? 'yes' : '',
      art: { sq: null, vt: null, ep: null }, agree: [false, false, false],
    };
    var tried = false;
    var m = document.createElement('div'); m.className = 'modal'; m.id = 'mPub';
    document.body.appendChild(m);
    var close = function () { Object.keys(F.art).forEach(function (k) { if (F.art[k] && F.art[k].url) URL.revokeObjectURL(F.art[k].url); }); m.remove(); };
    function cur() { return series.filter(function (s) { return s.id === F.target; })[0]; }
    function isNew() { return F.target === 'new'; }
    function needCover() { return isNew() || !(cur() && cur().hasCover); }
    function missing() {
      var out = [];
      if (isNew()) {
        if (!F.title.trim()) out.push(['title', '작품 제목']);
        if (!F.author.trim()) out.push(['author', '필명']);
        if (!F.genre) out.push(['genre', '장르']);
        if (!F.age) out.push(['age', '이용 연령']);
        if (F.desc.trim().length < 20) out.push(['desc', '작품 소개 20자 이상']);
        if (F.apply && !F.days.length) out.push(['days', '연재 요일']);
      }
      if (needCover()) { if (!F.art.sq) out.push(['sq', '정사각형 대표 이미지']); if (!F.art.vt) out.push(['vt', '세로 대표 이미지']); }
      if (!F.art.ep) out.push(['ep', '회차 썸네일']);
      if (!F.epTitle.trim()) out.push(['epTitle', '회차 제목']);
      if (F.note.trim().length < 10) out.push(['note', '작가의 말 10자 이상']);
      if (!F.ai) out.push(['ai', 'AI 활용 표시']);
      if (F.when === 'later' && !F.at) out.push(['at', '공개 일시']);
      if (!F.agree.every(Boolean)) out.push(['agree', '확인 3가지']);
      return out;
    }
    function artBox(k) {
      var a = ART[k], has = F.art[k], ratio = a.w / a.h;
      return '<div class="pa pa-' + k + '" data-f="' + k + '"><b>' + a.l + ' <i>*</i></b>'
        + '<div class="pabox' + (has ? ' has' : '') + '" style="aspect-ratio:' + ratio + ';' + (has ? 'background-image:url(' + has.url + ')' : '') + '">' + (has ? '' : '비어 있어요') + '</div>'
        + '<div class="pabtn"><button type="button" data-pa="pick" data-k="' + k + '">컷 · 라이브러리</button><button type="button" data-pa="file" data-k="' + k + '">파일</button><button type="button" data-pa="ai" data-k="' + k + '" title="AI 그림 1장을 써요">AI로 만들기</button></div>'
        + '<small>' + a.d + '</small></div>';
    }
    function fld(key, label, inner, req) { return '<div class="pf" data-f="' + key + '"><span>' + label + (req === false ? '' : '<b>*</b>') + '</span><div>' + inner + '</div></div>'; }
    function render() {
      var miss = missing(), bad = {}; miss.forEach(function (x) { bad[x[0]] = 1; });
      var sOpts = '<option value="new"' + (isNew() ? ' selected' : '') + '>＋ 새 작품으로 시작 (1화)</option>' + series.map(function (s) { return '<option value="' + escH(s.id) + '"' + (s.id === F.target ? ' selected' : '') + '>' + escH(s.title) + ' · ' + (s.episodes + 1) + '화로 이어서</option>'; }).join('');
      var h = '<div class="sheet pubsheet" role="dialog" aria-modal="true" aria-labelledby="pubT"><h3 id="pubT">연재하기</h3>'
        + '<p class="sub">' + escH(st.workTitle || '') + ' ' + (e.num ? e.num + '화' : '') + ' · 컷 ' + cuts.length + '개 · <b>*</b> 표시는 모두 채워야 올라가요. 독자가 처음 보는 정보라 꼼꼼히 적어 주세요.</p>'
        + fld('target', '올릴 작품', '<select data-in="target">' + sOpts + '</select>');
      if (isNew()) {
        h += '<h4>작가 · 작품 <small>작품 페이지 맨 위에 보여요</small></h4>'
          + fld('title', '작품 제목', '<input type="text" data-in="title" maxlength="40" value="' + escH(F.title) + '" placeholder="예) 우산 같이 쓸래요">')
          + fld('author', '필명', '<input type="text" data-in="author" maxlength="20" value="' + escH(F.author) + '" placeholder="글/그림 작가 이름">')
          + fld('genre', '장르', '<select data-in="genre"><option value="">고르세요</option>' + (cfg.genres || []).map(function (g) { return '<option' + (g === F.genre ? ' selected' : '') + '>' + escH(g) + '</option>'; }).join('') + '</select>')
          + fld('age', '이용 연령', '<div class="pseg">' + (cfg.ages || []).map(function (a) { return '<label><input type="radio" name="pAge" data-in="age" value="' + a[0] + '"' + (F.age === a[0] ? ' checked' : '') + '>' + escH(a[1]) + (a[0] === 'all' ? '' : ' 이상') + '</label>'; }).join('') + '</div>')
          + fld('desc', '작품 소개', '<textarea data-in="desc" maxlength="300" placeholder="어떤 이야기인지 2~3문장으로 · 주인공 · 갈등 · 분위기">' + escH(F.desc) + '</textarea><div class="cnt' + (F.desc.trim().length >= 20 ? ' ok' : '') + '" data-cnt="desc">' + F.desc.trim().length + ' / 300자 · 20자 이상</div>');
      }
      h += '<h4>연재 이미지 <small>네이버 웹툰 · WEBTOON 양식 · 파일 · 컷 · AI 중 골라 넣으면 크기에 맞게 잘라 줘요</small></h4><div class="pas">'
        + (needCover() ? artBox('sq') + artBox('vt') : '') + artBox('ep') + '</div>'
        + (needCover() || isNew() ? '' : '<p class="sub" style="margin:6px 0 0">작품 대표 이미지는 이미 있어요 · 회차 썸네일만 넣으면 돼요</p>');
      h += '<h4>이번 회차</h4>'
        + fld('epTitle', '회차 제목', '<input type="text" data-in="epTitle" maxlength="60" value="' + escH(F.epTitle) + '" placeholder="예) 붉은 등 아래">')
        + fld('note', '작가의 말', '<textarea data-in="note" maxlength="500" placeholder="회차 끝에 보여요 · 이번 화 이야기, 다음 화 예고, 독자에게 한마디">' + escH(F.note) + '</textarea><div class="cnt' + (F.note.trim().length >= 10 ? ' ok' : '') + '" data-cnt="note">' + F.note.trim().length + ' / 500자 · 10자 이상</div>');
      h += '<h4>공개 설정</h4>';
      if (isNew()) {
        h += fld('apply', '연재 방식', '<div class="pseg"><label><input type="radio" name="pMode" data-in="apply" value="0"' + (!F.apply ? ' checked' : '') + '>자유연재 · 바로 공개</label><label><input type="radio" name="pMode" data-in="apply" value="1"' + (F.apply ? ' checked' : '') + '>요일연재 검토 신청</label></div>')
          + (F.apply ? fld('days', '연재 요일', '<div class="pseg">' + (cfg.days || []).map(function (d) { return '<label><input type="checkbox" data-in="days" value="' + d[0] + '"' + (F.days.indexOf(d[0]) >= 0 ? ' checked' : '') + '>' + d[1] + '</label>'; }).join('') + '</div>') : '');
      }
      h += fld('when', '공개 시점', '<div class="pseg"><label><input type="radio" name="pWhen" data-in="when" value="now"' + (F.when === 'now' ? ' checked' : '') + '>지금 바로</label><label><input type="radio" name="pWhen" data-in="when" value="later"' + (F.when === 'later' ? ' checked' : '') + '>예약</label></div>' + (F.when === 'later' ? '<input type="datetime-local" data-in="at" value="' + escH(F.at) + '" style="margin-top:6px;max-width:260px">' : ''), false)
        + fld('ai', 'AI 활용 표시', '<div class="pseg"><label><input type="radio" name="pAi" data-in="ai" value="yes"' + (F.ai === 'yes' ? ' checked' : '') + '>AI 그림 · 글을 썼어요</label><label><input type="radio" name="pAi" data-in="ai" value="no"' + (F.ai === 'no' ? ' checked' : '') + '>직접 그렸어요</label></div>');
      h += '<h4>올리기 전 확인 <b style="color:var(--danger,#e5484d)">*</b></h4><div class="agree" data-f="agree">'
        + ['제가 만들었거나 쓸 권리가 있는 그림과 글만 올려요.', '선정적 · 폭력적인 내용은 이용 연령에 맞게 표시했어요.', '운영정책을 어기면 신고를 받아 숨김 처리될 수 있다는 걸 알아요. <a href="/read/policy" target="_blank" style="text-decoration:underline">운영정책</a>'].map(function (t, i) { return '<label><input type="checkbox" data-in="agree" value="' + i + '"' + (F.agree[i] ? ' checked' : '') + '><span>' + t + '</span></label>'; }).join('') + '</div>';
      h += '<div class="pfoot"><div class="left">' + (miss.length ? '남은 항목 <b>' + miss.length + '개</b> · ' + miss.slice(0, 4).map(function (x) { return x[1]; }).join(' · ') + (miss.length > 4 ? ' …' : '') : '모두 채웠어요 · 올릴 준비 끝') + '</div>'
        + '<button class="btn" data-pa="cancel">취소</button><button class="btn pri" data-pa="go"' + (miss.length ? ' aria-disabled="true" style="opacity:.55"' : '') + '>' + (F.when === 'later' ? '예약하기' : '연재하기') + '</button></div></div>';
      var sc = m.firstChild ? m.firstChild.scrollTop : 0;
      m.innerHTML = h;
      if (m.firstChild) m.firstChild.scrollTop = sc;
      if (tried) miss.forEach(function (x) { m.querySelectorAll('[data-f="' + x[0] + '"]').forEach(function (n) { n.classList.add('bad'); }); });
    }
    function setArt(k, blob) {
      if (!blob) return;
      if (F.art[k] && F.art[k].url) URL.revokeObjectURL(F.art[k].url);
      F.art[k] = { blob: blob, url: URL.createObjectURL(blob) }; render();
    }
    function fromCut(k, v) {
      var c = v.charAt(0) === 'c' ? coverCuts[+v.slice(1)] : cuts[+v];
      if (!c) return;
      say('컷을 맞춰 자르는 중');
      renderCut(c, 1080, null, false).then(function (cv) { return fitArt(cv, ART[k].w, ART[k].h, k !== 'ep'); }).then(function (b) { setArt(k, b); }).catch(function () { say('컷을 가져오지 못했어요'); });
    }
    function libKeys() {
      var L = []; try { L = (S.settings.lib || []).slice().reverse(); } catch (_) {}
      return L.map(function (x) { return x.k; }).filter(function (k) { return k && blobs.has(k); });
    }
    function fromKey(k, key) {
      var b = blobs.get(key); if (!b) return;
      blobImg(b).then(function (im) { return fitArt(im, ART[k].w, ART[k].h, k !== 'ep'); }).then(function (o) { setArt(k, o); }).catch(function () { say('그림을 열지 못했어요'); });
    }
    function pick(k) {
      var tabs = [['cut', '이번 회차 컷', cuts.length], ['cover', '표지 · 썸네일', coverCuts.length], ['lib', '라이브러리', libKeys().length]];
      var tab = tabs.filter(function (t) { return t[2]; })[0]; tab = tab ? tab[0] : 'cut';
      var ov = document.createElement('div'); ov.className = 'modal'; ov.style.zIndex = 80;
      document.body.appendChild(ov);
      var urls = [];
      var shut = function () { urls.forEach(function (u) { URL.revokeObjectURL(u); }); ov.remove(); };
      function draw() {
        urls.forEach(function (u) { URL.revokeObjectURL(u); }); urls = [];
        var h = '<div class="sheet pubsheet pick" role="dialog" aria-modal="true" aria-label="' + ART[k].l + ' 고르기"><h3>' + ART[k].l + ' 고르기</h3><p class="sub">고른 그림을 ' + ART[k].d.split(' · ')[0] + ' 크기에 맞게 가운데를 잘라 넣어요</p>'
          + '<div class="pseg" style="margin-bottom:12px">' + tabs.map(function (t) { return '<label><input type="radio" name="pkT" data-pt="' + t[0] + '"' + (t[0] === tab ? ' checked' : '') + '>' + t[1] + ' ' + t[2] + '</label>'; }).join('') + '</div><div class="pkgrid">';
        if (tab === 'lib') {
          var ks = libKeys();
          if (!ks.length) h += '<p class="sub">라이브러리에 그림이 없어요 · 왼쪽 「라이브러리」에 그림을 올려 두면 여기서 골라요</p>';
          ks.forEach(function (key) { var u = URL.createObjectURL(blobs.get(key)); urls.push(u); h += '<button type="button" data-pk="lib" data-v="' + escH(key) + '"><img src="' + u + '" alt=""></button>'; });
        } else {
          var L = tab === 'cover' ? coverCuts : cuts;
          if (!L.length) h += '<p class="sub">' + (tab === 'cover' ? '표지 · 썸네일 회차에 만든 그림이 없어요' : '컷이 없어요') + '</p>';
          L.forEach(function (c, i) { h += '<button type="button" data-pk="' + tab + '" data-v="' + i + '"><canvas data-ci="' + i + '"></canvas><span>' + (i + 1) + '</span></button>'; });
        }
        h += '</div><div class="pfoot"><div class="left"></div><button class="btn" data-pk="x">닫기</button></div></div>';
        ov.innerHTML = h;
        if (tab !== 'lib') {
          var L2 = tab === 'cover' ? coverCuts : cuts;
          Array.prototype.forEach.call(ov.querySelectorAll('canvas[data-ci]'), function (cv) {
            renderCut(L2[+cv.dataset.ci], 240, null, true).then(function (r) { cv.width = r.width; cv.height = r.height; cv.getContext('2d').drawImage(r, 0, 0); }).catch(function () {});
          });
        }
      }
      ov.addEventListener('change', function (ev) { var t = ev.target; if (t.dataset && t.dataset.pt) { tab = t.dataset.pt; draw(); } });
      ov.addEventListener('click', function (ev) {
        if (ev.target === ov) { shut(); return; }
        var b = ev.target.closest('[data-pk]'); if (!b) return;
        var w = b.dataset.pk, v = b.dataset.v;
        shut();
        if (w === 'x') return;
        if (w === 'lib') fromKey(k, v); else fromCut(k, w === 'cover' ? 'c' + v : v);
      });
      ov.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); shut(); } });
      draw();
    }
    function fromFile(k) {
      var i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*';
      i.onchange = function () { var f = i.files && i.files[0]; if (!f) return; blobImg(f).then(function (im) { return fitArt(im, ART[k].w, ART[k].h, false); }).then(function (b) { setArt(k, b); }).catch(function () { say('그림 파일을 열지 못했어요'); }); };
      i.click();
    }
    function fromAi(k) {
      var title = (isNew() ? F.title : (cur() && cur().title)) || st.workTitle || '';
      var chars = (st.sbCharList || []).filter(function (ch) { return ch.name; }).slice(0, 3);
      // 참고 그림: 이번 회차에 실제로 그린 컷(그림체 · 얼굴 · 옷) → 캐릭터 시트 → 그림체 참고 순서로 3장까지
      var cutKeys = [];
      cuts.concat(coverCuts).forEach(function (c) {
        [c.blob, c.sb && c.sb.img].concat((c.items || []).map(function (it) { return it.blob; })).forEach(function (key) { if (key && blobs.has(key) && cutKeys.indexOf(key) < 0 && blobs.get(key).type !== 'image/gif') cutKeys.push(key); });
      });
      var charKeys = chars.map(function (ch) { return (ch.refs || [])[0]; }).filter(function (key) { return key && blobs.has(key); });
      var styleKeys = (st.sbStyleRefs || []).filter(function (key) { return blobs.has(key); });
      var pickCuts = cutKeys.length > 2 ? [cutKeys[0], cutKeys[Math.floor(cutKeys.length / 2)]] : cutKeys;
      var refs = [pickCuts[0], charKeys[0], pickCuts[1], charKeys[1], styleKeys[0]].filter(Boolean).filter(function (key, i, A) { return A.indexOf(key) === i; }).slice(0, 3);
      var what = k === 'ep' ? 'Episode thumbnail for "' + (F.epTitle || e.title || '') + '": one striking moment from this episode, wide banner composition.' + (e.syn ? ' Episode summary: ' + e.syn : '')
        : 'Cover art for a Korean webtoon series' + (title ? ' titled "' + title + '"' : '') + '. ' + (k === 'vt' ? 'Tall vertical poster composition, main character(s) large and centered, room at the top.' : 'Square key visual, main character(s) close-up, eye-catching.');
      var prompt = what + ' Story: ' + (F.desc || P.logline || '') + (chars.length ? ' Main characters: ' + chars.map(function (ch) { return ch.name + (ch.desc ? ' (' + ch.desc + ')' : ''); }).join(', ') + '.' : '') + ' Genre: ' + (F.genre || P.genre || '') + '. Art style: ' + style() + '.' + (refs.length ? ' IMPORTANT: the attached images are panels and character sheets from this same webtoon. Match them exactly — same drawing style, line work, coloring, faces, hair, costumes and color palette. The characters must look like the same people.' : '') + ' Do not draw any text, letters, logos or speech bubbles.';
      var btn = m.querySelector('[data-pa=ai][data-k=' + k + ']'); if (btn) { btn.disabled = true; btn.textContent = '그리는 중…'; }
      image(prompt, ART[k].w, ART[k].h, refs).then(function (b) {
        if (!b) { render(); return; }
        return blobImg(b).then(function (im) { return fitArt(im, ART[k].w, ART[k].h, false); }).then(function (o) { setArt(k, o); say('AI로 만들었어요 · 마음에 안 들면 다시 눌러 주세요'); });
      });
    }
    m.addEventListener('input', function (ev) {
      var t = ev.target, k = t.dataset && t.dataset.in; if (!k) return;
      if (k === 'title' || k === 'author' || k === 'desc' || k === 'epTitle' || k === 'note' || k === 'at') {
        F[k] = t.value;
        var cn = m.querySelector('[data-cnt="' + k + '"]');
        if (cn) { var L = t.value.trim().length, need = k === 'desc' ? 20 : 10; cn.textContent = L + ' / ' + (k === 'desc' ? 300 : 500) + '자 · ' + need + '자 이상'; cn.classList.toggle('ok', L >= need); }
        var left = m.querySelector('.pfoot .left'), miss = missing();
        if (left) left.innerHTML = miss.length ? '남은 항목 <b>' + miss.length + '개</b> · ' + miss.slice(0, 4).map(function (x) { return x[1]; }).join(' · ') + (miss.length > 4 ? ' …' : '') : '모두 채웠어요 · 올릴 준비 끝';
        var go = m.querySelector('[data-pa=go]'); if (go) { if (miss.length) { go.setAttribute('aria-disabled', 'true'); go.style.opacity = '.55'; } else { go.removeAttribute('aria-disabled'); go.style.opacity = ''; } }
        var box = t.closest('.pf'); if (box && tried) box.classList.toggle('bad', miss.some(function (x) { return x[0] === k; }));
      }
    });
    m.addEventListener('change', function (ev) {
      var t = ev.target, k = t.dataset && t.dataset.in;
      if (t.dataset && t.dataset.pa === 'cut') { if (t.value) fromCut(t.dataset.k, t.value); return; }
      if (!k) return;
      if (k === 'target') F.target = t.value;
      else if (k === 'genre') F.genre = t.value;
      else if (k === 'age') F.age = t.value;
      else if (k === 'apply') F.apply = t.value === '1';
      else if (k === 'days') F.days = Array.prototype.map.call(m.querySelectorAll('[data-in=days]:checked'), function (x) { return x.value; });
      else if (k === 'when') F.when = t.value;
      else if (k === 'ai') F.ai = t.value;
      else if (k === 'agree') F.agree[+t.value] = t.checked;
      else return;
      render();
    });
    m.addEventListener('click', function (ev) {
      if (ev.target === m) return; // 바깥을 눌러도 닫지 않아요 (적은 내용을 지키려고)
      var b = ev.target.closest('[data-pa]'); if (!b || b.tagName === 'SELECT') return;
      var a = b.dataset.pa;
      if (a === 'cancel') { close(); return; }
      if (a === 'file') { fromFile(b.dataset.k); return; }
      if (a === 'pick') { pick(b.dataset.k); return; }
      if (a === 'ai') { fromAi(b.dataset.k); return; }
      if (a === 'go') {
        var miss = missing();
        if (miss.length) { tried = true; render(); var first = m.querySelector('.bad'); if (first) first.scrollIntoView({ block: 'center', behavior: 'smooth' }); say('아직 채울 게 있어요 · ' + miss[0][1]); return; }
        var form = JSON.parse(JSON.stringify({ target: F.target, title: F.title, author: F.author, genre: F.genre, age: F.age, desc: F.desc, epTitle: F.epTitle, note: F.note, apply: F.apply, days: F.days, when: F.when, at: F.at, ai: F.ai }));
        var art = {}; Object.keys(F.art).forEach(function (k) { if (F.art[k]) art[k] = F.art[k].blob; });
        m.remove();
        doPublish(e, cuts, form, art);
      }
    });
    m.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') { ev.stopPropagation(); if (window.confirm('적은 내용이 사라져요. 닫을까요?')) close(); } });
    render();
  }

  function doPublish(e, cuts, form, art) {
    var P = {}; try { P = plan() || {}; } catch (_) {}
    var W = 690, outs = [];
    try { prog('연재 규격으로 만드는 중'); } catch (_) {}
    var step = Promise.resolve();
    cuts.forEach(function (c, i) {
      step = step.then(function () {
        if (typeof cancelFlag !== 'undefined' && cancelFlag) throw { code: 'cancel' };
        try { progSet(i / cuts.length * 0.5, (i + 1) + ' / ' + cuts.length + ' 컷 만드는 중'); } catch (_) {}
        if (c.kind === 'gif') { var g = blobs.get(c.blob); if (g) outs.push({ blob: g, w: W, h: Math.round((dims(c).H0 || W) * W / (dims(c).W0 || W)) }); return; }
        return renderCut(c, W, null, false).then(function (cv) {
          var o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height;
          var x = o.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, o.width, o.height); x.drawImage(cv, 0, 0);
          return new Promise(function (r) { o.toBlob(r, 'image/jpeg', 0.9); }).then(function (b) { if (b) outs.push({ blob: b, w: o.width, h: o.height }); });
        });
      });
    });
    var draft;
    step.then(function () {
      try { progSet(0.5, '연재관에 자리 만드는 중'); } catch (_) {}
      return api(READ_API + 'drafts', { method: 'POST', json: {
        ai: form.ai === 'yes',
        art: { sq: !!art.sq, vt: !!art.vt, ep: !!art.ep },
        source: { project: (typeof WID !== 'undefined' && WID) || '', workTitle: (S.settings && S.settings.workTitle) || '', logline: P.logline || '', genre: P.genre || '', ep: { num: e.num, title: e.title || '', syn: e.syn || '' } },
        cuts: outs.map(function (o) { return { w: o.w, h: o.h, type: o.blob.type || 'image/jpeg', bytes: o.blob.size }; }),
      } });
    }).then(function (j) {
      draft = j; var q = Promise.resolve();
      var put = function (u, blob) {
        return fetch(u.url, { method: u.method, headers: { 'content-type': blob.type || 'image/jpeg', 'x-upsert': 'true' }, body: blob, credentials: u.method === 'POST' ? 'same-origin' : 'omit' })
          .then(function (r) { if (!r.ok) throw { code: 'upload', message: '그림을 올리지 못했어요 (' + r.status + ')' }; });
      };
      Object.keys(j.art || {}).forEach(function (k) { if (art[k]) q = q.then(function () { return put(j.art[k], art[k]); }); });
      outs.forEach(function (o, i) {
        q = q.then(function () {
          try { progSet(0.5 + (i + 1) / outs.length * 0.45, (i + 1) + ' / ' + outs.length + ' 컷 올리는 중'); } catch (_) {}
          return put(j.uploads[i], o.blob);
        });
      });
      return q;
    }).then(function () {
      return api(READ_API + 'drafts/' + encodeURIComponent(draft.id), { method: 'POST', json: {} });
    }).then(function () {
      try { progSet(0.97, '연재관에 올리는 중'); } catch (_) {}
      var isNew = form.target === 'new';
      return api(READ_API + 'publish', { method: 'POST', json: {
        draftId: draft.id, agree: true, ai: form.ai === 'yes', seriesId: isNew ? undefined : form.target,
        series: isNew ? { title: form.title, authorName: form.author, description: form.desc, genre: form.genre, age: form.age, days: form.days, apply: form.apply } : undefined,
        episode: { title: form.epTitle, authorNote: form.note, publishAt: form.when === 'later' && form.at ? new Date(form.at).toISOString() : null },
      } });
    }).then(function (j) {
      try { progEnd(); } catch (_) {}
      var msg = form.when === 'later' ? '예약해 두었어요' : '연재관에 올라갔어요';
      if (typeof confirmBox === 'function') confirmBox({ title: msg, body: (form.apply ? '요일연재 검토를 신청했어요. 그동안은 자유연재로 보여요. ' : '') + '다음 회차도 「연재하기」를 누르면 이어서 올라가요.', ok: '올린 회차 보기', danger: false, cancel: '닫기' }).then(function (y) { if (y) window.open(j.url, '_blank'); });
      else say(msg);
    }).catch(function (err) {
      try { progEnd(); } catch (_) {}
      if (err && err.code === 'cancel') { say('취소했어요'); return; }
      if (err && err.status === 401) { say('로그인하면 연재할 수 있어요'); return; }
      say((err && err.message) || '연재관에 올리지 못했어요 · 잠시 뒤 다시 해 주세요');
      console.warn('[바로웹툰] publish', err);
    });
  }

  window.__WBX = boot.ai.image ? '' : undefined;
  window.__WB = {
    boot: boot, dbSuffix: cloud ? ':' + uid : '',
    abortAI: abortAI,
    sync: sync, pushWorks: pushWorks, deleteProject: deleteProject, putBlob: putBlob, getBlob: getBlob,
    txtAi: txtAi, imgLeft: imgLeft, image: image, refPrompt: refPrompt, sbPrompt: sbPrompt, refsFor: refsFor,
    publish: publish, aiBlocked: aiBlocked, noImageKey: noImageKey,
  };
})();
