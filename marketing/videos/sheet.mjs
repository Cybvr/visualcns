// Renders check frames for a folder and tiles them into one contact sheet: node sheet.mjs <folder> 1.2 3.4 ...
import ffmpeg from "ffmpeg-static"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const here = path.dirname(fileURLToPath(import.meta.url))
const [name, ...times] = process.argv.slice(2)
execFileSync(process.execPath, [path.join(here, "render.mjs"), name, "--stills", ...times], { stdio: "inherit" })
const inputs = times.flatMap((t) => ["-i", path.join(here, name, `still-${Number(t)}.jpg`)])
const layout = times.map((_, i) => `${(i % 4) * 1080}_${Math.floor(i / 4) * 1920}`).join("|")
const labels = times.map((_, i) => `[${i}]`).join("")
execFileSync(ffmpeg, ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${labels}xstack=inputs=${times.length}:layout=${layout},scale=1440:-1`, path.join(here, name, "still-sheet.jpg")])
