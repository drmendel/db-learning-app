/* Adatbázis gyakorló – client (vanilla JS, no dependencies) */
'use strict';

const state = {
  modules: [],
  byId: new Map(),
  progress: { exercises: {}, quiz: {}, cards: {}, exams: [] },
  schema: null,
  exam: loadExam(),
};
const ENGINE_LABEL = { pg: 'SQL · PostgreSQL', redis: 'Redis', mongo: 'MongoDB', text: 'Code (checked by key elements)', quiz: 'Quiz', card: 'Flashcard' };
const PLACEHOLDER = {
  pg: '-- Write your SQL here.  Ctrl+Enter = Run, Ctrl+Shift+Enter = Check',
  redis: '# One Redis command per line, e.g.  SET kulcs "érték"\n# Ctrl+Enter = Run, Ctrl+Shift+Enter = Check',
  mongo: '// mongosh code, e.g.  db.Users.find({ city: "Budapest" })\n// Ctrl+Enter = Run, Ctrl+Shift+Enter = Check',
  text: '# Write your code here, then press Check (Ctrl+Shift+Enter)',
};

// ---------------------------------------------------------------- utils
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
async function api(path, body) {
  const res = await fetch('/api' + path, body === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ error: 'Bad response from the server' }));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}
function lsGet(k, d = null) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } }
function lsDel(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } }

// ---------------------------------------------------------------- markdown
function inline(s) {
  const codes = [];
  let out = esc(s).replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
}
function splitRow(line) {
  const cells = []; let cur = ''; let inCode = false;
  const s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && s[i + 1] === '|') { cur += '|'; i++; continue; }
    if (c === '`') inCode = !inCode;
    if (c === '|' && !inCode) { cells.push(cur.trim()); cur = ''; } else cur += c;
  }
  cells.push(cur.trim());
  return cells;
}
function md(src, { tryButtons = false } = {}) {
  const lines = String(src || '').replace(/\r/g, '').split('\n');
  let html = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1]; const buf = []; i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) buf.push(lines[i++]);
      i++;
      const code = buf.join('\n');
      const eng = { sql: 'pg', redis: 'redis', mongo: 'mongo' }[lang];
      html += `<div class="codeblock"><pre><code>${esc(code)}</code></pre>${tryButtons && eng ? `<button class="btn try" data-try="${eng}" data-code="${esc(code)}">▶ Try</button>` : ''}</div>`;
      continue;
    }
    if (/^#{1,4}\s/.test(line)) { const n = line.match(/^#+/)[0].length; html += `<h${n}>${inline(line.slice(n).trim())}</h${n}>`; i++; continue; }
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1])) {
      const head = splitRow(line); i += 2;
      let body = '';
      while (i < lines.length && /^\s*\|/.test(lines[i])) { body += '<tr>' + splitRow(lines[i]).map((c) => `<td>${inline(c)}</td>`).join('') + '</tr>'; i++; }
      html += `<table><thead><tr>${head.map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
      html += `<blockquote>${md(buf.join('\n'))}</blockquote>`;
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      // (nested) lists by indentation
      const stack = [];
      let out = '';
      while (i < lines.length && (/^\s*([-*]|\d+\.)\s+/.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && stack.length))) {
        const l = lines[i];
        const m = /^(\s*)([-*]|\d+\.)\s+(.*)$/.exec(l);
        if (!m) { out += ' ' + inline(l.trim()); i++; continue; }
        const indent = m[1].length; const type = /\d/.test(m[2]) ? 'ol' : 'ul';
        while (stack.length && indent < stack[stack.length - 1].indent) { out += `</li></${stack.pop().type}>`; }
        if (!stack.length || indent > stack[stack.length - 1].indent) { stack.push({ indent, type }); out += `<${type}><li>`; }
        else out += '</li><li>';
        out += inline(m[3]);
        i++;
      }
      while (stack.length) out += `</li></${stack.pop().type}>`;
      html += out;
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !/^(```|#{1,4}\s|>|\s*([-*]|\d+\.)\s+|\s*\|)/.test(lines[i])) buf.push(lines[i++]);
    if (!buf.length) { buf.push(lines[i++]); }
    html += `<p>${inline(buf.join(' '))}</p>`;
  }
  return html;
}

// ---------------------------------------------------------------- progress helpers
const gradable = (ex) => ['pg', 'redis', 'mongo', 'text'].includes(ex.type);
function status(ex) {
  if (gradable(ex)) {
    const p = state.progress.exercises[ex.id];
    if (!p) return '';
    if (p.passed) return 'pass';
    if (p.last === 'fail') return 'fail';
    if (p.revealed) return 'seen';
    return '';
  }
  if (ex.type === 'quiz') { const v = state.progress.quiz[ex.id]; return v === true ? 'pass' : v === false ? 'fail' : ''; }
  if (ex.type === 'card') { const v = state.progress.cards[ex.id]; return v === undefined ? '' : v >= 1 ? 'pass' : 'seen'; }
  return '';
}
const ICON = { pass: '✓', fail: '✗', seen: '◐', '': '○' };
function modProgress(m) { const done = m.exercises.filter((e) => status(e) === 'pass').length; return { done, total: m.exercises.length }; }

// ---------------------------------------------------------------- sidebar & header
function renderSidebar(activeModule, activeEx) {
  const sb = $('#sidebar');
  sb.innerHTML = '';
  state.modules.forEach((m, idx) => {
    const { done, total } = modProgress(m);
    const open = m.id === activeModule;
    const el = h(`<div class="mod">
      <a class="mod-head ${open && !activeEx ? 'active' : ''}" href="#/m/${m.id}">
        <span class="mod-num ${done === total && total ? 'done' : ''}">${done === total && total ? '✓' : idx}</span>
        <span class="mod-title"><div class="t">${esc(m.title)}</div>
          <div class="s"><span>${esc(m.lab)}</span><span class="bar"><span style="width:${total ? (100 * done / total) : 0}%"></span></span><span>${done}/${total}</span></div></span>
      </a></div>`);
    if (open) {
      const ul = h('<ul class="ex-list"></ul>');
      ul.appendChild(h(`<li><a href="#/m/${m.id}" class="${!activeEx ? 'active' : ''}"><span class="st">📖</span>Lesson</a></li>`));
      for (const ex of m.exercises) {
        const s = status(ex);
        ul.appendChild(h(`<li><a href="#/e/${ex.id}" class="${ex.id === activeEx ? 'active' : ''}"><span class="st ${s}">${ICON[s]}</span>${esc(ex.title)}</a></li>`));
      }
      el.appendChild(ul);
    }
    sb.appendChild(el);
  });
  renderOverall();
}
function renderOverall() {
  let done = 0, total = 0;
  for (const m of state.modules) { const p = modProgress(m); done += p.done; total += p.total; }
  $('#overall').innerHTML = `<span class="bar"><span style="width:${total ? 100 * done / total : 0}%"></span></span><span class="txt">${done} / ${total} done</span>`;
}

// ---------------------------------------------------------------- routing
function route() {
  document.body.classList.remove('menu-open');
  const hash = location.hash.replace(/^#\/?/, '');
  const [kind, id] = hash.split('/');
  const main = $('#main');
  main.scrollTop = 0;
  if (kind === 'm' && state.modules.find((m) => m.id === id)) return renderLesson(state.modules.find((m) => m.id === id));
  if (kind === 'e' && state.byId.has(id)) return renderExercise(state.byId.get(id));
  if (kind === 'play') return renderPlayground(id || 'pg');
  if (kind === 'exam-result') return renderExamResult();
  return renderHome();
}

// ---------------------------------------------------------------- home
function nextTodo() {
  for (const m of state.modules) for (const ex of m.exercises) if (status(ex) !== 'pass' && !m.exam) return ex;
  return null;
}
function renderHome() {
  renderSidebar(null, null);
  const next = nextTodo();
  const exams = state.progress.exams || [];
  const last = exams[exams.length - 1];
  const page = h(`<div class="page">
    <h1>Learn databases by doing</h1>
    <p class="muted">Adatbázis- és Big Data technológiák – every lab topic as hands-on tasks, graded locally against real PostgreSQL and Redis/MongoDB emulators.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
      ${next ? `<a class="btn primary" href="#/e/${next.id}">▶ Continue: ${esc(next.title)}</a>` : '<span class="badge pts">Everything done – try the mock ZH!</span>'}
      <a class="btn" href="#/m/start">How it works</a>
      <a class="btn" href="#/m/mockzh">Mock ZH${last ? ` (last: ${last.percent}% → ${last.grade})` : ''}</a>
    </div>
    <div class="home-grid"></div>
  </div>`);
  const grid = $('.home-grid', page);
  state.modules.forEach((m, idx) => {
    const { done, total } = modProgress(m);
    grid.appendChild(h(`<a class="card home-card" href="#/m/${m.id}">
      <div class="t">${idx}. ${esc(m.title)}</div>
      <div class="s">${esc(m.lab)} · ${total} items</div>
      <div class="bar"><span style="width:${total ? 100 * done / total : 0}%"></span></div>
    </a>`));
  });
  mount(page);
}
function mount(el) { const main = $('#main'); main.innerHTML = ''; main.appendChild(el); }

// ---------------------------------------------------------------- lesson
function renderLesson(m) {
  renderSidebar(m.id, null);
  const first = m.exercises[0];
  const page = h(`<div class="page">
    <div class="crumbs"><a href="#/">Home</a> › <span>${esc(m.lab)}</span></div>
    <div class="md lesson">${md(m.lessonText, { tryButtons: true })}</div>
    <div class="exam-box"></div>
    <div class="nav-row"><span></span>${first ? `<a class="btn primary" href="#/e/${first.id}">Start the exercises (${m.exercises.length}) →</a>` : ''}</div>
  </div>`);
  bindTry(page);
  if (m.exam) renderExamBox($('.exam-box', page), m);
  mount(page);
}
function bindTry(el) {
  $$('[data-try]', el).forEach((b) => b.addEventListener('click', () => {
    lsSet('play:' + b.dataset.try, b.dataset.code.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'));
    location.hash = '#/play/' + b.dataset.try;
  }));
}

// ---------------------------------------------------------------- exercise
function siblings(ex) {
  const m = state.modules.find((x) => x.id === ex.module);
  const i = m.exercises.findIndex((e) => e.id === ex.id);
  return { m, prev: m.exercises[i - 1], next: m.exercises[i + 1], idx: i };
}
function inExam(ex) { return state.exam && !state.exam.finished && state.exam.moduleId === ex.module; }

function renderExercise(ex) {
  const { m, prev, next, idx } = siblings(ex);
  renderSidebar(m.id, ex.id);
  const exam = inExam(ex);
  const page = h(`<div class="page">
    <div class="crumbs"><a href="#/">Home</a> › <a href="#/m/${m.id}">${esc(m.title)}</a> › <span>${idx + 1} / ${m.exercises.length}</span></div>
    <h1>${esc(ex.title)}</h1>
    <div style="display:flex;gap:6px;flex-wrap:wrap">
      <span class="badge ${ex.type}">${ENGINE_LABEL[ex.type] || ex.type}</span>
      ${ex.points ? `<span class="badge pts">${ex.points} points</span>` : ''}
      ${exam ? '<span class="badge pts">exam mode – no hints</span>' : ''}
    </div>
    <div class="card prompt"><div class="md">${md(ex.prompt)}</div></div>
    <div class="body"></div>
    <div class="nav-row">
      ${prev ? `<a class="btn" href="#/e/${prev.id}">← ${esc(prev.title)}</a>` : `<a class="btn" href="#/m/${m.id}">← Lesson</a>`}
      ${next ? `<a class="btn" href="#/e/${next.id}">${esc(next.title)} →</a>` : (exam ? '<button class="btn primary" id="finishBtn2">Finish exam</button>' : '<a class="btn" href="#/">Back to overview</a>')}
    </div>
  </div>`);
  const body = $('.body', page);
  if (gradable(ex)) renderCodeExercise(ex, body, exam);
  else if (ex.type === 'quiz') renderQuiz(ex, body, exam);
  else if (ex.type === 'card') renderCard(ex, body, exam);
  const fb = $('#finishBtn2', page);
  if (fb) fb.addEventListener('click', finishExam);
  mount(page);
}

function draftKey(ex) { return (inExam(ex) ? 'examdraft:' : 'draft:') + ex.id; }

function renderCodeExercise(ex, body, exam) {
  const saved = lsGet(draftKey(ex));
  const prog = state.progress.exercises[ex.id];
  const initial = saved ?? (exam ? (state.exam.results[ex.id]?.code ?? '') : (prog?.code ?? ex.starter ?? ''));
  const hints = exam ? [] : (ex.hints || []);
  const isText = ex.type === 'text';
  body.innerHTML = `
    ${hints.length ? `<div class="hints"><button class="btn ghost" data-act="hint">💡 Show hint (1/${hints.length})</button><div class="hint-list"></div></div>` : ''}
    ${ex.hasSetup && !exam ? '<div><button class="btn ghost" data-act="setup" style="font-size:13px">Show the starting state (setup)</button><div class="setup-box"></div></div>' : ''}
    <div class="card editor-wrap">
      <div class="editor-bar">
        ${!isText ? '<button class="btn" data-act="run" title="Ctrl+Enter">▶ Run</button>' : ''}
        <button class="btn primary" data-act="check" title="Ctrl+Shift+Enter">✓ Check</button>
        <span class="lbl">${!isText ? '<kbd>Ctrl</kbd>+<kbd>Enter</kbd> run · ' : ''}<kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> check</span>
        <span class="spacer"></span>
        ${!exam && !isText ? '<button class="btn ghost" data-act="expected">Expected output</button>' : ''}
        ${!exam ? '<button class="btn ghost" data-act="solution">Solution</button>' : ''}
        <button class="btn ghost" data-act="clear" title="Restore the starting code">↺</button>
      </div>
      <textarea class="editor" spellcheck="false" placeholder="${esc(PLACEHOLDER[ex.type] || '')}"></textarea>
    </div>
    <div class="feedback-box"></div>
    <div class="solution-box"></div>
    <div class="output"></div>`;
  const ta = $('textarea', body);
  ta.value = initial;
  autoGrow(ta);
  let hintN = 0;
  const save = debounce(() => lsSet(draftKey(ex), ta.value), 300);
  ta.addEventListener('input', () => { autoGrow(ta); save(); });
  editorKeys(ta, () => (isText ? doCheck() : doRun()), doCheck);

  const out = $('.output', body);
  const fbBox = $('.feedback-box', body);
  async function doRun() {
    out.innerHTML = '<p class="muted">Running…</p>';
    try { renderOutput(out, await api('/run', { exerciseId: ex.id, code: ta.value }), 'Output'); }
    catch (e) { out.innerHTML = `<div class="feedback fail">${esc(e.message)}</div>`; }
  }
  async function doCheck() {
    fbBox.innerHTML = '<div class="feedback info">Checking…</div>';
    try {
      const r = await api('/check', { exerciseId: ex.id, code: ta.value, exam });
      fbBox.innerHTML = `<div class="feedback ${r.pass ? 'pass' : 'fail'}"><strong>${r.pass ? '✓ ' : '✗ '}${esc(r.message)}</strong>${r.detail ? `<pre>${esc(r.detail)}</pre>` : ''}</div>`;
      if (r.output) renderOutput(out, r.output, 'Your output'); else out.innerHTML = '';
      if (exam) {
        state.exam.results[ex.id] = { pass: r.pass, code: ta.value };
        saveExam();
      } else {
        const p = state.progress.exercises[ex.id] || { attempts: 0 };
        p.attempts++; p.code = ta.value; p.last = r.pass ? 'pass' : 'fail'; if (r.pass) p.passed = true;
        state.progress.exercises[ex.id] = p;
        if (r.pass) lsDel(draftKey(ex));
      }
      renderSidebar(ex.module, ex.id);
      if (r.pass && !exam) {
        const { next } = siblings(ex);
        if (next) fbBox.firstElementChild.insertAdjacentHTML('beforeend', ` <a class="btn ok" style="margin-top:8px" href="#/e/${next.id}">Next: ${esc(next.title)} →</a>`);
      }
    } catch (e) { fbBox.innerHTML = `<div class="feedback fail">${esc(e.message)}</div>`; }
  }
  body.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (!act) return;
    if (act === 'run') doRun();
    if (act === 'check') doCheck();
    if (act === 'hint') {
      if (hintN < hints.length) $('.hint-list', body).insertAdjacentHTML('beforeend', `<div class="hint"><div class="md">${md(hints[hintN])}</div></div>`);
      hintN++;
      const b = e.target.closest('[data-act]');
      if (hintN >= hints.length) b.remove(); else b.textContent = `💡 Show hint (${hintN + 1}/${hints.length})`;
    }
    if (act === 'setup') {
      const r = await api('/reveal', { exerciseId: ex.id, what: 'setup' });
      $('.setup-box', body).innerHTML = `<div class="md"><p class="muted">This runs before your code (in a fresh sandbox):</p><pre><code>${esc(r.setup)}</code></pre></div>`;
      e.target.remove();
    }
    if (act === 'expected') {
      out.innerHTML = '<p class="muted">Computing the expected output…</p>';
      try { renderOutput(out, await api('/reveal', { exerciseId: ex.id, what: 'expected' }), 'Expected output (reference solution)'); }
      catch (err) { out.innerHTML = `<div class="feedback fail">${esc(err.message)}</div>`; }
    }
    if (act === 'solution') {
      const p = state.progress.exercises[ex.id];
      if (!(p && (p.attempts > 0 || p.passed)) && !confirm('Look at the solution without trying first? You learn more by attempting it (hints and the expected output can help).')) return;
      const r = await api('/reveal', { exerciseId: ex.id, what: 'solution' });
      const pp = state.progress.exercises[ex.id] || { attempts: 0 }; pp.revealed = true; state.progress.exercises[ex.id] = pp;
      $('.solution-box', body).innerHTML = `<div class="card answer"><strong>Model solution</strong><pre style="white-space:pre-wrap;margin:8px 0"><code>${esc(r.solution)}</code></pre><button class="btn" data-act="copy">Copy into the editor</button>${r.explain ? `<div class="md">${md(r.explain)}</div>` : ''}</div>`;
      $('.solution-box', body)._sol = r.solution;
      renderSidebar(ex.module, ex.id);
    }
    if (act === 'copy') { ta.value = $('.solution-box', body)._sol; autoGrow(ta); save(); ta.focus(); }
    if (act === 'clear') { if (confirm('Replace the editor content with the starting code?')) { ta.value = ex.starter || ''; lsDel(draftKey(ex)); autoGrow(ta); } }
  });
  setTimeout(() => ta.focus(), 0);
}

function renderQuiz(ex, body, exam) {
  const prev = exam ? state.exam.results[ex.id]?.choice : undefined;
  body.innerHTML = `<div class="quiz-opts">${ex.options.map((o, i) => `<label class="quiz-opt"><input type="radio" name="q" value="${i}" ${prev === i ? 'checked' : ''}><span class="md">${md(o)}</span></label>`).join('')}</div>
    <button class="btn primary" data-act="check">✓ Check</button><div class="feedback-box"></div>`;
  $('[data-act=check]', body).addEventListener('click', () => {
    const sel = $('input[name=q]:checked', body);
    if (!sel) return;
    const choice = Number(sel.value);
    const right = choice === ex.answer;
    $$('.quiz-opt', body).forEach((l, i) => { l.classList.remove('right', 'wrong'); if (i === ex.answer) l.classList.add('right'); else if (i === choice) l.classList.add('wrong'); });
    $('.feedback-box', body).innerHTML = `<div class="feedback ${right ? 'pass' : 'fail'}"><strong>${right ? '✓ Correct!' : '✗ Not quite.'}</strong>${ex.explain ? `<div class="md">${md(ex.explain)}</div>` : ''}</div>`;
    if (!exam) {
      if (state.progress.quiz[ex.id] !== true) { state.progress.quiz[ex.id] = right; api('/progress', { quiz: { [ex.id]: right } }); }
      renderSidebar(ex.module, ex.id);
    }
  });
}

function renderCard(ex, body, exam) {
  const key = (exam ? 'examcard:' : 'card:') + ex.id;
  body.innerHTML = `<div class="card editor-wrap"><div class="editor-bar"><span class="lbl">Your answer (for yourself – write it as you would in the ZH)</span></div>
      <textarea class="editor" style="font-family:var(--sans);white-space:pre-wrap;min-height:120px" placeholder="Type your answer…"></textarea></div>
    ${exam ? '<p class="muted">You will compare your answer with the model answer and score yourself when you finish the exam.</p>' : '<button class="btn primary" data-act="reveal" style="margin-top:10px">Reveal the model answer</button><div class="ans"></div>'}`;
  const ta = $('textarea', body);
  ta.value = lsGet(key, '');
  ta.addEventListener('input', debounce(() => lsSet(key, ta.value), 300));
  const rb = $('[data-act=reveal]', body);
  if (rb) rb.addEventListener('click', () => {
    rb.remove();
    const ans = $('.ans', body);
    ans.innerHTML = `<div class="card answer"><strong>Model answer</strong><div class="md">${md(ex.answerText)}</div></div>
      <div class="rate"><span class="muted" style="align-self:center">How did you do?</span>
        <button class="btn" data-r="0">✗ Didn't know it</button><button class="btn" data-r="1">◐ Partly</button><button class="btn ok" data-r="2">✓ Knew it</button></div>`;
    $$('[data-r]', ans).forEach((b) => b.addEventListener('click', () => {
      const v = Number(b.dataset.r);
      state.progress.cards[ex.id] = v; api('/progress', { cards: { [ex.id]: v } });
      $('.rate', ans).innerHTML = `<span class="muted">Saved. ${v === 2 ? 'Great!' : 'It will stay marked so you can come back to it.'}</span>`;
      renderSidebar(ex.module, ex.id);
    }));
  });
}

// ---------------------------------------------------------------- output rendering
function isNum(v) { return typeof v === 'number' || (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v)); }
function cellHtml(v) {
  if (v === null || v === undefined) return '<td class="null">NULL</td>';
  if (typeof v === 'object') return `<td>${esc(JSON.stringify(v))}</td>`;
  return `<td class="${isNum(v) ? 'num' : ''}">${esc(v)}</td>`;
}
function pgResultHtml(r) {
  const head = `<div class="stmt-head" title="${esc(r.sql)}">${esc((r.sql || '').replace(/\s+/g, ' ').slice(0, 140))}</div>`;
  const notes = (r.notes || []).map((n) => `<div class="note">${esc(n)}</div>`).join('');
  if (r.error) return `<div class="stmt err">${head}<div class="stmt-body"><strong>ERROR:</strong> ${esc(r.error)}${r.hint ? `<br><em>Hint: ${esc(r.hint)}</em>` : ''}${r.detail ? `<br>${esc(r.detail)}` : ''}</div>${notes}</div>`;
  if (r.command === 'SKIPPED') return `<div class="stmt">${head}${notes}</div>`;
  if (r.fields) {
    const rows = r.rows || [];
    const table = `<div class="tbl-wrap"><table class="res"><thead><tr>${r.fields.map((f) => `<th>${esc(f)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map(cellHtml).join('')}</tr>`).join('')}</tbody></table></div>`;
    return `<div class="stmt">${head}<div class="stmt-body">${table}<div class="rowcount">${r.rowCount ?? rows.length} row(s)${r.truncated ? ' – only the first 300 are shown' : ''}</div></div>${notes}</div>`;
  }
  const msg = r.affected !== undefined ? `${r.command}: ${r.affected} row(s) affected` : `${r.command || 'OK'} – done`;
  return `<div class="stmt">${head}<div class="stmt-body">✓ ${esc(msg)}</div>${notes}</div>`;
}
function linesHtml(lines) {
  return (lines || []).map((l) => `<div class="stmt ${l.error ? 'err' : ''}"><div class="stmt-head">&gt; ${esc(l.cmd.replace(/\s+/g, ' ').slice(0, 160))}</div>${l.text ? `<div class="stmt-body"><pre>${esc(l.text)}</pre></div>` : ''}</div>`).join('');
}
function renderOutput(el, out, title) {
  if (!out) { el.innerHTML = ''; return; }
  let html = `<h3>${esc(title)}</h3>`;
  if (out.kind === 'pg') {
    html += (out.results || []).map(pgResultHtml).join('') || '<p class="muted">(nothing ran)</p>';
    if (out.check && (out.check.fields || out.check.error)) html += `<h3>State checked after your code</h3>${pgResultHtml({ ...out.check, sql: out.check.sql || 'check' })}`;
  } else {
    html += linesHtml(out.lines) || '<p class="muted">(nothing ran)</p>';
    if (out.check && out.check.length) html += `<h3>State checked after your code</h3>${linesHtml(out.check)}`;
  }
  el.innerHTML = html;
}

// ---------------------------------------------------------------- editor helpers
function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 4, 170), 640) + 'px'; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function editorKeys(ta, run, check) {
  ta.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); (e.shiftKey ? check : run)(); return; }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const s = ta.selectionStart, en = ta.selectionEnd;
      ta.setRangeText('  ', s, en, 'end');
      ta.dispatchEvent(new Event('input'));
    }
  });
}

// ---------------------------------------------------------------- playground
const PLAY_SAMPLES = {
  pg: "SELECT department_id, COUNT(*), ROUND(AVG(salary)) AS atlag\nFROM employees\nGROUP BY department_id\nORDER BY atlag DESC;",
  redis: 'SET koszones "Szia, Redis!"\nGET koszones\nZADD ranglista 50 Anna 40 Bela 70 Csilla\nZREVRANGE ranglista 0 -1 WITHSCORES',
  mongo: 'use feladatok\ndb.Users.find({ city: "Budapest" }, { _id: 0, name: 1, age: 1 })',
};
function renderPlayground(engine) {
  if (!PLAY_SAMPLES[engine]) engine = 'pg';
  renderSidebar(null, null);
  const page = h(`<div class="page">
    <div class="crumbs"><a href="#/">Home</a> › Playground</div>
    <h1>Playground</h1>
    <p class="muted">Experiment freely. Changes persist until you reset or restart the server.
      ${engine === 'pg' ? 'HR tables are in schema <code>hr</code>; <code>DESC employees</code> shows a table\'s columns.' : ''}
      ${engine === 'mongo' ? 'Databases: <code>feladatok</code> (Users), <code>aggregacio_gyak</code> (orders, customers, users, sessions), <code>bolt</code> (termekek).' : ''}</p>
    <div class="tabs"><a href="#/play/pg" class="${engine === 'pg' ? 'on' : ''}">SQL</a><a href="#/play/redis" class="${engine === 'redis' ? 'on' : ''}">Redis</a><a href="#/play/mongo" class="${engine === 'mongo' ? 'on' : ''}">MongoDB</a></div>
    <div class="card editor-wrap">
      <div class="editor-bar"><button class="btn primary" data-act="run">▶ Run</button><span class="lbl"><kbd>Ctrl</kbd>+<kbd>Enter</kbd></span><span class="spacer"></span>
        <button class="btn ghost" data-act="reset" title="Restore the original data">Reset database</button></div>
      <textarea class="editor" spellcheck="false" placeholder="${esc(PLACEHOLDER[engine])}"></textarea>
    </div>
    <div class="output"></div>
  </div>`);
  const ta = $('textarea', page);
  ta.value = lsGet('play:' + engine) ?? PLAY_SAMPLES[engine];
  const save = debounce(() => lsSet('play:' + engine, ta.value), 300);
  ta.addEventListener('input', () => { autoGrow(ta); save(); });
  const out = $('.output', page);
  async function run() {
    out.innerHTML = '<p class="muted">Running…</p>';
    try { renderOutput(out, await api('/run', { engine, code: ta.value }), 'Output'); }
    catch (e) { out.innerHTML = `<div class="feedback fail">${esc(e.message)}</div>`; }
  }
  editorKeys(ta, run, run);
  $('[data-act=run]', page).addEventListener('click', run);
  $('[data-act=reset]', page).addEventListener('click', async () => {
    if (!confirm('Reset the playground database to its original state?')) return;
    out.innerHTML = '<p class="muted">Resetting…</p>';
    await api('/reset', { engine });
    out.innerHTML = '<div class="feedback pass">The database has been reset.</div>';
  });
  mount(page);
  autoGrow(ta);
  ta.focus();
}

// ---------------------------------------------------------------- schema drawer
async function toggleSchema() {
  const d = $('#drawer');
  d.hidden = !d.hidden;
  if (d.hidden || state.schema) return;
  $('#drawerBody').innerHTML = '<p class="muted">Loading…</p>';
  state.schema = await api('/schema');
  const t = state.schema.tables;
  const order = ['regions', 'countries', 'locations', 'departments', 'jobs', 'employees', 'job_history', 'employee_trainings', 'mandatory_trainings'];
  const names = [...order.filter((n) => t[n]), ...Object.keys(t).filter((n) => !order.includes(n))];
  let html = '<p class="muted">PostgreSQL schema <code>hr</code> (search_path is set, so no prefix is needed).</p>';
  for (const n of names) html += `<h4>${esc(n)}</h4><div class="cols">${t[n].map(([c, ty]) => `<b>${esc(c)}</b> ${esc(ty)}`).join('<br>')}</div>`;
  html += '<h4 style="margin-top:22px">MongoDB</h4>';
  for (const [db, colls] of Object.entries(state.schema.mongo)) {
    html += `<div class="cols" style="margin-top:6px"><b>use ${esc(db)}</b></div>`;
    for (const [c, info] of Object.entries(colls)) html += `<div class="cols">· <b>${esc(c)}</b> (${info.count}) – e.g. ${esc(JSON.stringify(info.sample).slice(0, 160))}</div>`;
  }
  $('#drawerBody').innerHTML = html;
}

// ---------------------------------------------------------------- exam mode
function loadExam() { return lsGet('adatb-exam', null); }
function saveExam() { lsSet('adatb-exam', state.exam); }
function examModule() { return state.modules.find((m) => m.exam); }
function renderExamBox(box, m) {
  const ex = state.exam;
  if (ex && !ex.finished && ex.moduleId === m.id) {
    box.innerHTML = `<div class="feedback info"><strong>The exam is running.</strong> Use the task list on the left. <button class="btn primary" id="finishBtn">Finish exam</button> <button class="btn ghost" id="abortBtn">Abort</button></div>`;
    $('#finishBtn', box).addEventListener('click', finishExam);
    $('#abortBtn', box).addEventListener('click', () => { if (confirm('Abort the exam? Nothing will be saved.')) { state.exam = null; lsDel('adatb-exam'); clearExamDrafts(); updateTimer(); route(); } });
    return;
  }
  const exams = state.progress.exams || [];
  box.innerHTML = `<div class="card prompt"><strong>Ready?</strong> ${m.exercises.length} tasks, ${m.exam.minutes} minutes.
    ${exams.length ? `<div class="muted" style="margin-top:6px">Previous attempts: ${exams.slice(-5).map((e) => `${e.percent}% (${e.grade})`).join(', ')}</div>` : ''}
    <div style="margin-top:10px"><button class="btn primary" id="startExam">▶ Start exam</button>
    <span class="muted" style="font-size:13px;margin-left:8px">Outside the exam you can open the tasks in practice mode (with hints).</span></div></div>`;
  $('#startExam', box).addEventListener('click', () => {
    clearExamDrafts();
    state.exam = { moduleId: m.id, startedAt: Date.now(), endsAt: Date.now() + m.exam.minutes * 60000, results: {}, cardScores: {}, finished: false };
    saveExam(); updateTimer();
    location.hash = '#/e/' + m.exercises[0].id;
  });
}
function clearExamDrafts() {
  try { Object.keys(localStorage).filter((k) => k.startsWith('examdraft:') || k.startsWith('examcard:')).forEach((k) => localStorage.removeItem(k)); } catch { /* ignore */ }
}
function updateTimer() {
  const el = $('#examTimer');
  const ex = state.exam;
  if (!ex || ex.finished) { el.hidden = true; return; }
  const left = ex.endsAt - Date.now();
  el.hidden = false;
  if (left <= 0) { el.textContent = '00:00'; finishExam(true); return; }
  const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
  el.textContent = `⏱ ${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
  el.classList.toggle('low', left < 10 * 60000);
  el.onclick = () => { location.hash = '#/m/' + ex.moduleId; };
  el.style.cursor = 'pointer';
}
function finishExam(timeUp) {
  if (!state.exam || state.exam.finished) return;
  if (timeUp !== true && !confirm('Finish the exam and see your score?')) return;
  state.exam.finished = true;
  state.exam.finishedAt = Date.now();
  saveExam(); updateTimer();
  location.hash = '#/exam-result';
  if (timeUp === true) route();
}
function gradeOf(p) { return p >= 87 ? 5 : p >= 75 ? 4 : p >= 63 ? 3 : p >= 50 ? 2 : 1; }
function renderExamResult() {
  const ex = state.exam;
  const m = ex ? state.modules.find((x) => x.id === ex.moduleId) : examModule();
  renderSidebar(m.id, null);
  if (!ex || !ex.finished) { location.hash = '#/m/' + m.id; return; }
  const page = h(`<div class="page exam-summary"><div class="crumbs"><a href="#/">Home</a> › <a href="#/m/${m.id}">${esc(m.title)}</a> › Result</div>
    <h1>Exam result</h1><div class="sum"></div><div class="cards-rate"></div></div>`);
  function compute() {
    let got = 0, max = 0, auto = 0, autoMax = 0;
    const rows = m.exercises.map((e) => {
      max += e.points || 0;
      let pts = 0, note = '';
      if (e.type === 'card') { const s = ex.cardScores[e.id]; pts = s === undefined ? 0 : s * e.points; note = s === undefined ? 'rate below' : 'self-rated'; }
      else { const r = ex.results[e.id]; pts = r && r.pass ? e.points : 0; note = r ? (r.pass ? 'correct' : 'incorrect') : 'not attempted'; autoMax += e.points; auto += pts; }
      got += pts;
      return `<tr><td>${esc(e.title)}</td><td>${note}</td><td style="text-align:right">${pts} / ${e.points}</td></tr>`;
    });
    const pct = Math.round(100 * got / max);
    const mins = Math.round((ex.finishedAt - ex.startedAt) / 60000);
    $('.sum', page).innerHTML = `<div class="card prompt" style="display:flex;gap:28px;align-items:center;flex-wrap:wrap">
        <div><div class="grade-big">${gradeOf(pct)}</div><div class="muted">grade</div></div>
        <div><div class="grade-big">${pct}%</div><div class="muted">${got} / ${max} points</div></div>
        <div class="muted">Practical (auto-graded): ${auto} / ${autoMax}<br>Time used: ${mins} min</div>
        <div><button class="btn primary" id="saveRes">Save result</button> <a class="btn" href="#/m/${m.id}">Back</a></div></div>
      <table><thead><tr><th>Task</th><th>Status</th><th style="text-align:right">Points</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
    $('#saveRes', page).addEventListener('click', async () => {
      const rec = { percent: pct, grade: gradeOf(pct), points: got, max, minutes: mins };
      await api('/progress', { exam: rec });
      state.progress.exams.push(rec);
      state.exam = null; lsDel('adatb-exam'); clearExamDrafts();
      location.hash = '#/m/' + m.id;
    });
  }
  const cr = $('.cards-rate', page);
  const cards = m.exercises.filter((e) => e.type === 'card');
  cr.innerHTML = '<h2 style="margin-top:28px">Score your theory answers</h2>' + cards.map((e) => `
    <div class="card prompt" data-id="${e.id}"><strong>${esc(e.title)} (${e.points} p)</strong>
      <div class="md">${md(e.prompt)}</div>
      <div class="muted" style="margin-top:6px">Your answer:</div><pre style="white-space:pre-wrap;margin:4px 0">${esc(lsGet('examcard:' + e.id, '') || '(empty)')}</pre>
      <div class="card answer"><strong>Model answer</strong><div class="md">${md(e.answerText)}</div></div>
      <div class="rate"><button class="btn" data-s="0">0 points</button><button class="btn" data-s="0.5">half points</button><button class="btn" data-s="1">full points</button></div>
    </div>`).join('');
  $$('[data-s]', cr).forEach((b) => b.addEventListener('click', () => {
    const id = b.closest('[data-id]').dataset.id;
    ex.cardScores[id] = Number(b.dataset.s); saveExam();
    $$('[data-s]', b.parentElement).forEach((x) => x.classList.remove('primary'));
    b.classList.add('primary');
    compute();
  }));
  cards.forEach((e) => { const s = ex.cardScores[e.id]; if (s !== undefined) $(`[data-id="${e.id}"] [data-s="${s}"]`, cr)?.classList.add('primary'); });
  compute();
  mount(page);
}

// ---------------------------------------------------------------- boot
async function boot() {
  const theme = lsGet('theme');
  if (theme) document.documentElement.dataset.theme = theme;
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    lsSet('theme', document.documentElement.dataset.theme);
  });
  $('#schemaBtn').addEventListener('click', toggleSchema);
  $('#drawerClose').addEventListener('click', toggleSchema);
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  try {
    const [mods, prog] = await Promise.all([api('/modules'), api('/progress')]);
    state.modules = mods;
    state.progress = { exercises: {}, quiz: {}, cards: {}, exams: [], ...prog };
    for (const m of mods) for (const e of m.exercises) state.byId.set(e.id, e);
  } catch (e) {
    $('#main').innerHTML = `<div class="page"><div class="feedback fail"><strong>Cannot reach the practice server.</strong> Start it with <code>npm start</code> in the db-learning-app folder, then reload.<pre>${esc(e.message)}</pre></div></div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  setInterval(updateTimer, 1000);
  updateTimer();
  route();
}
boot();
