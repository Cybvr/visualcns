import type { ReactNode, SVGProps } from "react"

// Flat illustrations for the home page. Shapes use theme tokens through
// Tailwind fill/stroke classes, so every scene follows light and dark mode.
// Orange and green are the Juju and Pasive brand colors from lib/brands.
type Props = SVGProps<SVGSVGElement>

const paper = "fill-background"
const ink = "fill-foreground"
const blue = "fill-primary"
const soft = "fill-muted"
const warm = "fill-[#f97316]"
const green = "fill-[#10b981]"
const edge = "stroke-border"

function Scene({ children, ...props }: Props & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 320 220" aria-hidden="true" {...props}>
      {children}
    </svg>
  )
}

function Sparkle({ x, y, r, className }: { x: number; y: number; r: number; className: string }) {
  const k = r * 0.22
  return (
    <path
      className={className}
      d={`M${x} ${y - r}Q${x + k} ${y - k} ${x + r} ${y}Q${x + k} ${y + k} ${x} ${y + r}Q${x - k} ${y + k} ${x - r} ${y}Q${x - k} ${y - k} ${x} ${y - r}Z`}
    />
  )
}

function Person({ cx, cy, s = 1 }: { cx: number; cy: number; s?: number }) {
  return (
    <g className={paper}>
      <circle cx={cx} cy={cy - 4 * s} r={5 * s} />
      <path d={`M${cx - 9 * s} ${cy + 10 * s}a${9 * s} ${8 * s} 0 0 1 ${18 * s} 0z`} />
    </g>
  )
}

function BrandDesign(props: Props) {
  return (
    <Scene {...props}>
      <rect className={warm} x="186" y="46" width="94" height="128" rx="12" transform="rotate(9 233 110)" />
      <circle className={paper} cx="250" cy="82" r="12" opacity="0.9" />
      <rect className={`${paper} ${edge}`} x="40" y="28" width="170" height="164" rx="12" />
      <circle className={blue} cx="96" cy="92" r="36" />
      <circle className={paper} cx="110" cy="80" r="13" />
      <text x="146" y="108" className={ink} fontSize="38" fontFamily="var(--font-serif)" fontStyle="italic">
        Aa
      </text>
      <circle className={blue} cx="72" cy="160" r="10" />
      <circle className={warm} cx="98" cy="160" r="10" />
      <circle className={green} cx="124" cy="160" r="10" />
      <circle className={ink} cx="150" cy="160" r="10" />
      <Sparkle x={278} y={34} r={12} className={blue} />
    </Scene>
  )
}

function ProductExperience(props: Props) {
  return (
    <Scene {...props}>
      <rect className={`${paper} ${edge}`} x="24" y="26" width="214" height="158" rx="12" />
      <circle className={warm} cx="42" cy="42" r="4" />
      <circle className={soft} cx="54" cy="42" r="4" />
      <circle className={green} cx="66" cy="42" r="4" />
      <line className={edge} x1="24" y1="56" x2="238" y2="56" />
      <rect className={blue} x="40" y="70" width="116" height="62" rx="8" />
      <rect className={paper} x="52" y="84" width="64" height="8" rx="4" opacity="0.95" />
      <rect className={paper} x="52" y="98" width="42" height="6" rx="3" opacity="0.6" />
      <rect className={warm} x="52" y="112" width="34" height="11" rx="5.5" />
      <rect className={soft} x="164" y="70" width="58" height="28" rx="6" />
      <rect className={soft} x="164" y="104" width="58" height="28" rx="6" />
      <rect className={soft} x="40" y="142" width="56" height="28" rx="6" />
      <rect className={soft} x="102" y="142" width="56" height="28" rx="6" />
      <rect className={ink} x="218" y="78" width="74" height="128" rx="14" />
      <rect className={paper} x="224" y="90" width="62" height="104" rx="8" />
      <circle className={blue} cx="255" cy="112" r="11" />
      <rect className={ink} x="236" y="132" width="38" height="6" rx="3" />
      <rect className={soft} x="232" y="146" width="46" height="16" rx="5" />
      <rect className={green} x="232" y="168" width="46" height="16" rx="8" />
      <path className={ink} d="M130 118l0 26 7-7 5 11 5-2-5-11 10 0z" />
    </Scene>
  )
}

function CampaignContent(props: Props) {
  return (
    <Scene {...props}>
      <rect className={blue} x="150" y="30" width="122" height="152" rx="14" transform="rotate(8 211 106)" />
      <rect className={`${paper} ${edge}`} x="132" y="36" width="122" height="156" rx="14" />
      <rect className={warm} x="144" y="48" width="98" height="76" rx="9" />
      <circle className={paper} cx="220" cy="70" r="10" opacity="0.9" />
      <path className={paper} d="M144 124l30-34 22 22 14-12 32 24z" opacity="0.55" />
      <rect className={ink} x="144" y="136" width="72" height="7" rx="3.5" />
      <rect className={soft} x="144" y="150" width="50" height="6" rx="3" />
      <path className={blue} d="M152 170c-4-4-10 1-5 6l5 5 5-5c5-5-1-10-5-6z" />
      <rect className={soft} x="166" y="172" width="22" height="6" rx="3" />
      <rect className={ink} x="58" y="118" width="13" height="40" rx="5" transform="rotate(-14 64 138)" />
      <path className={ink} d="M36 90h20l52-30v96l-52-30H36z" />
      <ellipse className={blue} cx="108" cy="108" rx="9" ry="48" />
      <path className="fill-none stroke-[#f97316]" strokeWidth="4" strokeLinecap="round" d="M121 88l8-6M123 108h9M121 128l8 6" />
    </Scene>
  )
}

function CrmRelationship(props: Props) {
  const nodes = [
    { cx: 86, cy: 110, c: green },
    { cx: 160, cy: 38, c: warm },
    { cx: 234, cy: 110, c: ink },
    { cx: 160, cy: 182, c: blue },
  ]
  return (
    <Scene {...props}>
      <circle className={`fill-none ${edge}`} cx="160" cy="110" r="74" strokeWidth="2" strokeDasharray="4 7" />
      {nodes.map((n) => (
        <line key={`l${n.cx}${n.cy}`} className="stroke-foreground" opacity="0.25" strokeWidth="2" x1="160" y1="110" x2={n.cx} y2={n.cy} />
      ))}
      <circle className={blue} cx="160" cy="110" r="34" />
      <Person cx={160} cy={108} s={1.7} />
      {nodes.map((n) => (
        <g key={`n${n.cx}${n.cy}`}>
          <circle className={n.c} cx={n.cx} cy={n.cy} r="19" />
          <Person cx={n.cx} cy={n.cy} />
        </g>
      ))}
      <rect className={`${paper} ${edge}`} x="226" y="36" width="60" height="30" rx="15" />
      <circle className={blue} cx="243" cy="51" r="3.5" />
      <circle className={blue} cx="256" cy="51" r="3.5" />
      <circle className={blue} cx="269" cy="51" r="3.5" />
      <path className={green} d="M52 164c-5-5-13 1-6 8l6 6 6-6c7-7-1-13-6-8z" />
    </Scene>
  )
}

function Ventures(props: Props) {
  return (
    <Scene {...props}>
      <line className={edge} x1="30" y1="190" x2="290" y2="190" strokeWidth="2" />
      <rect className={soft} x="58" y="150" width="54" height="40" rx="6" />
      <rect className={blue} x="118" y="116" width="54" height="74" rx="6" opacity="0.45" />
      <rect className={blue} x="178" y="78" width="54" height="112" rx="6" />
      <path className="fill-none stroke-[#10b981]" strokeWidth="4" strokeLinecap="round" d="M85 150v-18" />
      <path className={green} d="M85 136c-12 0-16-8-16-14 10 0 16 6 16 14zM85 132c0-10 6-16 16-16 0 8-5 16-16 16z" />
      <line className="stroke-foreground" strokeWidth="3.5" strokeLinecap="round" x1="205" y1="78" x2="205" y2="34" />
      <path className={warm} d="M205 34l38 11-38 12z" />
      <path className="fill-none stroke-foreground" opacity="0.35" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" d="M92 118Q140 70 196 60" />
      <Sparkle x={266} y={96} r={11} className={blue} />
      <Sparkle x={250} y={130} r={6} className={warm} />
      <Sparkle x={52} y={70} r={8} className={blue} />
    </Scene>
  )
}

function AiDesign(props: Props) {
  return (
    <Scene {...props}>
      <Sparkle x={92} y={82} r={44} className={blue} />
      <Sparkle x={142} y={38} r={14} className={warm} />
      <Sparkle x={48} y={128} r={9} className={green} />
      <path className="fill-none stroke-foreground" opacity="0.3" strokeWidth="2" strokeDasharray="3 6" strokeLinecap="round" d="M140 82h26" />
      <rect className={warm} x="174" y="30" width="48" height="48" rx="10" />
      <circle className={paper} cx="198" cy="54" r="11" opacity="0.9" />
      <rect className={blue} x="228" y="30" width="48" height="48" rx="10" opacity="0.45" />
      <path className={paper} d="M240 66l12-20 12 20z" />
      <rect className={green} x="174" y="84" width="48" height="48" rx="10" />
      <rect className={paper} x="186" y="102" width="24" height="12" rx="6" opacity="0.9" />
      <rect className={ink} x="228" y="84" width="48" height="48" rx="10" />
      <Sparkle x={252} y={108} r={10} className={paper} />
      <rect className={`${paper} ${edge}`} x="36" y="152" width="248" height="42" rx="21" />
      <rect className={soft} x="56" y="168" width="132" height="10" rx="5" />
      <circle className={blue} cx="262" cy="173" r="14" />
      <path className="fill-none stroke-background" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" d="M262 180v-13M256 172l6-6 6 6" />
    </Scene>
  )
}

function CommerceDesign(props: Props) {
  return (
    <Scene {...props}>
      <path className="fill-none stroke-foreground" strokeWidth="6" strokeLinecap="round" d="M72 84V70a24 24 0 0 1 48 0v14" />
      <rect className={blue} x="46" y="80" width="100" height="112" rx="10" />
      <circle className={paper} cx="96" cy="130" r="18" opacity="0.95" />
      <Sparkle x={96} y={130} r={9} className={blue} />
      <rect className={`${paper} ${edge}`} x="164" y="34" width="116" height="156" rx="14" />
      <rect className={soft} x="176" y="46" width="92" height="76" rx="9" />
      <circle className={warm} cx="222" cy="84" r="24" />
      <circle className={paper} cx="214" cy="76" r="6" opacity="0.6" />
      <rect className={ink} x="176" y="134" width="64" height="8" rx="4" />
      <rect className={green} x="176" y="152" width="44" height="20" rx="10" />
      <circle className={ink} cx="254" cy="162" r="13" />
      <path className="fill-none stroke-background" strokeWidth="3" strokeLinecap="round" d="M254 156v12M248 162h12" />
      <path className={warm} d="M34 44h30l14 14-22 22-22-22z" transform="rotate(-12 50 60)" />
      <circle className={paper} cx="45" cy="52" r="3.5" />
    </Scene>
  )
}

export function VisitorIllustration(props: Props) {
  return (
    <Scene {...props}>
      <path className={soft} d="M138 170h44l14 28h-72z" />
      <rect className={ink} x="64" y="20" width="192" height="150" rx="16" />
      <rect className={paper} x="75" y="31" width="170" height="128" rx="9" />
      <circle className={blue} cx="160" cy="64" r="15" />
      <Person cx={160} cy={64} s={1.1} />
      <rect className={ink} x="120" y="88" width="80" height="8" rx="4" />
      <rect className={soft} x="102" y="104" width="116" height="15" rx="7.5" />
      <rect className={blue} x="102" y="127" width="116" height="18" rx="9" />
      <g transform="rotate(10 268 136)">
        <rect className={`${paper} ${edge}`} x="240" y="98" width="58" height="78" rx="9" />
        <rect className={ink} x="262" y="92" width="14" height="10" rx="3" />
        <circle className={warm} cx="269" cy="124" r="11" />
        <Person cx={269} cy={124} s={0.7} />
        <rect className={ink} x="252" y="144" width="34" height="5" rx="2.5" />
        <rect className={soft} x="256" y="154" width="26" height="5" rx="2.5" />
      </g>
      <circle className={green} cx="56" cy="156" r="20" />
      <path className="fill-none stroke-background" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M47 156l6 6 12-12" />
    </Scene>
  )
}

export function AuditIllustration(props: Props) {
  return (
    <Scene {...props}>
      <rect className={`${paper} ${edge}`} x="48" y="20" width="156" height="184" rx="12" />
      <rect className={ink} x="66" y="40" width="84" height="10" rx="5" />
      <rect className={soft} x="66" y="58" width="56" height="6" rx="3" />
      <rect className={soft} x="68" y="112" width="18" height="30" rx="3" />
      <rect className={blue} x="92" y="94" width="18" height="48" rx="3" opacity="0.45" />
      <rect className={soft} x="116" y="104" width="18" height="38" rx="3" />
      <rect className={blue} x="140" y="78" width="18" height="64" rx="3" />
      <circle className={green} cx="74" cy="164" r="8" />
      <path className="fill-none stroke-background" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M70 164l3 3 5-6" />
      <rect className={soft} x="90" y="161" width="70" height="6" rx="3" />
      <circle className={warm} cx="74" cy="186" r="8" />
      <rect className={paper} x="72.5" y="181" width="3" height="6" rx="1.5" />
      <circle className={paper} cx="74" cy="190" r="1.6" />
      <rect className={soft} x="90" y="183" width="54" height="6" rx="3" />
      <line className="stroke-foreground" strokeWidth="13" strokeLinecap="round" x1="256" y1="142" x2="286" y2="174" />
      <circle className={paper} cx="226" cy="110" r="42" opacity="0.92" />
      <path className="fill-none stroke-[#f97316]" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" d="M204 124l14-14 10 8 20-22" />
      <circle className="fill-none stroke-foreground" strokeWidth="9" cx="226" cy="110" r="42" />
    </Scene>
  )
}

// Keyed by service slug so the Services grid can look each one up.
export const SERVICE_ILLUSTRATIONS: Record<string, (props: Props) => ReactNode> = {
  "brand-design": BrandDesign,
  "product-experience-design": ProductExperience,
  "campaign-content-design": CampaignContent,
  "crm-relationship-design": CrmRelationship,
  "visualcns-ventures": Ventures,
  "ai-design": AiDesign,
  "commerce-design": CommerceDesign,
}
