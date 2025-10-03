// AIロジック（簡易）を提供するグローバルクラス
// Note: kept simple for early development; replace with stronger heuristics later.
class AI {
    constructor(name = 'AI') {
        this.name = name;
        this.hand = [];
        this.chips = 1000;
        this.folded = false;
        this.contribution = 0;
    }

    receiveHand(cards) {
        this.hand = cards;
    }

    decideBet(currentBet) {
        const strength = this.evaluateHand();
        if (strength > 0.8) return currentBet * 2;
        if (strength > 0.5) return currentBet;
        return 0;
    }

    evaluateHand() {
        return Math.random();
    }

    bet(amount) {
        this.chips -= amount;
        this.contribution = (this.contribution || 0) + amount;
    }

    win(amount) {
        this.chips += amount;
    }
}

window.AI = AI;

// Add a simple decision API: returns { action, amount }
AI.prototype.decideAction = function(game, playerIndex = 1) {
    // Evaluate using hole + community for better decisions
    const combined = (this.hand || []).concat(game.communityCards || []);
    const score = evaluateHandScore(combined);
    const currentBet = game.currentBet || 0;

    // If there's no bet, sometimes open with a small bet when score moderate
    if (currentBet === 0) {
        if (score > 0.6 && this.chips > 10) {
            const raiseAmount = Math.min(50, this.chips);
            return { action: 'raise', amount: raiseAmount };
        }
        // otherwise check
        return { action: 'call' };
    }

    // If very weak and there's a bet, fold most of the time
    if (score < 0.25) {
        return { action: 'fold' };
    }

    // If decent, call
    if (score < 0.6) {
        return { action: 'call' };
    }

    // If strong, raise
    const raiseAmount = Math.min(Math.floor(this.chips * 0.15), this.chips);
    return { action: 'raise', amount: Math.max(currentBet + raiseAmount, currentBet + 10) };
};

function evaluateHandScore(hand) {
    if (!hand || hand.length < 2) return 0.1;
    const values = hand.map(c => c.value);
    if (values[0] === values[1]) return 0.9;
    const high = ['A','K','Q','J'];
    if (high.includes(values[0]) || high.includes(values[1])) return 0.6;
    return 0.35;
}