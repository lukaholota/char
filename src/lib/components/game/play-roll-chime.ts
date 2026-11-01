const CHIME_GAP_MS = 400;

let context: AudioContext | null = null;
let lastPlayedAt = 0;

const UNLOCK_EVENTS = ["pointerup", "touchend", "keydown"] as const;

/// Браузер вмикає звук лише в жесті, а дотик пальцем стає жестом на відпусканні, не на pointerdown.
export function unlockRollChimeOnFirstTap(): () => void {
  const stop = () => UNLOCK_EVENTS.forEach((type) => window.removeEventListener(type, unlock, { capture: true }));
  const unlock = () => {
    const audio = findContext();
    if (!audio) return stop();
    void audio.resume().then(() => audio.state === "running" && stop(), () => undefined);
  };
  UNLOCK_EVENTS.forEach((type) => window.addEventListener(type, unlock, { capture: true }));
  return stop;
}

export function playRollChime(now = Date.now()) {
  if (now - lastPlayedAt < CHIME_GAP_MS) return;
  const audio = findContext();
  if (!audio || audio.state !== "running") return;
  lastPlayedAt = now;
  playBubble(audio, audio.currentTime, 520, 0.14);
  playBubble(audio, audio.currentTime + 0.085, 780, 0.1);
}

/// Тон, що різко йде вгору й швидко гасне, звучить як «бульк» месенджера, а не як дзвінок.
function playBubble(audio: AudioContext, start: number, baseHz: number, peak: number) {
  const gain = audio.createGain();
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.006);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.11);
  gain.connect(audio.destination);
  const tone = audio.createOscillator();
  tone.type = "sine";
  tone.frequency.setValueAtTime(baseHz, start);
  tone.frequency.exponentialRampToValueAtTime(baseHz * 2, start + 0.045);
  tone.connect(gain);
  tone.start(start);
  tone.stop(start + 0.12);
}

function findContext(): AudioContext | null {
  if (context) return context;
  const AudioContextClass = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  context = AudioContextClass ? new AudioContextClass() : null;
  return context;
}
