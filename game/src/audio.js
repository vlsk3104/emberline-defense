// WebAudio-synthesized SFX — zero assets, every sound is an oscillator /
// noise recipe from spec section 6. Guarded so headless / muted contexts
// simply stay silent.

export function createAudio() {
  let ctx = null;
  let muted = false;
  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    try {
      const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
      if (!AC) return null;
      ctx = new AC();
    } catch { ctx = null; }
    return ctx;
  }
  function tone(freqA, freqB, dur, type = 'square', gain = 0.08, delay = 0) {
    const ac = ensure(); if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqA, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqB), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function noise(dur, freq = 800, gain = 0.12, delay = 0) {
    const ac = ensure(); if (!ac || muted) return;
    const t0 = ac.currentTime + delay;
    const len = Math.max(1, Math.floor(ac.sampleRate * dur));
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource(); src.buffer = buf;
    const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = freq;
    const g = ac.createGain(); g.gain.value = gain;
    src.connect(filter).connect(g).connect(ac.destination);
    src.start(t0);
  }
  const sounds = {
    arrow: () => tone(880, 520, 0.05, 'square', 0.05),
    cannon: () => { tone(120, 50, 0.16, 'sine', 0.16); noise(0.1, 500, 0.1); },
    explosion: () => noise(0.35, 700, 0.16),
    frost: () => tone(1400, 1500, 0.09, 'sine', 0.06),
    zap: () => { tone(300, 90, 0.09, 'sawtooth', 0.07); noise(0.07, 2400, 0.05); },
    die: () => tone(420, 140, 0.12, 'triangle', 0.07),
    leak: () => { tone(180, 180, 0.12, 'square', 0.1); tone(140, 140, 0.16, 'square', 0.1, 0.13); },
    gold: () => tone(1560, 1560, 0.06, 'sine', 0.045),
    place: () => tone(160, 90, 0.09, 'sine', 0.14),
    upgrade: () => { tone(520, 520, 0.07, 'triangle', 0.08); tone(660, 660, 0.07, 'triangle', 0.08, 0.07); tone(880, 880, 0.1, 'triangle', 0.08, 0.14); },
    sell: () => { tone(660, 660, 0.07, 'triangle', 0.07); tone(440, 440, 0.1, 'triangle', 0.07, 0.07); },
    wave: () => { tone(196, 196, 0.28, 'sawtooth', 0.07); tone(202, 202, 0.28, 'sawtooth', 0.07); },
    victory: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.09, i * 0.13)),
    defeat: () => tone(220, 55, 1.1, 'sine', 0.12),
    clear: () => tone(784, 988, 0.1, 'sine', 0.06),
  };
  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    play(name) { const s = sounds[name]; if (s) s(); },
    playEvents(events) {
      let shot = null;
      for (const ev of events) {
        if (ev.type === 'shoot') shot = ev.shootType;
        else if (ev.type === 'zap') shot = 'zap';
        else if (ev.type === 'explosion') this.play('explosion');
        else if (ev.type === 'die') this.play('die');
        else if (ev.type === 'gold') this.play('gold');
        else if (ev.type === 'leak') this.play('leak');
        else if (ev.type === 'place') this.play('place');
        else if (ev.type === 'upgrade') this.play('upgrade');
        else if (ev.type === 'sell') this.play('sell');
        else if (ev.type === 'wave') this.play('wave');
        else if (ev.type === 'clear') this.play('clear');
        else if (ev.type === 'victory') this.play('victory');
        else if (ev.type === 'defeat') this.play('defeat');
      }
      if (shot) this.play(shot);
    },
  };
}
