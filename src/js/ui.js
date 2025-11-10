const ui = (() => {
    // Simple in-memory cache: key = `${rank}_${suit}`, value = { src: string|null, resolved: boolean }
    const imageCache = new Map();
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

    function getCardImageCandidates(val, suit) {
        const s = String(suit).toLowerCase();
        const r = String(val).toUpperCase();
        const suitLetter = ({ hearts: 'H', diamonds: 'D', clubs: 'C', spades: 'S' })[s] || 'X';
        const candidates = [];
        const push = (p) => { if (p && !candidates.includes(p)) candidates.push(p); };
        // 1) Conventional naming for all ranks: AH.png, 10S.png, 2D.png, JC.png ... with multiple extensions
        const base1 = `assets/facecards/${r}${suitLetter}`;
        ['.png', '.webp', '.svg'].forEach(ext => push(base1 + ext));
        // 2) Lowercase variant
        const base1l = `assets/facecards/${r.toLowerCase()}${suitLetter.toLowerCase()}`;
        ['.png', '.webp', '.svg'].forEach(ext => push(base1l + ext));
        // 3) Word-based naming: ace_hearts.png, 2_spades.webp, jack_diamonds.svg
        const rankWord = ({
            'A': 'ace', 'K': 'king', 'Q': 'queen', 'J': 'jack', '10': '10', '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', '4': '4', '3': '3', '2': '2'
        })[r] || r.toLowerCase();
        const base2 = `assets/facecards/${rankWord}_${s}.`;
        ['png', 'webp', 'svg'].forEach(e => push(base2 + e));
        // 4) torannpu-illustNN.png style（既知のJ/Q/Kはもちろん、A/2-10も推測値で試す）
        const rankToNum = ({ 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 })[r];
        const suitIndex = ({ spades: 0, clubs: 1, diamonds: 2, hearts: 3 })[s];
        if (typeof rankToNum === 'number' && typeof suitIndex === 'number') {
            const num = suitIndex * 13 + rankToNum; // 1..52 を想定
            push(`assets/facecards/torannpu-illust${num}.png`);
            push(`assets/facecards/torannpu-illust${num}.webp`);
        }
        return candidates;
    }

    function createFaceGraphicElement(val, suit) {
        const wrap = document.createElement('div');
        wrap.className = 'face-graphic';
        // Prefer custom illustration image(s); fallback to SVG if all fail to load
        const candidates = getCardImageCandidates(val, suit);
        const img = new Image();
        img.className = 'face-illustration';
        img.alt = `${val} of ${suit}`;
        img.decoding = 'async';
        img.loading = 'lazy';
        let idx = 0;
        const tryNext = () => {
            if (idx >= candidates.length) {
                wrap.innerHTML = buildFaceSVG(val, String(suit).toLowerCase());
                return;
            }
            img.src = candidates[idx++];
        };
        img.onerror = () => tryNext();
        tryNext();
        wrap.appendChild(img);
        return wrap;
    }

    function buildGenericSVG(val, suit) {
        const s = String(suit).toLowerCase();
        const color = (s === 'hearts' || s === 'diamonds') ? '#b00' : '#000';
        const suitChar = ({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' })[s] || '?';
        const label = String(val).toUpperCase();
        return `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
        <filter id="drops" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.2"/>
        </filter>
    </defs>
    <text x="50" y="48" text-anchor="middle" font-size="34" font-family="Georgia, 'Times New Roman', Times, serif" fill="#333">${label}</text>
    <text x="50" y="78" text-anchor="middle" font-size="40" font-family="Georgia, 'Times New Roman', Times, serif" fill="${color}" filter="url(#drops)">${suitChar}</text>
</svg>`;
    }

    function createCardGraphicElement(val, suit) {
        const wrap = document.createElement('div');
        wrap.className = 'face-graphic';
        const candidates = getCardImageCandidates(val, suit);
        const img = new Image();
        img.className = 'face-illustration';
        img.alt = `${val} of ${suit}`;
        img.decoding = 'async';
        img.loading = 'lazy';
        let idx = 0;
        const key = `${String(val).toUpperCase()}_${String(suit).toLowerCase()}`;
        // Use cached successful src if available
        const cached = imageCache.get(key);
        if (cached && cached.resolved) {
            if (cached.src) {
                img.src = cached.src;
                wrap.appendChild(img);
                return wrap;
            }
            // cached resolved but no src -> immediately fallback
            const v = String(val).toUpperCase();
            const s = String(suit).toLowerCase();
            wrap.innerHTML = ['J', 'Q', 'K', 'A'].includes(v) ? buildFaceSVG(v, s) : buildGenericSVG(v, s);
            return wrap;
        }
        const tryNext = () => {
            if (idx >= candidates.length) {
                const v = String(val).toUpperCase();
                const s = String(suit).toLowerCase();
                imageCache.set(key, { src: null, resolved: true });
                // Fallback: 顔札とAは既存のSVG、それ以外は汎用SVG
                wrap.innerHTML = ['J', 'Q', 'K', 'A'].includes(v) ? buildFaceSVG(v, s) : buildGenericSVG(v, s);
                return;
            }
            img.src = candidates[idx++];
        };
        img.onerror = () => tryNext();
        img.onload = () => { imageCache.set(key, { src: img.src, resolved: true }); };
        tryNext();
        wrap.appendChild(img);
        return wrap;
    }

    function preloadCardImage(val, suit) {
        const key = `${String(val).toUpperCase()}_${String(suit).toLowerCase()}`;
        const cached = imageCache.get(key);
        if (cached && cached.resolved) return Promise.resolve(cached.src);
        return new Promise((resolve) => {
            const list = getCardImageCandidates(val, suit);
            let i = 0;
            const test = new Image();
            test.decoding = 'async';
            test.loading = 'eager';
            const next = () => {
                if (i >= list.length) {
                    imageCache.set(key, { src: null, resolved: true });
                    resolve(null);
                    return;
                }
                test.src = list[i++];
            };
            test.onload = () => { imageCache.set(key, { src: test.src, resolved: true }); resolve(test.src); };
            test.onerror = () => next();
            next();
        });
    }

    function createIllustrationOrPips(val, suit, suitClass) {
        // 画像があればイラスト、無ければピップを返すラッパー要素
        const placeholder = document.createElement('div');
        placeholder.className = 'face-graphic';
        const candidates = getCardImageCandidates(val, suit);
        const img = new Image();
        img.className = 'face-illustration';
        img.alt = `${val} of ${suit}`;
        img.decoding = 'async';
        img.loading = 'lazy';
        let tried = 0;
        const usePips = () => {
            // 置換：ピップ描画
            const pips = document.createElement('div');
            pips.className = 'card__pips';
            const positions = getPipPositions(val);
            positions.forEach(pos => {
                const pip = document.createElement('div');
                pip.className = `pip ${suitClass} ${pos.r} ${pos.c} ${pos.flip ? 'pip--flip' : ''}`.trim();
                pip.textContent = suitToSymbol(suit);
                pips.appendChild(pip);
            });
            placeholder.replaceWith(pips);
        };
        const tryNext = () => {
            if (tried >= candidates.length) { usePips(); return; }
            img.src = candidates[tried++];
        };
        img.onerror = () => tryNext();
        img.onload = () => { /* keep image */ };
        tryNext();
        placeholder.appendChild(img);
        return placeholder;
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

        // Body: すべて画像のみ（全ランク image-only）。
        const val = String(card.value).toUpperCase();
        let imageOnly = true;
        el.classList.add('card--image-only');
        el.appendChild(createCardGraphicElement(val, card.suit));
        // For image-only faces, hide corners (remove top, skip bottom)
        if (imageOnly) {
            if (top && top.parentNode === el) top.remove();
        } else {
            el.appendChild(bottom);
        }
        return el;
    }

    // Cubic bezier helper
    function bezierPoint(p0, p1, p2, p3, t) {
        const it = 1 - t;
        return it * it * it * p0 + 3 * it * it * t * p1 + 3 * it * t * t * p2 + t * t * t * p3;
    }

    // Animate a deal along a curved path from dealer anchor to element's final position
    function animateDealArc(el, anchor, delay = 0) {
        if (!anchor || !el || !el.animate) return false;
        const a = anchor.getBoundingClientRect();
        const e = el.getBoundingClientRect();
        const start = { x: a.left + a.width / 2, y: a.top + a.height / 2 };
        const end = { x: e.left + e.width / 2, y: e.top + e.height / 2 };
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
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10
        })[v] || 1)(String(val));
        const mid = { r: 'r3', c: 'c2' };
        const topMid = { r: 'r2', c: 'c2' };
        const botMid = { r: 'r4', c: 'c2', flip: true };
        const topPair = [{ r: 'r2', c: 'c1' }, { r: 'r2', c: 'c3' }];
        const botPair = [{ r: 'r4', c: 'c1', flip: true }, { r: 'r4', c: 'c3', flip: true }];
        const topEdge = [{ r: 'r1', c: 'c1' }, { r: 'r1', c: 'c3' }];
        const botEdge = [{ r: 'r5', c: 'c1', flip: true }, { r: 'r5', c: 'c3', flip: true }];

        switch (String(val).toUpperCase()) {
            case 'A': return [mid];
            case '2': return [topMid, botMid];
            case '3': return [topMid, mid, botMid];
            case '4': return [...topPair, ...botPair];
            case '5': return [...topPair, mid, ...botPair];
            case '6': return [...topPair, ...botPair, { r: 'r3', c: 'c1' }, { r: 'r3', c: 'c3', flip: true }];
            case '7': return [...topPair, ...botPair, { r: 'r3', c: 'c1' }, { r: 'r3', c: 'c3', flip: true }, topMid];
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
        const suitChar = (s => ({ hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' })[s] || '?')(suit);
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

    // Deal player's hand face-down, then flip each card sequentially
    // 既に同一のカードが表で存在する場合は再フリップしない
    async function dealPlayerHand(cards, options = {}) {
        const perCardDelay = typeof options.perCardDelay === 'number' ? options.perCardDelay : 240;
        const startDelay = typeof options.startDelay === 'number' ? options.startDelay : 0;
        const el = document.getElementById('player-hand');
        if (!el) return;
        const existing = el.children.length;
        // 判定: 同一ハンド（先頭カード一致かつ枚数一致）なら再演出しない
        if (existing === cards.length && existing > 0) {
            const c0 = cards[0];
            const e0 = el.children[0];
            const same0 = e0 && e0.dataset && e0.dataset.value === String(c0.value).toUpperCase() && e0.dataset.suit === String(c0.suit).toLowerCase();
            const allFaceUp = [...el.children].every(ch => !ch.classList.contains('card--back'));
            if (same0 && allFaceUp) return; // 既に表で同じカード
        }
        // 新しいハンドとみなして一旦クリア
        el.innerHTML = '';
        // 裏面で配布（アニメつき）
        renderCardsWithAnimation(el, cards, { faceDown: true, stagger: 90 });
        // preload to avoid pop-in on flip
        try { await Promise.all(cards.map(c => preloadCardImage(c.value, c.suit))); } catch (_) { }
        // flip sequentially
        for (let i = 0; i < cards.length; i++) {
            const child = el.children[i];
            const delay = startDelay + i * perCardDelay;
            setTimeout(() => flipCard(child, cards[i], false), delay);
        }
    }

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

    function updatePlayerHandName(text) {
        const el = document.getElementById('player-hand-name');
        if (el) el.textContent = text || '';
    }

    function updateAIHandNameByIndex(index, text) {
        const el = document.getElementById(`ai-${index}-hand-name`);
        if (el) el.textContent = text || '';
    }

    const updateAIByIndex = (index, aiHand, faceDown = true, chips) => {
        const handEl = document.getElementById(`ai-${index}-hand`);
        const chipsEl = document.getElementById(`ai-${index}-chips`);
        if (chipsEl && typeof chips !== 'undefined') chipsEl.textContent = `Chips: $${chips}`;
        renderCardsWithAnimation(handEl, aiHand, { faceDown, stagger: 90 });
    };

    // Showdown reveal: flip AI cards face-up sequentially
    async function revealAIHandByIndex(index, cards, options = {}) {
        const perCardDelay = typeof options.perCardDelay === 'number' ? options.perCardDelay : 220;
        const startDelay = typeof options.startDelay === 'number' ? options.startDelay : 0;
        const handEl = document.getElementById(`ai-${index}-hand`);
        if (!handEl) return Promise.resolve();
        // 完全同期: 画像を全てプリロードし終えるまで待つ
        try { await Promise.all(cards.map(c => preloadCardImage(c.value, c.suit))); } catch (_) { }
        // Ensure correct number of face-down cards exist before flipping
        if (handEl.children.length !== cards.length) {
            renderCardsWithAnimation(handEl, cards, { faceDown: true, stagger: 0 });
        } else {
            // If any is already face-up, reset to back to get a proper flip animation
            for (let i = 0; i < handEl.children.length; i++) {
                const el = handEl.children[i];
                if (!el.classList.contains('card--back')) {
                    const back = createCardElement(cards[i], true);
                    el.replaceWith(back);
                }
            }
        }
        // Flip each card with a slight delay
        for (let i = 0; i < cards.length; i++) {
            const el = handEl.children[i];
            const delay = startDelay + i * perCardDelay;
            setTimeout(() => {
                flipCard(el, cards[i], false);
            }, delay);
        }
        // すべてのフリップが終わるまで待ってからresolve
        const cssFlipMs = 350; // styles.css の flipCardIn と合わせる
        const buffer = 80;
        const total = startDelay + (cards.length > 0 ? (cards.length - 1) * perCardDelay : 0) + cssFlipMs + buffer;
        return new Promise(resolve => setTimeout(resolve, total));
    }

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

    // Deal community cards face-down then flip each sequentially
    // 既に公開済みのカードはそのまま保持し、新規のみ配ってめくる
    async function dealCommunityCards(cards, options = {}) {
        const perCardDelay = typeof options.perCardDelay === 'number' ? options.perCardDelay : 300;
        const startDelay = typeof options.startDelay === 'number' ? options.startDelay : 0;
        const el = document.getElementById('community-hand');
        if (!el) return;
        const existing = el.children.length;
        // 新ハンドの可能性: 既存枚数 > 0 かつ 先頭カード不一致、または cards が減っている
        if (existing > 0) {
            const e0 = el.children[0];
            const c0 = cards[0];
            const firstMatches = c0 && e0 && e0.dataset && e0.dataset.value === String(c0.value).toUpperCase() && e0.dataset.suit === String(c0.suit).toLowerCase();
            if (!firstMatches || existing > cards.length) {
                el.innerHTML = '';
            }
        }
        // 既存分はそのまま。足りない分だけ裏面で追加してフリップ
        const cur = el.children.length;
        // プリロード（新規分だけでもよいが全体でも十分軽量）
        try { await Promise.all(cards.map(c => preloadCardImage(c.value, c.suit))); } catch (_) {}
        for (let i = cur; i < cards.length; i++) {
            const elCard = createCardElement(cards[i], true);
            const anchor = document.getElementById('dealer-anchor');
            el.appendChild(elCard);
            const delayDeal = (i - cur) * 90;
            const ok = animateDealArc(elCard, anchor, delayDeal);
            if (!ok) {
                elCard.classList.add('deal-in');
                elCard.style.animationDelay = `${delayDeal}ms`;
            }
            const delayFlip = startDelay + (i - cur) * perCardDelay;
            setTimeout(() => flipCard(elCard, cards[i], false), delayFlip);
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
    dealPlayerHand,
    dealCommunityCards,
        renderAIPlayers,
        updateAIByIndex,
        updateChips,
        updatePot,
        showMessage,
        resetUI,
        updatePlayerHandName,
        updateAIHandNameByIndex,
        revealAIHandByIndex,
    };
})();

// Expose UI globally for non-module scripts
window.UI = ui;