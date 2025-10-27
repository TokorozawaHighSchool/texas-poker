(function(){
  const ctxState = { ctx: null, unlocked: false };
  function getCtx(){
    if (!ctxState.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctxState.ctx = new AudioCtx();
    }
    return ctxState.ctx;
  }
  function unlock(){
    const ctx = getCtx();
    if (!ctx || ctxState.unlocked) return;
    const b = ctx.createBuffer(1, 1, 22050);
    const s = ctx.createBufferSource();
    s.buffer = b; s.connect(ctx.destination);
    if (ctx.state === 'suspended') ctx.resume();
    try { s.start(0); } catch(e){}
    ctxState.unlocked = true;
  }
  function env(ctx, node, t, a=0.002, d=0.04){
    const g = ctx.createGain();
    node.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(1, now + a);
    g.gain.exponentialRampToValueAtTime(0.0001, now + a + d);
    return g;
  }
  function tone(freq=440, dur=0.08, type='sine', vol=0.2){
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.value = vol; o.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime; o.start(now); o.stop(now + dur);
    return {o,g,now,ctx};
  }
  function deal(){
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 900;
    const g = env(ctx, o, 0, 0.001, 0.06); g.gain.value = 0.12;
    const f = o.frequency; const t = ctx.currentTime;
    f.setValueAtTime(900, t); f.exponentialRampToValueAtTime(400, t + 0.06);
    o.start(); o.stop(t + 0.07);
  }
  function flip(){
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 200;
    const g = env(ctx, o, 0, 0.001, 0.05); g.gain.value = 0.09;
    const t = ctx.currentTime; o.start(t); o.stop(t + 0.05);
  }
  function click(){
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 1000;
    const g = env(ctx, o, 0, 0.001, 0.03); g.gain.value = 0.05;
    const t = ctx.currentTime; o.start(t); o.stop(t + 0.03);
  }
  function chips(){
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 1800;
    const g = env(ctx, o, 0, 0.001, 0.10); g.gain.value = 0.07;
    const t = ctx.currentTime; o.start(t); o.stop(t + 0.1);
  }
  function fold(){
    const ctx = getCtx(); if (!ctx) return;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 220;
    const g = env(ctx, o, 0, 0.004, 0.15); g.gain.value = 0.06;
    const t = ctx.currentTime; o.start(t); o.stop(t + 0.15);
  }
  function win(){
    const ctx = getCtx(); if (!ctx) return;
    // simple triumphant fanfare: I-V-I with octave lifts
    const notes = [ 523.25, 659.25, 783.99, 1046.5, 987.77, 880.0, 1174.66, 1567.98 ];
    let t = ctx.currentTime;
    for (let i=0; i<notes.length; i++) {
      const f = notes[i];
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = i % 3 === 0 ? 'square' : 'sine';
      o.frequency.value = f;
      g.gain.value = 0.05;
      o.connect(g); g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.15);
      t += (i === 3) ? 0.22 : 0.16;
    }
    // add quick shimmer
    const o2 = ctx.createOscillator(); const g2 = ctx.createGain();
    o2.type='triangle'; o2.frequency.value=1975; g2.gain.value=0.03; o2.connect(g2); g2.connect(ctx.destination);
    o2.start(t-0.2); o2.stop(t);
  }
  window.Sound = { unlock, deal, flip, click, chips, fold, win };
  window.addEventListener('pointerdown', unlock, { once: true });
})();
