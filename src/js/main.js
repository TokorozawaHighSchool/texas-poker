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

    // Hand chart open/close
    function openChart(){ if (chartOverlay){ chartOverlay.style.display = 'flex'; if (window.Sound) window.Sound.click(); } }
    function closeChart(){ if (chartOverlay){ chartOverlay.style.display = 'none'; if (window.Sound) window.Sound.click(); } }
    if (chartBtn) chartBtn.addEventListener('click', openChart);
    if (chartClose) chartClose.addEventListener('click', closeChart);
    if (chartOverlay) chartOverlay.addEventListener('click', (e)=>{ if (e.target === chartOverlay) closeChart(); });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeChart(); });

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
            game.players.forEach((pl, i) => {
                if (i === 0) {
                    UI.updateChips(pl.chips, null, game.pot);
                } else {
                    const faceDown = !!pl.folded; // 伏せ：フォールド者のみ
                    UI.updateAIByIndex(i - 1, pl.hand, faceDown, pl.chips);
                    // ショーダウン時に役名を表示（フォールドしていないAIのみ）
                    if (!pl.folded && window.evaluateHandName) {
                        const name = window.evaluateHandName([...pl.hand, ...game.communityCards]);
                        UI.updateAIHandNameByIndex(i - 1, name);
                    }
                }
            });

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

        // 次のハンドへ（ゲーム継続可能な場合）
        setTimeout(() => {
            if (game.players.length === 1 || game.players[0].chips <= 0) return;
            game.dealCards();
            const np = game.players[0];
            const na = game.players[1];
            UI.updatePlayerHand(np.hand);
            if (na) UI.updateAIHand(na.hand, true);
            UI.updateTableCards(game.communityCards);
            UI.updateChips(np.chips, na ? na.chips : 0, game.pot);
            const aiPlayersNext = game.players.slice(1).map(p => ({ chips: p.chips }));
            UI.renderAIPlayers(aiPlayersNext);
            // 新ハンドで役名クリア＆プレイヤー役名更新
            UI.updatePlayerHandName('');
            if (window.evaluateHandName) {
                const cards7b = [...np.hand, ...game.communityCards];
                UI.updatePlayerHandName(window.evaluateHandName(cards7b));
            }
        }, 1800);
    }
}
// main.js only wires UI to the global Game/Deck/AI implemented in other files