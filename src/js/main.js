// メインロジックを実行するファイルです。ゲームの初期化やイベントリスナーの設定を行います。

document.addEventListener('DOMContentLoaded', () => {
    // 初回自動配布
    if (!window._gameInstance) {
        // create Player + 3 AIs
        const names = ['Player', 'AI 1', 'AI 2', 'AI 3'];
        window._gameInstance = new (window.Game || window.PokerGame)(names);
        window._gameInstance.initializeGame(names);
        // initialize chips for players
        window._gameInstance.players.forEach(p => p.chips = 1000);
        window._gameInstance.pot = 0;
        // render AI blocks
        const aiPlayers = window._gameInstance.players.slice(1).map(p => ({ chips: p.chips }));
        UI.renderAIPlayers(aiPlayers);
    }
    window._gameInstance.dealCards();
    // update UI
    const player = window._gameInstance.players[0];
    const ai = window._gameInstance.players[1];
    console.log('player hand after deal:', player && player.hand);
    console.log('ai hand after deal:', ai && ai.hand);
    console.log('community after deal:', window._gameInstance.communityCards);
    UI.updatePlayerHand(player.hand);
    UI.updateAIHand(ai.hand, true); // keep AI face-down by default
    UI.updateTableCards(window._gameInstance.communityCards);
    UI.updateChips(player.chips, ai ? ai.chips : 0, window._gameInstance.pot);
    const callBtn = document.getElementById('call-button');
    const raiseBtn = document.getElementById('raise-button');
    const foldBtn = document.getElementById('fold-button');
    const raiseAmountInput = document.getElementById('raise-amount');
        const retryBtn = document.getElementById('retry-button');

        // 再挑戦ボタンのイベント
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                // ゲーム初期化
                const names = ['Player', 'AI 1', 'AI 2', 'AI 3'];
                window._gameInstance = new (window.Game || window.PokerGame)(names);
                window._gameInstance.initializeGame(names);
                window._gameInstance.players.forEach(p => p.chips = 1000);
                window._gameInstance.pot = 0;
                window._gameInstance.dealCards();
                // startHand() already handles forced bets; no duplicate here
                // UI初期化
                const player = window._gameInstance.players[0];
                const ai = window._gameInstance.players[1];
                UI.updatePlayerHand(player.hand);
                UI.updateAIHand(ai.hand, true);
                UI.updateTableCards(window._gameInstance.communityCards);
                UI.updateChips(player.chips, ai ? ai.chips : 0, window._gameInstance.pot);
                const aiPlayers = window._gameInstance.players.slice(1).map(p => ({ chips: p.chips }));
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
        // プレイヤーの所持チップを超えないように制限
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

    // AIターン進行関数（プレイヤーに戻るかショーダウンまで実行）
    function runAITurnsUntilPlayerOrShowdown() {
        let loopCount = 0;
        while (game.stage < 4 && game.currentPlayerIndex !== playerIndex && loopCount < 100) {
            loopCount++;
            // 全員オールインなら打ち切り（ショーダウンは別処理で行う）
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

    // プレイヤーのアクション処理
    if (action === 'call') {
        game.call(playerIndex);
    } else if (action === 'raise') {
        game.bet(playerIndex, amount);
    } else if (action === 'fold') {
        game.fold(playerIndex);
    }

    // オールインや現在のターンがAI側ならAIを進める
    if (game.stage < 4 && (game.players[playerIndex].chips === 0 || game.currentPlayerIndex !== playerIndex)) {
        runAITurnsUntilPlayerOrShowdown();
    }

    // UI更新
    const player = game.players[playerIndex];
    UI.updatePlayerHand(player.hand);
    UI.updateTableCards(game.communityCards);
    UI.updateChips(player.chips, null, game.pot);
    game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, true, aiPlayer.chips));

    // もしまだAIのターンが残っているなら続けて処理
    if (game.stage < 4 && game.currentPlayerIndex !== playerIndex) {
        runAITurnsUntilPlayerOrShowdown();
    }

    // ショーダウン処理
    if (game.stage === 4) {
        function finalizeShowdown(res) {
            // update chips after awarding
            game.players.forEach((pl, i) => {
                if (i === 0) UI.updateChips(pl.chips, null, game.pot);
                else UI.updateAIByIndex(i - 1, pl.hand, false, pl.chips);
            });
            const aiPlayers = game.players.slice(1).map(p => ({ chips: p.chips }));
            UI.renderAIPlayers(aiPlayers);
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
        // reveal all AI hands
        game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, false, aiPlayer.chips));
        UI.updatePlayerHand(player.hand);
        if (typeof game.showdown === 'function') {
            const res = game.showdown();
            finalizeShowdown(res);
            // 自動で新しいハンドを配る（showdownでゲームが続行可能な場合のみ）
            setTimeout(() => {
                if (game.players.length === 1 || game.players[0].chips <= 0) return;
                game.dealCards();
                const player = game.players[0];
                const ai = game.players[1];
                UI.updatePlayerHand(player.hand);
                if (ai) UI.updateAIHand(ai.hand, true);
                UI.updateTableCards(game.communityCards);
                UI.updateChips(player.chips, ai ? ai.chips : 0, game.pot);
                const aiPlayers = game.players.slice(1).map(p => ({ chips: p.chips }));
                UI.renderAIPlayers(aiPlayers);
            }, 1800);
        }
    }
}
// main.js only wires UI to the global Game/Deck/AI implemented in other files