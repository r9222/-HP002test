// app.js : アプリの脳みそ (音声認識・超強化版)

/* --- (中略：既存の変数やwindow.onload, 検索機能などはそのまま) --- */

// ▼▼▼ チャット・音声機能JS ここから ▼▼▼

const gasUrl = "https://script.google.com/macros/s/AKfycby6THg5PeEHYWWwxFV9VvY7kJ3MAMwoEuaJNs_EK_VZWv9alxqsi25RxDQ2wikkI1-H/exec";
let recognition;
let isRecording = false;
let finalTranscript = ''; // 認識した文字列を溜める

function toggleChat() {
    const win = document.getElementById('tama-chat-window');
    const btn = document.getElementById('tama-chat-btn');
    if (win.style.display === 'flex') {
        win.style.display = 'none';
        btn.style.display = 'flex'; 
    } else {
        win.style.display = 'flex';
        btn.style.display = 'none';
    }
}

function setupChatEnterKey() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); 
            sendTamaChat();
        }
    });
}

// ★ マイク機能の超強化版制御
function toggleMic() {
    const micBtn = document.getElementById('mic-btn');
    const inputEl = document.getElementById('chat-input');

    if (isRecording) {
        // 録音中なら明示的に停止
        isRecording = false; // 先にフラグを落とす（再起動ループを防ぐ）
        if (recognition) recognition.stop();
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("音声認識に対応していないたま...");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true; // 連続して聞き続ける
    recognition.interimResults = true; // 途中経過を表示する

    recognition.onstart = () => {
        isRecording = true;
        finalTranscript = ''; // リセット
        micBtn.classList.add('recording');
        inputEl.placeholder = "たまちゃんが聞いてるたま！喋って！";
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            let transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        // 喋っている最中の文字を表示
        inputEl.value = finalTranscript + interimTranscript;
    };

    recognition.onerror = (event) => {
        console.warn("Speech recognition error:", event.error);
        // no-speech 等のエラーで止まっても、録音中フラグが立っていれば無視
        if (event.error === 'no-speech') return; 
    };

    recognition.onend = () => {
        // ★ ここが肝心：勝手に止まっても、isRecording が true なら即座に再起動する
        if (isRecording) {
            console.log("Recognition ended unexpectedly. Restarting...");
            recognition.start();
        } else {
            // ユーザーが手動で止めた場合のみ、終了処理
            micBtn.classList.remove('recording');
            inputEl.placeholder = "例: 夜ご飯なにがいい？";
            // 何か文字が入っていれば、そのまま送信する
            if (inputEl.value.trim() !== "") {
                sendTamaChat();
            }
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
    sendBtn.disabled = true;

    addChatMsg('user', text);
    inputEl.value = '';

    chatHistory.push({ role: 'user', text: text });
    if (chatHistory.length > 6) chatHistory.shift(); 

    const loadingId = addChatMsg('bot', '筋トレ中...(思考中)');
    const context = getAppContextStr();

    let historyText = chatHistory.map(m => `${m.role === 'user' ? 'あなた' : 'たまちゃん'}: ${m.text}`).join('\n');

    const fallbackPrompt = "あなたはフィットネスアプリ「たまフィット」のキャラクター「たまちゃん」です。";
    const basePrompt = (typeof SYSTEM_PROMPT !== 'undefined') ? SYSTEM_PROMPT : fallbackPrompt;

    const fullPrompt = `
${basePrompt}

【ユーザーの現状データ】
${context}

【直近の会話履歴】
${historyText}

【ユーザーの最新の質問】
${text}
`;

    try {
        const response = await fetch(gasUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }] 
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("API Error Details:", data.error);
            addChatMsg('bot', `エラーだたま... (${data.error.message})`);
            removeMsg(loadingId);
            return;
        }

        let rawText = "ごめんたま、うまく答えられないたま...";
        let botReply = "";
        let autoFoodData = null;

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            rawText = data.candidates[0].content.parts[0].text;
            
            if (rawText.includes("[DATA]")) {
                const parts = rawText.split("[DATA]");
                botReply = parts[0].replace(/たまちゃんの返答:/g, "").trim();
                
                const dataString = parts[1].trim();
                const dataParts = dataString.split(",");
                
                if (dataParts.length >= 5) {
                    autoFoodData = {
                        name: dataParts[0].trim(),
                        P: parseFloat(dataParts[1].trim()) || 0,
                        F: parseFloat(dataParts[2].trim()) || 0,
                        C: parseFloat(dataParts[3].trim()) || 0,
                        Cal: parseInt(dataParts[4].trim()) || 0
                    };
                }
            } else {
                botReply = rawText.replace(/たまちゃんの返答:/g, "").trim();
            }
        }

        removeMsg(loadingId);
        
        botReply = botReply.replace(/\*\*/g, "").replace(/\*/g, "・").replace(/#/g, "");
        addChatMsg('bot', botReply);

        if (autoFoodData && autoFoodData.name) {
            const newData = {
                N: "🤖 " + autoFoodData.name, 
                P: autoFoodData.P,
                F: autoFoodData.F,
                C: autoFoodData.C,
                Cal: autoFoodData.Cal,
                U: "AI推測" 
            };
            lst.push(newData);
            sv(); 
            ren(); 
            upd(); 
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        chatHistory.push({ role: 'model', text: botReply });
        if (chatHistory.length > 6) chatHistory.shift();

    } catch (error) {
        console.error("Fetch Error:", error);
        removeMsg(loadingId);
        addChatMsg('bot', '通信エラーだたま...。通信環境を確認してもう一度送ってたま！');
    } finally {
        inputEl.disabled = false;
        sendBtn.disabled = false;
        inputEl.focus();
    }
}

function addChatMsg(role, text) {
    const box = document.getElementById('chat-messages');
    const id = 'msg-' + Date.now();
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.id = id;
    const iconDiv = document.createElement('div');
    iconDiv.className = 'icon';
    iconDiv.innerHTML = '<img src="new_tama.png">';
    const textDiv = document.createElement('div');
    textDiv.className = 'text';
    textDiv.innerText = text;
    if(role === 'bot') {
        div.appendChild(iconDiv);
        div.appendChild(textDiv);
    } else {
        div.appendChild(textDiv);
        div.appendChild(iconDiv);
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
    return id;
}

function removeMsg(id) {
    const el = document.getElementById(id);
    if(el) el.remove();
}

function getAppContextStr() {
    let t = { Cal: 0, P: 0, F: 0, C: 0 };
    lst.forEach(x => { t.Cal += x.Cal; t.P += x.P; t.F += x.F; t.C += x.C; });
    const remCal = TG.cal - t.Cal;
    const remF = TG.f - t.F;

    return `
    - 目標カロリー: ${TG.cal}kcal (モード: ${TG.label})
    - 現在の摂取: ${t.Cal}kcal (残り ${remCal}kcal)
    - P(タンパク質): ${t.P.toFixed(1)}g / 目標 ${TG.p}g
    - F(脂質): ${t.F.toFixed(1)}g / 目標 ${TG.f}g (残り ${remF.toFixed(1)}g)
    - C(炭水化物): ${t.C.toFixed(1)}g / 目標 ${TG.c}g
    - 今日食べたものリスト: ${lst.map(x => x.N).join(', ') || 'まだ何も食べてない'}
    `;
}