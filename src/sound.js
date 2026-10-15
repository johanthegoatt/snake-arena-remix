// Small synthesised sounds; no audio files. The context is created on the
// first key or tap, since browsers keep audio locked until a gesture.
const MUTE_KEY = "snake-arena-muted";

export function createSound() {
  let ctx = null;
  let muted = false;
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}

  function audio() {
    if (muted) return null;
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function blip(freq, { to = freq, length = 0.12, type = "square", gain = 0.06, delay = 0 } = {}) {
    const ac = audio();
    if (!ac) return;
    const t = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(amp).connect(ac.destination);
    osc.start(t);
    osc.stop(t + length + 0.02);
  }

  return {
    unlock: () => audio(),
    // Each food rings a little higher through a level, then resets.
    eat(foodsEaten) {
      blip(440 * 2 ** (((foodsEaten - 1) % 5) / 12 * 2), { to: 880, length: 0.09 });
    },
    levelUp() {
      [523, 659, 784].forEach((f, i) => blip(f, { type: "triangle", gain: 0.08, length: 0.14, delay: i * 0.08 }));
    },
    boost() {
      blip(300, { to: 1200, type: "sawtooth", gain: 0.04, length: 0.25 });
    },
    crash() {
      blip(220, { to: 40, type: "sawtooth", gain: 0.08, length: 0.5 });
    },
    win() {
      [523, 659, 784, 1047].forEach((f, i) => blip(f, { type: "triangle", gain: 0.08, length: 0.2, delay: i * 0.1 }));
    },
    get muted() {
      return muted;
    },
    toggle() {
      muted = !muted;
      try {
        localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
      } catch {}
      return muted;
    },
  };
}
