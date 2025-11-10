// Single clean implementation of PokerGame with strict turn control and betting rounds
// Resolve Deck reference for both browser and Node environments
let __DeckRef;
try {
    if (typeof module !== 'undefined' && module.exports) {
        __DeckRef = require('./deck').Deck;
    }
} catch (_) {}
if (!__DeckRef && typeof window !== 'undefined') {
    __DeckRef = window.Deck;
}

class PokerGame {
    constructor() {
        this.players = [];
        this.deck = __DeckRef ? new __DeckRef() : null;
        this.communityCards = [];
        this.currentBet = 0;
        this.pot = 0;
        this.currentPlayerIndex = 0;
        this.stage = 0; // 0=preflop,1=flop,2=turn,3=river,4=showdown
        this.dealerIndex = 0;
        this.playersToAct = 0; // remaining players to act in current betting round
        this.lastRaiser = null;
    }

    initializeGame(playerNames) {
        this.players = playerNames.map((name, idx) => {
            if (idx === 0) return new Player(name);
            // if AI class available, create AI instances for other seats
            if (typeof window !== 'undefined' && window.AI) {
                const ai = new window.AI(name);
                // mirror Player defaults
                ai.hand = ai.hand || [];
                ai.folded = false;
                ai.contribution = 0;
                ai.chips = ai.chips || 1000;
                return ai;
            }
            return new Player(name);
        });
    this.players.forEach(p => { p.game = this; });
    this.deck = __DeckRef ? new __DeckRef() : this.deck;
        this.deck.shuffle();
        this.communityCards = [];
        this.dealerIndex = 0;
        this.pot = 0;
    }

    // Backwards-compatible alias
    dealCards() {
        this.startHand();
    }

    startHand() {
    if (!this.deck) this.deck = __DeckRef ? new __DeckRef() : null;
        this.deck.resetDeck();
        this.communityCards = [];
        this.dealerIndex = (this.dealerIndex + 1) % this.players.length;
        this.stage = 0;
    for (let p of this.players) {
            p.hand = [];
            p.folded = false;
            p.contribution = 0;
        }
        for (let i = 0; i < 2; i++) {
            for (let p of this.players) {
                const c = this.deck.deal(1)[0];
                if (c) p.hand.push(c);
            }
        }
        this.pot = 0;
        // --- 強制収集（アンティ/ブラインド） ---
        const forcedAmount = 100;
        for (let p of this.players) {
            const pay = Math.min(forcedAmount, p.chips);
            p.chips -= pay;
            p.contribution = (p.contribution || 0) + pay;
            this.pot += pay;
        }
        this.currentBet = 0;
        this.lastRaiser = null;
        this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
        this.playersToAct = this.countActivePlayers();
    }

    dealCommunity(count) {
    const cards = this.deck ? this.deck.deal(count) : [];
        this.communityCards.push(...cards);
        return cards;
    }

    countActivePlayers() {
        return this.players.filter(p => !p.folded && p.chips > 0).length;
    }

    advanceToNextActive() {
        const n = this.players.length;
        for (let i = 1; i <= n; i++) {
            const idx = (this.currentPlayerIndex + i) % n;
            const p = this.players[idx];
            if (!p.folded && p.chips > 0) {
                this.currentPlayerIndex = idx;
                return;
            }
        }
    // no active player found: fallback to player 0 to avoid stuck state
    this.currentPlayerIndex = 0;
    }

    call(playerIndex) {
        const player = this.players[playerIndex];
        const toCall = Math.max(0, this.currentBet - (player.contribution || 0));
        const amount = Math.min(toCall, player.chips);
        player.chips -= amount;
        player.contribution = (player.contribution || 0) + amount;
        this.pot += amount;
        this.playersToAct = Math.max(0, this.playersToAct - 1);
        this.advanceToNextActive();
        this.checkEndOfBettingRound();
    }

    bet(playerIndex, amount) {
        const player = this.players[playerIndex];
        const available = Math.min(amount, player.chips);
        player.chips -= available;
        player.contribution = (player.contribution || 0) + available;
        this.pot += available;
        this.currentBet = Math.max(this.currentBet, player.contribution);
        this.lastRaiser = playerIndex;
        this.playersToAct = this.countActivePlayers() - 1;
        this.advanceToNextActive();
    }

    fold(playerIndex) {
        const player = this.players[playerIndex];
        player.folded = true;
        const active = this.countActivePlayers();
        if (active === 1) {
            const winner = this.players.find(p => !p.folded);
            if (winner) {
                winner.chips += this.pot;
                this.pot = 0;
                this.stage = 4;
            }
        } else {
            this.playersToAct = Math.max(0, this.playersToAct - 1);
            this.advanceToNextActive();
            this.checkEndOfBettingRound();
        }
    }

    checkEndOfBettingRound() {
        if (this.playersToAct <= 0) {
            if (this.stage === 0) {
                this.stage = 1;
                this.dealCommunity(3);
            } else if (this.stage === 1) {
                this.stage = 2;
                this.dealCommunity(1);
            } else if (this.stage === 2) {
                this.stage = 3;
                this.dealCommunity(1);
            } else if (this.stage === 3) {
                this.stage = 4; // showdown
                // immediately resolve showdown when betting ends on river
                try {
                    this.showdown();
                } catch (e) {
                    console.error('showdown error', e);
                }
            }
            this.players.forEach(p => p.contribution = 0);
            this.currentBet = 0;
            this.lastRaiser = null;
            this.currentPlayerIndex = (this.dealerIndex + 1) % this.players.length;
            this.playersToAct = this.countActivePlayers();
        }
    }

    // simple showdown: evaluate remaining players and give pot to best score
    showdown() {
        this.stage = 4;
        const contenders = this.players.filter(p => !p.folded && p.chips >= 0);
        if (contenders.length === 0) return null;
        // use global evaluateHandScore if available (fallback to random)
        let best = null;
        let bestScore = -Infinity;
        for (const p of contenders) {
            let score = 0;
            try {
                if (typeof evaluateHandScore === 'function') {
                    score = evaluateHandScore(p.hand.concat(this.communityCards));
                } else {
                    score = Math.random();
                }
            } catch (e) {
                score = Math.random();
            }
            if (score > bestScore) {
                bestScore = score;
                best = p;
            }
        }
        if (best) {
            best.chips += this.pot;
            const winnerName = best.name || 'Player';
            const awarded = this.pot;
            this.pot = 0;
            // showdown後、AIでチップが0以下のものを退場（players配列から除外）
            // プレイヤー（index 0）は除外しない
            this.players = this.players.filter((pl, idx) => idx === 0 || pl.chips > 0);
            return { winner: best, winnerName, awarded };
        }
        return null;
    }

    // --- Legacy API expected by existing tests ---
    startGame() {
        // initialize with two players if empty
        if (!this.players || this.players.length === 0) {
            this.initializeGame(['Player 1', 'Player 2']);
        }
        this.startHand();
    }

    determineWinner() {
        // Simplified: player with higher first card value wins (fallback)
        if (!this.players || this.players.length < 2) return null;
        const rankOrder = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
        const scoreOf = (card) => rankOrder.indexOf(String(card.rank || card.value)) + 2;
        const p0 = this.players[0];
        const p1 = this.players[1];
        const v0 = (p0.hand[0] ? scoreOf(p0.hand[0]) : 0) + (p0.hand[1] ? scoreOf(p0.hand[1]) : 0);
        const v1 = (p1.hand[0] ? scoreOf(p1.hand[0]) : 0) + (p1.hand[1] ? scoreOf(p1.hand[1]) : 0);
        return v0 >= v1 ? p0 : p1;
    }

    endGame() {
        // Clear hands (tests expect reset)
        this.players.forEach(p => { p.hand = []; });
        this.communityCards = [];
        this.pot = 0;
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.hand = [];
        this.chips = 1000;
        this.folded = false;
        this.contribution = 0;
        this.game = null;
    }

    bet(amount) {
        if (typeof amount !== 'number' || amount <= 0) return;
        const pay = Math.min(amount, this.chips);
        this.chips -= pay;
        this.contribution = (this.contribution || 0) + pay;
        if (this.game) this.game.pot += pay;
    }
}

// Expose classes globally (browser)
if (typeof window !== 'undefined') {
    window.PokerGame = PokerGame;
    window.Game = PokerGame;
    window.Player = Player;
}

// CommonJS export (Node/Jest)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game: PokerGame, PokerGame, Player };
}