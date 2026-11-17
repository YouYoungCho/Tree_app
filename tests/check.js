// 데이터 검증 + 모든 식물에 대해 "정답대로 답하면 찾아지는가" 시뮬레이션
// 실행: node tests/check.js
const fs = require('fs'); const vm = require('vm'); const path = require('path');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8') + ';this.QUESTIONS=QUESTIONS;this.SPECIES=SPECIES;this.ORDER=ORDER;', ctx);
const { QUESTIONS, SPECIES, ORDER } = ctx;
const Q = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
let errors = 0;
const ids = new Set();
for (const sp of SPECIES) {
  if (ids.has(sp.id)) { console.log('중복 id', sp.id); errors++; } ids.add(sp.id);
  for (const [k, v] of Object.entries(sp.t)) {
    if (!Q[k]) { console.log(sp.name, '알 수 없는 형질', k); errors++; continue; }
    for (const x of [].concat(v)) if (!Q[k].options.some((o) => o.v === x)) { console.log(sp.name, k, '잘못된 값', x); errors++; }
  }
  if (!sp.keys || !sp.keys.length) { console.log(sp.name, 'keys 없음'); errors++; }
}
for (const o of Object.values(ORDER)) for (const id of o) if (!Q[id]) { console.log('ORDER 오류', id); errors++; }

// 앱과 같은 엔진 로직
function traitOf(sp, q) { const v = sp.t[q.id]; return v === undefined ? q.default : v; }
function compat(sp, q, v) { const s = traitOf(sp, q); if (s === undefined) return true; return Array.isArray(s) ? s.includes(v) : s === v; }
function cands(ans) {
  const sc = SPECIES.map((sp) => ({ sp, m: ans.filter((a) => a.v !== '?' && !compat(sp, Q[a.q], a.v)).length }));
  const min = Math.min(...sc.map((s) => s.m)); return sc.filter((s) => s.m === min).map((s) => s.sp);
}
function useful(q, cs) {
  const n = cs.length; if (n < 2) return false;
  const def = cs.filter((sp) => traitOf(sp, q) !== undefined).length;
  if (def < Math.max(2, Math.ceil(n * 0.5))) return false;
  return q.options.some((o) => { const c = cs.filter((sp) => compat(sp, q, o.v)).length; return c > 0 && c < n; });
}
let unresolved = [];
for (const target of SPECIES) {
  const ans = []; let steps = 0;
  while (true) {
    const cs = cands(ans);
    const t = ans.find((a) => a.q === 'type');
    const order = t && t.v === 'herb' ? ORDER.herb : ORDER.tree;
    const q = order.map((id) => Q[id]).find((q) => !ans.some((a) => a.q === q.id) && useful(q, cs));
    if (!q || cs.length <= 1) {
      if (!cs.includes(target)) { console.log('❌ 못 찾음', target.name); errors++; }
      if (cs.length > 1) unresolved.push(`${target.name} → ${cs.map((s) => s.name).join(', ')}`);
      break;
    }
    const v = traitOf(target, q); const pick = v === undefined ? '?' : [].concat(v)[0];
    ans.push({ q: q.id, v: pick }); steps++;
  }
}
console.log(`식물 ${SPECIES.length}종, 질문 ${QUESTIONS.length}개`);
console.log(`질문만으로 1종까지 좁혀지지 않는 경우 ${unresolved.length}건 (핵심 특징 비교로 구분):`);
unresolved.forEach((u) => console.log('  ·', u));
console.log(errors ? `오류 ${errors}개` : '✅ 데이터 검증 통과');
process.exit(errors ? 1 : 0);
