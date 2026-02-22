// app.js の toggleMic 関数部分を以下に差し替え

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
        addChatMsg('bot', "ブラウザが音声認識に対応してないたま！");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isRecording = true;
        micBtn.classList.add('recording');
        inputEl.placeholder = "聞き取り中だたま...";
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
        inputEl.value = finalTranscript + interimTranscript;
    };

    // ★ エラー診断機能を追加！
    recognition.onerror = (event) => {
        console.error("Speech Error:", event.error);
        isRecording = false;
        micBtn.classList.remove('recording');

        // エラーの種類に応じて、たまちゃんが原因を報告
        let errorMsg = "";
        switch (event.error) {
            case 'not-allowed': errorMsg = "マイクの使用が拒否されてるたま！ブラウザの設定を確認してたま！"; break;
            case 'audio-capture': errorMsg = "マイクが見つからないたま。接続を確認してたま。"; break;
            case 'service-not-allowed': errorMsg = "ブラウザが音声サービスを禁止してるたま。一度リロードしてたま！"; break;
            case 'network': errorMsg = "ネット環境が悪くて聞き取れなかったたま...。"; break;
            default: errorMsg = "エラー（" + event.error + "）で止まっちゃったたま...";
        }
        addChatMsg('bot', errorMsg);
    };

    recognition.onend = () => {
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