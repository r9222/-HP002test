// app.js : たまフィットPFCアプリ 統合メインロジック

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
    if (!TG.mode) TG.mode = "std";

    const savedData = localStorage.getItem('tf_dat');
    if (savedData) lst = JSON.parse(savedData);
    
    // 日付設定
    const d = new Date();
    const today = `${d.getFullYear()}-${("0"+(d.getMonth()+1)).slice(-2)}-${("0"+d.getDate()).slice(-2)}`;
    if(document.getElementById('b-date')) document.getElementById('b-date').value = today;
    if(document.getElementById('reset-date')) document.getElementById('reset-date').value = today;

    setupChatEnterKey();
    mkCat(); mkTgt(); upd(); ren();
};

// --- UI構築・食品リスト関連 ---
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

function selMyFd(i) {
    selIdx = -1; editIdx = -1;
    document.getElementById('amt-area').style.display = 'block';
    const d = myFoods[i];
    document.getElementById('m-name').value = d.N;
    document.getElementById('m-p').value = d.P; document.getElementById('m-f').value = d.F; document.getElementById('m-c').value = d.C;
    document.getElementById('m-mul').value = 1; document.getElementById('m-cal').value = d.Cal;
    document.getElementById('pv-bar').style.display = 'block';
    document.getElementById('pv-name').textContent = d.N;
    document.getElementById('pv-stat').textContent = `${d.Cal}kcal (P${d.P} F${d.F} C${d.C})`;
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
    const mul = parseNum(document.getElementById('m-mul').value) || 1;
    const cal = parseNum(document.getElementById('m-cal').value) || ((p * 4 + f * 9 + c * 4) * mul);
    
    const newData = { N: n, P: p * mul, F: f * mul, C: c * mul, Cal: Math.round(cal), U: "手動" };

    if (editIdx >= 0) { lst[editIdx] = newData; editIdx = -1; } 
    else { lst.push(newData); }
    
    sv(); ren(); upd();
    document.getElementById('amt-area').style.display = 'none';
    window.scrollTo(0,0);
}

function ren() {
    const ul = document.getElementById('f-list-ul'); ul.innerHTML = "";
    lst.forEach((x, i) => {
        const li = document.createElement('li'); li.className = 'f-item';
        li.innerHTML = `<div><strong>${x.N}</strong><br>${x.Cal}kcal (P${x.P.toFixed(1)} F${x.F.toFixed(1)} C${x.C.toFixed(1)})</div>
            <div class="act-btns">
                <button class="l-btn b-ed" style="background:#3498db" onclick="ed(${i})">編集</button>
                <button class="l-btn b-del" style="background:#e74c3c" onclick="del(${i})">消去</button>
            </div>`;
        ul.appendChild(li);
    });
    document.getElementById('tot-cal').textContent = lst.reduce((a, b) => a + b.Cal, 0);
}

function del(i) { lst.splice(i, 1); sv(); ren(); upd(); }
function ed(i) {
    const x = lst[i]; editIdx = i;
    document.getElementById('amt-area').style.display = 'block';
    document.getElementById('m-name').value = x.N;
    document.getElementById('m-p').value = x.P; document.getElementById('m-f').value = x.F; document.getElementById('m-c').value = x.C;
    document.getElementById('m-mul').value = 1; document.getElementById('m-cal').value = x.Cal;
}

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

// --- チャット・音声機能 (エラー診断・強化版) ---

const gasUrl = "https://script.google.com/macros/s/AKfycby6THg5PeEHYWWwxFV9VvY7kJ3MAMwoEuaJNs_EK_VZWv9alxqsi25RxDQ2wikkI1-H/exec";
let recognition;
let isRecording = false;
let finalTranscript = ''; 

function toggleChat() {
    const win = document.getElementById('tama-chat-window');
    const btn = document.getElementById('tama-chat-btn');
    win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
}

function setupChatEnterKey() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendTamaChat(); } });
}

// ★音声認識の制御（診断機能・再起動ループ付き）
function toggleMic() {
    const micBtn = document.getElementById('mic-btn');
    const inputEl = document.getElementById('chat-input');

    if (isRecording) {
        isRecording = false;
        if (recognition) recognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addChatMsg('bot', "お使いのブラウザは音声入力に対応していないたま...。");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isRecording = true;
        finalTranscript = ''; 
        micBtn.classList.add('recording');
        inputEl.placeholder = "聞き取り中だたま！喋って！";
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            let transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) { finalTranscript += transcript; } 
            else { interimTranscript += transcript; }
        }
        inputEl.value = finalTranscript + interimTranscript;
    };

    // ★ エラー診断機能
    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        
        // ユーザーにわかりやすくエラーを報告
        let errorMsg = "";
        switch (event.error) {
            case 'not-allowed': errorMsg = "マイクの許可がされてないたま！URL横の鍵マークから許可してたま！"; break;
            case 'audio-capture': errorMsg = "マイクが見つからないたま...。接続を確認してたま！"; break;
            case 'no-speech': return; // 無音エラーは無視して継続
            default: errorMsg = "エラー（" + event.error + "）で録音が止まっちゃったたま...";
        }
        
        if (errorMsg) {
            addChatMsg('bot', errorMsg);
            isRecording = false;
            micBtn.classList.remove('recording');
        }
    };

    recognition.onend = () => {
        // 勝手に止まっても、isRecordingがtrueなら即座に再起動
        if (isRecording) {
            recognition.start();
        } else {
            micBtn.classList.remove('recording');
            inputEl.placeholder = "例: 夜ご飯なにがいい？";
            if (inputEl.value.trim() !== "") sendTamaChat();
        }
    };

    recognition.start();
}

async function sendTamaChat() {
    const inputEl = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    const text = inputEl.value.trim();
    if (!text) return;

    inputEl.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    addChatMsg('user', text);
    inputEl.value = '';

    chatHistory.push({ role: 'user', text: text });
    if (chatHistory.length > 6) chatHistory.shift(); 

    const loadingId = addChatMsg('bot', '筋トレ中...(思考中)');
    const context = getAppContextStr();

    let historyText = chatHistory.map(m => `${m.role === 'user' ? 'あなた' : 'たまちゃん'}: ${m.text}`).join('\n');
    const basePrompt = (typeof SYSTEM_PROMPT !== 'undefined') ? SYSTEM_PROMPT : "たまちゃんです。";

    const fullPrompt = `${basePrompt}\n\n【ユーザーデータ】\n${context}\n\n【履歴】\n${historyText}\n\n【質問】\n${text}`;

    try {
        const response = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
        });

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        let botReply = "";
        let autoFood = null;

        if (rawText.includes("[DATA]")) {
            const parts = rawText.split("[DATA]");
            botReply = parts[0].replace(/たまちゃんの返答:/g, "").trim();
            const d = parts[1].split(",");
            if (d.length >= 5) {
                autoFood = { N: d[0].trim(), P: parseFloat(d[1]), F: parseFloat(d[2]), C: parseFloat(d[3]), Cal: parseInt(d[4]) };
            }
        } else {
            botReply = rawText.replace(/たまちゃんの返答:/g, "").trim();
        }

        removeMsg(loadingId);
        addChatMsg('bot', botReply.replace(/\*/g, ""));

        if (autoFood) {
            lst.push({ N: "🤖 " + autoFood.N, P: autoFood.P, F: autoFood.F, C: autoFood.C, Cal: autoFood.Cal, U: "AI推測" });
            sv(); ren(); upd();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    } catch (error) {
        removeMsg(loadingId);
        addChatMsg('bot', '通信エラーだたま...。もう一度送ってたま！');
    } finally {
        inputEl.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        inputEl.focus();
    }
}

function addChatMsg(role, text) {
    const box = document.getElementById('chat-messages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.id = id;
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.innerText = text;
    div.appendChild(textDiv);
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
}

function removeMsg(id) { const el = document.getElementById(id); if (el) el.remove(); }

function getAppContextStr() {
    let t = { Cal: 0, P: 0, F: 0, C: 0 };
    lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; });
    return `現状: ${t.Cal}/${TG.cal}kcal, P:${t.P.toFixed(1)}, F:${t.f}, C:${t.c}`;
}