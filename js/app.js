/* 숲 식물 찾기 — 동정 엔진 + 화면 */
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const Q = Object.fromEntries(QUESTIONS.map((q) => [q.id, q]));
  const SKIP = '?';

  /* ======================= 동정 엔진 ======================= */
  const Engine = {
    answers: [], // [{ q: 'leaf', v: 'needle' }]  v === '?' 이면 모르겠음

    traitOf(sp, q) {
      const v = sp.t[q.id];
      return v === undefined ? q.default : v;
    },
    compatible(sp, q, v) {
      const s = this.traitOf(sp, q);
      if (s === undefined) return true; // 정보 없음 → 통과
      return Array.isArray(s) ? s.includes(v) : s === v;
    },
    mismatches(sp) {
      let m = 0;
      for (const a of this.answers) if (a.v !== SKIP && !this.compatible(sp, Q[a.q], a.v)) m++;
      return m;
    },
    /* 가장 잘 맞는 종들. 정확히 맞는 종이 없으면 틀린 답이 가장 적은 종들을 돌려줌 */
    candidates() {
      const scored = SPECIES.map((sp) => ({ sp, m: this.mismatches(sp) }));
      const min = Math.min(...scored.map((s) => s.m));
      return { list: scored.filter((s) => s.m === min).map((s) => s.sp), exact: min === 0, min };
    },
    answered(qid) {
      return this.answers.some((a) => a.q === qid);
    },
    answerOf(qid) {
      const a = this.answers.find((x) => x.q === qid);
      return a ? a.v : undefined;
    },
    order() {
      const t = this.answerOf('type');
      return t === 'herb' ? ORDER.herb : ORDER.tree;
    },
    optionCounts(q, cands) {
      const counts = {};
      for (const o of q.options) counts[o.v] = cands.filter((sp) => this.compatible(sp, q, o.v)).length;
      return counts;
    },
    /* 남은 후보를 실제로 가를 수 있는 질문인가? */
    isUseful(q, cands) {
      const n = cands.length;
      if (n < 2) return false;
      const defined = cands.filter((sp) => this.traitOf(sp, q) !== undefined).length;
      if (defined < Math.max(2, Math.ceil(n * 0.5))) return false;
      const counts = this.optionCounts(q, cands);
      return Object.values(counts).some((c) => c > 0 && c < n);
    },
    usefulQuestions(cands) {
      return this.order().map((id) => Q[id]).filter((q) => !this.answered(q.id) && this.isUseful(q, cands));
    },
    next(cands) {
      return this.usefulQuestions(cands)[0] || null;
    },
  };

  /* ======================= 저장 ======================= */
  const store = {
    load() {
      try {
        const a = JSON.parse(localStorage.getItem('forest-id-answers') || '[]');
        if (Array.isArray(a)) Engine.answers = a.filter((x) => x && Q[x.q]);
      } catch (e) { /* 저장소를 쓸 수 없어도 동작 */ }
    },
    save() {
      try { localStorage.setItem('forest-id-answers', JSON.stringify(Engine.answers)); } catch (e) { /* 무시 */ }
    },
    loadLearn() {
      try { return localStorage.getItem('forest-id-learn') === '1'; } catch (e) { return false; }
    },
    saveLearn(on) {
      try { localStorage.setItem('forest-id-learn', on ? '1' : '0'); } catch (e) { /* 무시 */ }
    },
  };

  /* ======================= 화면 ======================= */
  const main = $('#main');
  let pickedQuestion = null; // 사용자가 직접 고른 질문
  let learn = false;          // 학습 모드: 후보 수를 숨기고, 답할 때마다 제외 이유를 보여 줌
  let feedback = null;        // 마지막 답에 대한 학습 피드백
  let verify = { id: null, marks: {} }; // 결과 확인 체크리스트 상태

  function valuesText(sp, qid) {
    const v = Engine.traitOf(sp, Q[qid]);
    if (v === undefined) return '정보 없음';
    return (Array.isArray(v) ? v : [v]).map((x) => optLabel(qid, x)).join('·');
  }

  /* 답 하나가 후보를 어떻게 바꿨는지 정리 (학습 모드) */
  function buildFeedback(qid, v, before) {
    const after = Engine.candidates();
    if (v === SKIP) return { qid, v, skip: true, idx: Engine.answers.length - 1 };
    const excluded = before.filter((sp) => !after.list.includes(sp));
    const groups = {};
    for (const sp of excluded) (groups[valuesText(sp, qid)] ||= []).push(sp.name);
    return { qid, v, idx: Engine.answers.length - 1, kept: after.list.length, exact: after.exact, excludedCount: excluded.length, groups };
  }

  function feedbackHTML() {
    if (!learn || !feedback || feedback.idx !== Engine.answers.length - 1) return '';
    const f = feedback;
    const q = Q[f.qid];
    if (f.skip) {
      return `<div class="fb fb-skip"><b>${esc(SHORT[f.qid])}</b>을(를) 건너뛰었어요. 나중에 확인할 수 있으면 결과 화면에서 다시 짚어 드릴게요.</div>`;
    }
    if (!f.exact) {
      return `<div class="fb fb-bad">‘${esc(SHORT[f.qid])}: ${esc(optLabel(f.qid, f.v))}’와 맞는 후보가 없어요. 이 답이나 앞의 답 중 하나를 다시 관찰해 보세요.</div>`;
    }
    const groups = Object.entries(f.groups);
    const body = f.excludedCount === 0
      ? '<p>이번 답으로 제외된 후보는 없어요. 다른 특징으로 좁혀 볼게요.</p>'
      : `<ul class="fb-list">${groups.map(([val, names]) => `<li><span class="fb-val">${esc(val)}</span> ${esc(names.slice(0, 6).join(', '))}${names.length > 6 ? ` 외 ${names.length - 6}종` : ''}</li>`).join('')}</ul>`;
    return `<details class="fb" open>
      <summary>✅ ‘${esc(q ? SHORT[f.qid] : '')}: ${esc(optLabel(f.qid, f.v))}’ → <b>${f.excludedCount}종 제외</b>, ${f.kept}종 남음</summary>
      ${f.excludedCount ? '<p class="fb-why">제외된 식물은 이 특징이 다르기 때문이에요:</p>' : ''}${body}
    </details>`;
  }

  /* 결과와 한 가지 답만 다른 식물들 — "이 답을 다르게 봤다면?" */
  function nearMissHTML() {
    const scored = SPECIES.map((sp) => ({ sp, m: Engine.mismatches(sp) }));
    const min = Math.min(...scored.map((x) => x.m));
    const near = scored.filter((x) => x.m === min + 1).map((x) => x.sp);
    const byAnswer = new Map();
    for (const sp of near) {
      Engine.answers.forEach((a, i) => {
        if (a.v !== SKIP && !Engine.compatible(sp, Q[a.q], a.v)) {
          if (!byAnswer.has(i)) byAnswer.set(i, []);
          byAnswer.get(i).push(sp);
        }
      });
    }
    if (!byAnswer.size) return '<p class="nm-none">한 가지 답만 다른 식물은 없어요. 처음부터 다시 관찰해 보세요.</p>';
    return `<p>아래 답 중 하나를 잘못 봤을 수 있어요. 그 답을 다르게 봤다면 이런 식물이 후보가 돼요:</p><ul class="nm">` +
      [...byAnswer.entries()].slice(0, 6).map(([i, sps]) => {
        const a = Engine.answers[i];
        return `<li><button class="nm-redo" data-remove="${i}" title="이 답 지우고 다시 보기">‘${esc(SHORT[a.q])}: ${esc(optLabel(a.q, a.v))}’ 다시 보기</button>
          <span>${sps.slice(0, 4).map((sp) => `<a href="#/sp/${sp.id}">${esc(sp.name)}</a><small>(${esc(valuesText(sp, a.q))})</small>`).join(', ')}${sps.length > 4 ? ` 외 ${sps.length - 4}종` : ''}</span></li>`;
      }).join('') + '</ul>';
  }

  /* 결과 확인 체크리스트 */
  function verifyHTML(sp) {
    if (verify.id !== sp.id) verify = { id: sp.id, marks: {} };
    const items = sp.keys.map((k, i) => ({ k: 'k' + i, text: k }));
    Engine.answers.filter((a) => a.v === SKIP && sp.t[a.q] !== undefined).forEach((a) => {
      items.push({ k: 's' + a.q, text: `${SHORT[a.q]}: ${valuesText(sp, a.q)} (건너뛴 특징)` });
    });
    const marks = verify.marks;
    const done = items.filter((it) => marks[it.k]).length;
    const no = items.filter((it) => marks[it.k] === 'n').length;
    const yes = items.filter((it) => marks[it.k] === 'y').length;
    let verdict = '';
    if (no) verdict = `<div class="vf-verdict vf-bad"><b>맞지 않는 특징이 ${no}개 있어요.</b> ${nearMissHTML()}</div>`;
    else if (done === items.length) verdict = `<div class="vf-verdict vf-good">🎉 모든 특징이 맞아요! <b>${esc(sp.name)}</b>(으)로 동정했습니다. 핵심 특징을 기억해 두세요.</div>`;
    else if (yes >= 2) verdict = `<div class="vf-verdict">지금까지 ${yes}개가 맞아요. 나머지도 확인해 보세요.</div>`;
    return `<section class="verify">
      <h3>🔍 실물과 비교해 확인하기</h3>
      <p class="vf-help">앱의 결과는 "추정"입니다. 아래 특징을 실제 식물에서 하나씩 확인해 보세요. 볼 수 없는 계절의 특징은 "못 봄"을 누르세요.</p>
      <ul class="vf-list">${items.map((it) => `<li class="vf-${marks[it.k] || ''}">
        <span class="vf-text">${esc(it.text)}</span>
        <span class="vf-btns">
          <button data-vk="${it.k}" data-vm="y" class="${marks[it.k] === 'y' ? 'on' : ''}">맞아요</button>
          <button data-vk="${it.k}" data-vm="n" class="${marks[it.k] === 'n' ? 'on' : ''}">아니에요</button>
          <button data-vk="${it.k}" data-vm="u" class="${marks[it.k] === 'u' ? 'on' : ''}">못 봄</button>
        </span></li>`).join('')}</ul>
      ${verdict}
    </section>`;
  }

  function optLabel(qid, v) {
    const o = Q[qid].options.find((x) => x.v === v);
    return o ? o.label : v;
  }
  function traitText(sp, qid) {
    const v = sp.t[qid];
    if (v === undefined) return null;
    return (Array.isArray(v) ? v : [v]).map((x) => optLabel(qid, x)).join(', ');
  }

  const SHORT = {
    type: '구분', leaf: '잎 종류', needle: '잎 개수', compound: '홑·겹잎', shape: '잎 모양', margin: '톱니',
    habit: '수형', arrange: '잎차례', evergreen: '상록·낙엽', fcolor: '꽃색', fform: '꽃잎', season: '개화기',
    fruit: '열매', bark: '수피', thorn: '가시',
  };

  function chipsHTML() {
    if (!Engine.answers.length) return '';
    return `<div class="chips" aria-label="지금까지 고른 답">` + Engine.answers.map((a, i) =>
      `<button class="chip ${a.v === SKIP ? 'chip-skip' : ''}" data-remove="${i}" title="이 답 지우기">
        <span class="chip-k">${esc(SHORT[a.q])}</span> ${a.v === SKIP ? '모름' : esc(optLabel(a.q, a.v))} <span class="chip-x" aria-hidden="true">×</span>
      </button>`).join('') + `</div>`;
  }

  function renderQuiz() {
    const { list: cands, exact } = Engine.candidates();
    let q = pickedQuestion && !Engine.answered(pickedQuestion) ? Q[pickedQuestion] : Engine.next(cands);
    pickedQuestion = null;

    const notice = !exact && Engine.answers.length
      ? `<div class="notice">고른 특징과 모두 일치하는 식물이 없어, <b>가장 비슷한 후보</b>를 보여줍니다. 위의 답 중 확실하지 않은 것을 눌러 지워 보세요.</div>`
      : '';

    const status = `
      <div class="status">
        <button class="count-btn" data-go="list" ${cands.length ? '' : 'disabled'}>
          ${learn && cands.length > 1
            ? '<span class="count-learn">남은 후보 보기 ›</span>'
            : `<span class="count-num">${cands.length}</span><span class="count-unit">종</span><span class="count-label">남은 후보 보기 ›</span>`}
        </button>
        <div class="status-actions">
          <button class="ghost learn-toggle ${learn ? 'on' : ''}" data-act="learn" aria-pressed="${learn}">📘 학습 모드${learn ? ' 켜짐' : ''}</button>
          <button class="ghost" data-act="undo" ${Engine.answers.length ? '' : 'disabled'}>↶ 이전</button>
          <button class="ghost" data-act="reset" ${Engine.answers.length ? '' : 'disabled'}>처음부터</button>
        </div>
      </div>
      ${chipsHTML()}${feedbackHTML()}${notice}`;

    if (!q || cands.length <= 1) {
      main.innerHTML = status + resultHTML(cands, exact);
      return;
    }

    const counts = Engine.optionCounts(q, cands);
    const opts = q.options.map((o) => ({ o, c: counts[o.v] }));
    // 학습 모드에서는 후보 수를 숨기고 순서도 바꾸지 않음 → 숫자가 아니라 관찰로 고르게
    if (!learn) opts.sort((a, b) => (a.c === 0) - (b.c === 0)); // 해당 없는 선택지는 뒤로
    const step = Engine.answers.length + 1;
    const others = Engine.usefulQuestions(cands).filter((x) => x.id !== q.id);

    main.innerHTML = status + `
      <section class="qcard" aria-live="polite">
        <div class="qstep">질문 ${step}</div>
        <h2 class="qtitle">${esc(q.title)}</h2>
        ${q.help ? `<details class="help" ${learn ? 'open' : ''}><summary>어떻게 보나요?</summary><p>${esc(q.help)}</p></details>` : ''}
        ${q.why ? `<details class="help why" ${learn ? 'open' : ''}><summary>왜 이걸 보나요?</summary><p>${esc(q.why)}</p></details>` : ''}
        <div class="opts ${q.id === 'fcolor' || q.id === 'season' ? 'opts-compact' : ''}">
          ${opts.map(({ o, c }) => `
            <button class="opt ${c === 0 && !learn ? 'opt-none' : ''}" data-q="${q.id}" data-v="${esc(o.v)}">
              <span class="opt-ic">${Icons.forOption(q.id, o)}</span>
              <span class="opt-tx">
                <span class="opt-label">${esc(o.label)}</span>
                ${o.sub ? `<span class="opt-sub">${esc(o.sub)}</span>` : ''}
              </span>
              ${learn ? '' : `<span class="opt-n">${c ? c + '종' : '없음'}</span>`}
            </button>`).join('')}
        </div>
        <div class="qfoot">
          <button class="secondary" data-q="${q.id}" data-v="${SKIP}">잘 모르겠어요 · 건너뛰기</button>
          ${others.length ? `<details class="pick"><summary>다른 특징으로 먼저 찾기</summary>
            <div class="pick-list">${others.map((x) => `<button class="pick-item" data-pick="${x.id}">${esc(SHORT[x.id])}<small>${esc(x.title)}</small></button>`).join('')}</div>
          </details>` : ''}
        </div>
      </section>`;
  }

  function resultHTML(cands, exact) {
    if (!cands.length) return `<div class="empty">후보가 없습니다. 답을 지워 보세요.</div>`;
    if (cands.length === 1) {
      const sp = cands[0];
      return `<section class="result">
        <div class="result-head">${exact ? '🌿 이 식물일 가능성이 높아요' : '🔎 가장 비슷한 식물이에요'}</div>
        ${verifyHTML(sp)}
        ${detailHTML(sp, true)}
        <div class="result-actions">
          <button class="primary" data-act="reset">새로 찾기</button>
          <button class="secondary" data-act="undo">↶ 마지막 답 고치기</button>
        </div>
      </section>`;
    }
    return `<section class="result">
      <div class="result-head">더 가를 수 있는 질문이 없어요. 아래 ${cands.length}종 중에서 <b>핵심 특징</b>을 비교해 보세요.</div>
      ${compareHTML(cands)}
      ${listHTML(cands)}
      <div class="result-actions">
        <button class="primary" data-act="reset">새로 찾기</button>
        <button class="secondary" data-act="undo">↶ 마지막 답 고치기</button>
      </div>
    </section>`;
  }

  /* 후보가 2~4종 남았을 때: 핵심 특징·차이점 나란히 비교 */
  function compareHTML(list) {
    if (list.length > 4) return '';
    return `<div class="compare">${list.map((sp) => `<div class="cmp">
      <a class="cmp-name" href="#/sp/${sp.id}">${esc(sp.name)}</a>
      <ul>${sp.keys.slice(0, 3).map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
      ${sp.similar ? `<p class="cmp-sim">💡 ${esc(sp.similar)}</p>` : ''}
    </div>`).join('')}</div>`;
  }

  function listHTML(list) {
    return `<ul class="splist">` + list.map((sp) => `
      <li><a class="spcard" href="#/sp/${sp.id}">
        <span class="badge">${Icons.plantBadge(sp)}</span>
        <span class="spinfo">
          <span class="spname">${esc(sp.name)} ${sp.warn ? '<span class="warn-dot" title="주의">⚠️</span>' : ''}</span>
          <span class="spsci">${esc(sp.sci)} · ${esc(sp.family)}</span>
          <span class="spkey">${esc(sp.keys[0])}</span>
        </span>
      </a></li>`).join('') + `</ul>`;
  }

  function detailHTML(sp, inResult = false) {
    const rows = QUESTIONS.filter((q) => q.id !== 'type' && sp.t[q.id] !== undefined)
      .map((q) => `<tr><th>${esc(SHORT[q.id])}</th><td>${esc(traitText(sp, q.id))}</td></tr>`).join('');
    return `<article class="detail">
      <div class="detail-top">
        <span class="badge big">${Icons.plantBadge(sp)}</span>
        <div>
          <h2 class="dname">${esc(sp.name)}</h2>
          <div class="dsci"><i>${esc(sp.sci)}</i></div>
          <div class="dfam">${esc(sp.family)} · ${sp.t.type === 'tree' ? '나무' : '풀'}</div>
        </div>
      </div>
      ${sp.warn ? `<div class="warn">⚠️ ${esc(sp.warn)}</div>` : ''}
      <p class="ddesc">${esc(sp.desc)}</p>
      <h3>핵심 식별 포인트</h3>
      <ul class="keys">${sp.keys.map((k) => `<li>${esc(k)}</li>`).join('')}</ul>
      ${sp.similar ? `<h3>헷갈리는 식물</h3><p class="similar">${esc(sp.similar)}</p>` : ''}
      <details class="traits" ${inResult ? '' : 'open'}><summary>형질 정보</summary><table>${rows}</table></details>
      <p class="links">
        <a href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(sp.name.replace(/\s*\(.*\)/, '') + ' ' + sp.sci)}" target="_blank" rel="noopener">사진 검색 ↗</a>
      </p>
    </article>`;
  }

  function renderList() {
    const { list, exact } = Engine.candidates();
    main.innerHTML = `
      <div class="subhead"><a href="#/" class="back">‹ 질문으로</a><h2>남은 후보 ${list.length}종</h2></div>
      ${chipsHTML()}
      ${!exact && Engine.answers.length ? '<div class="notice">모두 일치하는 식물이 없어 가장 비슷한 후보입니다.</div>' : ''}
      ${listHTML(list)}`;
  }

  function renderDetail(id) {
    const sp = SPECIES.find((s) => s.id === id);
    if (!sp) { location.hash = '#/'; return; }
    main.innerHTML = `<div class="subhead"><button class="back" data-act="back">‹ 뒤로</button></div>${detailHTML(sp)}`;
  }

  let browseState = { q: '', type: 'all' };
  function renderBrowse() {
    main.innerHTML = `
      <div class="subhead"><h2>도감 <small>${SPECIES.length}종</small></h2></div>
      <div class="browse-bar">
        <input id="search" type="search" placeholder="이름·학명·과 이름으로 검색" value="${esc(browseState.q)}" autocomplete="off">
        <div class="seg" role="tablist">
          ${[['all', '전체'], ['tree', '나무'], ['herb', '풀']].map(([v, l]) => `<button class="seg-b ${browseState.type === v ? 'on' : ''}" data-type="${v}">${l}</button>`).join('')}
        </div>
      </div>
      <div id="browse-list"></div>`;
    drawBrowseList();
    $('#search').addEventListener('input', (e) => { browseState.q = e.target.value; drawBrowseList(); });
  }
  function drawBrowseList() {
    const q = browseState.q.trim().toLowerCase();
    const list = SPECIES.filter((sp) => (browseState.type === 'all' || sp.t.type === browseState.type) &&
      (!q || (sp.name + sp.sci + sp.family).toLowerCase().includes(q)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    $('#browse-list').innerHTML = list.length ? listHTML(list) : '<div class="empty">검색 결과가 없습니다.</div>';
  }

  /* ======================= 라우팅 ======================= */
  function route() {
    const h = location.hash || '#/';
    document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', (t.dataset.tab === 'browse') === h.startsWith('#/browse')));
    if (h.startsWith('#/list')) renderList();
    else if (h.startsWith('#/sp/')) renderDetail(decodeURIComponent(h.slice(5)));
    else if (h.startsWith('#/browse')) renderBrowse();
    else renderQuiz();
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('button, a');
    if (!b) return;
    if (b.dataset.q) {
      const before = Engine.candidates().list;
      Engine.answers.push({ q: b.dataset.q, v: b.dataset.v });
      feedback = buildFeedback(b.dataset.q, b.dataset.v, before);
      store.save();
      renderQuiz();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (b.dataset.remove !== undefined) {
      Engine.answers.splice(+b.dataset.remove, 1);
      feedback = null;
      store.save();
      if (location.hash.startsWith('#/sp/')) location.hash = '#/'; else route();
    } else if (b.dataset.vk) {
      const k = b.dataset.vk;
      verify.marks[k] = verify.marks[k] === b.dataset.vm ? undefined : b.dataset.vm;
      const y = window.scrollY;
      renderQuiz();
      window.scrollTo(0, y);
    } else if (b.dataset.act === 'learn') {
      learn = !learn; store.saveLearn(learn); feedback = null;
      renderQuiz();
    } else if (b.dataset.pick) {
      pickedQuestion = b.dataset.pick;
      renderQuiz();
    } else if (b.dataset.go === 'list') {
      location.hash = '#/list';
    } else if (b.dataset.type) {
      browseState.type = b.dataset.type;
      renderBrowse();
    } else if (b.dataset.act === 'undo') {
      Engine.answers.pop(); feedback = null; store.save();
      if (location.hash.startsWith('#/sp/') || location.hash.startsWith('#/list')) location.hash = '#/'; else renderQuiz();
    } else if (b.dataset.act === 'reset') {
      Engine.answers = []; feedback = null; verify = { id: null, marks: {} }; store.save();
      if (location.hash && location.hash !== '#/') location.hash = '#/'; else renderQuiz();
    } else if (b.dataset.act === 'back') {
      if (history.length > 1) history.back(); else location.hash = '#/';
    }
  });

  window.addEventListener('hashchange', route);
  store.load();
  learn = store.loadLearn();
  route();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  // 테스트·디버그용
  window.ForestID = { Engine, SPECIES, QUESTIONS };
})();
