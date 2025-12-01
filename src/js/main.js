// メインロジックを実行するファイルです。ゲームの初期化やイベントリスナーの設定を行います。

document.addEventListener('DOMContentLoaded', () => {
    // モード別コントローラの後始末関数
    let controlsTeardown = null;

    function initGame() {
        const names = ['Player', 'AI 1', 'AI 2', 'AI 3'];
        const modeValue = (document.querySelector('input[name="game-mode"]:checked')||{}).value || 'texas';
        window._gameMode = modeValue;
        if (modeValue === 'draw') {
            const dnames = ['Player']; // ドローはプレイヤーのみ（AIなし）
            window._gameInstance = new (window.DrawGame)(dnames);
            window._gameInstance.initializeGame(dnames);
        } else {
            window._gameInstance = new (window.Game || window.PokerGame)(names);
            window._gameInstance.initializeGame(names);
        }
        window._gameInstance.players.forEach(p => p.chips = 1000);
        window._gameInstance.pot = 0;
        window._gameInstance.dealCards();
        const player0 = window._gameInstance.players[0];
        const firstAI = window._gameInstance.players[1];
        const aiPlayersInit = window._gameInstance.players.slice(1).map(p => ({ chips: p.chips }));
        if (window._gameMode !== 'draw') {
            UI.renderAIPlayers(aiPlayersInit);
        }
        if (UI.dealPlayerHand) {
            UI.dealPlayerHand(player0.hand, { perCardDelay: 260 });
        } else {
            UI.updatePlayerHand(player0.hand);
        }
    if (window._gameMode !== 'draw' && firstAI) UI.updateAIHand(firstAI.hand, true);
        // モード別: Draw ではコミュニティカード非表示
        const commSection = document.getElementById('community-cards');
        if (window._gameMode === 'draw') {
            document.body.classList.add('mode-draw');
            if (commSection) commSection.style.display = 'none';
            const dctrl = document.getElementById('draw-controls');
            if (dctrl) dctrl.style.display = '';
            const aic = document.getElementById('ai-container');
            if (aic) aic.style.display = 'none';
        } else {
            document.body.classList.remove('mode-draw');
            if (commSection) commSection.style.display = '';
            if (UI.dealCommunityCards) {
                UI.dealCommunityCards(window._gameInstance.communityCards, { perCardDelay: 300 });
            } else {
                UI.updateTableCards(window._gameInstance.communityCards);
            }
            const dctrl = document.getElementById('draw-controls');
            if (dctrl) dctrl.style.display = 'none';
            const aic = document.getElementById('ai-container');
            if (aic) aic.style.display = '';
        }
        UI.updateChips(player0.chips, firstAI ? firstAI.chips : 0, window._gameInstance.pot);
        if (window.evaluateHandName) {
            const cards7 = [...player0.hand, ...window._gameInstance.communityCards];
            UI.updatePlayerHandName(window.evaluateHandName(cards7));
        }
        // モード別の遊び方を更新
        renderHowTo(modeValue);

        // 操作ガイダンス（ドロー時）
        if (window._gameMode === 'draw') {
            UI.showMessage('ベット額を入力して「ベット額確定」を押してください');
            // 入金ステータス表示更新
            const ds = document.getElementById('deposit-status');
            if (ds) {
                const g = window._gameInstance;
                const m = g.roundCount % 3;
                const n = g.depositRequired ? 0 : (m === 0 ? 3 : 3 - m);
                ds.textContent = `残り ${n} ラウンド後に最低 $${g.requiredDeposit} を入金してください。入金しないとゲームオーバー`; 
            }
        } else {
            UI.showMessage('アクションを選んでください（コール/ベット/フォールド）');
        }

        // コマンド配線をモードごとに有効化
        if (controlsTeardown) { try { controlsTeardown(); } catch(_){} }
        if (window._gameMode === 'draw' && typeof window.activateDrawControls === 'function') {
            controlsTeardown = window.activateDrawControls();
        } else if (typeof window.activateTexasControls === 'function') {
            controlsTeardown = window.activateTexasControls();
        }
    if (typeof window.updateRaiseButtonLabel === 'function') window.updateRaiseButtonLabel();
    // 賭け系ボタンの表示制御を反映（ドローでは非表示）
    if (typeof refreshActionButtons === 'function') refreshActionButtons();
    }

    const startBtn = document.getElementById('start-game-button');
    const titleScreen = document.getElementById('title-screen');
    const titleLogo = document.querySelector('#title-screen .title-logo');
    const gameTitle = document.getElementById('game-mode-title');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (window.Sound) window.Sound.click();
            initGame();
            if (titleScreen) {
                titleScreen.classList.add('fade-out');
                setTimeout(() => { titleScreen.style.display = 'none'; }, 360);
            }
            const gc = document.getElementById('game-container');
            if (gc) gc.style.display = '';
            // タイトル反映
            if (window._gameMode === 'draw') {
                if (gameTitle) gameTitle.textContent = 'インフィニティポーカー';
            } else {
                if (gameTitle) gameTitle.textContent = 'テキサスポーカー';
            }
        });
    } else {
        // Fallback: no title screen found
        initGame();
        const gc = document.getElementById('game-container');
        if (gc) gc.style.display = '';
    }

    // モード選択の変更でタイトル画面側も即更新
    document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const mode = (document.querySelector('input[name="game-mode"]:checked')||{}).value;
                renderHowTo(mode);
            if (mode === 'draw') {
                if (titleLogo) titleLogo.textContent = 'インフィニティポーカー';
            } else {
                if (titleLogo) titleLogo.textContent = 'テキサスポーカー';
            }
        });
    });

    const callBtn = document.getElementById('call-button');
    const raiseBtn = document.getElementById('raise-button');
    const foldBtn = document.getElementById('fold-button');
    const raiseAmountInput = document.getElementById('raise-amount');
    const retryBtn = document.getElementById('retry-button');
    const nextRoundBtn = document.getElementById('next-round-button');
    const chartBtn = document.getElementById('hand-chart-button');
    const chartOverlay = document.getElementById('hand-chart-overlay');
    const chartClose = document.getElementById('hand-chart-close');
    // HowTo modal controls
    const howtoOpen = document.getElementById('howto-open');
    const howtoOverlay = document.getElementById('howto-overlay');
    const howtoClose = document.getElementById('howto-close');
    const howtoModalBody = document.getElementById('howto-modal-body');
    // Draw controls（表示制御は共通、イベントはコントローラが担当）
    const drawControls = document.getElementById('draw-controls');
    const drawInput = document.getElementById('draw-input');
    const drawButton = document.getElementById('draw-button');
    const standButton = document.getElementById('stand-button');

    function refreshActionButtons() {
        const game = window._gameInstance;
        const inShowdown = game && game.stage >= 4;
        const buttons = [callBtn, raiseBtn, foldBtn, raiseAmountInput];
        if (window._gameMode === 'draw') {
            buttons.forEach(b => { if (b) b.style.display = 'none'; });
        } else {
            buttons.forEach(b => { if (b) b.style.display = inShowdown ? 'none' : ''; });
        }
        // next-round-button はショウダウン後継続可能なら表示（既存ロジックとも連動）
        if (nextRoundBtn && !inShowdown) {
            //  手番中は常時表示しない（既存の表示制御維持）
            // ここでは隠すだけ
            nextRoundBtn.style.display = 'none';
        }
        // Draw専用の表示制御（ドロー時は表示、ショウダウン中は非表示）
        if (drawControls) {
            if (window._gameMode === 'draw') {
                drawControls.style.display = inShowdown ? 'none' : '';
            } else {
                drawControls.style.display = 'none';
            }
        }
        updateRaiseButtonLabel();
    }

    function updateRaiseButtonLabel() {
        const game = window._gameInstance;
        if (!raiseBtn) return;
        if (!game || game.stage >= 4) { return; }
        // currentBet が 0 なら最初の賭けなので「ベット」それ以外は「レイズ」
        if (game.currentBet === 0) {
            raiseBtn.textContent = 'ベット';
        } else {
            raiseBtn.textContent = 'レイズ';
        }
    }
    window.updateRaiseButtonLabel = updateRaiseButtonLabel; // ほかの箇所から再利用

    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            const names = ['Player', 'AI 1', 'AI 2', 'AI 3'];
            if (window._gameMode === 'draw') {
                const dnames = ['Player'];
                window._gameInstance = new (window.DrawGame)(dnames);
                window._gameInstance.initializeGame(dnames);
            } else {
                window._gameInstance = new (window.Game || window.PokerGame)(names);
                window._gameInstance.initializeGame(names);
            }
            window._gameInstance.players.forEach(p => p.chips = 1000);
            window._gameInstance.pot = 0;
            window._gameInstance.dealCards();

            const p = window._gameInstance.players[0];
            const a = window._gameInstance.players[1];
            if (UI.dealPlayerHand) {
                UI.dealPlayerHand(p.hand, { perCardDelay: 260 });
            } else {
                UI.updatePlayerHand(p.hand);
            }
            if (window._gameMode !== 'draw' && a) UI.updateAIHand(a.hand, true);
            if (window._gameMode !== 'draw') {
                if (UI.dealCommunityCards) {
                    UI.dealCommunityCards(window._gameInstance.communityCards, { perCardDelay: 300 });
                } else {
                    UI.updateTableCards(window._gameInstance.communityCards);
                }
            }
            UI.updateChips(p.chips, a ? a.chips : 0, window._gameInstance.pot);
            if (window._gameMode !== 'draw') {
                const aiPlayers = window._gameInstance.players.slice(1).map(ap => ({ chips: ap.chips }));
                UI.renderAIPlayers(aiPlayers);
            } else {
                const aic = document.getElementById('ai-container');
                if (aic) aic.style.display = 'none';
                const commSection = document.getElementById('community-cards');
                if (commSection) commSection.style.display = 'none';
                const dctrl = document.getElementById('draw-controls');
                if (dctrl) dctrl.style.display = '';
            }
            UI.showMessage('');
            retryBtn.style.display = 'none';
            refreshActionButtons();
        });
    }
            function renderHowTo(mode) {
                const el = document.getElementById('howto-content');
                if (!el) return;
                if (mode === 'draw') {
                    el.innerHTML = `
                        <ul>
                            <li>各プレイヤーに5枚が配られ、1回だけ「ドロー（交換）」できます。</li>
                            <li>交換したいカードをクリックで選択（複数可）。選択されたカードは強調表示されます。</li>
                            <li>確定は「ドローボタン」か、手札エリアのダブルクリックで行えます。選択が空ならスタンドになります。</li>
                            <li>このモードでは賭け操作（コール/ベット/フォールド）はありません。</li>
                        </ul>
                    `;
                } else {
                    el.innerHTML = `
                        <ul>
                            <li>各プレイヤーに2枚が配られ、場に5枚のコミュニティカードが公開されます。</li>
                            <li>各ストリートごとにベッティングを行い、ショウダウンで役の強さを競います。</li>
                            <li>ショウダウン中はコール/レイズ/フォールドはできません。次のハンドは「次のラウンドへ」。</li>
                            <li>役表は「役表」ボタンからいつでも確認できます。</li>
                        </ul>
                    `;
                }
            }


    if (nextRoundBtn) {
        nextRoundBtn.addEventListener('click', () => {
            if (window.Sound) window.Sound.click();
            const game = window._gameInstance;
            if (!game) return;
            // 新しいハンドを配る（Texas/Draw 共通）
            if (typeof game.dealCards === 'function') game.dealCards();
            const np = game.players[0];
            const na = game.players[1];
            if (UI.dealPlayerHand) {
                UI.dealPlayerHand(np.hand, { perCardDelay: 260 });
            } else {
                UI.updatePlayerHand(np.hand);
            }
            if (na) UI.updateAIHand(na.hand, true);
            if (window._gameMode === 'draw') {
                document.body.classList.add('mode-draw');
                const commSection = document.getElementById('community-cards');
                if (commSection) commSection.style.display = 'none';
                const dctrl = document.getElementById('draw-controls');
                if (dctrl) dctrl.style.display = '';
                const aic = document.getElementById('ai-container');
                if (aic) aic.style.display = 'none';
            } else {
                document.body.classList.remove('mode-draw');
                if (UI.dealCommunityCards) {
                    UI.dealCommunityCards(game.communityCards, { perCardDelay: 300 });
                } else {
                    UI.updateTableCards(game.communityCards);
                }
                const dctrl = document.getElementById('draw-controls');
                if (dctrl) dctrl.style.display = 'none';
                const aic = document.getElementById('ai-container');
                if (aic) aic.style.display = '';
            }
            UI.updateChips(np.chips, na ? na.chips : 0, game.pot);
            if (window._gameMode !== 'draw') {
                const aiPlayersNext = game.players.slice(1).map(p => ({ chips: p.chips }));
                UI.renderAIPlayers(aiPlayersNext);
            }
            // 役名を初期化＆表示
            UI.updatePlayerHandName('');
            if (window.evaluateHandName) {
                const cards7b = [...np.hand, ...game.communityCards];
                UI.updatePlayerHandName(window.evaluateHandName(cards7b));
            }
            // ボタンを隠す
            nextRoundBtn.style.display = 'none';
            UI.showMessage('');
            refreshActionButtons();
            if (typeof window.updateRaiseButtonLabel === 'function') window.updateRaiseButtonLabel();
        });
    }

    // Hand chart open/close
    function openChart() { if (chartOverlay) { chartOverlay.style.display = 'flex'; if (window.Sound) window.Sound.click(); } }
    function closeChart() { if (chartOverlay) { chartOverlay.style.display = 'none'; if (window.Sound) window.Sound.click(); } }
    if (chartBtn) chartBtn.addEventListener('click', openChart);
    if (chartClose) chartClose.addEventListener('click', closeChart);
    if (chartOverlay) chartOverlay.addEventListener('click', (e) => { if (e.target === chartOverlay) closeChart(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeChart(); });

    function openHowto() { if (howtoOverlay) { howtoOverlay.style.display = 'flex'; if (window.Sound) window.Sound.click(); } }
    function closeHowto() { if (howtoOverlay) { howtoOverlay.style.display = 'none'; if (window.Sound) window.Sound.click(); } }
    function syncHowtoModal(){
        const src = document.getElementById('howto-content');
        if (src && howtoModalBody) howtoModalBody.innerHTML = src.innerHTML;
    }
    if (howtoOpen) howtoOpen.addEventListener('click', () => { syncHowtoModal(); openHowto(); });
    if (howtoClose) howtoClose.addEventListener('click', closeHowto);
    if (howtoOverlay) howtoOverlay.addEventListener('click', (e) => { if (e.target === howtoOverlay) closeHowto(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHowto(); });

    // イベント配線は各モード専用コントローラに委譲

    // 初期描画後（まだゲーム開始前）ボタンは非表示のまま。開始後に refreshActionButtons 実行。
});

window.playerAction = function playerAction(action, amount = 0) {
    const game = window._gameInstance;
    if (!game) return;
    // ショウダウン後は操作不可
    if (game.stage >= 4) {
        UI.showMessage('ショウダウン後は操作できません。次のラウンドへ進んでください。');
        return;
    }
    const playerIndex = 0;

    // Draw モード: 交換は専用ボタンで実施。ここでは賭け操作のみ。
    if (window._gameMode === 'draw') {
        if (action === 'fold') { game.fold(playerIndex); }
        else if (action === 'raise') { game.bet(playerIndex, amount); }
        else if (action === 'call') { game.call(playerIndex); }
        UI.updatePlayerHand(game.players[playerIndex].hand);
        UI.updateChips(game.players[playerIndex].chips, null, game.pot);
        return;
    }

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
                const from = document.getElementById(`ai-${idx-1}-chips`) || document.getElementById('ai-chips');
                const to = document.getElementById('pot');
                game.call(idx);
                if (from && to && window.UI && UI.animateChipFly) UI.animateChipFly(from, to, { count: 5 });
                UI.showMessage(`${actor.name} calls.`);
                if (window.Sound) window.Sound.chips();
            } else if (act === 'raise') {
                let amt = parseInt(decision.amount);
                if (isNaN(amt) || amt <= 0) amt = 50;
                amt = Math.min(amt, actor.chips);
                const from = document.getElementById(`ai-${idx-1}-chips`) || document.getElementById('ai-chips');
                const to = document.getElementById('pot');
                game.bet(idx, amt);
                if (from && to && window.UI && UI.animateChipFly) UI.animateChipFly(from, to, { count: Math.min(10, 4 + Math.floor(amt/50)) });
                UI.showMessage(`${actor.name} raises ${amt}.`);
                if (window.Sound) window.Sound.chips();
            }
            UI.updateAIByIndex(idx - 1, actor.hand, true, actor.chips);
            if (game.countActivePlayers() <= 1) break;
        }
    }

    if (action === 'call') {
    const from = document.getElementById('player-chips');
    const to = document.getElementById('pot');
    game.call(playerIndex);
    if (from && to && window.UI && UI.animateChipFly) UI.animateChipFly(from, to, { count: 6 });
        if (window.Sound) window.Sound.chips();
    } else if (action === 'raise') {
    const from = document.getElementById('player-chips');
    const to = document.getElementById('pot');
    game.bet(playerIndex, amount);
    if (from && to && window.UI && UI.animateChipFly) UI.animateChipFly(from, to, { count: Math.min(12, 5 + Math.floor(amount/50)) });
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
    if (UI.dealCommunityCards) {
        UI.dealCommunityCards(game.communityCards, { perCardDelay: 300 });
    } else {
        UI.updateTableCards(game.communityCards);
    }
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
                // Animate pot -> winner chips
                const potEl = document.getElementById('pot');
                let targetEl = null;
                if (res.winnerName === (game.players[0] && game.players[0].name)) {
                    targetEl = document.getElementById('player-chips');
                } else {
                    // find winner index
                    const idx = game.players.findIndex(p => p && p.name === res.winnerName);
                    if (idx > 0) targetEl = document.getElementById(`ai-${idx-1}-chips`) || document.getElementById('ai-chips');
                }
                if (potEl && targetEl && window.UI && UI.animateChipFly) UI.animateChipFly(potEl, targetEl, { count: Math.min(18, 6 + Math.floor((res.awarded||0)/100)), duration: 800 });
                if (window.Sound) window.Sound.win();
            } else {
                UI.showMessage('Showdown finished.');
            }
            // アクションボタンを隠す
            const callBtn2 = document.getElementById('call-button');
            const raiseBtn2 = document.getElementById('raise-button');
            const foldBtn2 = document.getElementById('fold-button');
            const raiseAmountInput2 = document.getElementById('raise-amount');
            [callBtn2, raiseBtn2, foldBtn2, raiseAmountInput2].forEach(b => { if (b) b.style.display = 'none'; });
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
    // showdownボタン状態最終更新
    // nextRoundBtn が表示されているので他の操作は消えているはず
    }
    // 最終的にボタンラベルを現在の状態に同期
    if (typeof window.updateRaiseButtonLabel === 'function') {
        window.updateRaiseButtonLabel();
    }
}
// main.js only wires UI to the global Game/Deck/AI implemented in other files