// Five-Card Draw specific command wiring. Shares UI with Texas.
// Exposes window.activateDrawControls returning a teardown function.

(function(){
  function activateDrawControls() {
    const callBtn = document.getElementById('call-button');
    const raiseBtn = document.getElementById('raise-button');
    const foldBtn = document.getElementById('fold-button');
    const raiseAmountInput = document.getElementById('raise-amount');
  const drawControls = document.getElementById('draw-controls');

  const listeners = [];
    // 選択状態を管理
    const selected = new Set();

    // 手札クリックで選択/解除（委譲）
    const playerHandEl = document.getElementById('player-hand');
    if (playerHandEl) {
      const clickHandler = (e) => {
        if (window._gameMode !== 'draw') return;
        const cardEl = e.target.closest('.card');
        if (!cardEl || !playerHandEl.contains(cardEl)) return;
        // カードのインデックスを特定（現状はDOM順を採用）
        const nodes = Array.from(playerHandEl.querySelectorAll('.card'));
        const idx = nodes.indexOf(cardEl);
        if (idx < 0) return;
        if (selected.has(idx)) { selected.delete(idx); cardEl.classList.remove('card--selected'); }
        else { selected.add(idx); cardEl.classList.add('card--selected'); }
      };
      const dblHandler = () => {
        if (window._gameMode !== 'draw') return;
        const game = window._gameInstance; if (!game) return;
        const me = 0;
        if (game.players[me].hasDrawn) { UI.showMessage('ドローは一度だけ可能です'); return; }
        const idxs = Array.from(selected).sort((a,b)=>a-b);
        game.drawCards(me, idxs);
        UI.updatePlayerHand(game.players[me].hand);
        selected.clear();
        playerHandEl.querySelectorAll('.card--selected').forEach(el=>el.classList.remove('card--selected'));
  // ドロー時はポット/チップ非表示のため更新は任意
        // シングルプレイのためAI処理は無し
        if (game.stage >= 4) {
          const res = game.showdown();
          if (res && res.winnerName) {
            const name = res.handName ? ` (${res.handName})` : '';
            UI.showMessage(`${res.winnerName} wins $${res.awarded}${name}`);
          } else UI.showMessage('Showdown');
          const btn = document.getElementById('next-round-button'); if (btn) btn.style.display = '';
        } else {
          UI.showMessage(idxs.length ? 'ドローしました' : 'スタンドしました');
        }
      };
      playerHandEl.addEventListener('click', clickHandler);
      playerHandEl.addEventListener('dblclick', dblHandler);
      listeners.push(()=>playerHandEl.removeEventListener('click', clickHandler));
      listeners.push(()=>playerHandEl.removeEventListener('dblclick', dblHandler));
    }

  // ドロー専用: アンティ（ベット額）の確定
  const betInput = document.getElementById('draw-bet-amount');
  const betButton = document.getElementById('draw-bet-button');
  const depositInput = document.getElementById('draw-deposit-amount');
  const depositButton = document.getElementById('draw-deposit-button');
  if (betButton) {
    const clickBet = () => {
      if (window.Sound) window.Sound.click();
      if (window._gameMode !== 'draw') return;
  const val = betInput ? parseInt(betInput.value||'0', 10) : 0;
  const safe = isNaN(val) ? 0 : Math.max(0, val);
  const game = window._gameInstance; if (!game) return;
  const me = 0;
  const player = game.players[me]; if (!player) return;
  const pay = Math.min(safe, player.chips);
  if (pay <= 0) { UI.showMessage('ベット額を入力してください'); return; }
  // DrawGame APIでベット確定（initialDealが未配布ならここで配布される）
  game.bet(me, pay);
  UI.updateChips(game.players[me].chips, 0, game.pot);
  // 配布が完了していれば手札を表示
  if (game.players[me].hand && game.players[me].hand.length) {
    UI.updatePlayerHand(game.players[me].hand);
  }
  UI.showMessage(`$${pay} ベットしました。交換したいカードをクリックして選び、「ドロー」か「スタンド」を行ってください。`);
    };
    betButton.addEventListener('click', clickBet);
    listeners.push(()=>betButton.removeEventListener('click', clickBet));
  }

  // 入金（3ラウンドごと）
  if (depositButton) {
    const clickDeposit = () => {
      if (window.Sound) window.Sound.click();
      if (window._gameMode !== 'draw') return;
      const game = window._gameInstance; if (!game) return;
      const me = 0;
      const val = depositInput ? parseInt(depositInput.value||'0',10) : 0;
      const ok = game.deposit(me, val);
      if (ok) {
        UI.showMessage(`$${val} を入金しました。プレイを続行できます。`);
        const p = game.players[me]; UI.updateChips(p.chips, 0, game.pot);
      } else {
        if (!game.depositRequired) UI.showMessage('入金は不要です');
        else UI.showMessage(`入金額が不足しています（最低 $${game.requiredDeposit}）`);
      }
    };
    depositButton.addEventListener('click', clickDeposit);
    listeners.push(()=>depositButton.removeEventListener('click', clickDeposit));
  }

  // 賭け系（コール/ベット/フォールド）はドローでは使用しないため、イベント配線しない

  // ドローボタンで選択カードの交換を確定できるようにする
  const drawButton = document.getElementById('draw-button');
  if (drawButton) {
    const clickDraw = () => {
      if (window.Sound) window.Sound.click();
      if (window._gameMode !== 'draw') return;
      const game = window._gameInstance; if (!game) return;
      const me = 0; if (game.players[me].hasDrawn) { UI.showMessage('ドローは一度だけ可能です'); return; }
  if (!game.players[me].hasBet) { UI.showMessage('先にベットを確定してください'); return; }
      const idxs = Array.from(selected).sort((a,b)=>a-b);
      if (idxs.length === 0) { UI.showMessage('カードを選択してください'); return; }
      game.drawCards(me, idxs);
      UI.updatePlayerHand(game.players[me].hand);
      selected.clear();
      const playerHandEl2 = document.getElementById('player-hand');
      if (playerHandEl2) playerHandEl2.querySelectorAll('.card--selected').forEach(el=>el.classList.remove('card--selected'));
  // ドロー時はポット/チップ非表示のため更新は任意
  if (game.stage >= 4) {
        const res = game.showdown();
        if (res && res.winnerName) {
          const name = res.handName ? ` (${res.handName})` : '';
          UI.showMessage(`${res.winnerName} wins $${res.awarded}${name}。次のラウンドへ移行を押してください。`);
        } else UI.showMessage('Showdown。次のラウンドへ移行を押してください。');
  // プレイヤーのチップ表示を更新（AIは非表示のため0）
  const mePlayer = game.players[0];
  UI.updateChips(mePlayer ? mePlayer.chips : 0, 0, game.pot);
        const btn = document.getElementById('next-round-button'); if (btn) btn.style.display = '';
      } else {
        UI.showMessage('ドローしました。スタンドまたはさらにカード選択を修正してドローしてください。');
      }
    };
    drawButton.addEventListener('click', clickDraw);
    listeners.push(()=>drawButton.removeEventListener('click', clickDraw));
  }

  // スタンドボタン: ベット確定後のみ実行可能
  const standButton = document.getElementById('stand-button');
  if (standButton) {
    const clickStand = () => {
      if (window.Sound) window.Sound.click();
      if (window._gameMode !== 'draw') return;
      const game = window._gameInstance; if (!game) return;
      const me = 0; if (game.players[me].hasDrawn) { UI.showMessage('ドローは一度だけ可能です'); return; }
      if (!game.players[me].hasBet) { UI.showMessage('先にベットを確定してください'); return; }
      // スタンドは交換なしでドロー確定
      game.drawCards(me, []);
      UI.showMessage('スタンドしました');
      if (game.stage >= 4) {
        const res = game.showdown();
        if (res && res.winnerName) {
          const name = res.handName ? ` (${res.handName})` : '';
          UI.showMessage(`${res.winnerName} wins $${res.awarded}${name}。次のラウンドへ移行を押してください。`);
        } else UI.showMessage('Showdown。次のラウンドへ移行を押してください。');
  const mePlayer = game.players[0];
  UI.updateChips(mePlayer ? mePlayer.chips : 0, 0, game.pot);
        const btn = document.getElementById('next-round-button'); if (btn) btn.style.display = '';
      }

  // 次のラウンドへ移行時の入金チェック
  const nextBtn = document.getElementById('next-round-button');
  if (nextBtn) {
    const onNext = () => {
      const game = window._gameInstance; if (!game) return;
      if (game.depositRequired) {
        // 入金がない場合はゲームオーバーへ
        const overlay = document.getElementById('gameover-overlay');
        const reason = document.getElementById('gameover-reason');
        if (overlay) overlay.setAttribute('aria-hidden', 'false');
        if (reason) reason.textContent = `3ラウンド経過しましたが、最低 $${game.requiredDeposit} の入金がありません。ゲームオーバーです。`;
        const closeBtn = document.getElementById('gameover-close');
        const retryBtn = document.getElementById('gameover-retry');
        const closeH = () => overlay && overlay.setAttribute('aria-hidden','true');
        const retryH = () => {
          // ゲーム再開（初期化）
          closeH();
          const dnames = ['Player'];
          window._gameInstance = new (window.DrawGame)(dnames);
          window._gameInstance.initializeGame(dnames);
          const p = window._gameInstance.players[0];
          UI.updateChips(p.chips, 0, window._gameInstance.pot);
          UI.showMessage('ベット額を入力して「ベット額確定」を押してください');
          const ds = document.getElementById('deposit-status');
          if (ds) {
            const g = window._gameInstance;
            const roundsUntil = (3 - (g.roundCount % 3)) % 3 || 3;
            ds.textContent = `残り ${roundsUntil} ラウンド後に最低 $${g.requiredDeposit} の入金が必要です。未入金ならゲームオーバー`;
          }
          nextBtn.style.display = 'none';
        };
        if (closeBtn) closeBtn.onclick = closeH;
        if (retryBtn) retryBtn.onclick = retryH;
        return; // 移行させない
      }
      // 通常のラウンドリセット
  game.resetRound(true);
      const p = game.players[0]; UI.updateChips(p.chips, 0, game.pot);
      UI.showMessage('ベット額を入力して「ベット額確定」を押してください');
      nextBtn.style.display = 'none';
      const ds = document.getElementById('deposit-status');
      if (ds) {
          const m = game.roundCount % 3;
          const n = game.depositRequired ? 0 : (m === 0 ? 3 : 3 - m);
  ds.textContent = `残り ${n} ラウンド後に最低 $${game.requiredDeposit} を入金してください。入金しないとゲームオーバー`;
      }
    };
    nextBtn.addEventListener('click', onNext);
    listeners.push(()=>nextBtn.removeEventListener('click', onNext));
  }
    };
    standButton.addEventListener('click', clickStand);
    listeners.push(()=>standButton.removeEventListener('click', clickStand));
  }

    return function teardown(){ listeners.forEach(off=>off()); if (drawControls) drawControls.style.display='none'; };
  }

  if (typeof window !== 'undefined') {
    window.activateDrawControls = activateDrawControls;
  }
})();
