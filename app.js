// app.js : アプリの脳みそ

// ■ グローバル変数
let TG = { cal: 2000, p: 150, f: 44, c: 250, label: "👨男性減量", mode: "std" }; 
let lst = []; 
let fav = []; 
let myFoods = []; 
let hist = []; 
let bodyData = []; 
let chatHistory = []; 
let selIdx = -1; 
let editIdx = -1; 
const toHira = s => s.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60)); 

function parseNum(val) {
    if (typeof val !== 'string') return parseFloat(val) || 0;
    const half = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    return parseFloat(half) || 0;
}

window.onload = () => {
    if (localStorage.getItem('tf_tg')) TG = JSON.parse(localStorage.getItem('tf_tg'));
    if (localStorage.getItem('tf_fav')) fav = JSON.parse(localStorage.getItem('tf_fav'));
    if (localStorage.getItem('tf_my')) myFoods = JSON.parse(localStorage.getItem('tf_my'));
    if (localStorage.getItem('tf_hist')) hist = JSON.parse(localStorage.getItem('tf_hist'));
    if (localStorage.getItem('tf_body')) bodyData = JSON.parse(localStorage.getItem('tf_body'));
    
    const savedData = localStorage.getItem('tf_dat');
    if (savedData) lst = JSON.parse(savedData);
    
    const d = new Date();
    const today = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
    if(document.getElementById('b-date')) document.getElementById('b-date').value = today;
    if(document.getElementById('reset-date')) document.getElementById('reset-date').value = today;

    mkCat(); mkTgt(); upd(); ren();
};

// --- 食品リスト・検索・追加機能 ---
function mkCat() {
    const d = document.getElementById('cat-btns');
    if(typeof DB === 'undefined') return;
    const cats = [...new Set(DB.map(i => i[0]))];
    d.innerHTML = `<div class="c-btn fav-cat-btn" onclick="shwList('⭐',this)">⭐ お気に入り</div><div class="c-btn my-cat-btn" onclick="shwList('📂',this)">📂 My食品</div>`;
    cats.forEach(c => {
        const b = document.createElement('div'); b.className = 'c-btn'; b.textContent = c;
        b.onclick = () => shwList(c, b); d.appendChild(b);
    });
}

function shwList(c, btn) {
    const l = document.getElementById('f-list');
    document.querySelectorAll('.c-btn').forEach(x => x.classList.remove('act'));
    if (l.style.display === 'block' && l.dataset.cat === c) { l.style.display = 'none'; return; }
    btn.classList.add('act'); l.dataset.cat = c;
    l.innerHTML = `<div class="list-head"><span>${c}</span><span class="cls-btn" onclick="clsList()">× 閉じる</span></div>`;
    
    let itms = [];
    if (c === '📂') itms = myFoods.map((x,i)=>({...x, name:x.N, isMy:true, i:i}));
    else {
        const allItems = DB.map((x, i) => ({ ...x, name:x[1], isMy:false, i:i }));
        if (c === '⭐') itms = allItems.filter(x => fav.includes(x.i));
        else itms = allItems.filter(x => x[0] === c);
    }

    itms.forEach(x => {
        const d = document.createElement('div'); d.className = 'f-btn';
        d.innerHTML = `<span>${x.name}</span>`;
        d.onclick = () => x.isMy ? selMyFd(x.i) : selFd(x.i);
        l.appendChild(d);
    });
    l.style.display = 'block';
}

function clsList() { document.getElementById('f-list').style.display = 'none'; }

function selFd(i) {
    selIdx = i; editIdx = -1;
    document.getElementById('amt-area').style.display = 'block';
    const d = DB[i];
    document.getElementById('m-name').value = d[1];
    document.getElementById('m-p').value = d[4]; document.getElementById('m-f').value = d[5]; document.getElementById('m-c').value = d[6];
    updBd(1);
}

function updBd(v) {
    if (selIdx < 0) return;
    const d = DB[selIdx]; v = parseNum(v);
    const m = d[3].includes('g') ? v / parseFloat(d[3]) : v;
    document.getElementById('m-mul').value = m;
    const P = d[4] * m, F = d[5] * m, C = d[6] * m, Cal = Math.round(d[7] * m);
    document.getElementById('pv-bar').style.display = 'block';
    document.getElementById('pv-name').textContent = `${d[1]} (${v})`;
    document.getElementById('pv-stat').textContent = `${Cal}kcal (P${P.toFixed(1)} F${F.toFixed(1)} C${C.toFixed(1)})`;
    document.getElementById('m-cal').value = Cal;
}

function addM() {
    const n = document.getElementById('m-name').value || "未入力";
    const p = parseNum(document.getElementById('m-p').value);
    const f = parseNum(document.getElementById('m-f').value);
    const c = parseNum(document.getElementById('m-c').value);
    const cal = parseNum(document.getElementById('m-cal').value) || (p * 4 + f * 9 + c * 4);
    const newData = { N: n, P: p, F: f, C: c, Cal: Math.round(cal), U: "-" };
    lst.push(newData); sv(); ren(); upd();
    document.getElementById('amt-area').style.display = 'none';
    window.scrollTo(0,0);
}

function ren() {
    const ul = document.getElementById('f-list-ul'); ul.innerHTML = "";
    lst.forEach((x, i) => {
        const li = document.createElement('li'); li.className = 'f-item';
        li.innerHTML = `<div><strong>${x.N}</strong><br>${x.Cal}kcal (P${x.P.toFixed(1)} F${x.F.toFixed(1)} C${x.C.toFixed(1)})</div>
            <div class="act-btns"><button class="l-btn b-del" onclick="del(${i})">消去</button></div>`;
        ul.appendChild(li);
    });
    document.getElementById('tot-cal').textContent = lst.reduce((a, b) => a + b.Cal, 0);
}

function del(i) { lst.splice(i, 1); sv(); ren(); upd(); }
function sv() { localStorage.setItem('tf_dat', JSON.stringify(lst)); }

function upd() {
    const t = { Cal: 0, P: 0, F: 0, C: 0 }; lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; });
    const setBar = (k, v, tg, u) => {
        const r = tg - v; const el = document.getElementById('bar-' + k.toLowerCase()); const tx = document.getElementById('rem-' + k.toLowerCase());
        el.style.width = Math.min((v / tg) * 100, 100) + '%'; el.className = 'bar ' + (r < 0 ? 'ov' : '');
        tx.textContent = r < 0 ? `+${Math.abs(r).toFixed(0)}${u}` : `残${r.toFixed(0)}${u}`;
    };
    setBar('Cal', t.Cal, TG.cal, 'kcal'); setBar('P', t.P, TG.p, 'g'); setBar('F', t.F, TG.f, 'g'); setBar('C', t.C, TG.c, 'g');
    document.getElementById('tgt-disp').textContent = `${TG.cal}kcal`;
}

// --- 目標設定・統計 ---
function mkTgt() {
    const b = document.getElementById('tgt-btns'); b.innerHTML = "";
    [{v:1600,l:"👩女性"},{v:2000,l:"👨男性"}].forEach(t => {
        const d = document.createElement('div'); d.className = 'tg-btn ' + (TG.cal === t.v ? 'act' : '');
        d.innerHTML = `<span>${t.l}</span><strong>${t.v}</strong>`;
        d.onclick = () => { TG.cal = t.v; TG.p = t.v*0.3/4; TG.f = t.v*0.2/9; TG.c = t.v*0.5/4; upd(); mkTgt(); };
        b.appendChild(d);
    });
}
function toggleTgt() { const b = document.getElementById('tgt-btns'); b.style.display = b.style.display === 'grid' ? 'none' : 'grid'; }

function togGraph() { 
    const a = document.getElementById('graph-area'); 
    a.style.display = a.style.display === 'block' ? 'none' : 'block'; 
    if(a.style.display === 'block') drawGraph('week'); 
}

function drawGraph(type) {
    const box = document.getElementById('chart-box'); box.innerHTML = '';
    const total = lst.reduce((a,b)=>a+b.Cal, 0);
    const count = 7; // ダミーの週間平均計算
    document.getElementById('stat-txt').textContent = `平均摂取カロリー: ${Math.round(total/count)} kcal`;
    // 簡易的な棒グラフの生成ロジック
}

// --- チャット機能 (GAS中継 & 粘り強い音声認識版) ---

const gasUrl = "https://script.google.com/macros/s/AKfycby6THg5PeEHYWWwxFV9VvY7kJ3MAMwoEuaJNs_EK_VZWv9alxqsi25RxDQ2wikkI1-H/exec";
let recognition;
let isRecording = false;

// ★ 音声認識の初期化と制御
function toggleMic() {
    const micBtn = document.getElementById('mic-btn');
    const inputEl = document.getElementById('chat-input');

    if (isRecording) {
        recognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("音声認識に対応していないたま...");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true; // 粘り強く聞き続ける設定
    recognition.interimResults = true; // 喋っている途中の文字を表示

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        inputEl.placeholder = "聞き取り中だたま！喋ってね...";
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                // 途中経過をリアルタイムに表示
                inputEl.value = event.results[i][0].transcript;
            }
        }
        
        if (finalTranscript) {
            inputEl.value = finalTranscript;
            recognition.stop(); // 確定したら止める
            sendTamaChat(); // 送信
        }
    };

    recognition.onerror = (e) => {
        console.error(e.error);
        isRecording = false;
        micBtn.classList.remove('recording');
        inputEl.placeholder = "例: 夜ご飯なにがいい？";
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        inputEl.placeholder = "例: 夜ご飯なにがいい？";
    };

    recognition.start();
}

async function sendTamaChat() {
    const inputEl = document.getElementById('chat-input');
    const text = inputEl.value.trim();
    if (!text) return;

    addChatMsg('user', text);
    inputEl.value = '';
    inputEl.disabled = true;

    const loadingId = addChatMsg('bot', '筋トレ中...(思考中)');
    const context = `現在の摂取:${lst.reduce((a,b)=>a+b.Cal,0)}kcal, 目標:${TG.cal}kcal`;
    const prompt = `${SYSTEM_PROMPT}\n\n【状況】${context}\n【質問】${text}`;

    try {
        const res = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        const data = await res.json();
        let reply = data.candidates[0].content.parts[0].text;

        // データ解析ロジック
        if (reply.includes("[DATA]")) {
            const parts = reply.split("[DATA]");
            reply = parts[0].trim();
            const d = parts[1].split(",");
            if(d.length >= 5) {
                lst.push({ N:"🤖 "+d[0].trim(), P:parseFloat(d[1]), F:parseFloat(d[2]), C:parseFloat(d[3]), Cal:parseInt(d[4]), U:"AI推測" });
                sv(); ren(); upd();
            }
        }

        removeMsg(loadingId);
        addChatMsg('bot', reply.replace(/[*#]/g, ""));
    } catch (e) {
        removeMsg(loadingId);
        addChatMsg('bot', "通信エラーだたま...");
    } finally {
        inputEl.disabled = false;
        inputEl.focus();
    }
}

function addChatMsg(role, text) {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerHTML = `<div class="icon"><img src="new_tama.png"></div><div class="text">${text}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return div;
}

function removeMsg(el) { if(el) el.remove(); }