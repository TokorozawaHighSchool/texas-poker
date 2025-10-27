const ui = (() => {
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

    function createCardElement(card, faceDown = false) {
        const el = document.createElement('div');
        if (faceDown) {
            el.className = 'card card--back';
            el.dataset.value = String(card.value).toUpperCase();
            el.dataset.suit = String(card.suit).toLowerCase();
            return el;
        }
        el.className = 'card card--face';
        el.dataset.value = String(card.value).toUpperCase();
        el.dataset.suit = String(card.suit).toLowerCase();
        const suitClass = `suit--${card.suit.toLowerCase()}`;
        const top = document.createElement('div');
        top.className = 'card__corner card__corner--top-left';
        top.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
        const bottom = document.createElement('div');
        bottom.className = 'card__corner card__corner--bottom-right';
        bottom.innerHTML = `<div class="card__value">${card.value}</div><div class="card__suit ${suitClass}">${suitToSymbol(card.suit)}</div>`;
            el.appendChild(top);

            // Body: pips for 2-10, graphic face for A/J/Q/K
            const val = String(card.value).toUpperCase();
            if (['A','J','Q','K'].includes(val)) {
                const wrap = document.createElement('div');
                wrap.className = 'face-graphic';
                wrap.innerHTML = buildFaceSVG(val, card.suit.toLowerCase());
                el.appendChild(wrap);
            } else {
                const pips = document.createElement('div');
                pips.className = 'card__pips';
                const positions = getPipPositions(val);
                positions.forEach(pos => {
                    const pip = document.createElement('div');
                    pip.className = `pip ${suitClass} ${pos.r} ${pos.c} ${pos.flip ? 'pip--flip' : ''}`.trim();
                    pip.textContent = suitToSymbol(card.suit);
                    pips.appendChild(pip);
                });
                el.appendChild(pips);
            }

            el.appendChild(bottom);
        return el;
    }

    // Cubic bezier helper
    function bezierPoint(p0, p1, p2, p3, t) {
        const it = 1 - t;
        return it*it*it*p0 + 3*it*it*t*p1 + 3*it*t*t*p2 + t*t*t*p3;
    }

    // Animate a deal along a curved path from dealer anchor to element's final position
    function animateDealArc(el, anchor, delay = 0) {
        if (!anchor || !el || !el.animate) return false;
        const a = anchor.getBoundingClientRect();
        const e = el.getBoundingClientRect();
        const start = { x: a.left + a.width/2, y: a.top + a.height/2 };
        const end = { x: e.left + e.width/2, y: e.top + e.height/2 };
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const curve = Math.max(90, Math.hypot(dx, dy) * 0.22);
        const c1 = { x: start.x + dx * 0.25, y: start.y + dy * 0.25 - curve };
        const c2 = { x: start.x + dx * 0.75, y: start.y + dy * 0.75 - curve };
        const steps = 20;
        const frames = [];
        for (let s = 0; s <= steps; s++) {
            const t = s / steps;
            const x = bezierPoint(start.x, c1.x, c2.x, end.x, t);
            const y = bezierPoint(start.y, c1.y, c2.y, end.y, t);
            const tx = x - end.x;
            const ty = y - end.y;
            const rot = -12 * (1 - t);
            const sc = 0.9 + 0.1 * t;
            frames.push({ transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${sc})`, opacity: t === 0 ? 0 : 1 });
        }
        el.animate(frames, { duration: 460, delay, easing: 'linear', fill: 'forwards' });
        return true;
    }

        function getPipPositions(val) {
            // returns array of {r: 'rX', c: 'cY', flip?: true}
            // layout anchors: rows r1..r5, cols c1..c3
            const n = (v => ({
                'A':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10
            })[v] || 1)(String(val));
            const mid = { r:'r3', c:'c2' };
            const topMid = { r:'r2', c:'c2' };
            const botMid = { r:'r4', c:'c2', flip:true };
            const topPair = [{ r:'r2', c:'c1' }, { r:'r2', c:'c3' }];
            const botPair = [{ r:'r4', c:'c1', flip:true }, { r:'r4', c:'c3', flip:true }];
            const topEdge = [{ r:'r1', c:'c1' }, { r:'r1', c:'c3' }];
            const botEdge = [{ r:'r5', c:'c1', flip:true }, { r:'r5', c:'c3', flip:true }];

            switch (String(val).toUpperCase()) {
                case 'A': return [mid];
                case '2': return [topMid, botMid];
                case '3': return [topMid, mid, botMid];
                case '4': return [...topPair, ...botPair];
                case '5': return [...topPair, mid, ...botPair];
                case '6': return [...topPair, ...botPair, { r:'r3', c:'c1' }, { r:'r3', c:'c3', flip:true }];
                case '7': return [...topPair, ...botPair, { r:'r3', c:'c1' }, { r:'r3', c:'c3', flip:true }, topMid];
                case '8': return [...topEdge, ...botEdge, ...topPair, ...botPair];
                case '9': return [...topEdge, ...botEdge, ...topPair, ...botPair, mid];
                case '10': return [...topEdge, ...botEdge, ...topPair, ...botPair, topMid, botMid];
                default: return [mid];
            }
        }

    function flipCard(cardElement, card, toFaceDown) {
        cardElement.classList.add('flip-in');
        cardElement.addEventListener('animationend', () => {
            cardElement.classList.remove('flip-in');
        }, { once: true });
        if (window.Sound && typeof window.Sound.flip === 'function') {
            window.Sound.flip();
        }
        if (toFaceDown) {
            cardElement.className = 'card card--back';
            cardElement.innerHTML = '';
        } else {
            const fresh = createCardElement(card, false);
            cardElement.className = fresh.className;
            cardElement.innerHTML = fresh.innerHTML;
        }
    }

        function buildFaceSVG(val, suit) {
                const color = (suit === 'hearts' || suit === 'diamonds') ? '#b00' : '#000';
                const suitChar = (s => ({hearts:'♥', diamonds:'♦', clubs:'♣', spades:'♠'})[s] || '?')(suit);
                        if (val === 'A') {
                                // Large suit emblem with laurel
                                return `
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
                <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.2"/>
                </filter>
            </defs>
            <text x="50" y="56" text-anchor="middle" font-size="64" font-family="Georgia, 'Times New Roman', Times, serif" fill="${color}" filter="url(#s)">${suitChar}</text>
            <g fill="#2e7d32" stroke="#1b5e20" stroke-width="0.5" opacity="0.8">
                <path d="M20,64 c8,-10 16,-14 30,-14" fill="none"/>
                <path d="M80,64 c-8,-10 -16,-14 -30,-14" fill="none"/>
                <g transform="translate(20,64)">
                    <path d="M0,0 l3,-4 l3,1 l-3,4 z"/>
                    <path d="M6,0 l3,-4 l3,1 l-3,4 z"/>
                    <path d="M12,0 l3,-4 l3,1 l-3,4 z"/>
                </g>
                <g transform="translate(62,64)">
                    <path d="M0,0 l-3,-4 l-3,1 l3,4 z"/>
                    <path d="M-6,0 l-3,-4 l-3,1 l3,4 z"/>
                    <path d="M-12,0 l-3,-4 l-3,1 l3,4 z"/>
                </g>
            </g>
        </svg>`;
                }
                // Simple stylized portraits for J/Q/K using geometric shapes
                if (val === 'J') {
                        return `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="30" r="13" fill="#f2d3b1" stroke="#333" stroke-width="1"/>
            <path d="M37 26 q13 -12 26 0" fill="#3e2723"/>
            <rect x="30" y="46" width="40" height="32" rx="6" fill="${color}" opacity="0.88"/>
            <circle cx="50" cy="62" r="6" fill="#fff" opacity="0.6"/>
    <path d="M35 78 q15 8 30 0" fill="none" stroke="#333" stroke-width="3"/>
    <text x="50" y="94" text-anchor="middle" font-size="18" font-family="Georgia, 'Times New Roman', Times, serif" fill="#333">J</text>
</svg>`;
                }
                if (val === 'Q') {
                        return `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="32" r="13" fill="#f2d3b1" stroke="#333" stroke-width="1"/>
            <polygon points="50,12 58,26 42,26" fill="#d4af37" stroke="#8a6d1d" stroke-width="1"/>
            <circle cx="50" cy="20" r="2" fill="#c62828"/>
            <rect x="28" y="48" width="44" height="30" rx="8" fill="${color}" opacity="0.88"/>
            <rect x="32" y="54" width="36" height="8" rx="4" fill="#fff" opacity="0.25"/>
    <text x="50" y="94" text-anchor="middle" font-size="18" font-family="Georgia, 'Times New Roman', Times, serif" fill="#333">Q</text>
</svg>`;
                }
                // K
                return `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="50" cy="30" r="13" fill="#f2d3b1" stroke="#333" stroke-width="1"/>
            <path d="M39 26 l22 0 l-2 4 l-18 0 z" fill="#d4af37" stroke="#8a6d1d" stroke-width="1"/>
            <rect x="26" y="46" width="48" height="32" rx="6" fill="${color}" opacity="0.88"/>
            <path d="M54 46 L72 64 M54 78 L72 60" stroke="#333" stroke-width="3"/>
            <circle cx="66" cy="62" r="2" fill="#c62828"/>
    <text x="50" y="94" text-anchor="middle" font-size="18" font-family="Georgia, 'Times New Roman', Times, serif" fill="#333">K</text>
</svg>`;
        }

    // render with diffing + staggered deal-in for new cards
    function renderCardsWithAnimation(container, cards, { faceDown = false, stagger = 80 } = {}) {
        if (!container) return;
        const currentCount = container.children.length;
        if (cards.length < currentCount) {
            container.innerHTML = '';
        }
        const minCount = Math.min(container.children.length, cards.length);
        for (let i = 0; i < minCount; i++) {
            const existing = container.children[i];
            const isBack = existing.classList.contains('card--back');
            const shouldBack = !!faceDown;
            if (isBack !== shouldBack) {
                flipCard(existing, cards[i], shouldBack);
            } else {
                // Detect card change (value or suit) and replace element
                const curVal = existing.dataset.value;
                const curSuit = existing.dataset.suit;
                const newVal = String(cards[i].value).toUpperCase();
                const newSuit = String(cards[i].suit).toLowerCase();
                if (curVal !== newVal || curSuit !== newSuit) {
                    const replacement = createCardElement(cards[i], shouldBack);
                    // brief flip-in to indicate change
                    replacement.classList.add('flip-in');
                    existing.replaceWith(replacement);
                    if (window.Sound && typeof window.Sound.flip === 'function') {
                        window.Sound.flip();
                    }
                }
            }
        }
        for (let i = container.children.length; i < cards.length; i++) {
            const el = createCardElement(cards[i], faceDown);
            const anchor = document.getElementById('dealer-anchor');
            container.appendChild(el);
            const delay = i * stagger;
            const ok = animateDealArc(el, anchor, delay);
            if (!ok) {
                el.classList.add('deal-in');
                el.style.animationDelay = `${delay}ms`;
            }
            if (window.Sound && typeof window.Sound.deal === 'function') {
                setTimeout(() => window.Sound.deal(), delay);
            }
        }
    }

    const updatePlayerHand = (playerHand) => {
        const el = document.getElementById('player-hand');
        renderCardsWithAnimation(el, playerHand, { faceDown: false, stagger: 90 });
    };

    const updateAIHand = (aiHand, faceDown = true) => {
        const aiHandElement = document.getElementById('ai-hand');
        renderCardsWithAnimation(aiHandElement, aiHand, { faceDown, stagger: 90 });
    };

    const renderAIPlayers = (aiPlayers) => {
        const container = document.getElementById('ai-container');
        if (!container) return;
        container.innerHTML = '<h2>AI プレイヤー</h2>';
        const row = document.createElement('div');
        row.className = 'ai-row';
        aiPlayers.forEach((ai, idx) => {
            const block = document.createElement('div');
            block.className = 'ai-block';
            block.id = `ai-block-${idx}`;
            block.innerHTML = `<h3>AI ${idx + 1}</h3><div id="ai-${idx}-hand" class="ai-hand"></div><div id="ai-${idx}-hand-name" class="hand-name"></div><div id="ai-${idx}-chips" class="chips">Chips: $${ai.chips || 0}</div>`;
            row.appendChild(block);
        });
        container.appendChild(row);
    };

    function updatePlayerHandName(text){
        const el = document.getElementById('player-hand-name');
        if (el) el.textContent = text || '';
    }

    function updateAIHandNameByIndex(index, text){
        const el = document.getElementById(`ai-${index}-hand-name`);
        if (el) el.textContent = text || '';
    }

    const updateAIByIndex = (index, aiHand, faceDown = true, chips) => {
        const handEl = document.getElementById(`ai-${index}-hand`);
        const chipsEl = document.getElementById(`ai-${index}-chips`);
        if (chipsEl && typeof chips !== 'undefined') chipsEl.textContent = `Chips: $${chips}`;
        renderCardsWithAnimation(handEl, aiHand, { faceDown, stagger: 90 });
    };

    const updateChips = (playerChips, aiChips, potAmount) => {
        const playerChipsEl = document.getElementById('player-chips');
        const aiChipsEl = document.getElementById('ai-chips');
        const potEl = document.getElementById('pot');
        if (playerChipsEl) playerChipsEl.textContent = `Chips: $${playerChips}`;
        if (aiChipsEl && aiChips != null) aiChipsEl.textContent = `Chips: $${aiChips}`;
        if (potEl && potAmount != null) potEl.textContent = `Pot: $${potAmount}`;
    };

    const updateTableCards = (tableCards) => {
        const tableCardsElement = document.getElementById('community-hand');
        renderCardsWithAnimation(tableCardsElement, tableCards, { faceDown: false, stagger: 120 });
    };

    const updatePot = (potAmount) => {
        const potElement = document.getElementById('pot');
        if (potElement) potElement.textContent = `Pot: $${potAmount}`;
    };

    const showMessage = (message) => {
        const messageElement = document.getElementById('message');
        if (messageElement) messageElement.textContent = message;
    };

    const resetUI = () => {
        const ph = document.getElementById('player-hand');
        const ch = document.getElementById('community-hand');
        if (ph) ph.innerHTML = '';
        if (ch) ch.innerHTML = '';
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
    resetUI,
    updatePlayerHandName,
    updateAIHandNameByIndex
    };
})();

// Expose UI globally for non-module scripts
window.UI = ui;