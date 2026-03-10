import bellAudio from "../assets/audio/bell.mp3";

const POOL_SIZE = 5;
const bellSfxPool = Array.from({ length: POOL_SIZE }, () => {
  const a = new Audio(bellAudio);
  a.preload = "auto";
  return a;
});

/**
 * Play a sound effect by id. Uses a pool so repeated plays layer instead of interrupting.
 * @param {string} audio - Sound id (e.g. "BELL_SFX")
 */
export function playAudio(audio) {
  switch (audio) {
    case "BELL_SFX": {
      const free = bellSfxPool.find((el) => el.paused || el.ended);
      if (free) {
        free.currentTime = 0;
        free.play().catch((err) => console.error("Play failed:", err));
      } else {
        const oneOff = new Audio(bellAudio);
        oneOff.play().catch((err) => console.error("Play failed:", err));
      }
      break;
    }
    default:
      console.error("Unknown audio", audio);
      break;
  }
}
