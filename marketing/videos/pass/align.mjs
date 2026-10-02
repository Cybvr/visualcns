// Writes timing.js (for index.html) and timing.json (for music.mjs) with the start of every
// voiceover sentence. With vo.wav present it finds the pauses in the recording; without it,
// it estimates from word counts so the film can be built before the voice exists.
//   node pass/align.mjs
import ffmpeg from "ffmpeg-static"
import { spawnSync } from "node:child_process"
import { existsSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"
import { LINES } from "./lines.mjs"

const here = path.dirname(fileURLToPath(import.meta.url))
const vo = path.join(here, "vo.wav")
const words = LINES.map((l) => l.split(/\s+/).length)
const total = words.reduce((a, b) => a + b, 0)
const TAIL = 2.2

let starts, end
if (existsSync(vo)) {
  const out = spawnSync(ffmpeg, ["-hide_banner", "-i", vo, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" }).stderr
  const dur = +out.match(/Duration: (\d+):(\d+):([\d.]+)/).slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0)
  const sil = []
  for (const m of out.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) sil.push([+m[1], +m[2]])
  const s0 = sil[0] && sil[0][0] < 0.05 ? sil[0][1] : 0
  const last = sil.at(-1)
  const s1 = last && last[1] > dur - 0.05 ? last[0] : dur
  const gaps = sil.filter(([a, b]) => a > s0 + 0.05 && b < s1 - 0.05)
  starts = [s0]
  let cum = 0, from = 0
  for (let i = 1; i < LINES.length; i++) {
    cum += words[i - 1]
    const guess = s0 + (s1 - s0) * (cum / total)
    // The pause nearest the guess, weighted towards longer pauses, after the last one used.
    let best = -1, score = Infinity
    for (let g = from; g < gaps.length; g++) {
      const [a, b] = gaps[g]
      if (b <= starts.at(-1) + 0.3) continue
      const sc = Math.abs((a + b) / 2 - guess) - (b - a) * 1.5
      if (sc < score) { score = sc; best = g }
    }
    if (best < 0) { starts.push(guess); continue }
    starts.push(gaps[best][1] - 0.04)
    from = best + 1
  }
  end = s1
} else {
  const RATE = 2.55, GAP = 0.38
  starts = []
  let t = 0.3
  for (const w of words) { starts.push(+t.toFixed(3)); t += w / RATE + GAP }
  end = t - GAP
}
const timing = { starts: starts.map((s) => +s.toFixed(3)), end: +end.toFixed(3), duration: +(end + TAIL).toFixed(2), lines: LINES }
writeFileSync(path.join(here, "timing.json"), JSON.stringify(timing, null, 2))
writeFileSync(path.join(here, "timing.js"), `window.TIMING = ${JSON.stringify(timing)}\n`)
console.log(LINES.map((l, i) => `${timing.starts[i].toFixed(2)}  ${l}`).join("\n"), `\nend ${timing.end}  duration ${timing.duration}`)
