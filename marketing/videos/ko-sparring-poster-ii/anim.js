// The fight bill prints itself like a press run: each block is pressed on with a thud,
// the gold SERIES gets its black shadow on a second pass, the fighter prints line by line.
// render(10) is the finished poster.
window.SIZE = [1080, 1920]
window.DURATION = 10

const $ = id => document.getElementById(id)
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const p = (t, a, b) => cl((t - a) / (b - a))
const outExpo = x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
const lerp = (a, b, x) => a + (b - a) * x
const fit = (el, w) => { el.style.fontSize = '100px'; el.style.fontSize = (100 * w / el.offsetWidth) + 'px' }

// Every press, in order: element, when it lands
const PRESSES = [
  ['bThe', .5], ['tSpar', .75], ['bSer', 1.25], ['bLogo', 2.6], ['bR1', 2.75], ['bR2', 3.0],
  ['bTen', 3.5], ['bFotn', 4.25], ['tDate', 5.0],
]
const HITS = PRESSES.map(([, at]) => at).concat([5.75, 6.0, 6.25])

const show = (el, on) => { el.style.visibility = on ? 'visible' : 'hidden' }
// A press: lands a little big and heavy with ink, then settles
function press(el, t, at, base) {
  show(el, t >= at)
  const x = outExpo(p(t, at, at + .1))
  el.style.transform = `${base} scale(${lerp(1.12, 1, x)})`
  el.style.filter = t >= at && t < at + .1 ? 'contrast(1.6) brightness(.7)' : 'none'
}
const wipe = (el, t, a, b) => { el.style.clipPath = `inset(0 ${100 - outExpo(p(t, a, b)) * 100}% 0 0)` }
const draw = (el, t, a, b) => { show(el, t >= a); el.style.transformOrigin = '0 0'; el.style.transform = `scaleX(${outExpo(p(t, a, b))})` }

let ready = false, bases
window.render = (t) => {
  if (!ready) {
    fit($('tSpar'), 980); fit($('tSer'), 760); fit($('tDate'), 600)
    $('tSpar').style.display = $('tSer').style.display = 'inline-block'
    bases = Object.fromEntries(PRESSES.map(([id]) => [id, getComputedStyle($(id)).transform === 'none' ? '' : $(id).style.transform]))
    ready = true
  }

  // The paper slides up into place and settles; the press jolts it on each hit
  let jolt = 0
  for (const at of HITS) { const k = 1 - (t - at) / .12; if (t >= at && k > 0) jolt = Math.max(jolt, k) }
  document.body.style.transform = `translateY(${lerp(140, 0, outExpo(p(t, 0, .4))) + jolt * 6}px)`

  // Top band
  $('bTop').style.transform = `translateY(${lerp(-100, 0, outExpo(p(t, .1, .3)))}px)`
  wipe($('bPres'), t, .25, .6); wipe($('bDub'), t, .3, .65)

  for (const [id, at] of PRESSES) press($(id), t, at, bases[id])
  // SERIES: gold first, the black shadow lands on a second pass
  $('bSer').style.textShadow = t >= 1.4 ? `${lerp(16, 7, outExpo(p(t, 1.4, 1.5)))}px 7px 0 var(--ink)` : 'none'

  // The fighter prints from the top down, frame first
  show($('bArch'), t >= 1.75)
  $('bArch').style.clipPath = `inset(0 0 ${100 - p(t, 1.75, 2.55) * 100}% 0)`

  // Rules draw across, the box draws, the small type wipes on
  draw($('bRu1'), t, 3.25, 3.5); draw($('bRu2'), t, 3.75, 4.0)
  show($('bBox'), t >= 4.0); $('bBox').style.clipPath = `inset(0 ${100 - outExpo(p(t, 4.0, 4.25)) * 100}% 0 0)`
  wipe($('bWins'), t, 4.5, 4.95)
  wipe($('bWeigh'), t, 5.25, 5.6)
  draw($('bRu3'), t, 5.5, 5.75)
  ;[...$('bInc').children].forEach((el, i) => press(el, t, 5.75 + i * .25, ''))

  // Bottom band rises, then the address and the link
  $('bBot').style.transform = `translateY(${lerp(100, 0, outExpo(p(t, 6.5, 6.7)))}px)`
  wipe($('bLoc'), t, 6.75, 7.1); wipe($('bReg'), t, 7.0, 7.35)
}
