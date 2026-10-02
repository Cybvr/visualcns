// Renders a video folder's index.html to MP4, frame by frame, in headless Chrome.
//
//   node render.mjs business-health ../../public/marketing/business-health-9x16.mp4
//   node render.mjs business-health --stills 1.5 4.3 9.8
//
// A page exposes window.render(t) that lays out every element for time t in seconds.
// If the folder has a music.mjs, it is run first and its music.wav is mixed in.
import puppeteer from "puppeteer-core"
import ffmpeg from "ffmpeg-static"
import { spawn, execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { pathToFileURL, fileURLToPath } from "node:url"
import path from "node:path"

const FPS = 30
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe"

const [name, ...rest] = process.argv.slice(2)
if (!name) throw new Error("Usage: node render.mjs <folder> <out.mp4> | --stills <t...>")
const folder = path.join(path.dirname(fileURLToPath(import.meta.url)), name)
const stills = rest[0] === "--stills" ? rest.slice(1).map(Number) : null
const out = stills ? null : path.resolve(rest[0] || `${name}.mp4`)

const music = path.join(folder, "music.mjs")
const wav = path.join(folder, "music.wav")
if (!stills && existsSync(music)) execFileSync(process.execPath, [music], { stdio: "inherit" })

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files", ...(process.getuid?.() === 0 ? ["--no-sandbox"] : [])] })
const page = await browser.newPage()
await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 })
await page.goto(pathToFileURL(path.join(folder, "index.html")).href, { waitUntil: "networkidle0" })
await page.evaluate(() => document.fonts.ready)
// A page can set window.DURATION (seconds); 10 is the default.
const DURATION = await page.evaluate(() => window.DURATION || 10)
// A still (a poster) can set window.SIZE = [width, height] instead of the 9:16 frame.
const size = await page.evaluate(() => window.SIZE)
if (size) await page.setViewport({ width: size[0], height: size[1], deviceScaleFactor: 1 })

if (stills) {
  for (const t of stills) {
    await page.evaluate((t) => window.render(t), t)
    await page.screenshot({ path: path.join(folder, `still-${t}.jpg`), type: "jpeg", quality: 80 })
  }
} else {
  const audio = !stills && existsSync(music) ? ["-i", wav, "-c:a", "aac", "-b:a", "192k", "-shortest"] : []
  const enc = spawn(ffmpeg, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-", ...audio, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "16", "-preset", "slow", "-movflags", "+faststart", out], { stdio: ["pipe", "inherit", "inherit"] })
  for (let f = 0; f < FPS * DURATION; f++) {
    await page.evaluate((t) => window.render(t), f / FPS)
    const buf = await page.screenshot({ type: "jpeg", quality: 95 })
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once("drain", r))
  }
  enc.stdin.end()
  await new Promise((r) => enc.on("close", r))
}
await browser.close()
