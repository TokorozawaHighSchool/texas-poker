const { Game } = require('../src/js/game');
const { Deck } = require('../src/js/deck');
const { AI } = require('../src/js/ai');

describe('Game Logic', () => {
    let game;

    beforeEach(() => {
        game = new Game();
    });

    test('should initialize with a fresh deck', () => {
        expect(game.deck.cards.length).toBe(52);
    });

    test('should deal cards to players', () => {
        game.startGame();
        expect(game.players[0].hand.length).toBe(2);
        expect(game.players[1].hand.length).toBe(2);
    });

    test('should determine the winner correctly', () => {
        game.players[0].hand = [{ rank: 'A', suit: 'hearts' }, { rank: 'K', suit: 'hearts' }];
        game.players[1].hand = [{ rank: '10', suit: 'spades' }, { rank: 'J', suit: 'spades' }];
        const winner = game.determineWinner();
        expect(winner).toBe(game.players[0]);
    });

    test('should allow players to make bets', () => {
        game.startGame();
        game.players[0].bet(100);
        expect(game.pot).toBe(100);
    });

    test('should reset the game after a round', () => {
        game.startGame();
        game.endGame();
        expect(game.players[0].hand.length).toBe(0);
        expect(game.players[1].hand.length).toBe(0);
    });
});