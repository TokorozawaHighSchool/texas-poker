// Texas Hold'em specific command wiring. Shares UI rendering with draw mode.
// Exposes window.activateTexasControls returning a teardown function.

(function(){
  function activateTexasControls() {
    const callBtn = document.getElementById('call-button');
    const raiseBtn = document.getElementById('raise-button');
    const foldBtn = document.getElementById('fold-button');
    const raiseAmountInput = document.getElementById('raise-amount');

    const listeners = [];

    if (callBtn) {
      const h = () => { if (window.Sound) window.Sound.click(); window.playerAction && window.playerAction('call'); };
      callBtn.addEventListener('click', h); listeners.push(()=>callBtn.removeEventListener('click', h));
    }
    if (raiseBtn) {
      const h = () => {
        if (window.Sound) window.Sound.click();
        let raiseAmount = 50;
        const game = window._gameInstance;
        if (raiseAmountInput && !isNaN(parseInt(raiseAmountInput.value))) {
          raiseAmount = parseInt(raiseAmountInput.value);
        }
        if (game && game.players && game.players[0]) {
          raiseAmount = Math.min(raiseAmount, game.players[0].chips);
        }
        window.playerAction && window.playerAction('raise', raiseAmount);
        if (typeof window.updateRaiseButtonLabel === 'function') window.updateRaiseButtonLabel();
      };
      raiseBtn.addEventListener('click', h); listeners.push(()=>raiseBtn.removeEventListener('click', h));
    }
    if (foldBtn) {
      const h = () => { if (window.Sound) window.Sound.click(); window.playerAction && window.playerAction('fold'); };
      foldBtn.addEventListener('click', h); listeners.push(()=>foldBtn.removeEventListener('click', h));
    }

    return function teardown(){ listeners.forEach(off=>off()); };
  }

  if (typeof window !== 'undefined') {
    window.activateTexasControls = activateTexasControls;
  }
})();
