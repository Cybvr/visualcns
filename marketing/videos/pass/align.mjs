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
// Rough syllable count per line: spoken length tracks syllables better than words.
// Letters spoken one by one (CNS, QR) and digits count one each.
const syllables = (w) => {
  const spelled = (w.match(/[A-Z]{2,}|\d/g) || []).join("").length
  const rest = w.replace(/[A-Z]{2,}|\d/g, "").toLowerCase().replace(/[^a-z]/g, "")
  return spelled + (rest ? Math.max(1, (rest.match(/[aeiouy]+/g) || []).length) : 0)
}
const words = LINES.map((l) => l.split(/\s+/).reduce((n, w) => n + syllables(w), 0))
const total = words.reduce((a, b) => a + b, 0)
const TAIL = 2.2

let starts, end
if (existsSync(vo)) {
  const out = spawnSync(ffmpeg, ["-hide_banner", "-i", vo, "-af", "silencedetect=noise=-38dB:d=0.12", "-f", "null", "-"], { encoding: "utf8" }).stderr
  const dur = +out.match(/Duration: (\d+):(\d+):([\d.]+)/).slice(1).reduce((a, v, i) => a + v * [3600, 60, 1][i], 0)
  const sil = []
  for (const m of out.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)) sil.push([+m[1], +m[2]])
  // A click or breath between two pauses splits one pause in two; join them back up.
  for (let i = sil.length - 1; i > 0; i--) if (sil[i][0] - sil[i - 1][1] < 0.1) sil.splice(i - 1, 2, [sil[i - 1][0], sil[i][1]])
  const s0 = sil[0] && sil[0][0] < 0.05 ? sil[0][1] : 0
  const last = sil.at(-1)
  const s1 = last && last[1] > dur - 0.05 ? last[0] : dur
  // The stretches of speech between pauses, ignoring stray clicks.
  const segs = []
  let from = s0
  for (const [a, b] of sil) {
    if (a <= s0 || b >= s1) continue
    if (a - from > 0.1) segs.push([from, a])
    from = b
  }
  segs.push([from, s1])
  // Split the stretches into LINES.length runs so each run's speaking time best matches its
  // line's syllable count (least squares, by dynamic programming over where each line starts).
  const speech = segs.reduce((n, [a, b]) => n + b - a, 0)
  const rate = speech / total
  const n = LINES.length, m = segs.length
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity))
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  cost[0][0] = 0
  for (let i = 1; i <= n; i++) {
    const want = words[i - 1] * rate
    for (let j = i; j <= m; j++) {
      let spoken = 0
      for (let k = j - 1; k >= i - 1; k--) {
        spoken += segs[k][1] - segs[k][0]
        const c = cost[i - 1][k] + (spoken - want) ** 2 / want
        if (c < cost[i][j]) { cost[i][j] = c; back[i][j] = k }
      }
    }
  }
  const first = []
  for (let i = n, j = m; i > 0; i--) { j = back[i][j]; first.unshift(j) }
  starts = first.map((k, i) => (i === 0 ? s0 : segs[k][0] - 0.04))
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
