// app.js : アプリの脳みそ (IDシステム導入・自動保存デフォルト化・新UI対応版)

let TG = { cal: 2000, p: 150, f: 44, c: 250, label: "👨男性減量", mode: "std", alcMode: false, autoReset: true }; // ★autoResetをデフォルトtrueに変更
let lst = []; let fav = []; let myFoods = []; let hist = []; let bodyData = []; let chatHistory = []; let selIdx = -1; let editIdx = -1; 
const toHira = s => s.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60)); 

function parseNum(val) { if (typeof val !== 'string') return parseFloat(val) || 0; const half = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)); return parseFloat(half) || 0; }
function getAutoTime() { const h = new Date().getHours(); if(h >= 4 && h < 11) return "朝"; if(h >= 11 && h < 16) return "昼"; return "晩"; }

window.onload = () => {
    if (localStorage.getItem('tf_tg')) { 
        TG = JSON.parse(localStorage.getItem('tf_tg')); 
        if (TG.alcMode === undefined) TG.alcMode = false; 
        if (TG.autoReset === undefined) TG.autoReset = true; // ★ここもデフォルトtrueを保証
    }
    if (localStorage.getItem('tf_fav')) fav = JSON.parse(localStorage.getItem('tf_fav'));
    if (localStorage.getItem('tf_my')) myFoods = JSON.parse(localStorage.getItem('tf_my'));
    if (localStorage.getItem('tf_hist')) hist = JSON.parse(localStorage.getItem('tf_hist'));
    if (localStorage.getItem('tf_body')) bodyData = JSON.parse(localStorage.getItem('tf_body'));
    if (!TG.mode) TG.mode = "std";
    
    const savedData = localStorage.getItem('tf_dat'); 
    if (savedData) {
        let parsed = JSON.parse(savedData);
        lst = parsed.map((x, i) => ({...x, id: x.id || Date.now() + i}));
    }
    
    const todayStr = new Date().toLocaleDateString();
    let lastDateStr = localStorage.getItem('tf_last_date');
    if (!lastDateStr) { localStorage.setItem('tf_last_date', todayStr); lastDateStr = todayStr; }
    
    // ★自動保存（0時リセット）処理
    if (TG.autoReset && lastDateStr !== todayStr && lst.length > 0) {
        svHist(lastDateStr, JSON.parse(JSON.stringify(lst))); 
        lst = []; 
        localStorage.setItem('tf_dat', JSON.stringify(lst));
        showToast(`📅 日付が変わったため、昨日（${lastDateStr}）の記録を自動保存してリセットしたたま！`);
    }
    localStorage.setItem('tf_last_date', todayStr); 

    const d = new Date(); const today = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
    if(document.getElementById('b-date')) document.getElementById('b-date').value = today;
    if(document.getElementById('reset-date')) document.getElementById('reset-date').value = today;
    if(document.getElementById('auto-reset-chk')) document.getElementById('auto-reset-chk').checked = TG.autoReset;
    if(document.getElementById('alc-mode-chk')) document.getElementById('alc-mode-chk').checked = TG.alcMode;
    if(document.getElementById('pfc-mode')) document.getElementById('pfc-mode').value = TG.mode;
    if(document.getElementById('cust-cal')) document.getElementById('cust-cal').value = TG.cal;
    
    toggleAlcMode(true); 
    if(typeof setupChatEnterKey === 'function') setupChatEnterKey(); 
    mkCat(); mkTgt(); upd(); ren();
};

function toggleAlcMode(isInit = false) {
    if (!isInit) { TG.alcMode = document.getElementById('alc-mode-chk').checked; localStorage.setItem('tf_tg', JSON.stringify(TG)); }
    const mtrA = document.getElementById('mtr-a'); const maWrap = document.getElementById('m-a-wrap');
    if(mtrA) mtrA.style.display = TG.alcMode ? 'block' : 'none'; 
    if(maWrap) maWrap.style.display = TG.alcMode ? 'block' : 'none'; 
    upd(); ren();
}

function mkCat() {
    const d = document.getElementById('cat-btns'); if(typeof DB === 'undefined' || !d) return;
    const cats = [...new Set(DB.map(i => i[0]))];
    d.innerHTML = `<div class="c-btn fav-cat-btn" onclick="shwList('⭐',this)">⭐ お気に入り</div><div class="c-btn my-cat-btn" onclick="shwList('📂',this)">📂 My食品</div>`;
    cats.forEach(c => { const b = document.createElement('div'); b.className = 'c-btn'; b.textContent = c; b.onclick = () => shwList(c, b); d.appendChild(b); });
}

function shwList(c, btn) {
    const l = document.getElementById('f-list'); document.querySelectorAll('.c-btn').forEach(x => x.classList.remove('act'));
    if (l.style.display === 'block' && l.dataset.cat === c) { l.style.display = 'none'; return; }
    btn.classList.add('act'); l.dataset.cat = c;
    l.innerHTML = `<div class="list-head"><span>${c === '⭐' ? 'お気に入り' : (c === '📂' ? 'My食品' : c)}</span><span class="cls-btn" onclick="clsList()">× 閉じる</span></div>`;
    let itms = [];
    if (c === '📂') { if (myFoods.length === 0) l.innerHTML += `<div style="padding:15px;text-align:center;color:#666;">My食品はまだありません。</div>`; else itms = myFoods.map((x,i)=>({...x, name:x.N, isMy:true, i:i})); } 
    else { const allItems = DB.map((x, i) => ({ ...x, name:x[1], isMy:false, i:i })); if (c === '⭐') itms = allItems.filter(x => fav.includes(x.i)); else { itms = allItems.filter(x => x[0] === c); itms.sort((a, b) => (fav.includes(b.i) ? 1 : 0) - (fav.includes(a.i) ? 1 : 0)); } }
    itms.forEach(x => {
        const d = document.createElement('div'); d.className = 'f-btn'; d.innerHTML = `<span>${x.name}</span>`; d.onclick = () => x.isMy ? selMyFd(x.i) : selFd(x.i);
        const actBtn = document.createElement('span');
        if (x.isMy) { actBtn.className = 'del-icon'; actBtn.textContent = '削除'; actBtn.onclick = (e) => { e.stopPropagation(); delMyFood(x.i); }; } 
        else { actBtn.className = 'fav-icon ' + (fav.includes(x.i) ? 'act' : ''); actBtn.textContent = '★'; actBtn.onclick = (e) => { e.stopPropagation(); togFav(x.i, actBtn); }; }
        d.appendChild(actBtn); l.appendChild(d);
    });
    l.style.display = 'block';
}

function clsList() { document.getElementById('f-list').style.display = 'none'; document.querySelectorAll('.c-btn').forEach(x => x.classList.remove('act')); }

function selFd(i) {
    selIdx = i; editIdx = -1; document.getElementById('btn-reg').textContent = "リストに追加する"; clsList(); document.getElementById('amt-area').style.display = 'block';
    const d = DB[i]; const r = document.getElementById('rice-btns'); const p = document.getElementById('pst-btns'); r.innerHTML = ''; p.innerHTML = ''; r.style.display = 'none';
    if (d[1].includes("白米") || d[1].includes("玄米") || d[1].includes("オート")) { r.style.display = 'grid'; [{l:"100",v:100,s:"小盛"},{l:"150",v:150,s:"普通"},{l:"250",v:250,s:"大盛"},{l:"200",v:200,s:""},{l:"300",v:300,s:""},{l:"400",v:400,s:""}].forEach(o => mkBtn(o.l, o.v, r, o.s)); } 
    else if (d[3].includes('g')) { [50, 100, 150, 200, 250].forEach(v => mkBtn(v, v, p)); } else { [0.5, 1, 2, 3].forEach(v => mkBtn(v, v, p)); }
    const bx = document.createElement('div'); bx.className = 'dir-inp'; const unitLabel = d[3].includes('g') ? 'g' : (d[3].includes('杯') ? '杯' : '個/他');
    bx.innerHTML = `<input type="text" inputmode="decimal" placeholder="手入力" oninput="updBd(this.value)"><span class="unit-label">${unitLabel}</span>`; p.appendChild(bx);
    document.getElementById('m-time').value = getAutoTime(); 
    updBd(1); setTimeout(() => document.getElementById('amt-area').scrollIntoView({ behavior: 'smooth' }), 100);
}

function selMyFd(i) {
    selIdx = -1; editIdx = -1; document.getElementById('btn-reg').textContent = "リストに追加する"; clsList(); document.getElementById('amt-area').style.display = 'block';
    const d = myFoods[i]; document.getElementById('rice-btns').style.display = 'none'; const p = document.getElementById('pst-btns'); p.innerHTML = '';
    [0.5, 1, 2, 3].forEach(v => { const b = document.createElement('div'); b.className = 'a-btn'; b.innerHTML = `<span>${v}個</span>`; b.onclick = () => { document.querySelectorAll('.a-btn').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); document.getElementById('m-mul').value = v; calcM(); }; p.appendChild(b); });
    document.getElementById('reg-bd').style.display = 'block'; document.getElementById('m-time').value = getAutoTime(); document.getElementById('m-name').value = d.N; document.getElementById('m-p').value = d.P; document.getElementById('m-f').value = d.F; document.getElementById('m-c').value = d.C; document.getElementById('m-a').value = d.A || 0; document.getElementById('m-mul').value = 1; document.getElementById('m-cal').value = d.Cal;
    document.getElementById('pv-bar').style.display = 'block'; document.getElementById('pv-name').textContent = d.N;
    let aStr = (TG.alcMode && d.A > 0) ? ` A${d.A}` : ""; document.getElementById('pv-stat').textContent = `${d.Cal}kcal (P${d.P} F${d.F} C${d.C}${aStr})`;
    setTimeout(() => document.getElementById('amt-area').scrollIntoView({ behavior: 'smooth' }), 100);
}

function regMyFood() {
    const n = document.getElementById('m-name').value; if (!n) return alert("食品名を入力してください"); const m = parseNum(document.getElementById('m-mul').value) || 1;
    myFoods.push({ N: n, P: parseFloat(((parseNum(document.getElementById('m-p').value)||0)/m).toFixed(1)), F: parseFloat(((parseNum(document.getElementById('m-f').value)||0)/m).toFixed(1)), C: parseFloat(((parseNum(document.getElementById('m-c').value)||0)/m).toFixed(1)), A: parseFloat(((parseNum(document.getElementById('m-a').value)||0)/m).toFixed(1)), Cal: Math.round((parseNum(document.getElementById('m-cal').value)||0)/m) });
    localStorage.setItem('tf_my', JSON.stringify(myFoods)); alert(`「${n}」をMy食品に登録しました！`);
}

function delMyFood(i) { if (!confirm(`「${myFoods[i].N}」を削除しますか？`)) return; myFoods.splice(i, 1); localStorage.setItem('tf_my', JSON.stringify(myFoods)); shwList('📂', document.querySelector('.my-cat-btn')); }

function mkBtn(lbl, v, par, subLbl = "") {
    const b = document.createElement('div'); b.className = 'a-btn'; const unit = DB[selIdx][3].includes('g') ? 'g' : '';
    b.innerHTML = (subLbl ? `<span class="sub-label">${subLbl}</span>` : '') + `<span>${lbl}${unit}</span>`;
    b.onclick = () => { document.querySelectorAll('.a-btn').forEach(x => x.classList.remove('sel')); b.classList.add('sel'); updBd(v); }; par.appendChild(b);
}

function updBd(v) {
    if (selIdx < 0) return; const d = DB[selIdx]; v = parseNum(v); let m = 1; if (d[3].includes('g')) { m = v / parseFloat(d[3]); } else { m = v; }
    document.getElementById('m-mul').value = parseFloat(m.toFixed(2)); 
    const P = d[4] * m, F = d[5] * m, C = d[6] * m; 
    let unitPfcCal = (d[4]*4) + (d[5]*9) + (d[6]*4);
    let unitA = (d[0].includes("酒") || d[7] > unitPfcCal + 10) ? Math.max(0, (d[7] - unitPfcCal) / 7) : 0;
    let A = unitA * m; const Cal = Math.round((P*4)+(F*9)+(C*4)+(A*7));
    document.getElementById('pv-bar').style.display = 'block'; const dispUnit = d[3].includes('g') ? 'g' : (d[3].includes('杯') ? '杯' : '個');
    document.getElementById('pv-name').textContent = `${d[1]} (${v}${dispUnit})`; 
    let aStr = (TG.alcMode && A > 0) ? ` A${A.toFixed(1)}` : "";
    document.getElementById('pv-stat').textContent = `${Cal}kcal (P${P.toFixed(1)} F${F.toFixed(1)} C${C.toFixed(1)}${aStr})`;
    document.getElementById('m-name').value = d[1]; document.getElementById('m-p').value = d[4]; document.getElementById('m-f').value = d[5]; document.getElementById('m-c').value = d[6]; 
    document.getElementById('m-a').value = parseFloat(unitA.toFixed(1)); document.getElementById('m-cal').value = Cal;
}

function togBd() { const b = document.getElementById('reg-bd'); b.style.display = b.style.display === 'block' ? 'none' : 'block'; }
function clsBd() { const bd = document.getElementById('reg-bd'); bd.style.display = 'none'; bd.classList.remove('editing'); editIdx = -1; document.getElementById('btn-reg').textContent = "リストに追加する"; }
function openMan() { selIdx = -1; editIdx = -1; document.getElementById('btn-reg').textContent = "リストに追加する"; document.getElementById('amt-area').style.display = 'block'; document.getElementById('reg-bd').style.display = 'block'; document.getElementById('m-time').value = getAutoTime(); setTimeout(() => document.getElementById('reg-bd').scrollIntoView({ behavior: 'smooth' }), 100); }

function calcM() {
    const p = parseNum(document.getElementById('m-p').value); const f = parseNum(document.getElementById('m-f').value); const c = parseNum(document.getElementById('m-c').value); const a = parseNum(document.getElementById('m-a').value); const m = parseNum(document.getElementById('m-mul').value) || 1;
    document.getElementById('m-cal').value = Math.round((p * 4 + f * 9 + c * 4 + a * 7) * m);
    if (selIdx < 0) document.getElementById('pv-name').textContent = document.getElementById('m-name').value;
}

function addM() {
    const n = document.getElementById('m-name').value || "未入力"; const time = document.getElementById('m-time').value || "朝"; const m = parseNum(document.getElementById('m-mul').value) || 1;
    const p = parseNum(document.getElementById('m-p').value) * m; const f = parseNum(document.getElementById('m-f').value) * m; const c = parseNum(document.getElementById('m-c').value) * m; const a = parseNum(document.getElementById('m-a').value) * m;
    const cal = parseNum(document.getElementById('m-cal').value) || (p * 4 + f * 9 + c * 4 + a * 7);
    const unit = (editIdx >= 0) ? lst[editIdx].U : (selIdx >= 0 ? DB[selIdx][3] : "-");
    const newData = { id: Date.now(), N: n, P: p, F: f, C: c, A: a, Cal: Math.round(cal), U: unit, time: time };
    if (editIdx >= 0) { newData.id = lst[editIdx].id; lst[editIdx] = newData; editIdx = -1; document.getElementById('btn-reg').textContent = "リストに追加する"; document.getElementById('reg-bd').classList.remove('editing'); } else { lst.push(newData); }
    sv(); ren(); upd(); document.getElementById('amt-area').style.display = 'none'; clsBd(); document.getElementById('m-name').value = ''; document.getElementById('m-cal').value = ''; window.scrollTo(0, 0); 
}

function ren() {
    const tlArea = document.getElementById('timeline-area'); if(!tlArea) return; tlArea.innerHTML = ""; let totalCal = 0;
    const times = ["朝", "昼", "晩", "間食"]; const emojis = {"朝":"☀️", "昼":"☁️", "晩":"🌙", "間食":"☕"};
    lst.forEach(x => { if (!times.includes(x.time)) x.time = "朝"; });
    times.forEach(t => {
        const items = lst.map((x, i) => ({...x, i})).filter(x => x.time === t); if (items.length === 0) return;
        let tCal=0, tP=0, tF=0, tC=0, tA=0; items.forEach(x => { tCal+=x.Cal; tP+=x.P; tF+=x.F; tC+=x.C; tA+=(x.A||0); totalCal+=x.Cal; });
        const sec = document.createElement('div'); sec.className = 'tl-sec'; let aStr = (TG.alcMode && tA>0) ? ` <span style="color:var(--my)">A${tA.toFixed(0)}</span>` : "";
        sec.innerHTML = `<div class="tl-head ${t}"><div>${emojis[t]} ${t}</div><div class="tl-stats">${tCal}kcal (P${tP.toFixed(0)} F${tF.toFixed(0)} C${tC.toFixed(0)}${aStr})</div></div><ul class="f-list">${items.map(x => {
            let aTag = (TG.alcMode && x.A > 0) ? ` <span style="color:var(--my)">A${x.A.toFixed(1)}</span>` : ""; let isAlcClass = (x.A > 0) ? "alc" : "";
            return `<li class="f-item ${isAlcClass}"><div><strong>${x.N}</strong> <small>${x.U}</small><br><span style="font-size:12px;color:#666">${x.Cal}kcal (P${x.P.toFixed(1)} F${x.F.toFixed(1)} C${x.C.toFixed(1)}${aTag})</span></div><div class="act-btns"><button class="l-btn b-re" onclick="reAdd(${x.i})">複製</button><button class="l-btn b-ed" onclick="ed(${x.i})">編集</button><button class="l-btn b-del" onclick="del(${x.i})">消去</button></div></li>`;
        }).join('')}</ul>`; tlArea.appendChild(sec);
    });
    if(lst.length === 0) tlArea.innerHTML = "<p style='text-align:center;color:#ccc;font-size:14px;'>まだ記録がありません</p>";
    if (document.getElementById('tot-cal')) document.getElementById('tot-cal').textContent = totalCal;
}

function del(i) { lst.splice(i, 1); sv(); ren(); upd(); }
function reAdd(i) { lst.push({ ...lst[i], id: Date.now() + Math.floor(Math.random() * 1000) }); sv(); ren(); upd(); }
function ed(i) {
    const x = lst[i]; editIdx = i; selIdx = -1; document.getElementById('amt-area').style.display = 'block'; const bd = document.getElementById('reg-bd'); bd.style.display = 'block'; bd.classList.add('editing');
    document.getElementById('btn-reg').textContent = "更新して完了"; document.getElementById('m-time').value = x.time || getAutoTime(); document.getElementById('m-name').value = x.N; document.getElementById('m-p').value = x.P; document.getElementById('m-f').value = x.F; document.getElementById('m-c').value = x.C; document.getElementById('m-a').value = x.A || 0; document.getElementById('m-mul').value = 1; document.getElementById('m-cal').value = x.Cal;
    setTimeout(() => bd.scrollIntoView({ behavior: 'smooth' }), 100);
}

function sv() { localStorage.setItem('tf_dat', JSON.stringify(lst)); }

function rst() { 
    document.getElementById('reset-modal').style.display = 'flex'; 
    if(document.getElementById('auto-reset-chk')) document.getElementById('auto-reset-chk').checked = TG.autoReset;
}
function toggleAutoReset() { TG.autoReset = document.getElementById('auto-reset-chk').checked; localStorage.setItem('tf_tg', JSON.stringify(TG)); }
function closeResetModal() { document.getElementById('reset-modal').style.display = 'none'; }
function confirmReset() { 
    const d = document.getElementById('reset-date').value; 
    if (!d) return alert("日付を選択してください"); 
    const dateStr = new Date(d).toLocaleDateString(); 
    svHist(dateStr, JSON.parse(JSON.stringify(lst))); 
    lst = []; sv(); ren(); upd(); closeResetModal(); 
    if(typeof showToast === 'function') showToast(`${dateStr} の記録として保存し、\n画面をリセットしたたま！`); else alert(`${dateStr} の記録として保存し、リセットしました。`);
}

function svHist(d, l) { const i = hist.findIndex(h => h.d === d); if (i >= 0) hist.splice(i, 1); const t = { Cal: 0, P: 0, F: 0, C: 0 }; l.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; }); hist.unshift({ d: d, s: t, l: l }); if (hist.length > 30) hist.pop(); localStorage.setItem('tf_hist', JSON.stringify(hist)); }
function togHist() { const a = document.getElementById('hist-area'); if (a.style.display === 'block') a.style.display = 'none'; else { a.style.display = 'block'; rHist(); } }

function rHist() {
    const d = document.getElementById('h-list'); if(!d) return; d.innerHTML = ""; if (!hist.length) d.innerHTML = "<p style='text-align:center'>履歴なし</p>";
    hist.forEach((h, i) => {
        const foodsHtml = h.l.map(f => `<div class="hf-row"><span class="hf-name">${f.time ? `[${f.time}] ` : ''}${f.N}</span><span class="hf-vals">${f.Cal}kcal</span></div>`).join('');
        const c = document.createElement('div'); c.className = 'h-card-wrap';
        c.innerHTML = `<div class="h-card"><div class="h-summary" onclick="document.getElementById('h-det-${i}').style.display = document.getElementById('h-det-${i}').style.display === 'block' ? 'none' : 'block'"><div class="h-info"><div><span class="h-date">${h.d}</span> <span class="h-meta">${h.s.Cal}kcal</span></div><div class="h-meta" style="font-size:10px;">(P${h.s.P.toFixed(0)} F${h.s.F.toFixed(0)} C${h.s.C.toFixed(0)})</div><div class="h-toggle-hint">▼ 詳細</div></div><div class="h-btns"><button class="h-btn h-b-res" onclick="event.stopPropagation(); resHist(${i})">復元</button><button class="h-btn h-b-cp" onclick="event.stopPropagation(); cpHist(${i})">コピー</button><button class="h-btn h-b-del" onclick="event.stopPropagation(); delHist(${i})">削除</button></div></div><div id="h-det-${i}" class="h-detail">${foodsHtml}</div></div>`; d.appendChild(c);
    });
}

function resHist(i) { if (!confirm("追加しますか？")) return; const addItems = hist[i].l.map((x, idx) => ({...x, id: Date.now() + idx})); lst = lst.concat(addItems); sv(); ren(); upd(); if(typeof showToast === 'function') showToast("履歴から復元したたま！"); else alert("復元しました"); }
function cpHist(i) { const h = hist[i]; let t = `【${h.d}】\n`; h.l.forEach(x => t += `${x.time?`[${x.time}] `:''}${x.N} ${x.Cal}kcal\n`); navigator.clipboard.writeText(t).then(() => { if(typeof showToast === 'function') showToast("コピー完了したたま！"); else alert("コピーしました"); }); }
function delHist(i) { if (!confirm("削除しますか？")) return; hist.splice(i, 1); localStorage.setItem('tf_hist', JSON.stringify(hist)); rHist(); }
function togFav(i, el) { const x = fav.indexOf(i); if (x >= 0) fav.splice(x, 1); else fav.push(i); localStorage.setItem('tf_fav', JSON.stringify(fav)); el.classList.toggle('act'); }

function filterF() {
    const rawV = document.getElementById('s-inp').value.trim(); const r = document.getElementById('s-res'); r.innerHTML = ""; if (!rawV) { r.style.display = 'none'; return; }
    const query = toHira(rawV).toLowerCase(); const isPartialAllowed = query.length >= 2; let results = [];
    DB.forEach((x, i) => {
        const name = toHira(x[1]).toLowerCase(); const keys = x[2] ? toHira(x[2]).toLowerCase() : ""; let score = 0;
        if (name === query || keys.split(' ').includes(query)) score = 1000; else if (name.startsWith(query) || keys.split(' ').some(k => k.startsWith(query))) score = 500; else if (isPartialAllowed && (name.includes(query) || keys.includes(query))) score = 100;
        if (score > 0) results.push({ item: x, index: i, score: score });
    });
    if (results.length === 0) { r.style.display = 'none'; return; }
    results.sort((a, b) => b.score - a.score); r.style.display = 'block';
    results.forEach(res => { const d = document.createElement('div'); d.className = 's-item'; d.innerHTML = `<strong>${res.item[1]}</strong>`; d.onclick = () => { selFd(res.index); r.style.display = 'none'; }; r.appendChild(d); });
}

function mkTgt() {
    const b = document.getElementById('tgt-btns'); if(!b) return; b.innerHTML = "";
    [{v:1200,l:"女性小食"},{v:1600,l:"👩女性減量"},{v:2000,l:"👨男性減量"},{v:2400,l:"活動・増量"}].forEach(t => {
        const d = document.createElement('div'); d.className = 'tg-btn ' + (TG.cal === t.v ? 'act' : ''); d.innerHTML = `<span style="font-size:9px;color:#666">${t.l}</span><strong>${t.v}</strong>`;
        d.onclick = () => { TG = { cal: t.v, ...calcPFC(t.v, TG.mode), label: t.l, mode: TG.mode, alcMode: TG.alcMode, autoReset: TG.autoReset }; localStorage.setItem('tf_tg', JSON.stringify(TG)); if(document.getElementById('cust-cal')) document.getElementById('cust-cal').value = t.v; if(document.getElementById('pfc-mode')) document.getElementById('pfc-mode').value = TG.mode; upd(); mkTgt(); }; b.appendChild(d);
    });
}
function toggleTgt() { const b = document.getElementById('tgt-btns'); const c = document.getElementById('cust-tgt'); const d = (b.style.display === 'grid'); b.style.display = d ? 'none' : 'grid'; c.style.display = d ? 'none' : 'flex'; }
function calcPFC(c, m) {
    let p=0, f=0;
    if (m === "lowfat") { p = c * 0.3 / 4; f = c * 0.1 / 9; } else if (m === "muscle") { p = c * 0.4 / 4; f = c * 0.2 / 9; } else if (m === "keto") { p = c * 0.3 / 4; f = c * 0.6 / 9; } else { p = c * 0.3 / 4; f = c * 0.2 / 9; }
    return { p: p, f: f, c: (c - (p * 4 + f * 9)) / 4 };
}
function upd() {
    const t = { Cal: 0, P: 0, F: 0, C: 0, A: 0 }; lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; t.A += (x.A || 0); });
    if(document.getElementById('cur-cal')) document.getElementById('cur-cal').textContent = t.Cal; 
    if(document.getElementById('cur-p')) document.getElementById('cur-p').textContent = t.P.toFixed(0); 
    if(document.getElementById('cur-f')) document.getElementById('cur-f').textContent = t.F.toFixed(0); 
    if(document.getElementById('cur-c')) document.getElementById('cur-c').textContent = t.C.toFixed(0);
    
    const setBar = (k, v, tg, u) => {
        const r = tg - v; const el = document.getElementById('bar-' + k.toLowerCase()); const tx = document.getElementById('rem-' + k.toLowerCase()); const tbox = document.getElementById('bar-text-' + k.toLowerCase());
        if(el) { let pct = Math.min((v / tg) * 100, 100); el.style.width = pct + '%'; el.className = 'bar ' + (r < 0 ? 'ov' : ''); }
        if(tx) { tx.className = 'rem ' + (r < 0 ? 'ov' : ''); tx.textContent = r < 0 ? `+${Math.abs(r).toFixed(0)}${u}` : `残${r.toFixed(0)}${u}`; }
        if(tbox) tbox.textContent = `${v.toFixed(0)} / ${Math.round(tg)}${u}`;
    };
    setBar('Cal', t.Cal, TG.cal, 'kcal'); setBar('P', t.P, TG.p, 'g'); setBar('F', t.F, TG.f, 'g'); setBar('C', t.C, TG.c, 'g');
    
    if (TG.alcMode) { let elA = document.getElementById('bar-a'); let tboxA = document.getElementById('bar-text-a'); if(elA) elA.style.width = Math.min((t.A / 50) * 100, 100) + '%'; if(tboxA) tboxA.textContent = `${t.A.toFixed(1)}g`; }
    const modeNames = { std: "標準(3:2:5)", lowfat: "ローファット(3:1:6)", muscle: "筋肥大(4:2:4)", keto: "ケト(3:6:1)" }; const modeName = modeNames[TG.mode] || "カスタム";
    if(document.getElementById('tgt-disp')) document.getElementById('tgt-disp').textContent = `${TG.cal}kcal [${modeName.split('(')[0]}] ▼`;
    if(document.getElementById('pfc-ratio-disp')) document.getElementById('pfc-ratio-disp').textContent = modeName;
}
function applyCust() {
    let inputCal = parseNum(document.getElementById('cust-cal').value); const c = inputCal > 0 ? inputCal : TG.cal; const selectedMode = document.getElementById('pfc-mode').value;
    TG = { cal: c, ...calcPFC(c, selectedMode), label: "カスタム", mode: selectedMode, alcMode: document.getElementById('alc-mode-chk').checked, autoReset: TG.autoReset };
    localStorage.setItem('tf_tg', JSON.stringify(TG)); upd(); toggleTgt(); mkTgt(); 
}

function cpRes() { let t = `【${new Date().toLocaleDateString()}】\n`; lst.forEach(x => t += `${x.time ? `[${x.time}] ` : ''}${x.N} ${x.Cal}kcal\n`); navigator.clipboard.writeText(t).then(() => { if(typeof showToast === 'function') showToast("📝 コピー完了！"); }); }

function importData(input) {
    const file = input.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result); const safeNum = (v) => isNaN(parseFloat(v)) ? 0 : parseFloat(v);
            if (data.dat) { let rawLst = JSON.parse(data.dat); let fixedLst = rawLst.map(x => ({ id: x.id || Date.now() + Math.floor(Math.random()*1000), N: x.N || x.n || "不明な食品", P: safeNum(x.P !== undefined ? x.P : x.p), F: safeNum(x.F !== undefined ? x.F : x.f), C: safeNum(x.C !== undefined ? x.C : x.c), A: safeNum(x.A), Cal: Math.round(safeNum(x.Cal !== undefined ? x.Cal : x.cal)), U: x.U || x.u || "-", time: x.time || "朝" })); localStorage.setItem('tf_dat', JSON.stringify(fixedLst)); }
            if (data.hist) { let rawHist = JSON.parse(data.hist); let fixedHist = rawHist.map(h => ({ d: h.d || "不明な日", s: { P: safeNum(h.s?.P !== undefined ? h.s.P : h.s?.p), F: safeNum(h.s?.F !== undefined ? h.s.F : h.s?.f), C: safeNum(h.s?.C !== undefined ? h.s.C : h.s?.c), Cal: Math.round(safeNum(h.s?.Cal !== undefined ? h.s.Cal : h.s?.cal)) }, l: (h.l || []).map(x => ({ id: x.id || Date.now() + Math.floor(Math.random()*1000), N: x.N || x.n || "不明", P: safeNum(x.P !== undefined ? x.P : x.p), F: safeNum(x.F !== undefined ? x.F : x.f), C: safeNum(x.C !== undefined ? x.C : x.c), A: safeNum(x.A), Cal: Math.round(safeNum(x.Cal !== undefined ? x.Cal : x.cal)), U: x.U || x.u || "-", time: x.time || "朝" })) })); localStorage.setItem('tf_hist', JSON.stringify(fixedHist)); }
            if (data.my) { let rawMy = JSON.parse(data.my); let fixedMy = rawMy.map(x => ({ N: x.N || x.n || "不明", P: safeNum(x.P !== undefined ? x.P : x.p), F: safeNum(x.F !== undefined ? x.F : x.f), C: safeNum(x.C !== undefined ? x.C : x.c), A: safeNum(x.A), Cal: Math.round(safeNum(x.Cal !== undefined ? x.Cal : x.cal)) })); localStorage.setItem('tf_my', JSON.stringify(fixedMy)); }
            if(data.tg) { let tgData = JSON.parse(data.tg); if(tgData.alcMode===undefined) tgData.alcMode = false; if(tgData.autoReset===undefined) tgData.autoReset=true; localStorage.setItem('tf_tg', JSON.stringify(tgData)); }
            if(data.fav) localStorage.setItem('tf_fav', data.fav); if(data.date) localStorage.setItem('tf_date', data.date); if(data.body) localStorage.setItem('tf_body', data.body);
            alert("✅ データの修復とお引越しが完了しました！リロードします。"); location.reload();
        } catch (err) { alert("ファイルが正しくありません。エラー: " + err.message); }
    }; reader.readAsText(file);
}

function exportData() {
    const data = { dat: localStorage.getItem('tf_dat'), tg: localStorage.getItem('tf_tg'), fav: localStorage.getItem('tf_fav'), my: localStorage.getItem('tf_my'), hist: localStorage.getItem('tf_hist'), date: localStorage.getItem('tf_date'), body: localStorage.getItem('tf_body') };
    const blob = new Blob([JSON.stringify(data)], {type: "text/json"}); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `pfc_backup_${new Date().toISOString().slice(0,10)}.json`; link.click();
}

function drawGraph(type, btn) {
    document.querySelectorAll('.g-btn').forEach(b => b.classList.remove('act')); if(btn) btn.classList.add('act'); const box = document.getElementById('chart-box'); if(!box) return; box.innerHTML = ''; let data = []; const today = new Date();
    if (type === 'week') { for (let i = 6; i >= 0; i--) { const d = new Date(today); d.setDate(today.getDate() - i); const ds = d.toLocaleDateString(); const log = hist.find(h => h.d === ds); let s = log ? log.s : { Cal:0, P:0, F:0, C:0 }; if (i === 0 && lst.length > 0) { const t = { Cal: 0, P: 0, F: 0, C: 0 }; lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; }); s = t; } data.push({ label: `${d.getDate()}日`, s: s, d: ds }); } } else { data = hist.slice(0, 30).reverse().map(h => ({ label: h.d.split('/')[2], s: h.s, d: h.d })); }
    if (data.length === 0) { box.innerHTML = '<p style="margin:auto;color:#ccc">データなし</p>'; return; }
    const total = data.reduce((acc, cur) => acc + cur.s.Cal, 0); const avg = data.length > 0 ? Math.round(total / data.length) : 0;
    document.getElementById('stat-txt').innerHTML = `期間平均: ${avg}kcal <span style="font-size:10px;color:#999">(合計: ${total}kcal)</span><br><span style="font-size:10px;">グラフの棒をタップで詳細</span>`;
    const maxVal = Math.max(...data.map(d => d.s.Cal), TG.cal) || 2000; const line = document.createElement('div'); line.className = 'target-line'; line.style.bottom = (TG.cal/maxVal)*100 + '%'; line.innerHTML = `<span class="target-val">${TG.cal}</span>`; box.appendChild(line);
    data.forEach(d => {
        const h = Math.min((d.s.Cal / maxVal) * 100, 100); const grp = document.createElement('div'); grp.className = 'bar-grp'; const col = document.createElement('div'); col.className = 'bar-col'; col.style.height = h + '%'; const totalCal = (d.s.P*4 + d.s.F*9 + d.s.C*4) || 1;
        col.innerHTML = `<div class="seg-p" style="height:${(d.s.P*4/totalCal)*100}%;"></div><div class="seg-f" style="height:${(d.s.F*9/totalCal)*100}%;"></div><div class="seg-c" style="height:${(d.s.C*4/totalCal)*100}%;"></div>`; grp.innerHTML = `<span class="bar-lbl">${d.label}</span>`; grp.appendChild(col);
        grp.onclick = () => { document.getElementById('stat-txt').innerHTML = `${d.d}<br>総摂取:${d.s.Cal}kcal<br><span style="color:#e74c3c">P:${d.s.P.toFixed(1)}</span> <span style="color:#f1c40f">F:${d.s.F.toFixed(1)}</span> <span style="color:#3498db">C:${d.s.C.toFixed(1)}</span>`; }; box.appendChild(grp);
    });
}

function saveBody() {
    const d = document.getElementById('b-date').value; const w = parseNum(document.getElementById('b-weight').value); const f = parseNum(document.getElementById('b-fat').value); const waist = parseNum(document.getElementById('b-waist').value);
    if(!d || (!w && !f && !waist)) return alert("日付と数値を入力してください");
    const idx = bodyData.findIndex(x => x.date === d); const rec = { date: d, w: w, f: f, waist: waist }; if(idx >= 0) bodyData[idx] = rec; else bodyData.push(rec);
    bodyData.sort((a,b) => new Date(a.date) - new Date(b.date)); localStorage.setItem('tf_body', JSON.stringify(bodyData)); if(typeof showToast === 'function') showToast("📉 体組成を記録したたま！"); document.querySelector('.body-inp-grid').classList.remove('editing-mode'); document.getElementById('b-weight').value = ''; document.getElementById('b-fat').value = ''; document.getElementById('b-waist').value = ''; drawBodyGraph('A', document.querySelector('.b-tog-btn')); renderBodyList();
}
function editBody(i) { const d = bodyData[i]; document.getElementById('b-date').value = d.date; document.getElementById('b-weight').value = d.w || ''; document.getElementById('b-fat').value = d.f || ''; document.getElementById('b-waist').value = d.waist || ''; const grid = document.querySelector('.body-inp-grid'); grid.scrollIntoView({ behavior: 'smooth', block: 'center' }); grid.classList.add('editing-mode'); }
function deleteBody(i) { if(!confirm("この記録を削除しますか？")) return; bodyData.splice(i, 1); localStorage.setItem('tf_body', JSON.stringify(bodyData)); drawBodyGraph('A', document.querySelector('.b-tog-btn')); renderBodyList(); }
function renderBodyList() { const d = document.getElementById('body-hist-list'); if(!d) return; d.innerHTML = bodyData.slice().reverse().map((x, i) => { const originalIdx = bodyData.length - 1 - i; return `<div class="b-hist-row" onclick="editBody(${originalIdx})"><span>${x.date}</span><span>${x.w?x.w+'kg':'-'} / ${x.f?x.f+'%':'-'} / ${x.waist?x.waist+'cm':'-'}</span><button class="b-del-btn" onclick="event.stopPropagation(); deleteBody(${originalIdx})">削除</button></div>`; }).join(''); }
function drawBodyGraph(mode, btn) {
    document.querySelectorAll('.b-tog-btn').forEach(b => b.classList.remove('act')); if(btn) btn.classList.add('act'); const box = document.getElementById('body-chart-area'); if(!box) return; box.innerHTML = ''; const legend = document.getElementById('body-legend'); legend.innerHTML = ''; 
    if(bodyData.length === 0) { box.innerHTML = '<p style="padding:20px;text-align:center;color:#ccc">データがありません</p>'; return; }
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 300 150"); const datasets = [];
    if (mode === 'A') { datasets.push({ key: 'w', color: '#3498db', label: '体重', unit:'kg' }); datasets.push({ key: 'f', color: '#e67e22', label: '体脂肪率', unit:'%' }); datasets.push({ key: 'waist', color: '#2ecc71', label: 'ウエスト', unit:'cm' }); } else { datasets.push({ key: 'lbm', color: '#e74c3c', label: '除脂肪', unit:'kg' }); datasets.push({ key: 'fm', color: '#f1c40f', label: '脂肪量', unit:'kg' }); }
    const dataPoints = bodyData.slice(-14); const xStep = 260 / (dataPoints.length - 1 || 1); 
    datasets.forEach((ds) => {
        let pts = ""; const vals = dataPoints.map(d => { if(ds.key === 'w') return d.w; if(ds.key === 'f') return d.f; if(ds.key === 'waist') return d.waist; if(ds.key === 'fm') return (d.w && d.f) ? (d.w * d.f / 100) : 0; if(ds.key === 'lbm') return (d.w && d.f) ? (d.w - (d.w * d.f / 100)) : 0; return 0; });
        const max = Math.max(...vals) || 100; const min = Math.min(...vals.filter(v=>v>0)) || 0; const range = max - min || 1; const current = vals[vals.length-1] || 0;
        if(Math.max(...vals) > 0) { legend.innerHTML += `<div class="bl-item"><div class="bl-dot" style="background:${ds.color}"></div><span>${ds.label}: ${current.toFixed(1)}${ds.unit} <span style="color:#999;font-size:9px;">(${min.toFixed(0)}~${max.toFixed(0)})</span></span></div>`; }
        vals.forEach((v, i) => {
            if(v > 0) { const x = 20 + i * xStep; const y = 130 - ((v - min) / range * 110); pts += `${x},${y} `; const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle"); dot.setAttribute("cx", x); dot.setAttribute("cy", y); dot.setAttribute("r", "4"); dot.setAttribute("fill", ds.color); dot.setAttribute("class", "g-dot"); dot.onclick = () => { const pop = document.getElementById('body-pop'); pop.style.display = 'block'; pop.style.left = (x/300*100) + '%'; pop.style.top = '10px'; pop.innerHTML = `${dataPoints[i].date}<br>${ds.label}: ${v.toFixed(1)}`; setTimeout(()=>pop.style.display='none', 2000); }; svg.appendChild(dot); }
        });
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline"); poly.setAttribute("points", pts); poly.setAttribute("stroke", ds.color); poly.setAttribute("class", "g-line"); svg.prepend(poly);
    });
    if(dataPoints.length > 0){
        const startTxt = document.createElementNS("http://www.w3.org/2000/svg", "text"); startTxt.setAttribute("x", 20); startTxt.setAttribute("y", 148); startTxt.setAttribute("class", "g-label"); startTxt.textContent = dataPoints[0].date.slice(5); svg.appendChild(startTxt);
        const endTxt = document.createElementNS("http://www.w3.org/2000/svg", "text"); endTxt.setAttribute("x", 280); endTxt.setAttribute("y", 148); endTxt.setAttribute("class", "g-label"); endTxt.setAttribute("text-anchor", "end"); endTxt.textContent = dataPoints[dataPoints.length-1].date.slice(5); svg.appendChild(endTxt);
    }
    box.appendChild(svg);
}

// ----------------------------------------------------
// ここから下（AI通信、マイク制御、UI操作など）は後半へ続く！
// ----------------------------------------------------
// ▼▼▼ API通信・外部連携・マイク・AI制御 ▼▼▼

const gasUrl = "https://script.google.com/macros/s/AKfycbxfD_oYqqac1rG0U1Po9cWiHGq1jslASe2GQhEmVtQj8RjDTeIvVtHyA8tpeKHQhzoN/exec";
let recognition; let isRecording = false; let activeMicTarget = null; // 'voice' or 'chat'

// ★欠落していたチャット開閉関数を復活
function toggleChat() { 
    const win = document.getElementById('tama-chat-window'); 
    const btn = document.getElementById('tama-chat-btn'); 
    if (!win || !btn) return;
    if (win.style.display === 'flex') { 
        win.style.display = 'none'; 
        btn.style.display = 'flex'; 
    } else { 
        win.style.display = 'flex'; 
        btn.style.display = 'none'; 
        const box = document.getElementById('chat-messages');
        if(box) box.scrollTop = box.scrollHeight; // 開いた時に一番下にスクロール
    } 
}

// ★欠落していたEnterキー送信関数を復活
function setupChatEnterKey() { 
    const input = document.getElementById('chat-input'); 
    if (!input) return; 
    input.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) sendTamaChat(); 
    }); 
}

const forceStopMic = () => {
    if (isRecording) { 
        isRecording = false; 
        const vMicBtn = document.getElementById('v-main-mic'); 
        const vStatusText = document.getElementById('v-status-text');
        const cMicBtn = document.getElementById('mic-btn');
        
        if(vMicBtn) { vMicBtn.classList.remove('listening'); if(vStatusText) vStatusText.innerText = "マイクがオフだたま！"; }
        if(cMicBtn) cMicBtn.classList.remove('recording');
        
        try { if (recognition) recognition.abort(); } catch(e) {} 
    }
};

document.addEventListener('visibilitychange', () => { if (document.hidden) forceStopMic(); });
window.addEventListener('pagehide', forceStopMic); window.addEventListener('blur', forceStopMic);

function showToast(msg) {
    let toast = document.getElementById('tama-toast');
    if (!toast) { toast = document.createElement('div'); toast.id = 'tama-toast'; toast.style.cssText = 'position:fixed; top:20px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:#fff; padding:12px 20px; border-radius:30px; font-size:13px; z-index:999999; text-align:center; box-shadow:0 4px 15px rgba(0,0,0,0.3); transition: opacity 0.3s ease; font-weight:bold; white-space:pre-wrap; width:max-content; max-width:90%; pointer-events:none;'; document.body.appendChild(toast); }
    toast.innerText = msg; toast.style.opacity = '1'; toast.style.display = 'block'; setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.style.display = 'none', 300); }, 3000);
}

window.openRecipe = function(keywords, type) {
    const q = encodeURIComponent(keywords); let url = "";
    if(type === 'delish') url = `https://delishkitchen.tv/search?q=${q}`;
    if(type === 'nadia') url = `https://oceans-nadia.com/search?q=${q}`;
    if(type === 'youtube') url = `https://www.youtube.com/results?search_query=${q}+レシピ`;
    window.open(url, "_blank");
};

window.openChatGPTAndCopy = function(foodName) {
    const text = `「${foodName}」の一般的なカロリーと、PFC（タンパク質・脂質・炭水化物）の数値を調べてください。\n\nまた、私が食事管理アプリにそのままコピペして記録できるよう、回答の最後に以下のフォーマットの〇〇に数値を埋めたテキストを、ワンタップでコピーできるように「マークダウンのコードブロック（\`\`\`）」で囲んで出力してください。\n\n\`\`\`\n${foodName}を食べたよ！カロリーは〇〇kcal、Pは〇〇g、Fは〇〇g、Cは〇〇gだって！\n\`\`\``;
    const textArea = document.createElement("textarea"); textArea.value = text; textArea.style.position = 'fixed'; textArea.style.top = '0'; textArea.style.left = '0'; textArea.style.opacity = '0'; document.body.appendChild(textArea); textArea.focus(); textArea.select(); try { document.execCommand('copy'); } catch (err) {} document.body.removeChild(textArea);
    if (navigator.clipboard) { navigator.clipboard.writeText(text).catch(()=>{}); }
    showToast("🤖 質問文をコピーしたたま！\nそのまま貼り付けて聞いてね！"); setTimeout(() => { window.open("https://chatgpt.com/", "_blank"); }, 300);
};

// 🎤 通常チャット用マイク
function toggleMic() {
    activeMicTarget = 'chat';
    const micBtn = document.getElementById('mic-btn'); const inputEl = document.getElementById('chat-input');
    if (isRecording) { forceStopMic(); return; }
    startRecognition(
        () => { micBtn.classList.add('recording'); inputEl.placeholder = "聞いてるたま！喋って！"; inputEl.value = ''; },
        (text) => { inputEl.value = text; sendTamaChat(); }
    );
}

// 🎙️ 新UI・ボイス専用画面用マイク
window.toggleVoiceMic = function() {
    activeMicTarget = 'voice';
    const vMicBtn = document.getElementById('v-main-mic'); const vStatusText = document.getElementById('v-status-text'); const vInputEl = document.getElementById('v-chat-input');
    if (isRecording) { forceStopMic(); return; }
    startRecognition(
        () => { vMicBtn.classList.add('listening'); vStatusText.innerText = "たまちゃんが聞いてるたま！"; vInputEl.value = ''; },
        (text) => { vInputEl.value = text; sendVoiceChat(); }
    );
};

function startRecognition(onStartCallback, onResultCallback) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition; 
    if (!SpeechRecognition) { showToast("お使いのブラウザは音声入力非対応だたま！"); return; }
    
    recognition = new SpeechRecognition(); recognition.lang = 'ja-JP'; recognition.continuous = false; recognition.interimResults = false; 
    
    recognition.onstart = () => { isRecording = true; onStartCallback(); };
    recognition.onresult = (event) => { if (!isRecording) return; const txt = event.results[0][0].transcript; forceStopMic(); onResultCallback(txt); };
    recognition.onerror = (event) => { 
        forceStopMic(); 
        if (event.error === 'not-allowed') showToast("マイクの許可がないみたいだたま！\niPhoneのホーム画面からだと使えないことがあるからSafariで開いてたま！");
    };
    recognition.onend = () => { if (isRecording) { forceStopMic(); } };
    recognition.start();
}

// ▼ 通常チャットからの送信
async function sendTamaChat() {
    const inputEl = document.getElementById('chat-input'); const text = inputEl.value.trim(); if (!text) return;
    addChatMsg('user', text); inputEl.value = ''; inputEl.disabled = true; const loadingId = addChatMsg('bot', 'たまちゃん考え中...');
    await processAIChat(text, loadingId);
    inputEl.disabled = false;
}

// ▼ 新UI ボイス専用画面からの送信 (★ここを超賢く修正)
window.sendVoiceChat = async function() {
    const inputEl = document.getElementById('v-chat-input'); const text = inputEl.value.trim(); if (!text) return;
    const vStatusText = document.getElementById('v-status-text');
    inputEl.value = ''; inputEl.disabled = true; 
    vStatusText.innerText = `「${text}」\n\n🤔 考え中だたま...`;
    
    // 裏側のチャットウィンドウにも履歴を残す
    addChatMsg('user', text); const loadingId = addChatMsg('bot', 'たまちゃん考え中...');
    
    // 処理結果をオブジェクトで受け取る
    const result = await processAIChat(text, loadingId);
    
    vStatusText.innerText = result.reply || "処理が完了したたま！";
    inputEl.disabled = false;
    
    if (result.needsFollowUp || !result.isActionDone) {
        // 【検索が必要な場合や雑談の時】
        // 1.5秒だけボイス画面でテキストを見せた後、自動でチャットウィンドウに引き継ぐ！
        setTimeout(() => { 
            if(typeof closeVoiceUI === 'function') closeVoiceUI(); 
            const win = document.getElementById('tama-chat-window');
            const btn = document.getElementById('tama-chat-btn');
            if(win) win.style.display = 'flex';
            if(btn) btn.style.display = 'none';
            const box = document.getElementById('chat-messages');
            if(box) box.scrollTop = box.scrollHeight;
        }, 1500);
    } else {
        // 【記録が成功した時】
        // 2.5秒後にスマートにボイス画面を閉じるだけ
        setTimeout(() => { if(typeof closeVoiceUI === 'function') closeVoiceUI(); }, 2500);
    }
}

// AIとの通信コア処理（★戻り値をオブジェクトに変更）
async function processAIChat(text, loadingId) {
    const currentCal = lst.reduce((a,b)=>a+b.Cal,0); const currentP = lst.reduce((a,b)=>a+b.P,0); const currentF = lst.reduce((a,b)=>a+b.F,0); const currentC = lst.reduce((a,b)=>a+b.C,0);
    const d = new Date(); const timeStr = `${d.getHours()}時${d.getMinutes()}分`; const alcStr = TG.alcMode ? "ON" : "OFF";
    
    const context = `【目標】Cal:${TG.cal} P:${TG.p.toFixed(0)} F:${TG.f.toFixed(0)} C:${TG.c.toFixed(0)}\n【現在摂取】Cal:${currentCal} P:${currentP.toFixed(0)} F:${currentF.toFixed(0)} C:${currentC.toFixed(0)}\n【現在時刻】${timeStr}\n【酒飲みモード】${alcStr}\n【現在の今日の食事記録リスト(ID付き)】\n${lst.length > 0 ? lst.map(x => `[ID: ${x.id}] ${x.time} | ${x.N} (${x.Cal}kcal)`).join('\n') : 'まだ記録なし'}`;
    
    let historyText = chatHistory.map(m => `${m.role === 'user' ? 'あなた' : 'たまちゃん'}: ${m.text}`).join('\n'); let userPrefText = "";
    if (myFoods && myFoods.length > 0) { userPrefText += `\n【ユーザーのMy食品】\n${myFoods.map(x => `- ${x.N} (P${x.P} F${x.F} C${x.C} ${x.Cal}kcal)`).join('\n')}\n`; }
    if (fav && fav.length > 0 && typeof DB !== 'undefined') { let favNames = fav.map(id => DB[id] ? DB[id][1] : "").filter(n => n); if(favNames.length > 0) { userPrefText += `【ユーザーのお気に入り】\n${favNames.join(', ')}\n`; } }
    
    let cheatSheetText = "";
    if (typeof DB !== 'undefined') {
        let matchedFoods = []; const normalizedText = toHira(text).toLowerCase();
        DB.forEach(x => {
            const nameHira = toHira(x[1]).toLowerCase(); const keys = x[2] ? x[2].split(' ') : []; let isMatch = false;
            if (normalizedText.includes(nameHira)) isMatch = true; else { for (let k of keys) { if (!k) continue; let kHira = toHira(k).toLowerCase(); if (normalizedText.includes(kHira)) { isMatch = true; break; } } }
            if (isMatch) matchedFoods.push(`- ${x[1]}(${x[3]}あたり): P ${x[4]}g, F ${x[5]}g, C ${x[6]}g, カロリー ${x[7]}kcal`);
        });
        if (matchedFoods.length > 0) cheatSheetText = `\n【カンペ(公式データ)】\n${matchedFoods.slice(0, 5).join('\n')}\n`;
    }

    const prompt = `${typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'あなたは「たまちゃん」です。'}\n=== 現在の状況 ===\n${context}\n=== 会話履歴 ===\n${historyText}\n${cheatSheetText}\n${userPrefText}\n=== ユーザーの発言 ===\n${text}`;

    try {
        const response = await fetch(gasUrl, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
        const data = await response.json(); let rawText = data.candidates[0].content.parts[0].text;
        rawText = rawText.replace(/\*\*/g, "").replace(/^たまちゃん:\s*/i, "").replace(/たまちゃんの返答:/g, "").replace(/たまちゃん:\s*/i, ""); 

        let botReply = ""; let autoFood = null; let replaceFood = null; let targetFoodName = null; let deleteFood = null; let unknownFood = null; let recipeKeywords = null;
        let isActionDone = false;
        
        const recMatch = rawText.match(/\[RECIPE\]\s*(.+)/);
        if (recMatch) { recipeKeywords = recMatch[1].trim(); rawText = rawText.replace(recMatch[0], ""); }

        const dataIdx = rawText.indexOf("[DATA]"); const repIdx = rawText.indexOf("[REPLACE]"); const delIdx = rawText.indexOf("[DELETE]"); const unkIdx = rawText.indexOf("[UNKNOWN]");

        if (dataIdx !== -1) {
            botReply = rawText.substring(0, dataIdx).trim(); let dStr = rawText.substring(dataIdx + 6).trim(); let parts = dStr.split('|'); let tZone = parts.length > 1 ? parts[0].trim() : getAutoTime(); let fStr = parts.length > 1 ? parts[1].trim() : parts[0].trim(); let d = fStr.split(/,|、/); 
            if (d.length >= 4) { let p = parseFloat(d[1].replace(/[^\d.]/g, "")) || 0; let f = parseFloat(d[2].replace(/[^\d.]/g, "")) || 0; let c = parseFloat(d[3].replace(/[^\d.]/g, "")) || 0; let a = d.length >= 5 ? (parseFloat(d[4].replace(/[^\d.]/g, "")) || 0) : 0; let trueCal = Math.round(p * 4 + f * 9 + c * 4 + a * 7); autoFood = { N: d[0].trim(), P: p, F: f, C: c, A: a, Cal: trueCal, time: tZone }; isActionDone = true; }
        } else if (repIdx !== -1) {
            botReply = rawText.substring(0, repIdx).trim(); let dStr = rawText.substring(repIdx + 9).trim(); let parts = dStr.split('|');
            if (parts.length >= 3) { targetFoodName = parts[0].trim(); let tZone = parts[1].trim(); let d = parts[2].split(/,|、/); if (d.length >= 4) { let p = parseFloat(d[1].replace(/[^\d.]/g, "")) || 0; let f = parseFloat(d[2].replace(/[^\d.]/g, "")) || 0; let c = parseFloat(d[3].replace(/[^\d.]/g, "")) || 0; let a = d.length >= 5 ? (parseFloat(d[4].replace(/[^\d.]/g, "")) || 0) : 0; let trueCal = Math.round(p * 4 + f * 9 + c * 4 + a * 7); replaceFood = { N: d[0].trim(), P: p, F: f, C: c, A: a, Cal: trueCal, time: tZone }; isActionDone = true; } }
        } else if (delIdx !== -1) { botReply = rawText.substring(0, delIdx).trim(); deleteFood = rawText.substring(delIdx + 8).trim(); isActionDone = true; } 
        else if (unkIdx !== -1) { botReply = rawText.substring(0, unkIdx).trim(); unknownFood = rawText.substring(unkIdx + 9).trim(); } 
        else { botReply = rawText.trim(); }

        removeMsg(loadingId); const newMsgId = addChatMsg('bot', botReply);

        // ボイスモードかどうかに関わらず、裏のチャットウィンドウには必ずボタンを描画しておく！
        if (recipeKeywords) {
            const msgEl = document.getElementById(newMsgId).querySelector('.text');
            msgEl.innerHTML += `<br><br><div style="display:flex; flex-direction:column; gap:6px; width:100%; margin-top:8px;">
                <div onclick="openRecipe('${recipeKeywords}', 'delish')" style="cursor:pointer; background-color:#FFB600; color:#FFFFFF; padding:8px; border-radius:8px; font-weight:bold; font-size:12px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.1);">🍳 デリッシュキッチン で見る</div>
                <div onclick="openRecipe('${recipeKeywords}', 'nadia')" style="cursor:pointer; background-color:#65C1A6; color:#FFFFFF; padding:8px; border-radius:8px; font-weight:bold; font-size:12px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.1);">👨‍🍳 Nadia(プロのレシピ) で見る</div>
                <div onclick="openRecipe('${recipeKeywords}', 'youtube')" style="cursor:pointer; background-color:#FF0000; color:#FFFFFF; padding:8px; border-radius:8px; font-weight:bold; font-size:12px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.1);">▶️ YouTube で調理法を見る</div>
            </div>`;
        }

        if (unknownFood) {
            const msgEl = document.getElementById(newMsgId).querySelector('.text');
            msgEl.innerHTML += `<br><br><div style="display:flex; gap:10px; width:100%; margin-top:8px;"><div onclick="openChatGPTAndCopy('${unknownFood}')" style="cursor:pointer; flex:1; background-color:#10A37F; color:#FFFFFF; padding:12px 0; border-radius:10px; font-weight:600; font-size:13px; text-decoration:none; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.15); display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.4; box-sizing:border-box; transition:opacity 0.2s;"><div style="display:flex; align-items:center; gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M22.28 10.51a6.6 6.6 0 0 0-1.63-7.1 6.62 6.62 0 0 0-7.04-1.6 6.59 6.59 0 0 0-8.91 3.52 6.61 6.61 0 0 0-1.57 7.15 6.6 6.6 0 0 0 1.63 7.09 6.61 6.61 0 0 0 7.03 1.6 6.59 6.59 0 0 0 8.92-3.53 6.62 6.62 0 0 0 1.57-7.13zm-8.87 9.87a4.57 4.57 0 0 1-3.23-1.32l.24-.14 4.54-2.62a1.05 1.05 0 0 0 .52-.91v-5.26l1.79 1.03a4.59 4.59 0 0 1 1.7 5.91 4.58 4.58 0 0 1-5.56 3.31zm-7.66-2.5a4.59 4.59 0 0 1-1.3-3.28l.2.16 4.55 2.63a1.04 1.04 0 0 0 1.05 0l4.55-2.63-.9-1.55-4.54 2.62a2.66 2.66 0 0 1-2.66 0L4.1 11.66a4.58 4.58 0 0 1 1.65-5.38zm7.5-12.78a4.58 4.58 0 0 1 3.23 1.33l-.24.14-4.54 2.62a1.04 1.04 0 0 0-.52.9v5.27l-1.8-1.04A4.59 4.59 0 0 1 8.2 8.52a4.58 4.58 0 0 1 5.06-3.41zm1.25 5.86-1.8-1.04v-3.1a4.58 4.58 0 0 1 6.85-2.1L16.2 6.5v.01l-4.54 2.62a2.66 2.66 0 0 1-2.67 0l-2.6-1.5 2.6-4.5a4.59 4.59 0 0 1 5.51-1.6zm4.6 7.42a4.59 4.59 0 0 1 1.3 3.28l-.2-.16-4.55-2.63a1.04 1.04 0 0 0-1.05 0l-4.54 2.63.9 1.55 4.54-2.62a2.66 2.66 0 0 1 2.66 0l2.58 1.5A4.58 4.58 0 0 1 19.1 18.4zM12 14.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg><span>ChatGPT</span></div><span style="font-size:9.5px; font-weight:400; margin-top:3px; opacity:0.9;">(質問を自動コピー)</span></div><a href="https://www.google.com/search?q=${encodeURIComponent(unknownFood + ' カロリー PFC')}" target="_blank" style="flex:1; background-color:#FFFFFF; color:#3C4043; border:1px solid #DADCE0; padding:12px 0; border-radius:10px; font-weight:600; font-size:13px; text-decoration:none; text-align:center; box-shadow:0 2px 5px rgba(0,0,0,0.05); display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.4; box-sizing:border-box; transition:background-color 0.2s;"><div style="display:flex; align-items:center; gap:6px;"><svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg><span>Google</span></div><span style="font-size:9.5px; font-weight:400; margin-top:3px; color:#5F6368;">(自分で調べる)</span></a></div>`;
        }

        if (autoFood) { 
            lst.push({ id: Date.now() + Math.floor(Math.random()*1000), N: "🤖 " + autoFood.N, P: autoFood.P, F: autoFood.F, C: autoFood.C, A: autoFood.A, Cal: autoFood.Cal, U: "AI", time: autoFood.time }); 
            localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd(); window.scrollTo({ top: 0, behavior: 'smooth' }); 
        } 
        else if (deleteFood) { 
            const targetId = parseInt(deleteFood.replace(/[^\d]/g, ''), 10);
            const foundIdx = lst.findIndex(item => item.id === targetId);
            if (foundIdx !== -1) { lst.splice(foundIdx, 1); localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd(); } 
        }
        else if (replaceFood && targetFoodName) { 
            const targetId = parseInt(targetFoodName.replace(/[^\d]/g, ''), 10);
            const foundIdx = lst.findIndex(item => item.id === targetId);
            const newItem = { id: targetId || Date.now(), N: "🤖 " + replaceFood.N, P: replaceFood.P, F: replaceFood.F, C: replaceFood.C, A: replaceFood.A, Cal: replaceFood.Cal, U: "AI", time: replaceFood.time }; 
            if (foundIdx !== -1) { lst[foundIdx] = newItem; } else { lst.push({...newItem, id: Date.now()}); } 
            localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd(); window.scrollTo({ top: 0, behavior: 'smooth' }); 
        }
        
        chatHistory.push({ role: 'model', text: botReply }); if (chatHistory.length > 6) chatHistory.shift();
        
        // オブジェクトで返し、sendVoiceChat側に「次どうするか」を判断させる
        return { reply: botReply, isActionDone: isActionDone, needsFollowUp: !!(unknownFood || recipeKeywords) };

    } catch (error) { 
        removeMsg(loadingId); 
        const errMsg = '通信エラーだたま...。もう一度送ってたま！';
        if(!isVoiceMode) addChatMsg('bot', errMsg); 
        return { reply: errMsg, isActionDone: false, needsFollowUp: false };
    }
}

function addChatMsg(role, text) {
    const box = document.getElementById('chat-messages'); const id = 'msg-' + Date.now();
    const div = document.createElement('div'); div.className = `msg ${role}`; div.id = id;
    const iconDiv = document.createElement('div'); iconDiv.className = 'icon'; iconDiv.innerHTML = '<img src="new_tama.png">';
    const textDiv = document.createElement('div'); textDiv.className = 'text'; textDiv.innerHTML = text;
    if(role === 'bot') { div.appendChild(iconDiv); div.appendChild(textDiv); } else { div.appendChild(textDiv); div.appendChild(iconDiv); }
    box.appendChild(div); box.scrollTop = box.scrollHeight; return id;
}
function removeMsg(id) { const el = document.getElementById(id); if(el) el.remove(); }

function getAppContextStr() {
    let t = { Cal: 0, P: 0, F: 0, C: 0 }; lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; });
    const remCal = TG.cal - t.Cal; return `現在の摂取: ${t.Cal}kcal (残り ${remCal}kcal)\n今日食べたもの: ${lst.map(x => x.N).join(', ') || 'なし'}`;
}
