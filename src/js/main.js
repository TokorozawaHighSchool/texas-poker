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

    const callBtn = document.getElementById('call-button');
    const raiseBtn = document.getElementById('raise-button');
    const foldBtn = document.getElementById('fold-button');
    const raiseAmountInput = document.getElementById('raise-amount');
    const retryBtn = document.getElementById('retry-button');

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

    callBtn.addEventListener('click', () => playerAction('call'));
    raiseBtn.addEventListener('click', () => {
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
    foldBtn.addEventListener('click', () => playerAction('fold'));
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
            } else if (act === 'fold') {
                game.fold(idx);
                UI.showMessage(`${actor.name} folds.`);
            } else if (act === 'call') {
                game.call(idx);
                UI.showMessage(`${actor.name} calls.`);
            } else if (act === 'raise') {
                let amt = parseInt(decision.amount);
                if (isNaN(amt) || amt <= 0) amt = 50;
                amt = Math.min(amt, actor.chips);
                game.bet(idx, amt);
                UI.showMessage(`${actor.name} raises ${amt}.`);
            }
            UI.updateAIByIndex(idx - 1, actor.hand, true, actor.chips);
            if (game.countActivePlayers() <= 1) break;
        }
    }

    if (action === 'call') {
        game.call(playerIndex);
    } else if (action === 'raise') {
        game.bet(playerIndex, amount);
    } else if (action === 'fold') {
        game.fold(playerIndex);
    }

    if (game.stage < 4 && (game.players[playerIndex].chips === 0 || game.currentPlayerIndex !== playerIndex)) {
        runAITurnsUntilPlayerOrShowdown();
    }

    const player = game.players[playerIndex];
    UI.updatePlayerHand(player.hand);
    UI.updateTableCards(game.communityCards);
    UI.updateChips(player.chips, null, game.pot);
    game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, true, aiPlayer.chips));

    if (game.stage < 4 && game.currentPlayerIndex !== playerIndex) {
        runAITurnsUntilPlayerOrShowdown();
    }

    // ショウダウン処理（フォールドしていないAIのみ公開）
    if (game.stage === 4) {
        function finalizeShowdown(res) {
            // ブロックを最新状態で描画してから各手札を更新（フォールドAIは伏せたまま）
            const aiPlayers = game.players.slice(1).map(p => ({ chips: p.chips }));
            UI.renderAIPlayers(aiPlayers);
            game.players.forEach((pl, i) => {
                if (i === 0) {
                    UI.updateChips(pl.chips, null, game.pot);
                } else {
                    const faceDown = !!pl.folded;
                    UI.updateAIByIndex(i - 1, pl.hand, faceDown, pl.chips);
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
        }, 1800);
    }
}
// main.js only wires UI to the global Game/Deck/AI implemented in other files