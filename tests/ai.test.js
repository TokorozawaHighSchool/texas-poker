const { AI } = require('../src/js/ai');
const { Player } = require('../src/js/player');

describe('AI Player Logic', () => {
    let aiPlayer;

    beforeEach(() => {
        aiPlayer = new AI('AI Player');
    });

    test('AI should make a decision based on hand strength', () => {
        aiPlayer.hand = [{ value: 10, suit: 'hearts' }, { value: 11, suit: 'hearts' }]; // Example hand
        const decision = aiPlayer.makeDecision();
        expect(['fold', 'call', 'raise']).toContain(decision);
    });

    test('AI should raise when it has a strong hand', () => {
        aiPlayer.hand = [{ value: 12, suit: 'spades' }, { value: 13, suit: 'spades' }]; // Strong hand
        const decision = aiPlayer.makeDecision();
        expect(decision).toBe('raise');
    });

    test('AI should fold when it has a weak hand', () => {
        aiPlayer.hand = [{ value: 2, suit: 'clubs' }, { value: 3, suit: 'clubs' }]; // Weak hand
        const decision = aiPlayer.makeDecision();
        expect(decision).toBe('fold');
    });

    test('AI should call when it has a medium strength hand', () => {
        aiPlayer.hand = [{ value: 8, suit: 'diamonds' }, { value: 9, suit: 'diamonds' }]; // Medium hand
        const decision = aiPlayer.makeDecision();
        expect(decision).toBe('call');
    });
});