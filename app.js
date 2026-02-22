// app.js : たまフィットPFCアプリ 統合メインロジック (テキストクリア修正版)

let TG = { cal: 2000, p: 150, f: 44, c: 250, label: "👨男性減量", mode: "std" }; 
let lst = []; 
let fav = []; 
let myFoods = []; 
let hist = []; 
let bodyData = []; 
let chatHistory = []; 
let selIdx = -1; 
let editIdx = -1; 

function parseNum(val) {
    if (typeof val !== 'string') return parseFloat(val) || 0;
    const half = val.replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));
    return parseFloat(half) || 0;
}

window.onload = () => {
    if (localStorage.getItem('tf_tg')) TG = JSON.parse(localStorage.getItem('tf_tg'));
    const savedData = localStorage.getItem('tf_dat');
    if (savedData) lst = JSON.parse(savedData);
    mkCat(); upd(); ren();
};

// --- 食品リスト関連 ---
function mkCat() {
    const d = document.getElementById('cat-btns');
    if(typeof DB === 'undefined') return;
    const cats = [...new Set(DB.map(i => i[0]))];
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
    l.innerHTML = `<div style="background:#eee;padding:5px;font-size:12px;font-weight:bold;display:flex;justify-content:space-between;"><span>${c}</span><span onclick="this.parentElement.parentElement.style.display='none'" style="cursor:pointer">×</span></div>`;
    DB.forEach((x, i) => {
        if (x[0] === c) {
            const d = document.createElement('div'); d.className = 'f-btn'; d.innerHTML = `<span>${x[1]}</span>`;
            d.onclick = () => selFd(i); l.appendChild(d);
        }
    });
    l.style.display = 'block';
}

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

function calcM() {
    const p = parseNum(document.getElementById('m-p').value);
    const f = parseNum(document.getElementById('m-f').value);
    const c = parseNum(document.getElementById('m-c').value);
    const mul = parseNum(document.getElementById('m-mul').value) || 1;
    document.getElementById('m-cal').value = Math.round((p * 4 + f * 9 + c * 4) * mul);
}

function addM() {
    const n = document.getElementById('m-name').value || "未入力";
    const mul = parseNum(document.getElementById('m-mul').value) || 1;
    const newData = {
        N: n,
        P: parseNum(document.getElementById('m-p').value) * mul,
        F: parseNum(document.getElementById('m-f').value) * mul,
        C: parseNum(document.getElementById('m-c').value) * mul,
        Cal: parseNum(document.getElementById('m-cal').value)
    };
    if (editIdx >= 0) { lst[editIdx] = newData; editIdx = -1; } else { lst.push(newData); }
    localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd();
    document.getElementById('amt-area').style.display = 'none';
}

function ren() {
    const ul = document.getElementById('f-list-ul'); ul.innerHTML = "";
    lst.forEach((x, i) => {
        const li = document.createElement('li'); li.className = 'f-item';
        li.innerHTML = `<div><strong>${x.N}</strong><br>${x.Cal}kcal (P${x.P.toFixed(1)} F${x.F.toFixed(1)} C${x.C.toFixed(1)})</div>
            <div class="act-btns">
                <button class="l-btn" style="background:#3498db" onclick="ed(${i})">編集</button>
                <button class="l-btn" style="background:#e74c3c" onclick="del(${i})">消去</button>
            </div>`;
        ul.appendChild(li);
    });
    document.getElementById('tot-cal').textContent = lst.reduce((a, b) => a + b.Cal, 0);
}

function del(i) { lst.splice(i, 1); localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd(); }

function ed(i) {
    const x = lst[i]; editIdx = i; selIdx = -1;
    document.getElementById('amt-area').style.display = 'block';
    document.getElementById('m-name').value = x.N;
    document.getElementById('m-p').value = x.P; document.getElementById('m-f').value = x.F; document.getElementById('m-c').value = x.C;
    document.getElementById('m-mul').value = 1; document.getElementById('m-cal').value = x.Cal;
    document.getElementById('pv-bar').style.display = 'none';
}

function upd() {
    const t = { Cal: 0, P: 0, F: 0, C: 0 }; lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; });
    const setBar = (k, v, tg, u) => {
        const r = tg - v; const el = document.getElementById('bar-' + k.toLowerCase()); const tx = document.getElementById('rem-' + k.toLowerCase());
        el.style.width = Math.min((v / tg) * 100, 100) + '%'; el.className = 'bar ' + (r < 0 ? 'ov' : '');
        tx.textContent = r < 0 ? `+${Math.abs(r).toFixed(0)}${u}` : `残${r.toFixed(0)}${u}`;
    };
    setBar('Cal', t.Cal, TG.cal, 'kcal'); setBar('P', t.P, TG.p, 'g'); setBar('F', t.F, TG.f, 'g'); setBar('C', t.C, TG.c, 'g');
}

// --- チャット・音声入力機能 ---

const gasUrl = "https://script.google.com/macros/s/AKfycby6THg5PeEHYWWwxFV9VvY7kJ3MAMwoEuaJNs_EK_VZWv9alxqsi25RxDQ2wikkI1-H/exec";
let recognition;
let isRecording = false;
let finalTranscript = ''; 
let speechTimeout = null;

function toggleChat() {
    const win = document.getElementById('tama-chat-window');
    win.style.display = (win.style.display === 'flex') ? 'none' : 'flex';
}

function setupChatEnterKey() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter' && !e.shiftKey) sendTamaChat(); });
}

function toggleMic() {
    const micBtn = document.getElementById('mic-btn');
    const inputEl = document.getElementById('chat-input');

    function stopAndSend() {
        if (!isRecording) return;
        isRecording = false; // ★ここでフラグを折る
        micBtn.classList.remove('recording');
        inputEl.placeholder = "例: 夜ご飯なにがいい？";
        
        try { recognition.stop(); } catch(e) {} 
        
        if (inputEl.value.trim() !== "") {
            sendTamaChat();
        }
    }

    if (isRecording) {
        clearTimeout(speechTimeout);
        stopAndSend(); 
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        addChatMsg('bot', "ブラウザが音声入力に対応していないたま！");
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
        inputEl.placeholder = "たまちゃんが聞いてるたま！喋って！";
    };

    recognition.onresult = (event) => {
        // ★鉄壁のガード: 録音フラグが折れていたら、遅れてきた文字を絶対に入力させない
        if (!isRecording) return;

        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            let transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) finalTranscript += transcript;
            else interimTranscript += transcript;
        }
        inputEl.value = finalTranscript + interimTranscript;

        clearTimeout(speechTimeout);
        speechTimeout = setTimeout(() => {
            stopAndSend(); 
        }, 1500); 
    };

    recognition.onerror = (event) => {
        clearTimeout(speechTimeout);
        if (event.error === 'aborted') {
            if (isRecording) stopAndSend(); 
            return;
        }
        if (event.error === 'no-speech') {
            isRecording = false;
            micBtn.classList.remove('recording');
            inputEl.placeholder = "声が聞こえなかったたま。";
            return;
        }

        isRecording = false;
        micBtn.classList.remove('recording');
        addChatMsg('bot', `エラー(${event.error})で止まっちゃったたま。`);
    };

    recognition.onend = () => {
        clearTimeout(speechTimeout);
        if (isRecording) stopAndSend(); 
    };

    recognition.start();
}

async function sendTamaChat() {
    const inputEl = document.getElementById('chat-input');
    const text = inputEl.value.trim();
    if (!text) return;

    addChatMsg('user', text);
    
    // ★ 送信開始時に一回白紙にする
    inputEl.value = '';
    inputEl.disabled = true;

    const loadingId = addChatMsg('bot', 'たまちゃん考え中...');
    
    const context = `現在の摂取: ${lst.reduce((a,b)=>a+b.Cal,0)}kcal\n今日食べたものリスト: ${lst.map(x => x.N).join(', ') || 'まだなし'}`;
    let historyText = chatHistory.map(m => `${m.role === 'user' ? 'あなた' : 'たまちゃん'}: ${m.text}`).join('\n');
    
    const prompt = `${typeof SYSTEM_PROMPT !== 'undefined' ? SYSTEM_PROMPT : 'たまちゃんです。'}\n\n【状況】\n${context}\n\n【直近の会話履歴】\n${historyText}\n\n【ユーザーの最新の発言】\n${text}`;

    try {
        const response = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        let rawText = data.candidates[0].content.parts[0].text;
        let botReply = "";
        let autoFood = null;
        let replaceFood = null;

        if (rawText.includes("[DATA]")) {
            const parts = rawText.split("[DATA]");
            botReply = parts[0].replace(/たまちゃんの返答:/g, "").trim();
            const d = parts[1].split(",");
            if (d.length >= 5) {
                autoFood = { N: d[0].trim(), P: parseFloat(d[1]), F: parseFloat(d[2]), C: parseFloat(d[3]), Cal: parseInt(d[4]) };
            }
        } else if (rawText.includes("[REPLACE]")) {
            const parts = rawText.split("[REPLACE]");
            botReply = parts[0].replace(/たまちゃんの返答:/g, "").trim();
            const d = parts[1].split(",");
            if (d.length >= 5) {
                replaceFood = { N: d[0].trim(), P: parseFloat(d[1]), F: parseFloat(d[2]), C: parseFloat(d[3]), Cal: parseInt(d[4]) };
            }
        } else {
            botReply = rawText.replace(/たまちゃんの返答:/g, "").trim();
        }

        removeMsg(loadingId);
        botReply = botReply.replace(/\*/g, "");
        addChatMsg('bot', botReply);

        if (autoFood) {
            lst.push({ N: "🤖 " + autoFood.N, P: autoFood.P, F: autoFood.F, C: autoFood.C, Cal: autoFood.Cal, U: "AI推測" });
            localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } 
        else if (replaceFood) {
            if (lst.length > 0) {
                lst.pop(); 
            }
            if (replaceFood.Cal > 0 || replaceFood.P > 0 || replaceFood.F > 0 || replaceFood.C > 0) {
                lst.push({ N: "🤖 " + replaceFood.N, P: replaceFood.P, F: replaceFood.F, C: replaceFood.C, Cal: replaceFood.Cal, U: "AI修正" });
            }
            localStorage.setItem('tf_dat', JSON.stringify(lst)); ren(); upd();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        chatHistory.push({ role: 'model', text: botReply });
        if (chatHistory.length > 6) chatHistory.shift();

    } catch (error) {
        removeMsg(loadingId);
        addChatMsg('bot', '通信エラーだたま...。もう一度送ってたま！');
    } finally {
        // ★ 念押しの白紙化（すべてが終わった後にもう一度綺麗にする）
        inputEl.value = '';
        inputEl.disabled = false;
        // inputEl.focus(); // スマホでキーボードが勝手に出るのを防ぐため、あえてフォーカスは外したままにします
    }
}

function addChatMsg(role, text) {
    const box = document.getElementById('chat-messages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.id = id;
    div.innerHTML = `<div class="text">${text}</div>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
}

function removeMsg(id) { const el = document.getElementById(id); if (el) el.remove(); }
