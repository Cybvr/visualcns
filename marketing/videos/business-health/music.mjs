// Builds the 10s, 120 BPM soundtrack for index.html; every hit lines up with a cut.
import { writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import path from "node:path"

const SR = 44100, LEN = 10, N = SR * LEN
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

function beep(t, dur, g = 1) {
  add(t, dur, (x) => Math.sin(2 * Math.PI * 1000 * x) * Math.min(1, x / .01) * Math.min(1, (dur - x) / .02), .12 * g)
}
function blip(t, f) {
  add(t, .09, (x) => Math.sin(2 * Math.PI * f * x) * Math.exp(-x * 40), .3)
}

// Hook: two hits for the two lines, a heartbeat, then it flatlines
impact(0, .8); impact(.5, 1)
thump(1.0, .8); thump(1.18, .6)
beep(1.3, .7)
add(0, 2, (x) => Math.sin(2 * Math.PI * 41 * x) * Math.min(1, x / .4) * .22)

// Solution: the drop, with the heartbeat spike at 2.2
impact(2.0, 1.2); thump(2.2, 1)
for (let b = 2.0; b < 3.5; b += .5) kick(b)
for (let b = 2.0; b < 3.5; b += .25) hat(b + .125)
snare(2.5); snare(3.0); snare(3.25, .6); snare(3.375, .8)
for (let b = 2.0; b < 3.5; b += .25) bass(b, roots[0] * (b % .5 === 0 ? 1 : 2), .22)
pad(2.0, chords[0], 1.5)

// Demo: cut, tap, a rising blip for each area, the score counts and lands
snare(3.5, .8); kick(3.5)
kick(4.0); kick(4.5)
add(3.9, .03, () => rnd() * .6, .5)
;[0, 1, 2, 3, 4, 5].forEach((i) => blip(4.0 + i * .125, 660 * Math.pow(1.122, i)))
riser(4.75, .5)
impact(5.25, 1.3)
pad(5.25, chords[1], 1.25, 1.2); bass(5.25, roots[1], 1.25, 1.1)
for (let b = 5.5; b < 6.5; b += .25) hat(b + .125)
kick(6.0)

// Features: a snare and kick on each of the five cuts
for (const s of [6.5, 6.875, 7.25, 7.625, 8.0]) { kick(s); snare(s, .9) }
for (let b = 6.5; b < 8.5; b += .125) hat(b, .6)
for (let b = 6.5; b < 8.5; b += .25) bass(b, (b < 7.5 ? roots[2] : roots[3]) * (b % .5 === 0 ? 1 : 2), .22)
pad(6.5, chords[2], 1); pad(7.5, chords[3], 1)

// Outro: the last hit, a held chord, and the heartbeat under the trace
impact(8.5, 1.3)
pad(8.5, [220, 261.6, 329.6, 440], 1.5, 1.4)
bass(8.5, 55, 1.5, .9)
thump(9.2, .9); thump(9.38, .7)

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
