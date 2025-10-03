const ui = (() => {
    const updatePlayerHand = (playerHand) => {
        const playerHandElement = document.getElementById('player-hand');
        if (!playerHandElement) return;
        playerHandElement.innerHTML = '';
        playerHand.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card card--face';
            const suitClass = `suit--${card.suit.toLowerCase()}`;

            const top = document.createElement('div');
            top.className = 'card__corner card__corner--top-left';
            top.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;

            const bottom = document.createElement('div');
            bottom.className = 'card__corner card__corner--bottom-right';
            bottom.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;

            const center = document.createElement('div');
            center.className = `card__center ${suitClass}`;
            center.textContent = suitToSymbol(card.suit);

            cardElement.appendChild(top);
            cardElement.appendChild(center);
            cardElement.appendChild(bottom);
            playerHandElement.appendChild(cardElement);
        });
    };

    const updateAIHand = (aiHand, faceDown = true) => {
        // single AI representation kept for compatibility; prefer renderAIPlayers for multiple
        const aiHandElement = document.getElementById('ai-hand');
        if (!aiHandElement) return;
        aiHandElement.innerHTML = '';
        aiHand.forEach(card => {
            const cardElement = document.createElement('div');
            if (faceDown) {
                cardElement.className = 'card card--back';
            } else {
                cardElement.className = 'card card--face';
                const suitClass = `suit--${card.suit.toLowerCase()}`;
                const top = document.createElement('div');
                top.className = 'card__corner card__corner--top-left';
                top.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
                const bottom = document.createElement('div');
                bottom.className = 'card__corner card__corner--bottom-right';
                bottom.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
                const center = document.createElement('div');
                center.className = `card__center ${suitClass}`;
                center.textContent = suitToSymbol(card.suit);
                cardElement.appendChild(top);
                cardElement.appendChild(center);
                cardElement.appendChild(bottom);
            }
            aiHandElement.appendChild(cardElement);
        });
    };

    const renderAIPlayers = (aiPlayers) => {
        const container = document.getElementById('ai-container');
        if (!container) return;
        container.innerHTML = '<h2>AI プレイヤー</h2>';
        aiPlayers.forEach((ai, idx) => {
            const block = document.createElement('div');
            block.className = 'ai-block';
            block.id = `ai-block-${idx}`;
            block.innerHTML = `<h3>AI ${idx + 1}</h3><div id="ai-${idx}-hand" class="ai-hand"></div><div id="ai-${idx}-chips" class="chips">Chips: $${ai.chips || 0}</div>`;
            container.appendChild(block);
        });
    };

    const updateAIByIndex = (index, aiHand, faceDown = true, chips) => {
        const handEl = document.getElementById(`ai-${index}-hand`);
        const chipsEl = document.getElementById(`ai-${index}-chips`);
        if (chipsEl && typeof chips !== 'undefined') chipsEl.textContent = `Chips: $${chips}`;
        if (!handEl) return;
        handEl.innerHTML = '';
        aiHand.forEach(card => {
            const cardElement = document.createElement('div');
            if (faceDown) cardElement.className = 'card card--back';
            else {
                cardElement.className = 'card card--face';
                const suitClass = `suit--${card.suit.toLowerCase()}`;
                const top = document.createElement('div');
                top.className = 'card__corner card__corner--top-left';
                top.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
                const bottom = document.createElement('div');
                bottom.className = 'card__corner card__corner--bottom-right';
                bottom.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
                const center = document.createElement('div');
                center.className = `card__center ${suitClass}`;
                center.textContent = suitToSymbol(card.suit);
                cardElement.appendChild(top);
                cardElement.appendChild(center);
                cardElement.appendChild(bottom);
            }
            handEl.appendChild(cardElement);
        });
    };

    const updateChips = (playerChips, aiChips, potAmount) => {
        const playerChipsEl = document.getElementById('player-chips');
        const aiChipsEl = document.getElementById('ai-chips');
        const potEl = document.getElementById('pot');
        if (playerChipsEl) playerChipsEl.textContent = `Chips: $${playerChips}`;
        if (aiChipsEl) aiChipsEl.textContent = `Chips: $${aiChips}`;
        if (potEl) potEl.textContent = `Pot: $${potAmount}`;
    };

    const updateTableCards = (tableCards) => {
        const tableCardsElement = document.getElementById('community-hand');
        if (!tableCardsElement) return;
        tableCardsElement.innerHTML = '';
        tableCards.forEach(card => {
            const cardElement = document.createElement('div');
            cardElement.className = 'card card--face';
            const suitClass = `suit--${card.suit.toLowerCase()}`;
            const top = document.createElement('div');
            top.className = 'card__corner card__corner--top-left';
            top.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
            const bottom = document.createElement('div');
            bottom.className = 'card__corner card__corner--bottom-right';
            bottom.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
            const center = document.createElement('div');
            center.className = `card__center ${suitClass}`;
            center.textContent = suitToSymbol(card.suit);
            cardElement.appendChild(top);
            cardElement.appendChild(center);
            cardElement.appendChild(bottom);
            tableCardsElement.appendChild(cardElement);
        });
    };

    // helper to convert suit name to symbol
    function suitToSymbol(suit) {
        switch (suit.toLowerCase()) {
            case 'hearts': return '♥';
            case 'diamonds': return '♦';
            case 'clubs': return '♣';
            case 'spades': return '♠';
            default: return '?';
        }
    }

    const updatePot = (potAmount) => {
        const potElement = document.getElementById('pot');
        if (potElement) potElement.textContent = `Pot: $${potAmount}`;
    };

    const showMessage = (message) => {
        const messageElement = document.getElementById('message');
        if (messageElement) messageElement.textContent = message;
    };

    const resetUI = () => {
        updatePlayerHand([]);
        updateTableCards([]);
        updatePot(0);
        showMessage('');
    };

    return {
        updatePlayerHand,
        updateTableCards,
        updateAIHand,
        renderAIPlayers,
        updateAIByIndex,
        updateChips,
        updatePot,
        showMessage,
        resetUI
    };
})();

// Expose UI globally for non-module scripts
window.UI = ui;