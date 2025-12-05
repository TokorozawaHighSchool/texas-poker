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
            this.hasBet = false;   // whether placed a bet this round
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
            this.ante = 50; // 初期アンティ（UIから変更可能）
            this.roundCount = 0; // 経過ラウンド数
            this.depositRequired = false; // 入金が必要な状態か
            this.requiredDeposit = 500; // 要求入金額（UIで変更可）
        }
        initializeGame(names, options={}){
            this.players = names.map(n=> new DrawPlayer(n));
            if (options && typeof options.ante === 'number' && options.ante >= 0) {
                this.ante = options.ante;
            } else if (typeof window !== 'undefined' && typeof window._drawAnte === 'number') {
                this.ante = Math.max(0, window._drawAnte);
            }
            this.roundCount = 0;
            this.depositRequired = false;
            this.resetRound(false); // 初期ラウンドではカウントを増やさない
        }
        resetRound(increment=true){
            this.deck.reset();
            this.players.forEach(p=>{ p.hand=[]; p.folded=false; p.contribution=0; p.hasDrawn=false; p.hasBet=false; });
            // 開始時アンティは無し。ベットはユーザー操作で行う。
            this.pot = 0;
            // ベット確定後に配るため、開始時は未配布ステージにする
            this.stage = -1; // -1: 未配布（ベット後にinitialDeal）
            // ラウンドカウントを進め、3の倍数の直後は入金必須に
            if (increment) {
                this.roundCount += 1;
                this.depositRequired = (this.roundCount % 3 === 0);
            }
        }
        // ベット確定後の初回配布
        initialDeal(){
            if (this.stage !== -1) return;
            // 5枚ずつ配布
            for (let i=0;i<5;i++){
                this.players.forEach(p=>{ const c=this.deck.deal(1)[0]; if (c) p.hand.push(c); });
            }
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
            p.hasBet = true;
            // 初回配布がまだなら、ここで配る
            if (this.stage === -1) this.initialDeal();
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
            const results = [];
            active.forEach(p=>{
                let score = 0;
                let name = '';
                if (typeof evaluateHandScore === 'function'){ score = evaluateHandScore(p.hand); }
                else { score = Math.random(); }
                if (typeof window !== 'undefined' && typeof window.evaluateHandName === 'function') {
                    name = window.evaluateHandName(p.hand) || '';
                }
                results.push({ player: p, score, name });
                if (score > bScore){ bScore = score; best = p; }
            });
            // 役に応じた係数テーブル（ドロー用）
            function getMultiplierForHand(hand){
                let name = '';
                if (typeof window !== 'undefined' && typeof window.evaluateHandName === 'function') {
                    name = window.evaluateHandName(hand) || '';
                }
                // 簡易判定：役名に含まれるキーワードで係数決定
                const n = name;
                if (/ストレートフラッシュ|Straight Flush/i.test(n)) return 12;
                if (/フォーカード|Four of a Kind/i.test(n)) return 8;
                if (/フルハウス|Full House/i.test(n)) return 6;
                if (/フラッシュ|Flush/i.test(n)) return 5;
                if (/ストレート|Straight/i.test(n)) return 4;
                if (/スリーカード|Three of a Kind/i.test(n)) return 3;
                if (/ツーペア|Two Pair/i.test(n)) return 2;
                if (/ワンペア|One Pair/i.test(n)) return 1.5;
                return 1; // ハイカード
            }
            if (best){
                const multiplier = getMultiplierForHand(best.hand);
                const baseBet = Math.max(0, best.contribution || 0);
                // ベット額×係数を上限に、ポットから支払う
                const desired = Math.floor(baseBet * multiplier);
                const awarded = Math.min(this.pot, desired);
                best.chips += awarded;
                this.pot -= awarded;
                const bestRes = results.find(r=>r.player===best) || { name: '' };
                return { winner: best, winnerName: best.name, handName: bestRes.name, awarded, multiplier };
            }
            return null;
        }

        // 入金処理
        deposit(playerIndex, amount){
            const p = this.players[playerIndex];
            if (!p) return false;
            const amt = Math.max(0, Math.floor(amount||0));
            if (amt <= 0) return false;
            // いつでも入金可: プレイヤーの持ち金（chips）から差し引く。ポットは変更しない。
            const pay = Math.min(amt, p.chips);
            if (pay <= 0) return false;
            p.chips -= pay;
            // 入金必須フラグは解除して継続可能にする
            this.depositRequired = false;
            return true;
        }
    }

    if (typeof window !== 'undefined') {
        window.DrawGame = DrawGame;
    }
    if (typeof module !== 'undefined' && module.exports){
        module.exports = { DrawGame };
    }
})();
