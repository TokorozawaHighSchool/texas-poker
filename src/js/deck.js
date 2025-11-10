class Deck {
    constructor() {
        this.cards = [];
        this.createDeck();
        this.shuffle();
    }

    createDeck() {
        const suits = ['Hearts', 'Diamonds', 'Clubs', 'Spades'];
        const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

        for (let suit of suits) {
            for (let value of values) {
                this.cards.push({ suit, value });
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal(numCards) {
        return this.cards.splice(0, numCards);
    }

    resetDeck() {
        this.cards = [];
        this.createDeck();
        this.shuffle();
    }
}

// Make Deck available as a global (avoid ESM export so scripts can be loaded via plain <script> tags)
if (typeof window !== 'undefined') {
    window.Deck = Deck;
}
// CommonJS export for Node/Jest tests
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Deck };
}