// The poster builds itself on the beat (120 BPM), then holds. render(10) is the finished poster.
window.SIZE = [1080, 1920]
window.DURATION = 10

const $ = id => document.getElementById(id)
const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v))
const p = (t, a, b) => cl((t - a) / (b - a))
const outExpo = x => x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
const outBack = x => { const c = 1.8; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2) }
const lerp = (a, b, x) => a + (b - a) * x
function fit(el, w) { el.style.fontSize = '100px'; el.style.fontSize = (100 * w / el.offsetWidth) + 'px' }

function show(el, on) { el.style.visibility = on ? 'visible' : 'hidden' }
function slam(el, t, at, from = 1.3, base = '') {
  show(el, t >= at)
  el.style.transform = `${base} scale(${lerp(from, 1, outExpo(p(t, at, at + .12)))})`
}
function wipe(el, t, a, b, dir = 'right') {
  const k = 100 - outExpo(p(t, a, b)) * 100
  el.style.clipPath = dir === 'right' ? `inset(0 ${k}% 0 0)` : `inset(0 0 ${k}% 0)`
}
function shake(t, hits, power = 16) {
  for (const at of hits) {
    const k = 1 - (t - at) / .2
    if (t >= at && k > 0) return `translate(${Math.sin(t * 210) * power * k}px, ${Math.cos(t * 260) * power * k}px)`
  }
  return ''
}

let ready = false
window.render = (t) => {
  if (!ready) {
    fit($('t1'), 900); fit($('t2'), 720)
    $('t1').style.transformOrigin = $('t2').style.transformOrigin = '0 100%'
    $('aD').style.transformOrigin = '0 50%'
    ready = true
  }

  // The photo drops in from the top and keeps pushing slowly
  $('aPh').style.clipPath = `polygon(0 0, 100% 0, 100% ${78 * outExpo(p(t, 0, .5))}%, 0 ${100 * outExpo(p(t, 0, .5))}%)`
  $('aGr').style.opacity = outExpo(p(t, 0, .5))
  $('aPh').querySelector('.ph').style.transform = `scale(${lerp(1.22, 1.04, p(t, 0, 10))})`
  wipe($('aH1'), t, .1, .45); wipe($('aH2'), t, .2, .55)

  // Title
  slam($('t1'), t, .5, 1.25); slam($('t2'), t, 1.0, 1.25)

  // Sticker slaps on, then keeps spinning
  const sx = outBack(p(t, 1.5, 1.75))
  show($('aSt'), t >= 1.5)
  $('aSt').style.transform = `rotate(${lerp(-60, -12, sx)}deg) scale(${lerp(2.2, 1.15, sx)})`
  $('aSpin').style.transform = `rotate(${Math.max(0, t - 1.5) * 40}deg)`

  // Prize band
  show($('aSlab'), t >= 2.0)
  $('aSlab').style.transformOrigin = '0 50%'
  $('aSlab').style.transform = `rotate(-3deg) scaleX(${outExpo(p(t, 2.0, 2.2))})`
  slam($('aW'), t, 2.25, 1.25, 'rotate(-3deg)')
  wipe($('aWm'), t, 2.5, 2.95)

  // Date and times
  slam($('aD'), t, 3.0, 1.3)
  wipe($('aT'), t, 3.25, 3.6, 'down')

  // The list, one item per half beat
  ;[...$('aL').children].forEach((li, i) => {
    const at = 4.0 + i * .25, x = outExpo(p(t, at, at + .2))
    show(li, t >= at)
    li.style.transform = `translateX(${lerp(500, 0, x)}px)`
  })

  // Footer
  show($('aF'), t >= 5.25)
  $('aF').style.transform = `scaleX(${outExpo(p(t, 5.25, 5.6))})`
  wipe($('aA'), t, 5.5, 5.85); wipe($('aR'), t, 5.75, 6.1)
  wipe($('aLg'), t, 6.0, 6.35); wipe($('aTg'), t, 6.1, 6.5)

  // A pulse on the sticker when the beat comes back in at 8s
  if (t >= 8 && t < 8.25) $('aSt').style.transform += ` scale(${lerp(1.12, 1, outExpo(p(t, 8, 8.25)))})`

  document.body.style.transform = shake(t, [.5, 1.0, 1.5, 2.25, 3.0])
}
