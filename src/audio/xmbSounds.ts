export type XmbSound = "move" | "confirm" | "back" | "error";

const sources: Record<XmbSound, string> = {
  move: "/audio/xmb/snd_option.wav",
  confirm: "/audio/xmb/snd_system_ok.wav",
  back: "/audio/xmb/snd_cancel.wav",
  error: "/audio/xmb/snd_system_ng.wav",
};

// The firmware WAVs are mastered very quietly (roughly -21 to -31 dBFS).
// Web Audio gain above 1 brings them to a clear menu level without clipping.
const gains: Record<XmbSound, number> = {
  move: 3.4,
  confirm: 5.5,
  back: 5,
  error: 3,
};

let context: AudioContext | undefined;
const buffers = new Map<XmbSound, AudioBuffer>();
const loading = new Map<XmbSound, Promise<AudioBuffer>>();
const rollingVoices: AudioBufferSourceNode[] = [];
const singleVoices = new Map<XmbSound, AudioBufferSourceNode>();

function getContext() {
  context ??= new AudioContext({ latencyHint: "interactive" });
  return context;
}

function loadSound(sound: XmbSound) {
  const existing = buffers.get(sound);
  if (existing) return Promise.resolve(existing);
  const pending = loading.get(sound);
  if (pending) return pending;

  const task = fetch(sources[sound])
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load XMB sound: ${sources[sound]}`);
      return response.arrayBuffer();
    })
    .then((data) => getContext().decodeAudioData(data))
    .then((buffer) => {
      buffers.set(sound, buffer);
      loading.delete(sound);
      return buffer;
    })
    .catch((error) => {
      loading.delete(sound);
      throw error;
    });

  loading.set(sound, task);
  return task;
}

export function playXmbSound(sound: XmbSound, enabled = true) {
  if (!enabled) return;
  const audioContext = getContext();
  if (audioContext.state === "suspended") void audioContext.resume();

  const buffer = buffers.get(sound);
  if (!buffer) {
    void loadSound(sound).catch(() => undefined);
    return;
  }

  const source = audioContext.createBufferSource();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  gain.gain.value = gains[sound];
  source.connect(gain).connect(audioContext.destination);

  if (sound === "move") {
    // A few 39 ms cursor samples may overlap during key repeat. Keeping those
    // tails is what creates the PS3-style rolling click instead of silence.
    rollingVoices.push(source);
    if (rollingVoices.length > 4) rollingVoices.shift()?.stop();
    source.addEventListener("ended", () => {
      const index = rollingVoices.indexOf(source);
      if (index >= 0) rollingVoices.splice(index, 1);
    }, { once: true });
  } else {
    singleVoices.get(sound)?.stop();
    singleVoices.set(sound, source);
    source.addEventListener("ended", () => {
      if (singleVoices.get(sound) === source) singleVoices.delete(sound);
    }, { once: true });
  }

  source.start();
}

export function preloadXmbSounds() {
  (Object.keys(sources) as XmbSound[]).forEach((sound) => {
    void loadSound(sound).catch(() => undefined);
  });
}
