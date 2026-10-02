// Builds the soundtrack for index.html: a low, steady 90 BPM pulse, sound cues on the cuts,
// and the voiceover (vo.wav) on top when it's there. Timing comes from timing.json (align.mjs).
import ffmpeg from "ffmpeg-static"
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const T = JSON.parse(readFileSync(path.join(here, "timing.json"), "utf8"))
const S = T.starts
const SR = 44100, LEN = T.duration, N = Math.ceil(SR * LEN)
const L = new Float32Array(N), R = new Float32Array(N)
let seed = 5
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1

function add(t0, dur, fn, gain = 1, pan = 0) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR)
  const gl = gain * Math.min(1, 1 - pan), gr = gain * Math.min(1, 1 + pan)
  for (let i = 0; i < n && s0 + i < N; i++) {
    if (s0 + i < 0) continue
    const v = fn(i / SR)
    L[s0 + i] += v * gl; R[s0 + i] += v * gr
  }
}

// Same cut times as index.html
const SCENE_LINE = [0, 2, 3, 4, 5, 6, 8, 9, 10, 11, 12, 14, 16]
const CUT = SCENE_LINE.map((l, i) => (i === 0 ? 0 : S[l] - 0.12))
const at = (scene, dt) => CUT[scene] + dt

// The bed
const BPM = 90, BEAT = 60 / BPM
function kick(t, g = 1) {
  let ph = 0
  add(t, .45, (x) => { ph += (2 * Math.PI * (42 + 70 * Math.exp(-x * 30))) / SR; return Math.tanh(Math.sin(ph) * Math.exp(-x * 8) * 1.8) }, .55 * g)
}
function hat(t, g = 1) {
  let prev = 0
  add(t, .05, () => { const n = rnd(), hp = n - prev; prev = n; return hp }, .035 * g, (t * 3) % 2 > 1 ? .25 : -.25)
}
function bass(t, f, dur, g = 1) {
  add(t, dur, (x) => (Math.sin(2 * Math.PI * f * x) + .25 * Math.sin(4 * Math.PI * f * x)) * Math.min(1, x * 30) * Math.exp(-x * 1.4), .22 * g)
}
const ROOTS = [55, 55, 49, 51.91] // A, A, G, G#: a slow, even loop
const passAt = CUT[4]
for (let b = 0, t = 0; t < LEN - 1.6; b++, t = b * BEAT) {
  const before = t < passAt
  if (b % 2 === 0) kick(t, before ? .6 : 1)
  if (!before) hat(t + BEAT / 2, b % 4 === 3 ? 1.4 : 1)
  if (b % 4 === 0) bass(t, ROOTS[Math.floor(b / 4) % 4], BEAT * 4, before ? .6 : 1)
}
// A low pad under everything
add(0, LEN, (x) => {
  const sw = .5 + .5 * Math.sin(2 * Math.PI * x / 8)
  return (Math.sin(2 * Math.PI * 110 * x) + Math.sin(2 * Math.PI * 110.6 * x) + .6 * Math.sin(2 * Math.PI * 164.8 * x)) * (.4 + .6 * sw) * Math.min(1, x / 2) * Math.min(1, (LEN - x) / 2)
}, .025)

// Cues
function tick(t, g = 1) { add(t, .03, (x) => Math.sin(2 * Math.PI * 2400 * x) * Math.exp(-x * 160), .12 * g) }
function chime(t) { add(t, 1.2, (x) => (Math.sin(2 * Math.PI * 1318.5 * x) + .6 * Math.sin(2 * Math.PI * 1975.5 * x)) * Math.exp(-x * 4), .08) }
function hit(t, g = 1) {
  kick(t, 1.4 * g)
  add(t, 1.6, (x) => Math.sin(2 * Math.PI * 36 * x) * Math.exp(-x * 2), .5 * g)
  let lp = 0
  add(t, 1.2, () => { lp += (rnd() - lp) * .05; return lp * 3 }, .12 * g)
}
function scratch(t, dur) {
  let lp = 0, hp = 0
  add(t, dur, (x) => { const n = rnd(); lp += (n - lp) * .35; hp = n - lp; return hp * (.5 + .5 * Math.sin(2 * Math.PI * 11 * x) ** 2) * Math.min(1, x * 20) }, .05)
}
function flip(t) {
  let lp = 0
  add(t, .14, (x) => { lp += (rnd() - lp) * .25; return lp * Math.sin(Math.PI * x / .14) }, .18)
}
function whoosh(t, dur) {
  let lp = 0
  add(t, dur, (x) => { const k = x / dur; lp += (rnd() - lp) * (.02 + .2 * k); return lp * k * 2 }, .25)
}

scratch(at(0, .5), 1.6)
;[.55, .55 + Math.max(.45, (CUT[2] - CUT[1] - .6) / 3.4), .55 + 2 * Math.max(.45, (CUT[2] - CUT[1] - .6) / 3.4)].forEach((d) => tick(at(1, d), 1.5))
for (let t = CUT[3]; t < CUT[4] - .2; t += .32) flip(t)
whoosh(CUT[4] - .5, .5)
hit(at(4, .62))
tick(at(5, 1.2)); tick(at(5, 2.4)); chime(at(5, S[7] - CUT[5]))
tick(at(6, 2.0), 1.5)
chime(at(7, .3)); [1.1, 1.45, 1.8].forEach((d) => tick(at(7, d)))
tick(at(8, 1.4)); tick(at(8, 2.1)); tick(at(8, 2.8), .6)
tick(at(9, 1.0), 1.5)
tick(at(10, S[13] - CUT[10] + .05), 1.5)
hit(at(11, 0), .6)
hit(at(12, S[17] - CUT[12] + 1.5), .8)

// Normalise the bed, then mix it under the voice
let peak = 0
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]))
const buf = Buffer.alloc(44 + N * 4)
buf.write("RIFF", 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write("WAVE", 8); buf.write("fmt ", 12)
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24)
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  buf.writeInt16LE(Math.round((L[i] / peak) * .9 * 32767), 44 + i * 4)
  buf.writeInt16LE(Math.round((R[i] / peak) * .9 * 32767), 46 + i * 4)
}
const bed = path.join(here, "bed.wav"), vo = path.join(here, "vo.wav"), out = path.join(here, "music.wav")
writeFileSync(bed, buf)
if (existsSync(vo)) {
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", bed, "-i", vo, "-filter_complex",
    "[1:a]aresample=44100,pan=stereo|c0=c0|c1=c0,volume=1.0[v];[v]asplit[v1][v2];[0:a]volume=0.32[b];[b][v1]sidechaincompress=threshold=0.05:ratio=4:attack=20:release=300[d];[d][v2]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95",
    "-ar", "44100", out])
} else {
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-i", bed, "-af", "volume=0.55", out])
}
console.log(existsSync(vo) ? "music.wav: bed + voiceover" : "music.wav: bed only (no vo.wav yet)")
