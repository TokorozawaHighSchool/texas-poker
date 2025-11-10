// Simple but solid Texas Hold'em 7-card hand evaluator
// Exposes:
//  - window.evaluateHandScore(cards) => number (higher is better)
//  - window.evaluateHandName(cards)  => string (日本語の役名)
(function(){
	const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
	const RANK_VAL = Object.fromEntries(RANK_ORDER.map((r,i)=>[r, i+2])); // 2..14

	function byDesc(a,b){ return b-a; }

	function countsByRank(cards){
		const map = new Map();
		for (const c of cards){
			const v = RANK_VAL[String(c.value).toUpperCase()] || 0;
			map.set(v, (map.get(v)||0)+1);
		}
		return map; // key: value(2..14), val: count
	}

	function groupBySuit(cards){
		const map = new Map();
		for (const c of cards){
			const s = String(c.suit).toLowerCase();
			if (!map.has(s)) map.set(s, []);
			map.get(s).push(c);
		}
		return map; // suit => [cards]
	}

	function getSortedValues(cards){
		const vals = cards.map(c=>RANK_VAL[String(c.value).toUpperCase()]||0).filter(v=>v>0);
		vals.sort(byDesc);
		return vals;
	}

	function uniqueSorted(vals){
		const out = [];
		let last = -1;
		for (const v of vals){ if (v!==last){ out.push(v); last=v; } }
		return out;
	}

	function detectStraight(valuesDesc){
		// valuesDesc must be unique and desc
		if (valuesDesc.length===0) return null;
		const vset = new Set(valuesDesc);
		// wheel: A-2-3-4-5 => treat A as 1
		if (vset.has(14) && vset.has(5) && vset.has(4) && vset.has(3) && vset.has(2)){
			return 5; // straight to 5
		}
		let run = 1;
		for (let i=0;i<valuesDesc.length-1;i++){
			if (valuesDesc[i]===valuesDesc[i+1]+1){
				run++;
				if (run>=5) return valuesDesc[i-3]; // top of 5-long straight
			} else if (valuesDesc[i]!==valuesDesc[i+1]){
				run=1;
			}
		}
		return null;
	}

	function bestFlushValues(cards){
		const bySuit = groupBySuit(cards);
		for (const [,arr] of bySuit){
			if (arr.length>=5){
				const vals = getSortedValues(arr);
				return vals.slice(0,5);
			}
		}
		return null;
	}

	function bestStraightFlush(cards){
		const bySuit = groupBySuit(cards);
		for (const [,arr] of bySuit){
			if (arr.length>=5){
				const vals = uniqueSorted(getSortedValues(arr));
				const top = detectStraight(vals);
				if (top){ return top; } // top card value of straight flush
			}
		}
		// wheel straight flush?
		for (const [,arr] of bySuit){
			if (arr.length>=5){
				const set = new Set(arr.map(c=>RANK_VAL[String(c.value).toUpperCase()]));
				if (set.has(14)&&set.has(5)&&set.has(4)&&set.has(3)&&set.has(2)) return 5;
			}
		}
		return null;
	}

	function buildScore(category, kickers){
		// pack into a number: cat (0..8) then five 2-digit slots (00..14)
		// scale to keep ordering; JS Number safe for this range
		let s = category * 1e10;
		const mul = [1e8,1e6,1e4,1e2,1];
		for (let i=0;i<5;i++){
			s += (kickers[i]||0) * mul[i];
		}
		return s;
	}

	function evaluate(cards){
		const valsDesc = getSortedValues(cards);
		const uniq = uniqueSorted(valsDesc);
		const counts = countsByRank(cards);
		// straight flush
		const sfTop = bestStraightFlush(cards);
		if (sfTop){
			return { cat:8, name:'ストレートフラッシュ', score: buildScore(8, [sfTop,0,0,0,0]) };
		}
		// four of a kind
		let quad=null; for (const [v,c] of counts) if (c===4) quad = Math.max(quad||0, v);
		if (quad){
			const kicker = uniq.find(v=>v!==quad) || 0;
			return { cat:7, name:'フォーカード', score: buildScore(7, [quad, kicker]) };
		}
		// full house: triple + pair (or second triple as pair)
		const triples = [...counts].filter(([,c])=>c===3).map(([v])=>v).sort(byDesc);
		const pairs = [...counts].filter(([,c])=>c>=2).map(([v])=>v).sort(byDesc);
		if (triples.length>=1 && pairs.length>=2 || triples.length>=2){
			const t = triples[0];
			const restPairs = pairs.filter(v=>v!==t);
			const p = restPairs.length?restPairs[0]: (triples[1]||0);
			if (p){
				return { cat:6, name:'フルハウス', score: buildScore(6, [t, p]) };
			}
		}
		// flush
		const flush = bestFlushValues(cards);
		if (flush){
			return { cat:5, name:'フラッシュ', score: buildScore(5, flush) };
		}
		// straight
		const stTop = detectStraight(uniq);
		if (stTop){
			return { cat:4, name:'ストレート', score: buildScore(4, [stTop]) };
		}
		// three of a kind
		if (triples.length){
			const t = triples[0];
			const kickers = uniq.filter(v=>v!==t).slice(0,2);
			return { cat:3, name:'スリーカード', score: buildScore(3, [t, ...kickers]) };
		}
		// two pair
		const pairVals = [...counts].filter(([,c])=>c===2).map(([v])=>v).sort(byDesc);
		if (pairVals.length>=2){
			const [p1,p2] = pairVals.slice(0,2);
			const kicker = uniq.find(v=>v!==p1 && v!==p2) || 0;
			return { cat:2, name:'ツーペア', score: buildScore(2, [p1,p2,kicker]) };
		}
		// one pair
		if (pairVals.length===1){
			const p = pairVals[0];
			const kickers = uniq.filter(v=>v!==p).slice(0,3);
			return { cat:1, name:'ワンペア', score: buildScore(1, [p, ...kickers]) };
		}
		// high card
		return { cat:0, name:'ハイカード', score: buildScore(0, uniq.slice(0,5)) };
	}

	window.evaluateHandScore = function(cards){ return evaluate(cards||[]).score; };
	window.evaluateHandName  = function(cards){ return evaluate(cards||[]).name; };
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = {
			evaluateHandScore: (cards)=>evaluate(cards||[]).score,
			evaluateHandName:  (cards)=>evaluate(cards||[]).name
		};
	}
})();
