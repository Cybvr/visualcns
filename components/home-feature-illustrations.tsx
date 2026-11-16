import type { ReactNode, SVGProps } from "react"

// Detailed scenes for the home page features: small app screens with real
// labels. Same theme colors as home-illustrations, so they follow light and dark mode.
type Props = SVGProps<SVGSVGElement>

const paper = "fill-background"
const ink = "fill-foreground"
const muted = "fill-muted-foreground"
const blue = "fill-primary"
const soft = "fill-muted"
const warm = "fill-[#f97316]"
const green = "fill-[#10b981]"
const card = "fill-background stroke-border"

function Scene({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 220" aria-hidden="true" fontFamily="inherit" {...props}>
      {children}
    </svg>
  )
}

function T({ x, y, size = 8, bold, className = ink, anchor, children }: { x: number; y: number; size?: number; bold?: boolean; className?: string; anchor?: "middle" | "end"; children: ReactNode }) {
  return (
    <text x={x} y={y} fontSize={size} fontWeight={bold ? 600 : 400} textAnchor={anchor} className={className}>
      {children}
    </text>
  )
}

function Sparkle({ x, y, r, className }: { x: number; y: number; r: number; className: string }) {
  const k = r * 0.22
  return <path className={className} d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`} />
}

function Star({ x, y, r, className }: { x: number; y: number; r: number; className: string }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (Math.PI / 5) * i - Math.PI / 2
    const radius = i % 2 ? r * 0.45 : r
    return `${(x + radius * Math.cos(angle)).toFixed(1)},${(y + radius * Math.sin(angle)).toFixed(1)}`
  })
  return <polygon className={className} points={points.join(" ")} />
}

function Tick({ cx, cy, r = 6 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle className={green} cx={cx} cy={cy} r={r} />
      <path className="fill-none stroke-background" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d={`M${cx - r * 0.4} ${cy}l${r * 0.3} ${r * 0.3} ${r * 0.55} -${r * 0.6}`} />
    </>
  )
}

function Badge({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: ReactNode }) {
  return (
    <>
      <rect className={warm} x={x} y={y} width={w} height={h} rx="8" />
      <T x={x + w / 2} y={y + h / 2 + 3} size={8.5} bold anchor="middle" className="fill-white">{children}</T>
    </>
  )
}

function Pill({ x, y, label, tone }: { x: number; y: number; label: string; tone: "warm" | "green" }) {
  const w = label.length * 4.2 + 12
  const color = tone === "warm" ? warm : green
  return (
    <>
      <rect className={color} x={x - w} y={y - 7} width={w} height={14} rx="7" opacity="0.15" />
      <T x={x - w / 2} y={y + 2.5} size={7} bold anchor="middle" className={color}>{label}</T>
    </>
  )
}

export function VisitorScene(props: Props) {
  return (
    <Scene {...props}>
      {/* Sign-in tablet */}
      <rect className={card} x="24" y="14" width="168" height="170" rx="12" />
      <T x={38} y={32} size={7.5} className={muted}>Front desk</T>
      <T x={38} y={47} size={12} bold>Welcome to Acme</T>
      <T x={38} y={66} size={7} className={muted}>Your name</T>
      <rect className={soft} x="38" y="70" width="140" height="20" rx="6" />
      <T x={46} y={83.5} size={8.5}>Ada Okafor</T>
      <T x={38} y={104} size={7} className={muted}>Here to see</T>
      <rect className={soft} x="38" y="108" width="140" height="20" rx="6" />
      <T x={46} y={121.5} size={8.5}>Tunde Bello</T>
      <rect className={blue} x="38" y="138" width="140" height="22" rx="11" />
      <T x={108} y={152} size={8.5} bold anchor="middle" className={paper}>Sign in</T>

      {/* Host email */}
      <rect className={card} x="176" y="26" width="128" height="54" rx="10" />
      <circle className={blue} cx="194" cy="45" r="9" />
      <rect className="fill-none stroke-background" strokeWidth="1.4" x="189" y="41" width="10" height="8" rx="1.5" />
      <path className="fill-none stroke-background" strokeWidth="1.4" strokeLinejoin="round" d="M189.5 41.5l4.5 4 4.5-4" />
      <T x={208} y={43} size={8.5} bold>Ada has arrived</T>
      <T x={208} y={54} size={7} className={muted}>Waiting at reception</T>
      <T x={188} y={71} size={7} className={muted}>09:41 · Email sent to Tunde</T>

      {/* Visitor log */}
      <rect className={card} x="200" y="94" width="104" height="98" rx="10" />
      <T x={212} y={111} size={8.5} bold>Today</T>
      {[
        { name: "Ada O.", time: "09:41", color: warm, y: 130 },
        { name: "Femi A.", time: "10:15", color: green, y: 150 },
        { name: "Kemi B.", time: "11:02", color: blue, y: 170 },
      ].map((row) => (
        <g key={row.name}>
          <circle className={row.color} cx="218" cy={row.y} r="6" />
          <T x={230} y={row.y + 3} size={7.5}>{row.name}</T>
          <T x={294} y={row.y + 3} size={7} anchor="end" className={muted}>{row.time}</T>
        </g>
      ))}

      <Tick cx={182} cy={160} r={9} />
      <Badge x={14} y={176} w={92} h={30}>Free for 30 days</Badge>
    </Scene>
  )
}

export function NgaiScene(props: Props) {
  return (
    <Scene {...props}>
      {/* Chat */}
      <rect className={card} x="20" y="12" width="180" height="196" rx="12" />
      <circle className={blue} cx="38" cy="32" r="10" />
      <Sparkle x={38} y={32} r={5.5} className={paper} />
      <T x={54} y={30} size={9.5} bold>Ngai</T>
      <T x={54} y={41} size={7} className={muted}>AI assistant</T>
      <rect className={soft} x="32" y="50" width="156" height="1" />
      <rect className={soft} x="82" y="60" width="106" height="22" rx="11" />
      <T x={135} y={74} size={7.5} anchor="middle">Write May&apos;s newsletter</T>
      <rect className="fill-background stroke-primary" strokeWidth="1.5" x="32" y="92" width="156" height="64" rx="10" />
      <T x={42} y={108} size={8} bold>Here&apos;s a draft for you:</T>
      <rect className={blue} opacity="0.45" x="42" y="116" width="134" height="5" rx="2.5" />
      <rect className={blue} opacity="0.35" x="42" y="127" width="120" height="5" rx="2.5" />
      <rect className={blue} opacity="0.25" x="42" y="138" width="80" height="5" rx="2.5" />
      <rect className={blue} x="32" y="166" width="72" height="22" rx="11" />
      <T x={68} y={180} size={8} bold anchor="middle" className={paper}>Approve</T>
      <rect className={card} x="110" y="166" width="52" height="22" rx="11" />
      <T x={136} y={180} size={8} bold anchor="middle">Edit</T>

      {/* Plan */}
      <rect className={card} x="184" y="70" width="124" height="104" rx="10" />
      <T x={196} y={88} size={8.5} bold>Plan · 3 steps</T>
      <Tick cx={202} cy={106} />
      <T x={214} y={109} size={7.5}>Draft newsletter</T>
      <Tick cx={202} cy={128} />
      <T x={214} y={131} size={7.5}>Choose audience</T>
      <circle className="fill-none stroke-border" strokeWidth="1.5" cx="202" cy="150" r="5.5" />
      <T x={214} y={153} size={7.5}>Send Friday, 9am</T>

      <Sparkle x={272} y={34} r={13} className={blue} />
      <Sparkle x={296} y={54} r={6} className={warm} />
      <Badge x={220} y={184} w={88} h={26}>On every plan</Badge>
    </Scene>
  )
}

export function PulseScene(props: Props) {
  const circumference = 2 * Math.PI * 32
  return (
    <Scene {...props}>
      {/* Score */}
      <rect className={card} x="16" y="16" width="124" height="128" rx="12" />
      <T x={28} y={34} size={8.5} bold>Brand score</T>
      <circle className="fill-none stroke-muted" strokeWidth="10" cx="78" cy="88" r="32" />
      <circle
        className="fill-none stroke-primary"
        strokeWidth="10"
        strokeLinecap="round"
        cx="78"
        cy="88"
        r="32"
        strokeDasharray={`${circumference * 0.78} ${circumference}`}
        transform="rotate(-90 78 88)"
      />
      <T x={78} y={94} size={20} bold anchor="middle">78</T>
      <T x={78} y={106} size={7} anchor="middle" className={muted}>out of 100</T>

      {/* Channels */}
      <rect className={card} x="130" y="40" width="176" height="140" rx="12" />
      {[62, 92, 122, 152].map((y, i) => i > 0 && <rect key={y} className={soft} x="142" y={y - 15} width="152" height="1" />)}
      <circle className={card} cx="150" cy="62" r="8" />
      <T x={150} y={65} size={9} bold anchor="middle" className={blue}>G</T>
      <T x={164} y={65} size={8} bold>Google</T>
      {[0, 1, 2, 3, 4].map((i) => <Star key={i} x={248 + i * 11} y={61} r={4.5} className={i < 4 ? warm : soft} />)}

      <path className={warm} d="M150 84a6 6 0 0 1 6 6c0 4.5-6 10-6 10s-6-5.5-6-10a6 6 0 0 1 6-6z" />
      <circle className={paper} cx="150" cy="90" r="2.2" />
      <T x={164} y={95} size={8} bold>Maps</T>
      <Pill x={296} y={92} label="Missing hours" tone="warm" />

      <circle className={blue} cx="150" cy="122" r="7" />
      <path className="fill-none stroke-background" strokeWidth="1.2" d="M143 122h14M150 115c-3 4-3 10 0 14M150 115c3 4 3 10 0 14" />
      <T x={164} y={125} size={8} bold>Website</T>
      <Pill x={296} y={122} label="Fast" tone="green" />

      <rect className="fill-none stroke-[#f97316]" strokeWidth="1.8" x="143.5" y="145.5" width="13" height="13" rx="4" />
      <circle className="fill-none stroke-[#f97316]" strokeWidth="1.6" cx="150" cy="152" r="3" />
      <T x={164} y={155} size={8} bold>Instagram</T>
      <Pill x={296} y={152} label="Post more" tone="warm" />

      {/* Fixes */}
      <rect className={card} x="16" y="154" width="118" height="56" rx="10" />
      <T x={28} y={170} size={8.5} bold>Fix first</T>
      <T x={28} y={185} size={7.5}>1  Add opening hours</T>
      <T x={28} y={199} size={7.5}>2  Reply to reviews</T>

      <Badge x={222} y={8} w={84} h={24}>2-min report</Badge>
    </Scene>
  )
}

export function ConsultingScene(props: Props) {
  return (
    <Scene {...props}>
      {/* Website */}
      <rect className={card} x="110" y="36" width="196" height="140" rx="12" />
      <circle className={warm} cx="122" cy="48" r="2.5" />
      <circle className={soft} cx="130" cy="48" r="2.5" />
      <circle className={green} cx="138" cy="48" r="2.5" />
      <rect className={soft} x="150" y="44" width="92" height="8" rx="4" />
      <rect className={blue} x="122" y="58" width="172" height="56" rx="6" />
      <T x={150} y={78} size={11} bold className={paper}>Grow with us</T>
      <rect className={paper} opacity="0.7" x="150" y="85" width="72" height="4" rx="2" />
      <rect className={paper} x="150" y="96" width="46" height="12" rx="6" />
      <T x={173} y={104.5} size={6.5} bold anchor="middle" className={blue}>Shop now</T>
      {[122, 182, 242].map((x) => (
        <g key={x}>
          <rect className={soft} x={x} y="122" width="52" height="44" rx="6" />
          <rect className={paper} x={x + 8} y="152" width="30" height="4" rx="2" />
        </g>
      ))}

      {/* Brand kit */}
      <rect className={card} x="16" y="14" width="122" height="112" rx="12" />
      <T x={28} y={32} size={8.5} bold>Brand kit</T>
      <T x={28} y={72} size={28} bold>Aa</T>
      <T x={78} y={62} size={7.5} bold>Inter</T>
      <T x={78} y={73} size={7} className={muted}>Bold · Regular</T>
      {[ink, blue, warm, green].map((color, i) => <circle key={i} className={color} cx={36 + i * 22} cy="100" r="8" />)}

      {/* Launch plan */}
      <rect className={card} x="24" y="140" width="122" height="70" rx="10" />
      <T x={36} y={156} size={8.5} bold>Launch plan</T>
      {[
        { label: "Mon · Teaser post", color: blue, y: 171 },
        { label: "Wed · Email", color: warm, y: 185 },
        { label: "Fri · Launch day", color: green, y: 199 },
      ].map((row) => (
        <g key={row.label}>
          <circle className={row.color} cx="40" cy={row.y - 2.5} r="3" />
          <T x={48} y={row.y} size={7.5}>{row.label}</T>
        </g>
      ))}

      <Badge x={214} y={186} w={92} h={26}>Idea to launch</Badge>
    </Scene>
  )
}

export function GrowthScene(props: Props) {
  const bars = [34, 46, 40, 58, 66, 84]
  return (
    <Scene {...props}>
      {/* Reach chart */}
      <rect className={card} x="16" y="14" width="176" height="118" rx="12" />
      <T x={28} y={32} size={8.5} bold>Reach this month</T>
      <T x={28} y={52} size={18} bold>12.4k</T>
      <Pill x={180} y={28} label="+32%" tone="green" />
      {bars.map((h, i) => (
        <rect key={i} className={blue} opacity={0.35 + i * 0.13} x={34 + i * 26} y={122 - h * 0.7} width="16" height={h * 0.7} rx="4" />
      ))}

      {/* This month's work */}
      <rect className={card} x="176" y="56" width="132" height="122" rx="12" />
      <T x={188} y={74} size={8.5} bold>This month</T>
      {[
        { label: "5 social posts", y: 94 },
        { label: "2 newsletters", y: 116 },
        { label: "2 campaigns", y: 138 },
      ].map((row) => (
        <g key={row.label}>
          <Tick cx={194} cy={row.y - 3} />
          <T x={206} y={row.y} size={7.5}>{row.label}</T>
        </g>
      ))}
      <circle className="fill-none stroke-border" strokeWidth="1.5" cx="194" cy="157" r="5.5" />
      <T x={206} y={160} size={7.5}>Monthly report</T>

      {/* Post */}
      <rect className={card} x="28" y="144" width="132" height="62" rx="10" />
      <rect className={warm} opacity="0.2" x="38" y="154" width="42" height="42" rx="6" />
      <Sparkle x={59} y={175} r={9} className={warm} />
      <T x={88} y={166} size={7.5} bold>New post</T>
      <rect className={soft} x="88" y="173" width="60" height="4" rx="2" />
      <rect className={soft} x="88" y="182" width="44" height="4" rx="2" />

      <Badge x={206} y={186} w={102} h={26}>Done for you</Badge>
    </Scene>
  )
}

export function WebsiteScene(props: Props) {
  return (
    <Scene {...props}>
      {/* Browser */}
      <rect className={card} x="16" y="14" width="220" height="164" rx="12" />
      <circle className={warm} cx="30" cy="27" r="2.5" />
      <circle className={soft} cx="38" cy="27" r="2.5" />
      <circle className={green} cx="46" cy="27" r="2.5" />
      <rect className={soft} x="60" y="23" width="110" height="8" rx="4" />
      <T x={66} y={29.5} size={5.5} className={muted}>yourbrand.com</T>
      <rect className={blue} x="28" y="40" width="196" height="66" rx="6" />
      <T x={42} y={64} size={12} bold className={paper}>Fresh every day</T>
      <rect className={paper} opacity="0.7" x="42" y="72" width="86" height="4" rx="2" />
      <rect className={paper} x="42" y="84" width="50" height="14" rx="7" />
      <T x={67} y={93.5} size={6.5} bold anchor="middle" className={blue}>Order now</T>
      {[28, 94, 160].map((x) => (
        <g key={x}>
          <rect className={soft} x={x} y="114" width="60" height="52" rx="6" />
          <rect className={paper} x={x + 8} y="152" width="34" height="4" rx="2" />
        </g>
      ))}

      {/* Editor */}
      <rect className={card} x="204" y="62" width="104" height="96" rx="10" />
      <T x={216} y={80} size={8.5} bold>Edit page</T>
      <T x={216} y={96} size={7} className={muted}>Headline</T>
      <rect className="fill-background stroke-primary" strokeWidth="1.2" x="216" y="100" width="80" height="16" rx="5" />
      <T x={222} y={111} size={7}>Fresh every day</T>
      <rect className={blue} x="216" y="126" width="48" height="18" rx="9" />
      <T x={240} y={137.5} size={7} bold anchor="middle" className={paper}>Publish</T>

      {/* Platforms */}
      {[
        { mark: "W", x: 40, fill: "fill-[#146ef5]" },
        { mark: "F", x: 64, fill: ink },
        { mark: "W", x: 88, fill: "fill-[#21759b]" },
      ].map((item) => (
        <g key={item.x}>
          <circle className={item.fill} cx={item.x} cy="196" r="9" />
          <T x={item.x} y={199} size={8} bold anchor="middle" className={paper}>{item.mark}</T>
        </g>
      ))}
      <Badge x={208} y={176} w={100} h={28}>Edit it yourself</Badge>
    </Scene>
  )
}

export function AppScene(props: Props) {
  return (
    <Scene {...props}>
      {/* Phone */}
      <rect className={card} x="30" y="12" width="102" height="196" rx="16" />
      <rect className={soft} x="66" y="20" width="30" height="5" rx="2.5" />
      <T x={42} y={42} size={9} bold>Bookings</T>
      {[
        { label: "Ada · 10:00", color: blue, y: 62 },
        { label: "Femi · 11:30", color: warm, y: 92 },
        { label: "Kemi · 14:00", color: green, y: 122 },
      ].map((row) => (
        <g key={row.label}>
          <rect className={soft} x="40" y={row.y - 12} width="82" height="24" rx="6" />
          <circle className={row.color} cx="52" cy={row.y} r="5" />
          <T x={62} y={row.y + 3} size={7}>{row.label}</T>
        </g>
      ))}
      <rect className={blue} x="40" y="170" width="82" height="22" rx="11" />
      <T x={81} y={184} size={8} bold anchor="middle" className={paper}>Book</T>

      {/* Dashboard */}
      <rect className={card} x="118" y="34" width="190" height="122" rx="12" />
      <T x={130} y={52} size={8.5} bold>Dashboard</T>
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect className={soft} x={130 + i * 58} y="60" width="50" height="36" rx="6" />
          <T x={136 + i * 58} y={74} size={6.5} className={muted}>{["Users", "Orders", "Revenue"][i]}</T>
          <T x={136 + i * 58} y={88} size={10} bold>{["1.2k", "348", "₦4.1m"][i]}</T>
        </g>
      ))}
      <path className="fill-none stroke-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M132 142l28-14 26 8 30-20 28 6 30-18 22-4" />

      {/* Stack */}
      {[
        { label: "Sign in", x: 150 },
        { label: "Database", x: 204 },
        { label: "Payments", x: 262 },
      ].map((item) => (
        <g key={item.label}>
          <rect className={card} x={item.x - 24} y="164" width="50" height="18" rx="9" />
          <T x={item.x + 1} y={176} size={6.5} bold anchor="middle">{item.label}</T>
        </g>
      ))}
      <Badge x={196} y={190} w={112} h={24}>Idea to launch</Badge>
    </Scene>
  )
}

export function SupportScene(props: Props) {
  return (
    <Scene {...props}>
      {/* Request thread */}
      <rect className={card} x="16" y="14" width="190" height="168" rx="12" />
      <T x={28} y={32} size={8.5} bold>Support</T>
      <Pill x={194} y={29} label="Resolved" tone="green" />
      <rect className={soft} x="28" y="40" width="166" height="1" />
      <rect className={soft} x="28" y="50" width="130" height="30" rx="10" />
      <T x={38} y={63} size={7.5}>Can you update our</T>
      <T x={38} y={74} size={7.5}>menu page today?</T>
      <rect className="fill-background stroke-primary" strokeWidth="1.5" x="62" y="90" width="132" height="30" rx="10" />
      <T x={72} y={103} size={7.5}>Done. The new menu</T>
      <T x={72} y={114} size={7.5}>is live now.</T>
      <circle className={blue} cx="44" cy="105" r="10" />
      <T x={44} y={108} size={8} bold anchor="middle" className={paper}>V</T>
      <T x={62} y={136} size={7} className={muted}>Replied in 2 hours</T>
      <rect className={soft} x="28" y="146" width="166" height="24" rx="12" />
      <T x={40} y={161} size={7.5} className={muted}>Ask for help…</T>

      {/* Hours */}
      <rect className={card} x="188" y="60" width="120" height="96" rx="10" />
      <T x={200} y={78} size={8.5} bold>Hours this month</T>
      <rect className={soft} x="200" y="90" width="96" height="10" rx="5" />
      <rect className={blue} x="200" y="90" width="60" height="10" rx="5" />
      <T x={200} y={116} size={14} bold>6 of 10</T>
      <T x={200} y={130} size={7} className={muted}>hours used</T>
      <Tick cx={290} cy={140} r={8} />

      <Badge x={196} y={176} w={112} h={28}>Same-day replies</Badge>
    </Scene>
  )
}
