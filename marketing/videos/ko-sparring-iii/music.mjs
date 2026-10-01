// Builds the 15s soundtrack for index.html: a bell for each round, glove hits on every line, card and cell.
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const SR = 44100, LEN = 15, N = SR * LEN
const L = new Float32Array(N), R = new Float32Array(N)
let seed = 7
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

function kick(t, g = 1) {
  let ph = 0
  add(t, .5, (x) => {
    const f = 45 + 110 * Math.exp(-x * 28)
    ph += (2 * Math.PI * f) / SR
    return Math.tanh(Math.sin(ph) * Math.exp(-x * 7) * 2.2) + (x < .004 ? rnd() * .5 : 0)
  }, .9 * g)
}
function snare(t, g = 1) {
  let lp = 0
  add(t, .3, (x) => {
    const n = rnd(); lp += (n - lp) * .5
    return (n - lp) * Math.exp(-x * 16) * .9 + Math.sin(2 * Math.PI * 190 * x) * Math.exp(-x * 30) * .5
  }, .55 * g)
}
function hat(t, g = 1, open = false) {
  let prev = 0
  add(t, open ? .25 : .06, (x) => {
    const n = rnd(), hp = n - prev; prev = n
    return hp * Math.exp(-x * (open ? 14 : 70))
  }, .18 * g, (t * 7) % 2 > 1 ? .3 : -.3)
}
function thump(t, g = 1) {
  add(t, .35, (x) => Math.sin(2 * Math.PI * (55 + 30 * Math.exp(-x * 20)) * x) * Math.exp(-x * 12), .9 * g)
}
function impact(t, g = 1) {
  kick(t, 1.2 * g)
  let lp = 0
  add(t, 1.8, (x) => { lp += (rnd() - lp) * .08; return lp * Math.exp(-x * 2.2) * 3 }, .35 * g, -.2)
  add(t, 1.8, (x) => { return rnd() * Math.exp(-x * 3.5) * .5 }, .12 * g, .2)
  add(t, 1.6, (x) => Math.sin(2 * Math.PI * 38 * x) * Math.exp(-x * 1.6), .7 * g)
}
function riser(t, dur) {
  let lp = 0
  add(t, dur, (x) => {
    const k = x / dur
    lp += (rnd() - lp) * (.02 + .5 * k * k)
    return lp * k * k * 1.6 + Math.sin(2 * Math.PI * (200 + 1400 * k * k) * x) * k * .12
  }, .5)
}

// Bass and a detuned chord pad: Am, F, C, G across two-second bars.
const roots = [55, 43.65, 65.41, 49]
const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 261.6, 329.6], [196, 246.9, 293.7]]
function bass(t, f, dur, g = 1) {
  let ph = 0, lp = 0
  add(t, dur, (x) => {
    ph += f / SR
    const saw = 2 * (ph % 1) - 1
    lp += (saw - lp) * .06
    return Math.tanh(lp * 3) * Math.min(1, x * 200) * Math.exp(-x * 3)
  }, .45 * g)
}
function pad(t, notes, dur, g = 1) {
  notes.forEach((f, i) => [-.12, .12].forEach((d) => {
    let ph = rnd(), lp = 0
    add(t, dur, (x) => {
      ph += (f * (1 + d / 100)) / SR
      lp += ((2 * (ph % 1) - 1) - lp) * .03
      const env = Math.min(1, x / .08) * Math.min(1, (dur - x) / .3)
      return lp * env
    }, .06 * g, d * 4 + (i - 1) * .3)
  }))
}


// Glove on pad: a tight low thud with a slap of noise on top.
function glove(t, g = 1) {
  thump(t, 1.1 * g)
  let lp = 0
  add(t, .09, (x) => { lp += (rnd() - lp) * .35; return lp * Math.exp(-x * 45) * 2.2 }, .5 * g)
}
// Boxing bell: a few inharmonic partials ringing out.
function bell(t, g = 1) {
  ;[[830, 1], [1330, .6], [2120, .4], [2890, .25]].forEach(([f, a]) =>
    add(t, 1.6, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * (2.2 + f / 1500)) * a, .22 * g))
}
function clap(t, g = 1) {
  ;[0, .012, .024].forEach((d) => { let prev = 0; add(t + d, .16, (x) => { const n = rnd(), hp = n - prev; prev = n; return hp * Math.exp(-x * 28) }, .45 * g) })
}
// 808: a long sine with a pitch drop at the start, saturated.
function b808(t, f, dur, g = 1) {
  let ph = 0
  add(t, dur, (x) => {
    ph += (2 * Math.PI * f * (1 + .6 * Math.exp(-x * 30))) / SR
    return Math.tanh(Math.sin(ph) * 2.4) * Math.min(1, x * 300) * Math.min(1, (dur - x) / .05) * Math.exp(-x * .9)
  }, .55 * g)
}
function roll(a, b, step, g = .7) { for (let x = a; x < b - 1e-6; x += step) hat(x, g) }

const E = 41.2, C = 32.7, D = 36.7, G = 49

// Round 1: the bell, the manifesto line by line
bell(0, 1.3); impact(0, .8)
add(0, 3, (x) => Math.sin(2 * Math.PI * 41.2 * x) * Math.min(1, x / .3) * .2)
for (const x of [.25, .75, 1.5, 2.0]) { glove(x); kick(x) }
add(1.2, .25, (x) => { return rnd() * Math.exp(-x * 14) * .3 }, .5)
impact(2.25, 1); b808(2.25, E, .75)
roll(2.5, 3.0, .0625, .5)

// The ticket slams up, the beat runs, the stamp lands
impact(3.0, 1.1); b808(3.0, E, .9)
for (let x = 3.0; x < 5.5; x += .5) kick(x)
for (const x of [3.5, 4.0, 5.0]) clap(x, .8)
roll(3.0, 5.5, .125, .5)
impact(4.5, 1.2); glove(4.5, 1.3); b808(4.5, C, .9)

// Round 2: a bell, then a card sticks on every 0.75s
bell(5.5, 1.1)
for (const [x, f] of [[5.5, E], [6.25, C], [7.0, D], [7.75, E], [8.5, G]]) { glove(x); kick(x); b808(x, f, .6) }
for (const x of [5.875, 6.625, 7.375, 8.125, 8.875]) clap(x, .55)
roll(5.5, 9.5, .125, .45); roll(9.25, 9.5, .0417, .55)

// Round 3: a bell, then a cell lands every beat
bell(9.5, 1.1)
for (const [x, f] of [[9.5, E], [10.0, E], [10.5, C], [11.0, C], [11.5, D], [12.0, G]]) { glove(x); kick(x); b808(x, f, .45) }
for (const x of [10.0, 11.0, 12.0]) clap(x)
roll(9.5, 12.5, .125, .55); roll(12.25, 12.5, .0417, .6)

// Final: the hit on the outro, a line per beat, then ding ding ding
impact(12.5, 1.2); b808(12.5, E, 1.4)
glove(12.75, 1.1); glove(13.0, 1.2); kick(13.0)
for (const x of [14.0, 14.25, 14.5]) bell(x, 1.2)

function blip(t, f) {
  add(t, .06, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 60), .25)
}

// Master: soft clip and a short fade at the end
const out = Buffer.alloc(44 + N * 4)
out.write("RIFF", 0); out.writeUInt32LE(36 + N * 4, 4); out.write("WAVEfmt ", 8)
out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22)
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34)
out.write("data", 36); out.writeUInt32LE(N * 4, 40)
for (let i = 0; i < N; i++) {
  const fade = Math.min(1, (N - i) / (SR * .4))
  out.writeInt16LE(Math.round(Math.tanh(L[i] * .9) * fade * 30000), 44 + i * 4)
  out.writeInt16LE(Math.round(Math.tanh(R[i] * .9) * fade * 30000), 46 + i * 4)
}
writeFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "music.wav"), out)
