// Draws the Visual social ads as 1080x1350 SVGs (and PNGs when Chrome is installed).
// Run from the repo root: node marketing/ads/make-ads.mjs
import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const OUT = dirname(fileURLToPath(import.meta.url))
const ROOT = join(OUT, "..", "..")
const W = 1080
const H = 1350
const BLUE = "#0E32FC"
const INK = "#0b0b0f"
const LINE = "#3b2fd9"

// The logo: the blue mark from public/logoblue.svg with the wordmark in ink.
const logoPaths = readFileSync(join(ROOT, "public", "logoblue.svg"), "utf8").match(/<path [^>]*\/>/g).join("")
function logo(x, y, height, wordmark = INK) {
  const width = (521 / 141) * height
  return `<svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="0 0 521 141">${logoPaths.replaceAll('fill="white"', `fill="${wordmark}"`)}</svg>`
}

const esc = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")

/** Lines of text. anchor: start | middle | end. */
function text(x, y, lines, { size, weight = 800, fill = INK, anchor = "start", lead = 1.05, spacing = -0.02 }) {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * size * lead}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" letter-spacing="${spacing}em">${esc(line)}</text>`).join("")
}

function pill(x, y, label, { w, h = 64, size = 28 } = {}) {
  const width = w ?? label.length * size * 0.55 + 64
  return `<g><rect x="${x}" y="${y}" width="${width}" height="${h}" rx="${h / 2}" fill="${BLUE}"/><text x="${x + width / 2}" y="${y + h / 2 + size * 0.36}" font-size="${size}" font-weight="500" fill="white" text-anchor="middle">${esc(label)}</text></g>`
}

/** A white rounded tile with the brand's thin violet outline, holding a drawing scaled to fit. */
function tile(x, y, size, drawing) {
  return `<g><rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${size * 0.16}" fill="white" stroke="${LINE}" stroke-width="2.5"/><g transform="translate(${x} ${y}) scale(${size / 200})">${drawing}</g></g>`
}

// ---------- Object drawings, each in a 200x200 box ----------

const cart = `
  <g>
    <rect x="58" y="44" width="22" height="64" rx="3" fill="#ec4899"/><rect x="82" y="36" width="24" height="72" rx="3" fill="#a78bfa"/>
    <rect x="108" y="48" width="20" height="60" rx="3" fill="#facc15"/><rect x="130" y="40" width="24" height="68" rx="3" fill="#22d3ee"/>
    <rect x="66" y="56" width="18" height="52" rx="3" fill="#f472b6" opacity="0.8"/>
    <path d="M58 40 Q 70 26 80 40 M82 32 Q 94 18 106 32 M130 36 Q 142 22 154 36" stroke="#111" stroke-width="2" fill="none"/>
    <path d="M30 60 L48 60 L62 128 L160 128 L170 70" stroke="#9ca3af" stroke-width="5" fill="none" stroke-linejoin="round"/>
    <path d="M52 76 L166 76 M56 94 L162 94 M60 112 L158 112" stroke="#9ca3af" stroke-width="2.5"/>
    <path d="M80 76 L84 128 M104 76 L106 128 M128 76 L128 128 M150 76 L146 128" stroke="#9ca3af" stroke-width="2.5"/>
    <path d="M62 128 L54 150 L158 150" stroke="#9ca3af" stroke-width="5" fill="none"/>
    <rect x="70" y="136" width="70" height="10" rx="2" fill="#111"/>
    <circle cx="66" cy="164" r="9" fill="#111"/><circle cx="148" cy="164" r="9" fill="#111"/>
  </g>`

const bulb = `
  <defs><radialGradient id="glow" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#fff7c2"/><stop offset="0.45" stop-color="#fde68a"/><stop offset="1" stop-color="#f59e0b" stop-opacity="0"/></radialGradient></defs>
  <circle cx="100" cy="82" r="78" fill="url(#glow)"/>
  <path d="M100 30 C 66 30 50 56 52 80 C 54 102 72 112 76 132 L124 132 C 128 112 146 102 148 80 C 150 56 134 30 100 30 Z" fill="#fff8d6" stroke="#f5d570" stroke-width="2"/>
  <path d="M86 132 L90 100 Q 100 90 110 100 L114 132" stroke="#f59e0b" stroke-width="2.5" fill="none"/>
  <rect x="76" y="132" width="48" height="12" rx="3" fill="#d1d5db"/><rect x="78" y="146" width="44" height="10" rx="3" fill="#9ca3af"/>
  <rect x="80" y="158" width="40" height="10" rx="3" fill="#d1d5db"/><path d="M88 170 L112 170 L104 182 L96 182 Z" fill="#6b7280"/>`

const laptop = `
  <rect x="34" y="52" width="132" height="84" rx="6" fill="#d4d4d8"/>
  <rect x="40" y="57" width="120" height="74" rx="3" fill="#0a0a0a"/>
  <path d="M40 57 L100 57 L70 131 L40 131 Z" fill="#ffffff" opacity="0.06"/>
  <path d="M18 138 L182 138 L172 152 L28 152 Z" fill="#e4e4e7"/><rect x="86" y="138" width="28" height="4" rx="2" fill="#a1a1aa"/>`

const phone = `
  <rect x="62" y="20" width="76" height="160" rx="16" fill="#7f1d1d"/>
  <rect x="67" y="26" width="66" height="148" rx="12" fill="url(#phone-screen)"/>
  <defs><linearGradient id="phone-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fed7aa"/><stop offset="1" stop-color="#f97316"/></linearGradient></defs>
  <text x="76" y="62" font-size="26" font-weight="700" fill="#1f2937">02</text><text x="76" y="88" font-size="26" font-weight="700" fill="#1f2937">43</text>
  <rect x="74" y="98" width="52" height="22" rx="6" fill="#ffffff" opacity="0.75"/>
  <circle cx="80" cy="150" r="6" fill="#111"/><circle cx="96" cy="150" r="6" fill="#111"/><circle cx="112" cy="150" r="6" fill="#111"/>
  <rect x="88" y="30" width="24" height="6" rx="3" fill="#111"/>`

const envelope = `
  <defs><linearGradient id="env" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#a5b4fc"/></linearGradient></defs>
  <rect x="28" y="62" width="130" height="92" rx="12" fill="url(#env)"/>
  <path d="M30 70 L93 116 L156 70" stroke="#ffffff" stroke-width="5" fill="none" stroke-linejoin="round"/>
  <path d="M30 150 L80 108 M156 150 L106 108" stroke="#ffffff" stroke-width="3" opacity="0.7"/>
  <circle cx="156" cy="62" r="24" fill="#a78bfa"/><text x="156" y="72" font-size="28" font-weight="700" fill="white" text-anchor="middle">1</text>`

// ---------- Shared frame ----------

function svg(body, { background = "#ffffff", defs = "" } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><style>@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;800;900&amp;display=swap'); text { font-family: Inter, Arial, Helvetica, sans-serif; }</style>${defs}</defs>
<rect width="${W}" height="${H}" fill="${background}"/>
${body}
</svg>`
}

function domain(y = 118) {
  return `<text x="${W - 80}" y="${y}" font-size="26" font-weight="800" fill="${LINE}" text-anchor="end" letter-spacing="0.02em">VISUALCNS.COM</text>`
}

/** A tablet in landscape with a screen drawn by `screen(x, y, w, h)`. */
function tablet(x, y, w, h, screen, frame = "#141414") {
  const pad = 22
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="44" fill="${frame}"/><rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h - 8}" rx="40" fill="none" stroke="#3f3f46" stroke-width="2"/>
  <clipPath id="screen-${x}"><rect x="${x + pad}" y="${y + pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="22"/></clipPath>
  <g clip-path="url(#screen-${x})">${screen(x + pad, y + pad, w - pad * 2, h - pad * 2)}</g></g>`
}

// ---------- The ads ----------

function toTheMoon() {
  const defs = `
    <filter id="paper"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.09 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <linearGradient id="tank" x1="0" x2="1"><stop offset="0" stop-color="#b8571f"/><stop offset="0.45" stop-color="#f1a066"/><stop offset="1" stop-color="#a64b17"/></linearGradient>
    <linearGradient id="booster" x1="0" x2="1"><stop offset="0" stop-color="#bdb8b0"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="1" stop-color="#a8a39b"/></linearGradient>
    <linearGradient id="orbiter" x1="0" x2="1"><stop offset="0" stop-color="#d6d2cb"/><stop offset="0.5" stop-color="#ffffff"/><stop offset="1" stop-color="#c9c4bc"/></linearGradient>
    <radialGradient id="flame" cx="50%" cy="100%" r="70%"><stop offset="0" stop-color="#fffbe8"/><stop offset="0.35" stop-color="#fdba74"/><stop offset="1" stop-color="#f97316" stop-opacity="0"/></radialGradient>
    <linearGradient id="warm" x1="0" x2="1"><stop offset="0.45" stop-color="#f97316" stop-opacity="0"/><stop offset="1" stop-color="#fb923c" stop-opacity="0.28"/></linearGradient>`
  const rocket = `
    <g transform="translate(560 0)">
      <rect x="150" y="60" width="210" height="1080" fill="url(#tank)"/><path d="M150 60 Q 255 -150 360 60 Z" fill="url(#tank)"/>
      <rect x="40" y="250" width="110" height="900" fill="url(#booster)"/><path d="M40 250 Q 95 90 150 250 Z" fill="url(#booster)"/>
      <rect x="360" y="250" width="110" height="900" fill="url(#booster)"/><path d="M360 250 Q 415 90 470 250 Z" fill="url(#booster)"/>
      <path d="M40 330 h110 M360 330 h110 M40 900 h110 M360 900 h110" stroke="#8f8a82" stroke-width="3"/>
      <path d="M190 560 Q 255 420 320 560 L 336 1040 L 420 1180 L 90 1180 L 174 1040 Z" fill="url(#orbiter)"/>
      <path d="M220 520 Q 255 470 290 520 Z" fill="#1c1c1c"/>
      <path d="M232 575 h46 l-6 14 h-34 z" fill="#2b2b2b"/>
      <path d="M90 1180 L 174 1040 L 180 1180 Z M420 1180 L 336 1040 L 330 1180 Z" fill="#c2bdb5"/>
      <ellipse cx="255" cy="1330" rx="380" ry="230" fill="url(#flame)"/>
    </g>`
  return svg(`
    <rect width="${W}" height="${H}" fill="#e7e5e0"/>
    ${rocket}
    <rect width="${W}" height="${H}" fill="url(#warm)"/>
    <rect width="${W}" height="${H}" filter="url(#paper)"/>
    ${logo(80, 330, 76)}
    ${text(80, 650, ["TO THE"], { size: 168, weight: 900, fill: BLUE })}
    ${text(80, 820, ["MOON"], { size: 168, weight: 900 })}
    ${text(80, 1040, ["Boost your business with", "us. Build audience", "engagement, and drive", "website traffic."], { size: 38, weight: 700, fill: BLUE, lead: 1.18, spacing: 0 })}
  `, { background: "#e7e5e0", defs })
}

function smallIdeas() {
  const words = [["Cutting-Edge", "Data-driven", "Strategic"], ["Customer-driven", "Creative", "On point"]]
  const pills = words.map((row, r) => {
    let x = 90
    return row.map((label) => {
      const w = label.length * 16 + 70
      const out = pill(x, 1110 + r * 92, label, { w, h: 70, size: 30 })
      x += w + 22
      return out
    }).join("")
  }).join("")
  return svg(`
    ${logo(90, 70, 70)}
    ${tile(120, 190, 230, cart)}${tile(425, 190, 230, bulb)}${tile(730, 190, 230, laptop)}
    <path d="M130 600 H 460" stroke="${LINE}" stroke-width="4"/><path d="M445 588 L 462 600 L 445 612" stroke="${LINE}" stroke-width="4" fill="none"/>
    ${text(990, 640, ["GREAT", "BUSINESSES", "START FROM", "SMALL IDEAS"], { size: 120, weight: 900, anchor: "end", lead: 0.98 })}
    ${pills}
  `)
}

function partner() {
  return svg(`
    ${tile(30, 40, 230, cart)}${tile(820, 40, 230, phone)}${tile(30, 1060, 230, bulb)}${tile(820, 1060, 230, laptop)}
    ${logo(330, 380, 82)}
    ${text(W / 2, 640, ["PARTNER", "WITH US"], { size: 150, weight: 900, fill: BLUE, anchor: "middle", lead: 1 })}
    ${text(W / 2, 880, ["take your business to the", "next level!"], { size: 46, weight: 700, anchor: "middle", lead: 1.2, spacing: 0 })}
    ${pill(W / 2 - 170, 1000, "Send us a DM!", { w: 340, h: 76, size: 34 })}
    <text x="${W / 2}" y="1310" font-size="24" font-weight="800" fill="${LINE}" text-anchor="middle" letter-spacing="0.02em">VISUALCNS.COM</text>
  `)
}

/** A light dashboard panel: a header, rows and sometimes a small chart. */
function panel(x, y, w, h, kind, accent) {
  const header = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="#fbfaf3"/><rect x="${x + 14}" y="${y + 14}" width="${w * 0.4}" height="10" rx="5" fill="${accent}"/>`
  const rows = Array.from({ length: Math.floor((h - 50) / 26) }, (_, index) => `<rect x="${x + 14}" y="${y + 44 + index * 26}" width="${w - 28 - (index % 3) * 30}" height="8" rx="4" fill="#e7e3d4"/>`).join("")
  if (kind === "person") {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="url(#portrait-${accent.slice(1)})"/><circle cx="${x + w / 2}" cy="${y + h * 0.42}" r="${Math.min(w, h) * 0.17}" fill="#7c4a2d"/><path d="M${x + w * 0.2} ${y + h} Q ${x + w / 2} ${y + h * 0.55} ${x + w * 0.8} ${y + h} Z" fill="${accent}"/>`
  }
  if (kind === "chart") {
    return `${header}<polyline points="${[0, 0.7, 0.55, 0.62, 0.4, 0.45, 0.2].map((v, i) => `${x + 14 + i * ((w - 28) / 6)},${y + 50 + v * (h - 70)}`).join(" ")}" fill="none" stroke="${accent}" stroke-width="3"/>`
  }
  if (kind === "stat") {
    return `${header}<text x="${x + 14}" y="${y + 70}" font-size="30" font-weight="800" fill="#1f2937">$8.34</text><rect x="${x + 14}" y="${y + 90}" width="${w - 28}" height="${h - 110}" rx="8" fill="${accent}" opacity="0.9"/>`
  }
  return header + rows
}

function interfaces() {
  const teal = "#1f5c55"
  const defs = ["1f5c55", "c2410c"].map((c) => `<linearGradient id="portrait-${c}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9e4d8"/><stop offset="1" stop-color="#cfc6b3"/></linearGradient>`).join("")
  const screen = (x, y, w, h) => {
    const cols = 3, gap = 12, cw = (w - gap * (cols + 1)) / cols, rh = (h - gap * 4) / 3
    const kinds = [["list", "person", "chart"], ["list", "person", "stat"], ["person", "list", "list"]]
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#efeadb"/>` + kinds.map((row, r) => row.map((kind, c) => panel(x + gap + c * (cw + gap), y + gap + r * (rh + gap), cw, rh, kind, kind === "person" && (r + c) % 2 ? "#c2410c" : teal)).join("")).join("")
  }
  return svg(`
    ${logo(80, 70, 70)}${domain()}
    ${text(80, 330, ["HIGH"], { size: 110, weight: 900 })}
    ${text(80, 445, ["CONVERTING", "INTERFACES"], { size: 110, weight: 900, fill: BLUE, lead: 1.02 })}
    ${text(80, 640, ["Expertly crafted, high-converting user experiences", "for websites, web apps, and mobile, with deep", "analytics for informed decisions, enhancing", "campaigns and success."], { size: 32, weight: 500, lead: 1.4, spacing: 0 })}
    ${tablet(100, 830, 880, 640, screen)}
  `, { defs })
}

function email() {
  return svg(`
    ${logo(80, 70, 70)}${domain()}
    ${text(80, 330, ["EMAIL", "MARKETING"], { size: 110, weight: 900, fill: BLUE, lead: 1.02 })}
    ${text(80, 555, ["EXCELLENCE:"], { size: 110, weight: 900 })}
    ${text(80, 660, ["Our email campaigns are meticulously designed to", "engage potential leads and foster customer loyalty.", "By leveraging our email marketing strategy, you can", "effectively increase your brand's visibility and drive", "repeat business."], { size: 30, weight: 500, lead: 1.42, spacing: 0 })}
    ${tile(90, 920, 200, envelope)}${tile(400, 880, 290, envelope)}${tile(210, 1180, 140, envelope)}${tile(760, 1110, 200, envelope)}
  `)
}

/** One social post tile on the blue tablet screen. */
function post(x, y, w, h, look) {
  const backgrounds = {
    mint: "url(#post-mint)", sky: "url(#post-sky)", cyan: "url(#post-cyan)", blue: "#1d4ed8", navy: "#1e2a78", pale: "#e0f2fe",
  }
  const dark = look.bg === "pale"
  const ink = dark ? "#1e3a8a" : "#ffffff"
  let art = ""
  if (look.art === "ring") art = `<circle cx="${x + w * 0.7}" cy="${y + h * 0.72}" r="${w * 0.16}" fill="none" stroke="#0f172a" stroke-width="${w * 0.08}"/>`
  if (look.art === "cube") art = `<rect x="${x + w * 0.62}" y="${y + h * 0.6}" width="${w * 0.24}" height="${w * 0.24}" rx="10" fill="#f9a8d4" transform="rotate(-12 ${x + w * 0.74} ${y + h * 0.72})"/>`
  if (look.art === "orb") art = `<circle cx="${x + w * 0.74}" cy="${y + h * 0.74}" r="${w * 0.13}" fill="#a3e635"/>`
  if (look.art === "stripes") art = Array.from({ length: 4 }, (_, i) => `<path d="M${x} ${y + h * (0.62 + i * 0.09)} q ${w * 0.25} -${h * 0.06} ${w * 0.5} 0 t ${w * 0.5} 0" stroke="#60a5fa" stroke-width="6" fill="none"/>`).join("")
  if (look.art === "chevrons") art = `<path d="M${x + w * 0.45} ${y + h} L ${x + w * 0.8} ${y + h * 0.62} L ${x + w} ${y + h * 0.62} L ${x + w * 0.66} ${y + h} Z" fill="#3b5bdb"/>`
  const lines = look.title.map((line, i) => `<text x="${x + 18}" y="${y + 70 + i * 26}" font-size="22" font-weight="600" fill="${ink}">${esc(line)}</text>`).join("")
  const checks = look.checks ? look.checks.map((line, i) => `<rect x="${x + 18}" y="${y + 40 + i * 34}" width="18" height="18" rx="3" fill="none" stroke="#bfdbfe" stroke-width="2"/><text x="${x + 46}" y="${y + 55 + i * 34}" font-size="20" font-weight="600" fill="#bfdbfe">${esc(line)}</text>`).join("") : ""
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${backgrounds[look.bg]}"/>${art}<text x="${x + 18}" y="${y + 30}" font-size="13" font-weight="700" fill="${ink}" opacity="0.85">VISUAL</text>${lines}${checks}${look.button ? `<rect x="${x + 18}" y="${y + 70 + look.title.length * 26}" width="96" height="24" rx="12" fill="${dark ? "#1e3a8a" : "#0f172a"}"/>` : ""}</g>`
}

function social() {
  const defs = `
    <linearGradient id="post-mint" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bbf7d0"/><stop offset="1" stop-color="#2563eb"/></linearGradient>
    <linearGradient id="post-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1e40af"/></linearGradient>
    <linearGradient id="post-cyan" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22d3ee"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient>`
  const looks = [
    { bg: "mint", title: ["Reach the right", "audience"], art: "ring", button: true },
    { bg: "sky", title: ["Turn clicks into", "customers"], art: "cube", button: true },
    { bg: "cyan", title: ["Grow with", "every post"], art: "orb", button: true },
    { bg: "blue", title: [], checks: ["Speed", "Efficiency", "Performance"], art: "stripes" },
    { bg: "navy", title: ["Relax while we", "run your ads"], art: "chevrons" },
    { bg: "pale", title: ["Content that", "converts"], art: "stripes" },
  ]
  const screen = (x, y, w, h) => {
    const gap = 16, cw = (w - gap * 4) / 3, rh = (h - gap * 3) / 2
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#1f3bdb"/>` + looks.map((look, i) => post(x + gap + (i % 3) * (cw + gap), y + gap + Math.floor(i / 3) * (rh + gap), cw, rh, look)).join("")
  }
  return svg(`
    ${logo(80, 70, 70)}${domain()}
    ${text(80, 330, ["ENGAGING"], { size: 104, weight: 900 })}
    ${text(80, 440, ["SOCIAL MEDIA", "CAMPAIGNS"], { size: 104, weight: 900, fill: BLUE, lead: 1.02 })}
    ${text(80, 640, ["Stand out from the competition with captivating", "social media campaigns that not only drive traffic", "but also build a strong community of loyal", "customers."], { size: 32, weight: 500, lead: 1.4, spacing: 0 })}
    ${tablet(100, 830, 880, 640, screen)}
  `, { defs })
}

const ADS = {
  "01-to-the-moon": toTheMoon,
  "02-small-ideas": smallIdeas,
  "03-partner-with-us": partner,
  "04-high-converting-interfaces": interfaces,
  "05-email-marketing": email,
  "06-social-media-campaigns": social,
}

const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find((path) => existsSync(path))

for (const [name, draw] of Object.entries(ADS)) {
  const file = join(OUT, `${name}.svg`)
  writeFileSync(file, draw())
  if (chrome) {
    execFileSync(chrome, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${W},${H}`, "--virtual-time-budget=6000", `--screenshot=${join(OUT, `${name}.png`)}`, `file:///${file.replaceAll("\\", "/")}`], { stdio: "ignore" })
  }
  console.log(name)
}
