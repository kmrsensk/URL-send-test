document.addEventListener('DOMContentLoaded', () => {
    const urlInput = document.getElementById('webhook-url');
    const payloadInput = document.getElementById('payload-data');
    const sendBtn = document.getElementById('send-btn');
    const resultArea = document.getElementById('result-area');
    const messageBox = document.getElementById('message-box');
    
    // ドロワー関連
    const openHistoryBtn = document.getElementById('open-history-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const drawerOverlay = document.getElementById('drawer-overlay');
    const historyDrawer = document.getElementById('history-drawer');
    const historyListUl = document.getElementById('history-list');

    const STORAGE_KEY_DATA = 'webhookTesterData';
    const STORAGE_KEY_HISTORY = 'webhookTesterHistory';
    const MAX_HISTORY = 20;

    let historyData = [];

    // メッセージ表示用関数
    const showMessage = (msg, type) => {
        messageBox.textContent = msg;
        messageBox.className = type; 
    };

    const hideMessage = () => {
        messageBox.className = '';
        messageBox.style.display = 'none';
    };

    // ドロワーの開閉制御
    const toggleDrawer = (isOpen) => {
        if (isOpen) {
            renderHistoryList();
            drawerOverlay.classList.add('open');
            historyDrawer.classList.add('open');
        } else {
            drawerOverlay.classList.remove('open');
            historyDrawer.classList.remove('open');
        }
    };

    openHistoryBtn.addEventListener('click', () => toggleDrawer(true));
    closeHistoryBtn.addEventListener('click', () => toggleDrawer(false));
    drawerOverlay.addEventListener('click', () => toggleDrawer(false));

    // 履歴一覧を描画する関数
    const renderHistoryList = () => {
        historyListUl.innerHTML = '';
        if (historyData.length === 0) {
            historyListUl.innerHTML = '<li class="empty-history">送信履歴はありません</li>';
            return;
        }

        historyData.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'history-item';
            
            // JSONの改行を消してプレビュー用にする
            const previewText = item.payload.replace(/\s+/g, ' ').substring(0, 60) + '...';
            const isSuccess = item.status && item.status.toString().startsWith('2');
            const statusClass = isSuccess ? 'status-success' : 'status-error';

            li.innerHTML = `
                <div class="history-time">
                    ${item.time} 
                    <span class="status-badge ${statusClass}">${item.status || 'Error'}</span>
                </div>
                <div class="history-url">${item.url}</div>
                <div class="history-payload-preview">${previewText}</div>
            `;

            // 履歴アイテムをクリックしたらフォームに復元
            li.addEventListener('click', () => {
                urlInput.value = item.url;
                payloadInput.value = item.payload;
                
                // 入力中のデータをlocalStorageにも反映
                localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({ url: item.url, payload: item.payload }));
                
                hideMessage();
                resultArea.textContent = '履歴からデータを復元しました。送信ボタンを押すと再送信できます。';
                toggleDrawer(false);
            });

            historyListUl.appendChild(li);
        });
    };

    // 新しい履歴を追加して保存する関数
    const saveToHistory = (url, payload, statusMsg) => {
        const now = new Date();
        const timeStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        historyData.unshift({
            url: url,
            payload: payload,
            time: timeStr,
            status: statusMsg
        });

        if (historyData.length > MAX_HISTORY) {
            historyData.pop();
        }
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(historyData));
    };

    // 初期ロード処理
    const init = () => {
        // 入力フォームの復元
        const savedData = localStorage.getItem(STORAGE_KEY_DATA);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                if (parsed.url) urlInput.value = parsed.url;
                if (parsed.payload) payloadInput.value = parsed.payload;
            } catch (e) {
                console.error('データパース失敗', e);
            }
        } else {
            payloadInput.value = '{\n  "text": "テストメッセージです。"\n}';
        }

        // 履歴データのロード
        const savedHistory = localStorage.getItem(STORAGE_KEY_HISTORY);
        if (savedHistory) {
            try {
                historyData = JSON.parse(savedHistory);
            } catch (e) {
                console.error('履歴データパース失敗', e);
                historyData = [];
            }
        }
    };

    init();

    // 送信ボタンクリック時の処理
    sendBtn.addEventListener('click', async () => {
        hideMessage();
        const url = urlInput.value.trim();
        const payloadString = payloadInput.value.trim();

        // 入力チェック
        if (!url || !payloadString) {
            showMessage('URLとPayloadを入力してください。', 'error');
            return;
        }

        // JSONフォーマットチェック
        try {
            JSON.parse(payloadString);
        } catch (e) {
            showMessage('Payloadが有効なJSONフォーマットではありません。', 'error');
            return;
        }

        // 入力状態の保存
        localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify({ url, payload: payloadString }));

        sendBtn.disabled = true;
        sendBtn.textContent = '送信中...';
        resultArea.textContent = 'リクエストを送信しています...';

        try {
            // CORS回避のため headers を指定せず、シンプルリクエストとして送信する
            const response = await fetch(url, {
                method: 'POST',
                body: payloadString 
            });

            const responseText = await response.text();
            
            if (response.ok) {
                showMessage('送信成功！', 'success');
            } else {
                showMessage(`エラー: ${response.status}`, 'error');
            }

            resultArea.textContent = `[Status: ${response.status} ${response.statusText}]\n\n${responseText || '(No response body)'}`;
            
            // 履歴に保存
            saveToHistory(url, payloadString, response.status);
            
        } catch (error) {
            showMessage('通信エラーが発生しました', 'error');
            resultArea.textContent = `【ネットワークエラーが発生しました】\n${error.message}\n\n※CORSによって通信がブロックされたか、URLが間違っている可能性があります。`;
            
            // エラー時も履歴に保存
            saveToHistory(url, payloadString, 'Error');
            console.error('Fetch error:', error);
        } finally {
            sendBtn.disabled = false;
            sendBtn.textContent = '送信する';
        }
    });
});
