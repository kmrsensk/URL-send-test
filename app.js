document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('webhook-url');
    const payloadInput = document.getElementById('payload-data');
    const sendBtn = document.getElementById('send-btn');
    const resultArea = document.getElementById('result-area');

    const STORAGE_KEY = 'webhookTesterData';

    // 1. ページ読み込み時にlocalStorageからデータを復元
    const loadSavedData = () => {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.url) urlInput.value = parsed.url;
                if (parsed.payload) payloadInput.value = parsed.payload;
            } catch (e) {
                console.error('localStorageのデータパースに失敗しました', e);
            }
        }
    };

    loadSavedData();

    // 2. 送信ボタンクリック時の処理
    sendBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        const payloadString = payloadInput.value.trim();

        // 入力チェック
        if (!url || !payloadString) {
            alert('URLとPayloadを入力してください。');
            return;
        }

        // JSONフォーマットチェック
        try {
            JSON.parse(payloadString);
        } catch (e) {
            alert('Payloadが有効なJSONフォーマットではありません。');
            return;
        }

        // localStorageに入力内容を保存 (UX向上)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            url: url,
            payload: payloadString
        }));

        // UIを送信中状態にする
        sendBtn.disabled = true;
        sendBtn.textContent = '送信中...';
        resultArea.textContent = 'リクエストを送信しています...';

        // 3. fetch APIによるPOSTリクエスト
        try {
            const response = await fetch(url, {
                method: 'POST',
                body: payloadString // Content-Typeを指定しないことでシンプルリクエスト化する
            });

            const responseText = await response.text();
            
            // 結果を表示
            resultArea.textContent = `[Status: ${response.status} ${response.statusText}]\n\n${responseText || '(No response body)'}`;
            
        } catch (error) {
            // エラー時の表示
            resultArea.textContent = `【エラーが発生しました】\n${error.message}\n\n※ブラウザの開発者ツール(Console)も確認してください。\n※CORS(Cross-Origin Resource Sharing)エラーの可能性が高いです。`;
            console.error('Fetch error:', error);
        } finally {
            // UIを元に戻す
            sendBtn.disabled = false;
            sendBtn.textContent = '送信する';
        }
    });
});
