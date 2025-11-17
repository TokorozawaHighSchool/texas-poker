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
          if (res && res.winnerName) UI.showMessage(`${res.winnerName} wins $${res.awarded}`); else UI.showMessage('Showdown');
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

  // 賭け系（コール/ベット/フォールド）はドローでは使用しないため、イベント配線しない

  // ドローボタンで選択カードの交換を確定できるようにする
  const drawButton = document.getElementById('draw-button');
  if (drawButton) {
    const clickDraw = () => {
      if (window.Sound) window.Sound.click();
      if (window._gameMode !== 'draw') return;
      const game = window._gameInstance; if (!game) return;
      const me = 0; if (game.players[me].hasDrawn) { UI.showMessage('ドローは一度だけ可能です'); return; }
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
        if (res && res.winnerName) UI.showMessage(`${res.winnerName} wins $${res.awarded}`); else UI.showMessage('Showdown');
        const btn = document.getElementById('next-round-button'); if (btn) btn.style.display = '';
      } else {
        UI.showMessage('ドローしました');
      }
    };
    drawButton.addEventListener('click', clickDraw);
    listeners.push(()=>drawButton.removeEventListener('click', clickDraw));
  }

  // standボタンは使用しない

    return function teardown(){ listeners.forEach(off=>off()); if (drawControls) drawControls.style.display='none'; };
  }

  if (typeof window !== 'undefined') {
    window.activateDrawControls = activateDrawControls;
  }
})();
