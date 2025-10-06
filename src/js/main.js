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
    // --- ここから強制ベット（100チップ）処理 ---
    const betAmount = 100;
    window._gameInstance.players.forEach(p => {
        const actualBet = Math.min(betAmount, p.chips);
        p.chips -= actualBet;
        window._gameInstance.pot += actualBet;
    });
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
    const aiStart = 1;

    if (action === 'call') {
        game.call(playerIndex);
    } else if (action === 'raise') {
        game.bet(playerIndex, amount);
    } else if (action === 'fold') {
        game.fold(playerIndex);
    }

    // update UI after player's action
    const player = game.players[playerIndex];
    UI.updatePlayerHand(player.hand);
    UI.updateTableCards(game.communityCards);
    // Update chips/pot and AI panels
    UI.updateChips(player.chips, null, game.pot);
    game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, true, aiPlayer.chips));

    // Process turns strictly: continue letting currentPlayerIndex act until it returns to player (index 0) or hand ends
    while (game.stage < 4 && game.currentPlayerIndex !== 0) {
        const idx = game.currentPlayerIndex;
        const actor = game.players[idx];
        if (actor.folded || actor.chips <= 0) {
            // skip
            game.advanceToNextActive();
            continue;
        }

        // AI acts
        const decision = actor.decideAction(game, idx);
        if (decision.action === 'fold') {
            game.fold(idx);
            UI.showMessage(`${actor.name} folds.`);
        } else if (decision.action === 'call') {
            game.call(idx);
            UI.showMessage(`${actor.name} calls.`);
        } else if (decision.action === 'raise') {
            const amt = Math.min(decision.amount || 50, actor.chips);
            game.bet(idx, amt);
            UI.showMessage(`${actor.name} raises ${amt}.`);
        }

        // update this AI's UI block
        UI.updateAIByIndex(idx - 1, actor.hand, true, actor.chips);
    }

    // final UI update for player and community
    UI.updatePlayerHand(player.hand);
    UI.updateTableCards(game.communityCards);
    // update chips for all players: player and each AI block
    UI.updateChips(player.chips, null, game.pot);
    game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, true, aiPlayer.chips));

    // if we've reached showdown stage, reveal hands and determine winner
    if (game.stage === 4) {
        // reveal all AI hands
        game.players.slice(1).forEach((aiPlayer, i) => UI.updateAIByIndex(i, aiPlayer.hand, false, aiPlayer.chips));
        // reveal player hand (already visible)
        UI.updatePlayerHand(player.hand);
        // call showdown logic to determine winner and award pot
        if (typeof game.showdown === 'function') {
            const res = game.showdown();
            // update chips after awarding
            game.players.forEach((pl, i) => {
                if (i === 0) UI.updateChips(pl.chips, null, game.pot);
                else UI.updateAIByIndex(i - 1, pl.hand, false, pl.chips);
            });
            // 退場AIを画面からも消す
            const aiPlayers = game.players.slice(1).map(p => ({ chips: p.chips }));
            UI.renderAIPlayers(aiPlayers);
            // 勝利・敗北判定
            if (game.players.length === 1) {
                UI.showMessage('AIを全て倒しました！勝利です！');
                return;
            }
            if (game.players[0].chips <= 0) {
                UI.showMessage('あなたのチップがなくなりました。敗北です。');
                return;
            }
            // 通常の勝者表示
            if (res && res.winnerName) {
                UI.showMessage(`${res.winnerName} wins $${res.awarded}`);
            } else {
                UI.showMessage('Showdown finished.');
            }

            // --- showdown後に自動で新しいカードを配る ---
            setTimeout(() => {
                if (game.players.length === 1 || game.players[0].chips <= 0) return;
                game.dealCards();
                // 強制ベット
                const betAmount = 100;
                game.players.forEach(p => {
                    const actualBet = Math.min(betAmount, p.chips);
                    p.chips -= actualBet;
                    game.pot += actualBet;
                });
                // update UI
                const player = game.players[0];
                const ai = game.players[1];
                UI.updatePlayerHand(player.hand);
                if (ai) UI.updateAIHand(ai.hand, true);
                UI.updateTableCards(game.communityCards);
                UI.updateChips(player.chips, ai ? ai.chips : 0, game.pot);
                // AIブロック再描画
                const aiPlayers = game.players.slice(1).map(p => ({ chips: p.chips }));
                UI.renderAIPlayers(aiPlayers);
            }, 1800); // 1.8秒後に自動配布
        }
    }
}
// main.js only wires UI to the global Game/Deck/AI implemented in other files