// prototype/studio.html(아티팩트에서 다듬어 온 편집기)을 실서비스용 editor/studio.html로 바꿔요.
// 편집기 코드는 그대로 두고, 저장 · 회원 · AI가 닿는 몇 군데만 브리지(public/studio-assets/bridge.js)로 연결해요.
// 패치가 맞지 않으면(원본이 바뀌어서) 바로 멈춰서 알려 줘요.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let s = readFileSync(join(root, 'prototype/studio.html'), 'utf8');

const P = (name, from, to, count = 1) => {
  const n = typeof from === 'string' ? s.split(from).length - 1 : (s.match(from) || []).length;
  if (n !== count) throw new Error(`[studio patch] "${name}" — ${count}곳이어야 하는데 ${n}곳 찾았어요`);
  s = typeof from === 'string' ? s.split(from).join(to) : s.replace(from, to);
};

// 0) 부트 데이터 + 브리지를 편집기 스크립트보다 먼저
P('bridge 주입', '\n<script>\n', '\n<script>window.__WB_BOOT=__WB_BOOT_JSON__;</script>\n<script src="/studio-assets/bridge.js"></script>\n<script>\n');
P('제목', /<title>[^<]*<\/title>/, '<title>웹툰보드</title>');

// 1) 저장소: 회원마다 브라우저 DB를 따로 + 시작할 때 클라우드와 맞추기
P('IDB 이름', "indexedDB.open('webtoon-cut-studio',1)", "indexedDB.open('webtoon-cut-studio'+(window.__WB?__WB.dbSuffix:''),1)");
P('시작 동기화', "try{db=await idbOpen();const w=await idb('kv','readonly',s=>s.get('works'));", "try{db=await idbOpen();if(window.__WB)await __WB.sync(db);const w=await idb('kv','readonly',s=>s.get('works'));");
P('그림 올리기', "function putBlob(k,b){if(db)idb('blobs','readwrite',s=>s.put(b,k)).catch(()=>{});}", "function putBlob(k,b){if(db)idb('blobs','readwrite',s=>s.put(b,k)).catch(()=>{});if(window.__WB)__WB.putBlob(k,b);}");
P('그림 받아오기', "const b=await idb('blobs','readonly',s=>s.get(k));if(b)blobs.set(k,b);", "let b=await idb('blobs','readonly',s=>s.get(k));if(!b&&window.__WB)b=await __WB.getBlob(k,db);if(b)blobs.set(k,b);");
P('작품 목록 저장', "const worksSave=()=>db?", "const worksSave=()=>(window.__WB&&__WB.pushWorks(WI,db),0)||db?");
P('작품 삭제', "WI=WI.filter(x=>x.id!==id);await worksSave();", "WI=WI.filter(x=>x.id!==id);if(window.__WB)__WB.deleteProject(id);await worksSave();");

// 2) 회원: 테스트 모드 끄기 · 한도는 서버 기준
P('테스트 모드', 'const AI_TEST=true,', 'const AI_TEST=!window.__WB,');
P('글 한도', 'const TXT_FREE=30;', 'const TXT_FREE=window.__WB?__WB.boot.quota.text.limit:30;');
P('이미지 남은 장 수', 'AI_FREE-(st.aiUsed||0)', 'aiImgLeft(st)', 5);
P('이미지 한도', 'const AI_FREE=10;', 'const AI_FREE=window.__WB?__WB.boot.quota.image.limit:10;function aiImgLeft(st){return window.__WB?__WB.imgLeft():AI_FREE-(st.aiUsed||0);}');
P('글 남은 횟수', 'function txtAi(){aiTestReset();', 'function txtAi(){if(window.__WB)return __WB.txtAi();aiTestReset();');
P('글 사용 기록', 'function txtAiUse(n=1){', 'function txtAiUse(n=1){if(window.__WB)return;');
P('이미지 남은 장 수(토스트)', 'Math.max(0,AI_FREE-st.aiUsed)', 'Math.max(0,aiImgLeft(st))');
P('AI 오류 문구', 'const SM_ERR={', "const SM_ERR={budget_exceeded:'이번 달 AI 사용량이 많아 잠시 멈췄어요',quota_exceeded:'이번 달 글 AI를 다 썼어요',image_quota:'AI 이미지를 다 썼어요',not_configured:'AI가 아직 연결되지 않았어요',suspended:'이용이 정지된 계정이에요',upstream_error:'AI 서버가 답하지 않았어요',");

// 3) 계정 메뉴: 진짜 로그인 · 내 계정 · 관리자
P('로그아웃', "else if(a==='logout'){USER=null;", "else if(a==='account'){location.href='/account';}else if(a==='admin'){location.href='/admin';}else if(a==='logout'){if(window.__WB){location.href='/auth/signout';return;}USER=null;");
P('계정 메뉴 항목', ' <button class="tbmi" data-am="home"><i>${ic(\'book\',15)}</i><span><b>내 작품</b></span></button>', ' <button class="tbmi" data-am="home"><i>${ic(\'book\',15)}</i><span><b>내 작품</b></span></button>${window.__WB&&__WB.boot.mode===\'cloud\'?`<button class="tbmi" data-am="account"><i>${ic(\'user\',15)}</i><span><b>내 계정 · 사용량</b></span></button>`:\'\'}${window.__WB&&__WB.boot.isAdmin?`<button class="tbmi" data-am="admin"><i>${ic(\'sliders\',15)}</i><span><b>관리자</b></span></button>`:\'\'}');
P('로그인 창 대신 로그인 페이지', "else{$('#mLogin').hidden=false;setTimeout(()=>$('#lgEmail').focus(),50);}", "else{if(window.__WB&&__WB.boot.mode==='cloud'){location.href='/login?next=/studio';return;}$('#mLogin').hidden=false;setTimeout(()=>$('#lgEmail').focus(),50);}");

// 4) 이미지 AI: 프롬프트가 있으면 서버(Gemini)로, 없거나 키가 없으면 예시 그림
P('이미지 생성기', 'function sbMockImg(W,H,seed,v){', 'async function sbMockImg(W,H,seed,v,prompt,refs){if(window.__WB&&__WB.boot.ai.image&&prompt){if(cancelFlag)return null;const b=await __WB.image(prompt,W,H,refs||[]);return b;}return sbMockImg0(W,H,seed,v);}\nfunction sbMockImg0(W,H,seed,v){');
P('시트 · 배경 그림', "let b=await sbMockImg(kind==='ch'?1200:1280,kind==='ch'?800:720,seed,kind==='ch'?1:2);", "let b=await sbMockImg(kind==='ch'?1200:1280,kind==='ch'?800:720,seed,kind==='ch'?1:2,window.__WB&&__WB.refPrompt(kind,o),(o.refs||[]).slice(1,3));if(!b){progEnd();return;}if(window.__WB&&__WB.boot.ai.image){}else ");
P('장면 그림', 'const b=await sbMockImg(W,H,seed,v+(c&&c.sb.cands?c.sb.cands.length:0));', 'const b=await sbMockImg(W,H,seed,v+(c&&c.sb.cands?c.sb.cands.length:0),prompt,stuRefs().map(r=>r.k));if(!b)break;');
P('콘티 컷 그림', 'const mk=async(w,h,v)=>{const b=await sbMockImg(Math.max(40,Math.round(w)),Math.max(40,Math.round(h)),c.sb.no,v);', "const mk=async(w,h,v)=>{if(cancelFlag)return null;const b=await sbMockImg(Math.max(40,Math.round(w)),Math.max(40,Math.round(h)),c.sb.no,v,window.__WB&&__WB.sbPrompt(c),window.__WB?__WB.refsFor(c):[]);if(!b){cancelFlag=true;return null;}");
P('실패한 컷 빼기', ' progEnd();if(!res.length)return;\n mutate(()=>{for(const r of res){const c=r.c;c.sb.aiModel=model;', ' progEnd();for(let i=res.length-1;i>=0;i--){if(res[i].ks.some(k=>!k))res.splice(i,1);}if(!res.length)return;\n mutate(()=>{for(const r of res){const c=r.c;c.sb.aiModel=model;');
P('예시 표시', / \(예시 이미지\)`/g, "${window.__WBX??' (예시 이미지)'}`", (s.match(/ \(예시 이미지\)`/g) || []).length || 1);

// 5) 연재하기: 내보내기 버튼 옆 · 연재관으로 바로 올리기
P('연재하기 버튼', '<span class="lb">내보내기</span></button></div>`', '<span class="lb">내보내기</span></button><button class="btn sm sbout" data-act="wb-publish" title="연재관에 이 회차 올리기">${ic(\'up\',13)}<span class="lb">연재하기</span></button></div>`');
P('연재하기 버튼(선택 없을 때)', "${n}컷</span></div>`:'');}bar.hidden", "${n}컷</span>${cov?'':`<span style=\"flex:1\"></span><button class=\"btn sm sbout\" data-act=\"wb-publish\" title=\"연재관에 이 회차 올리기\">${ic('up',13)}<span class=\"lb\">연재하기</span></button>`}</div>`:'');}bar.hidden");
P('연재하기 동작', "case'exp-open':openExp(b.dataset.scope);break;", "case'exp-open':openExp(b.dataset.scope);break;case'wb-publish':if(window.__WB)__WB.publish();break;");

mkdirSync(join(root, 'editor'), { recursive: true });
writeFileSync(join(root, 'editor/studio.html'), s);
console.log(`editor/studio.html 만들었어요 (${(s.length / 1024 / 1024).toFixed(2)}MB)`);
