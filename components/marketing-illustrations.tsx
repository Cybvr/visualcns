import type { ReactNode, SVGProps } from "react"

// Wide, short scenes for the to-do cards on the Marketing pages. Same theme
// colors as the home page feature drawings, so they follow light and dark mode.
type Props = SVGProps<SVGSVGElement>

const paper = "fill-background"
const ink = "fill-foreground"
const muted = "fill-muted-foreground"
const blue = "fill-primary"
const soft = "fill-muted"
const warm = "fill-[#f97316]"
const green = "fill-[#10b981]"
const red = "fill-[#ea4335]"
const card = "fill-background stroke-border"

function Scene({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 360 120" aria-hidden="true" fontFamily="inherit" preserveAspectRatio="xMidYMid meet" {...props}>
      {children}
    </svg>
  )
}

function T({ x, y, size = 8, bold, className = ink, anchor, children }: { x: number; y: number; size?: number; bold?: boolean; className?: string; anchor?: "middle" | "end"; children: ReactNode }) {
  return <text x={x} y={y} fontSize={size} fontWeight={bold ? 600 : 400} textAnchor={anchor} className={className}>{children}</text>
}

function Tick({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle className={green} cx={cx} cy={cy} r={r} />
      <path className="fill-none stroke-background" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d={`M${cx - r * 0.4} ${cy}l${r * 0.3} ${r * 0.3} ${r * 0.55} -${r * 0.6}`} />
    </>
  )
}

function Pin({ x, y }: { x: number; y: number }) {
  return (
    <>
      <path className={red} d={`M${x} ${y - 12}a7 7 0 0 1 7 7c0 5-7 12-7 12s-7-7-7-12a7 7 0 0 1 7-7z`} />
      <circle className={paper} cx={x} cy={y - 5} r="2.6" />
    </>
  )
}

function Star({ x, y, r, className }: { x: number; y: number; r: number; className: string }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const radius = i % 2 ? r * 0.45 : r
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`
  })
  return <polygon className={className} points={points.join(" ")} />
}

/** Profile fields ticked off, the business on Google, and a map with pins. */
export function BusinessProfileScene(props: Props) {
  return (
    <Scene {...props}>
      {[18, 42, 66, 90].map((y, i) => (
        <g key={y}>
          <rect className={card} x="16" y={y} width="104" height="18" rx="4" />
          <rect className={soft} x="24" y={y + 7} width={[64, 46, 54, 0][i]} height="4" rx="2" />
          {i < 3 && <Tick cx={110} cy={y + 9} r={5} />}
        </g>
      ))}
      <circle className={card} cx="180" cy="60" r="34" />
      <rect className={blue} x="160" y="46" width="40" height="28" rx="4" />
      <path className={blue} d="M156 48h48l-4-10h-40z" opacity="0.6" />
      <T x={180} y={66} size={14} bold anchor="middle" className={paper}>G</T>
      <path className={soft} d="M238 96l20-44 34 8 20-14 34 40-30 12-24-8-24 10z" />
      <path className="fill-none stroke-border" strokeWidth="1" d="M258 52l10 52M292 60l-6 46M312 46l-14 52" />
      <Pin x={262} y={74} />
      <Pin x={300} y={66} />
      <Pin x={330} y={82} />
    </Scene>
  )
}

/** A social page joining your business, with likes and a comment. */
export function SocialScene(props: Props) {
  return (
    <Scene {...props}>
      <circle className="fill-[#1877f2]" cx="56" cy="60" r="30" />
      <path className={paper} d="M61 46h7v-10h-8c-9 0-12 6-12 13v6h-7v10h7v26h11v-26h8l2-10h-10v-5c0-3 1-4 2-4z" />
      <path className="fill-none stroke-[#10b981]" strokeWidth="2" strokeDasharray="4 4" d="M92 60h50" />
      <path className={green} d="M142 55l8 5-8 5z" />
      <rect className={card} x="160" y="22" width="180" height="76" rx="10" />
      <circle className={blue} cx="178" cy="40" r="8" />
      <T x={192} y={38} size={8} bold>Your business</T>
      <T x={192} y={48} size={6.5} className={muted}>Connected</T>
      <rect className={soft} x="172" y="58" width="156" height="5" rx="2.5" />
      <rect className={soft} x="172" y="68" width="110" height="5" rx="2.5" />
      <T x={172} y={88} size={7} className={muted}>128 likes · 14 comments</T>
      <Tick cx={326} cy={38} r={7} />
    </Scene>
  )
}

/** Web pages with the keywords in place. */
export function SeoScene(props: Props) {
  return (
    <Scene {...props}>
      <rect className={blue} x="16" y="16" width="110" height="80" rx="6" opacity="0.9" />
      {[30, 40, 50, 60].map((y) => <rect key={y} className={paper} x="26" y={y} width={y === 30 ? 60 : 84} height="4" rx="2" opacity="0.8" />)}
      <rect className={paper} x="26" y="74" width="34" height="12" rx="3" />
      <rect className={card} x="80" y="40" width="96" height="66" rx="6" />
      <rect className={soft} x="88" y="48" width="80" height="26" rx="3" />
      <rect className={blue} x="88" y="82" width="50" height="4" rx="2" />
      <rect className={soft} x="88" y="92" width="70" height="4" rx="2" />
      <rect className={card} x="198" y="22" width="146" height="76" rx="8" />
      <T x={210} y={40} size={8} bold>Google</T>
      <rect className={soft} x="210" y="46" width="122" height="12" rx="6" />
      <T x={218} y={55} size={6.5} className={muted}>your keyword</T>
      <T x={210} y={72} size={7.5} bold className={blue}>Your business · #1</T>
      <rect className={soft} x="210" y="80" width="100" height="4" rx="2" />
      <rect className={soft} x="210" y="88" width="76" height="4" rx="2" />
    </Scene>
  )
}

/** A traffic chart rising, for Google Analytics. */
export function AnalyticsScene(props: Props) {
  const bars = [26, 34, 30, 44, 52, 66]
  return (
    <Scene {...props}>
      <rect className={card} x="16" y="14" width="200" height="92" rx="10" />
      <T x={28} y={32} size={8} bold>Visitors</T>
      <T x={28} y={48} size={14} bold>2,481</T>
      {bars.map((h, i) => <rect key={i} className={blue} opacity={0.35 + i * 0.12} x={110 + i * 16} y={96 - h} width="10" height={h} rx="3" />)}
      <rect className={card} x="232" y="26" width="112" height="70" rx="10" />
      <T x={244} y={44} size={8} bold>Top sources</T>
      {[["Google", 62], ["Instagram", 40], ["Direct", 26]].map(([label, w], i) => (
        <g key={String(label)}>
          <T x={244} y={60 + i * 13} size={6.5} className={muted}>{label}</T>
          <rect className={green} x="290" y={55 + i * 13} width={Number(w) * 0.7} height="5" rx="2.5" />
        </g>
      ))}
    </Scene>
  )
}

/** An ad on Google turning into a lead. */
export function AdsScene(props: Props) {
  return (
    <Scene {...props}>
      <rect className={card} x="16" y="20" width="170" height="80" rx="10" />
      <rect className={warm} x="28" y="32" width="22" height="12" rx="3" />
      <T x={39} y={41} size={6.5} bold anchor="middle" className="fill-white">Ad</T>
      <T x={56} y={41} size={8} bold>Your business</T>
      <rect className={soft} x="28" y="52" width="140" height="5" rx="2.5" />
      <rect className={soft} x="28" y="62" width="110" height="5" rx="2.5" />
      <rect className={blue} x="28" y="76" width="60" height="14" rx="7" />
      <T x={58} y={85.5} size={6.5} bold anchor="middle" className={paper}>Call now</T>
      <path className="fill-none stroke-primary" strokeWidth="2" strokeDasharray="4 4" d="M196 60h40" />
      <path className={blue} d="M236 55l8 5-8 5z" />
      <rect className={card} x="254" y="30" width="90" height="60" rx="10" />
      <T x={299} y={52} size={7} anchor="middle" className={muted}>New leads</T>
      <T x={299} y={72} size={18} bold anchor="middle">+12</T>
    </Scene>
  )
}

/** Stars and a review with a reply. */
export function ReviewsScene(props: Props) {
  return (
    <Scene {...props}>
      <rect className={card} x="16" y="20" width="120" height="80" rx="10" />
      <T x={76} y={54} size={24} bold anchor="middle">4.8</T>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} x={48 + i * 14} y={70} r={5.5} className={i < 4 ? warm : soft} />)}
      <T x={76} y={88} size={6.5} anchor="middle" className={muted}>126 reviews</T>
      <rect className={card} x="150" y="16" width="194" height="40" rx="10" />
      <circle className={blue} cx="166" cy="32" r="7" />
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} x={182 + i * 9} y={28} r={3.5} className={warm} />)}
      <rect className={soft} x="178" y="36" width="140" height="4" rx="2" />
      <rect className={soft} x="178" y="44" width="96" height="4" rx="2" />
      <rect className="fill-background stroke-primary" strokeWidth="1.2" x="190" y="64" width="154" height="36" rx="10" />
      <T x={202} y={80} size={7} bold className={blue}>Your reply</T>
      <rect className={soft} x="202" y="86" width="120" height="4" rx="2" />
    </Scene>
  )
}

/** A list of fixes with the first ones ticked, for the scan's to-dos. */
export function TasksScene(props: Props) {
  return (
    <Scene {...props}>
      <rect className={card} x="80" y="12" width="200" height="96" rx="10" />
      {[28, 50, 72, 94].map((y, i) => (
        <g key={y}>
          {i < 2 ? <Tick cx={98} cy={y} r={6} /> : <circle className="fill-none stroke-border" strokeWidth="1.5" cx="98" cy={y} r="5.5" />}
          <rect className={soft} x="112" y={y - 3} width={[120, 96, 140, 80][i]} height="6" rx="3" />
        </g>
      ))}
      <circle className={blue} cx="300" cy="28" r="12" opacity="0.15" />
      <circle className={warm} cx="58" cy="94" r="8" opacity="0.2" />
    </Scene>
  )
}
