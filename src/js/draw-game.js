// Five-Card Draw Poker minimal implementation
// Interface aligns with existing Texas holdem Game where possible.
// Exposes window.DrawGame and CommonJS export { DrawGame }

(function(){
    class DrawPlayer {
        constructor(name){
            this.name = name;
            this.hand = [];
            this.chips = 1000;
            this.folded = false;
            this.contribution = 0;
            this.hasDrawn = false; // whether draw phase completed
        }
    }

    class DrawDeck {
        constructor(){
            this.cards = [];
            this.reset();
        }
        reset(){
            this.cards = [];
            const suits = ['Hearts','Diamonds','Clubs','Spades'];
            const values = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
            for (const s of suits){
                for (const v of values){
                    this.cards.push({ suit:s, value:v });
                }
            }
            // shuffle
            for (let i = this.cards.length -1; i>0; i--){
                const j = Math.floor(Math.random()*(i+1));
                [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
            }
        }
        deal(n){ return this.cards.splice(0,n); }
    }

    class DrawGame {
        constructor(){
            this.players = [];
            this.deck = new DrawDeck();
            this.pot = 0;
            this.stage = 0; // 0: initial deal, 1: draw phase, 4: showdown (align with Texas)
            this.currentPlayerIndex = 0;
            this.dealerIndex = 0;
            this.communityCards = [];
        }
        initializeGame(names){
            this.players = names.map(n=> new DrawPlayer(n));
            this.resetRound();
        }
        resetRound(){
            this.deck.reset();
            this.players.forEach(p=>{ p.hand=[]; p.folded=false; p.contribution=0; p.hasDrawn=false; });
            for (let i=0;i<5;i++){
                this.players.forEach(p=>{ p.hand.push(this.deck.deal(1)[0]); });
            }
            // ante
            const ante = 50;
            this.pot = 0;
            this.players.forEach(p=>{ const pay = Math.min(ante,p.chips); p.chips -= pay; p.contribution += pay; this.pot += pay; });
            this.stage = 0;
        }
        // Texas互換API
        dealCards(){ this.resetRound(); }
        startGame(){ if (this.players.length===0) this.initializeGame(['Player','AI']); }
        bet(playerIndex, amount){
            const p = this.players[playerIndex];
            if (!p || amount<=0) return;
            const pay = Math.min(amount, p.chips);
            p.chips -= pay; p.contribution += pay; this.pot += pay;
        }
        call(playerIndex){ /* simplified: treat as bet of 0 */ }
        fold(playerIndex){ const p=this.players[playerIndex]; if (p) p.folded=true; }
        drawCards(playerIndex, discardIndices){
            const p = this.players[playerIndex];
            if (!p || (this.stage!==0 && this.stage!==1)) return;
            // replace selected cards
            discardIndices.sort((a,b)=>b-a); // remove high to low
            discardIndices.forEach(idx=>{ if (idx>=0 && idx<p.hand.length){ p.hand.splice(idx,1); p.hand.push(this.deck.deal(1)[0]); } });
            p.hasDrawn = true;
            // if all players drawn advance to showdown
            if (this.players.every(pl=>pl.hasDrawn || pl.folded)) {
                this.stage = 4; // showdown next
            } else {
                this.stage = 1; // draw phase partially complete
            }
        }
        showdown(){
            this.stage = 4;
            const active = this.players.filter(p=>!p.folded);
            let best=null,bScore=-Infinity;
            active.forEach(p=>{
                let score = 0;
                if (typeof evaluateHandScore === 'function'){ score = evaluateHandScore(p.hand); }
                else { score = Math.random(); }
                if (score > bScore){ bScore = score; best = p; }
            });
            if (best){ const awarded = this.pot; best.chips += awarded; this.pot=0; return { winner: best, winnerName: best.name, awarded }; }
            return null;
        }
    }

    if (typeof window !== 'undefined') {
        window.DrawGame = DrawGame;
    }
    if (typeof module !== 'undefined' && module.exports){
        module.exports = { DrawGame };
    }
})();
