// メインロジックを実行するファイルです。ゲームの初期化やイベントリスナーの設定を行います。

document.addEventListener('DOMContentLoaded', () => {
    // 初回自動配布
    if (!window._gameInstance) {
        const names = ['Player', 'AI 1', 'AI 2', 'AI 3'];
        window._gameInstance = new (window.Game || window.PokerGame)(names);
        window._gameInstance.initializeGame(names);
        window._gameInstance.players.forEach(p => p.chips = 1000);
        window._gameInstance.pot = 0;
        const aiPlayersInit = window._gameInstance.players.slice(1).map(p => ({ chips: p.chips }));
        UI.renderAIPlayers(aiPlayersInit);
    }

    // 配り直し
    window._gameInstance.dealCards();

    // 初期UI反映
    const player0 = window._gameInstance.players[0];
    const firstAI = window._gameInstance.players[1];
    UI.updatePlayerHand(player0.hand);
    if (firstAI) UI.updateAIHand(firstAI.hand, true);
    UI.updateTableCards(window._gameInstance.communityCards);
    UI.updateChips(player0.chips, firstAI ? firstAI.chips : 0, window._gameInstance.pot);
    // 初期役名
    if (window.evaluateHandName) {
        const cards7 = [...player0.hand, ...window._gameInstance.communityCards];
        UI.updatePlayerHandName(window.evaluateHandName(cards7));
    }

    const callBtn = document.getElementById('call-button');
    const raiseBtn = document.getElementById('raise-button');
    const foldBtn = document.getElementById('fold-button');
    const raiseAmountInput = document.getElementById('raise-amount');
    const retryBtn = document.getElementById('retry-button');
    const nextRoundBtn = document.getElementById('next-round-button');
    const chartBtn = document.getElementById('hand-chart-button');
    const chartOverlay = document.getElementById('hand-chart-overlay');
    const chartClose = document.getElementById('hand-chart-close');

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const names = ['Player', 'AI 1', 'AI 2', 'AI 3'];
            window._gameInstance = new (window.Game || window.PokerGame)(names);
            window._gameInstance.initializeGame(names);
            window._gameInstance.players.forEach(p => p.chips = 1000);
            window._gameInstance.pot = 0;
            window._gameInstance.dealCards();

            const p = window._gameInstance.players[0];
            const a = window._gameInstance.players[1];
            UI.updatePlayerHand(p.hand);
            if (a) UI.updateAIHand(a.hand, true);
            UI.updateTableCards(window._gameInstance.communityCards);
            UI.updateChips(p.chips, a ? a.chips : 0, window._gameInstance.pot);
            const aiPlayers = window._gameInstance.players.slice(1).map(ap => ({ chips: ap.chips }));
            UI.renderAIPlayers(aiPlayers);
            UI.showMessage('');
            retryBtn.style.display = 'none';
        });
    }

    if (nextRoundBtn) {
        nextRoundBtn.addEventListener('click', () => {
            if (window.Sound) window.Sound.click();
            const game = window._gameInstance;
            if (!game) return;
            // 新しいハンドを配る
            game.dealCards();
            const np = game.players[0];
            const na = game.players[1];
            UI.updatePlayerHand(np.hand);
            if (na) UI.updateAIHand(na.hand, true);
            UI.updateTableCards(game.communityCards);
            UI.updateChips(np.chips, na ? na.chips : 0, game.pot);
            const aiPlayersNext = game.players.slice(1).map(p => ({ chips: p.chips }));
            UI.renderAIPlayers(aiPlayersNext);
            // 役名を初期化＆表示
            UI.updatePlayerHandName('');
            if (window.evaluateHandName) {
                const cards7b = [...np.hand, ...game.communityCards];
                UI.updatePlayerHandName(window.evaluateHandName(cards7b));
            }
            // ボタンを隠す
            nextRoundBtn.style.display = 'none';
            UI.showMessage('');
        });
    }

    // Hand chart open/close
    function openChart() { if (chartOverlay) { chartOverlay.style.display = 'flex'; if (window.Sound) window.Sound.click(); } }
    function closeChart() { if (chartOverlay) { chartOverlay.style.display = 'none'; if (window.Sound) window.Sound.click(); } }
    if (chartBtn) chartBtn.addEventListener('click', openChart);
    if (chartClose) chartClose.addEventListener('click', closeChart);
    if (chartOverlay) chartOverlay.addEventListener('click', (e) => { if (e.target === chartOverlay) closeChart(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChart(); });

    callBtn.addEventListener('click', () => { if (window.Sound) window.Sound.click(); playerAction('call'); });
    raiseBtn.addEventListener('click', () => {
        if (window.Sound) window.Sound.click();
        let raiseAmount = 50;
        const game = window._gameInstance;
        if (raiseAmountInput && !isNaN(parseInt(raiseAmountInput.value))) {
            raiseAmount = parseInt(raiseAmountInput.value);
        }
        if (game && game.players && game.players[0]) {
            raiseAmount = Math.min(raiseAmount, game.players[0].chips);
        }
        playerAction('raise', raiseAmount);
    });
    foldBtn.addEventListener('click', () => { if (window.Sound) window.Sound.click(); playerAction('fold'); });
});

function playerAction(action, amount = 0) {
    const game = window._gameInstance;
    if (!game) return;
    const playerIndex = 0;

    function runAITurnsUntilPlayerOrShowdown() {
        let loopCount = 0;
        while (game.stage < 4 && game.currentPlayerIndex !== playerIndex && loopCount < 100) {
            loopCount++;
            if (game.players.every(p => p.chips === 0)) break;
            const idx = game.currentPlayerIndex;
            const actor = game.players[idx];
            if (actor.folded || actor.chips <= 0) {
                game.advanceToNextActive();
                continue;
            }
            const decision = (typeof actor.decideAction === 'function') ? actor.decideAction(game, idx) : { action: 'call' };
            const act = decision && decision.action;
            if (!['fold', 'call', 'raise'].includes(act)) {
                game.fold(idx);
                UI.showMessage(`${actor.name} folds (invalid action).`);
                if (window.Sound) window.Sound.fold();
            } else if (act === 'fold') {
                game.fold(idx);
                UI.showMessage(`${actor.name} folds.`);
                if (window.Sound) window.Sound.fold();
            } else if (act === 'call') {
                game.call(idx);
                UI.showMessage(`${actor.name} calls.`);
                if (window.Sound) window.Sound.chips();
            } else if (act === 'raise') {
                let amt = parseInt(decision.amount);
                if (isNaN(amt) || amt <= 0) amt = 50;
                amt = Math.min(amt, actor.chips);
                game.bet(idx, amt);
                UI.showMessage(`${actor.name} raises ${amt}.`);
                if (window.Sound) window.Sound.chips();
            }
            UI.updateAIByIndex(idx - 1, actor.hand, true, actor.chips);
            if (game.countActivePlayers() <= 1) break;
        }
    }

    if (action === 'call') {
        game.call(playerIndex);
        if (window.Sound) window.Sound.chips();
    } else if (action === 'raise') {
        game.bet(playerIndex, amount);
        if (window.Sound) window.Sound.chips();
    } else if (action === 'fold') {
        game.fold(playerIndex);
        if (window.Sound) window.Sound.fold();
    }

    if (game.stage < 4 && (game.players[playerIndex].chips === 0 || game.currentPlayerIndex !== playerIndex)) {
        runAITurnsUntilPlayerOrShowdown();
    }

    const player = game.players[playerIndex];
    UI.updatePlayerHand(player.hand);
    UI.updateTableCards(game.communityCards);
    UI.updateChips(player.chips, null, game.pot);
    // プレイヤーの役名は常時更新
    if (window.evaluateHandName) {
        const cards7 = [...player.hand, ...game.communityCards];
        UI.updatePlayerHandName(window.evaluateHandName(cards7));
    }
    game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, true, aiPlayer.chips));

    if (game.stage < 4 && game.currentPlayerIndex !== playerIndex) {
        runAITurnsUntilPlayerOrShowdown();
    }

    // ショウダウン処理（フォールドしていないAIのみ公開）
    if (game.stage === 4) {
        function finalizeShowdown(res) {
            // 既存のAI表示数と比較し、人数が変わったときのみ再構築（フリップ演出を保護）
            const currentBlocks = document.querySelectorAll('#ai-container .ai-block').length;
            const targetBlocks = Math.max(0, game.players.length - 1);
            if (currentBlocks !== targetBlocks) {
                const aiPlayers = game.players.slice(1).map(p => ({ chips: p.chips }));
                UI.renderAIPlayers(aiPlayers);
            }
            (async () => {
                let revealIdx = 0;
                for (let i = 0; i < game.players.length; i++) {
                    const pl = game.players[i];
                    if (i === 0) {
                        UI.updateChips(pl.chips, null, game.pot);
                    } else {
                        const idx = i - 1;
                        if (pl.folded) {
                            // フォールドしているAIは伏せたまま
                            UI.updateAIByIndex(idx, pl.hand, true, pl.chips);
                        } else {
                            // 一度伏せてから順番にめくる
                            UI.updateAIByIndex(idx, pl.hand, true, pl.chips);
                            const delayBase = 200; // 次のAIをめくり始める間隔
                            const perCard = 240;   // 一人の2枚を順次めくる間隔
                            await UI.revealAIHandByIndex(idx, pl.hand, { startDelay: revealIdx * delayBase, perCardDelay: perCard });
                            if (window.evaluateHandName) {
                                const name = window.evaluateHandName([...pl.hand, ...game.communityCards]);
                                UI.updateAIHandNameByIndex(idx, name);
                            }
                            revealIdx++;
                        }
                    }
                }
            })();

            const retryBtn = document.getElementById('retry-button');
            if (game.players.length === 1) {
                UI.showMessage('AIを全て倒しました！勝利です！');
                if (retryBtn) retryBtn.style.display = '';
                return;
            }
            if (game.players[0].chips <= 0) {
                UI.showMessage('あなたのチップがなくなりました。敗北です。');
                if (retryBtn) retryBtn.style.display = '';
                return;
            }
            if (res && res.winnerName) {
                UI.showMessage(`${res.winnerName} wins $${res.awarded}`);
                if (window.Sound) window.Sound.win();
            } else {
                UI.showMessage('Showdown finished.');
            }
        }

        // ゲームロジックで勝者決定と配当
        let result = null;
        if (typeof game.showdown === 'function') {
            result = game.showdown();
        }
        finalizeShowdown(result);

        // 次のハンドへはボタン操作で進む（勝敗が確定していない場合に表示）
        const canContinue = !(game.players.length === 1 || game.players[0].chips <= 0);
        const btn = document.getElementById('next-round-button');
        if (canContinue && btn) btn.style.display = '';
    }
}
// main.js only wires UI to the global Game/Deck/AI implemented in other files