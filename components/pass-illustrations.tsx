// Theme-aware SVG illustrations for the Pass page feature and deploy cards.

const FONT = { fontFamily: "inherit" } as const

function Frame({
  label,
  children,
  width = 400,
  height = 220,
}: {
  label: string
  children: React.ReactNode
  width?: number
  height?: number
}) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="h-auto w-full" style={FONT}>
      <rect width={width} height={height} rx="14" className="fill-muted/50" />
      {children}
    </svg>
  )
}

/* 01 — guest scans QR on phone, signs NDA, record saved */
export function CheckInIllustration() {
  return (
    <Frame label="A guest scans a QR code on their phone, signs an NDA, and the signed record is saved">
      {/* Phone */}
      <rect x="36" y="28" width="92" height="164" rx="14" className="fill-background stroke-border" strokeWidth="2" />
      <rect x="66" y="36" width="32" height="5" rx="2.5" className="fill-muted" />
      <text x="82" y="62" textAnchor="middle" fontSize="10" fontWeight="600" className="fill-foreground">Scan to check in</text>
      <g transform="translate(52 72)" className="fill-foreground">
        <rect x="0" y="0" width="60" height="60" rx="4" className="fill-background stroke-foreground" strokeWidth="2" />
        <rect x="6" y="6" width="16" height="16" rx="2" />
        <rect x="38" y="6" width="16" height="16" rx="2" />
        <rect x="6" y="38" width="16" height="16" rx="2" />
        <rect x="28" y="10" width="5" height="5" />
        <rect x="28" y="22" width="5" height="5" />
        <rect x="40" y="28" width="5" height="5" />
        <rect x="28" y="34" width="5" height="5" />
        <rect x="46" y="40" width="5" height="5" />
        <rect x="34" y="46" width="5" height="5" />
        <rect x="10" y="28" width="5" height="5" />
        <rect x="46" y="50" width="5" height="5" />
      </g>
      <rect x="50" y="150" width="64" height="22" rx="11" className="fill-primary" />
      <text x="82" y="165" textAnchor="middle" fontSize="10" fontWeight="600" className="fill-primary-foreground">Continue</text>

      {/* Arrow */}
      <path d="M140 110 h28" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M166 104 l8 6 -8 6" fill="none" className="stroke-muted-foreground" strokeWidth="2" />

      {/* NDA document */}
      <rect x="186" y="24" width="124" height="168" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      <text x="200" y="50" fontSize="12" fontWeight="700" className="fill-foreground">Visitor NDA</text>
      <rect x="200" y="60" width="96" height="5" rx="2.5" className="fill-muted" />
      <rect x="200" y="72" width="84" height="5" rx="2.5" className="fill-muted" />
      <rect x="200" y="84" width="92" height="5" rx="2.5" className="fill-muted" />
      <rect x="200" y="96" width="70" height="5" rx="2.5" className="fill-muted" />
      <rect x="200" y="112" width="10" height="10" rx="2" className="fill-primary" />
      <path d="M202.5 117 l2 2 4 -4" fill="none" className="stroke-primary-foreground" strokeWidth="1.6" />
      <text x="216" y="121" fontSize="9" className="fill-muted-foreground">Safety waiver</text>
      <rect x="200" y="128" width="10" height="10" rx="2" className="fill-primary" />
      <path d="M202.5 133 l2 2 4 -4" fill="none" className="stroke-primary-foreground" strokeWidth="1.6" />
      <text x="216" y="137" fontSize="9" className="fill-muted-foreground">Health check</text>
      <path
        d="M204 170 c8 -14 14 -14 16 -4 s8 6 14 -6 c4 -8 8 -6 10 2 s8 6 16 -2"
        fill="none"
        className="stroke-foreground"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M200 178 h96" className="stroke-border" strokeWidth="1.5" />

      {/* Vault / saved */}
      <path d="M318 110 h22" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="4 4" />
      <circle cx="364" cy="110" r="22" className="fill-primary" />
      <rect x="355" y="108" width="18" height="13" rx="2" className="fill-primary-foreground" />
      <path d="M359 108 v-4 a5 5 0 0 1 10 0 v4" fill="none" className="stroke-primary-foreground" strokeWidth="2" />
      <text x="364" y="148" textAnchor="middle" fontSize="9" fontWeight="600" className="fill-muted-foreground">Saved</text>
    </Frame>
  )
}

/* 02 — printed visitor badge with name, host and logo */
export function BadgeIllustration() {
  return (
    <Frame label="A printed visitor badge showing the guest's name, who they are visiting and the company logo">
      {/* Printer */}
      <rect x="40" y="96" width="120" height="70" rx="12" className="fill-background stroke-border" strokeWidth="2" />
      <rect x="56" y="88" width="88" height="14" rx="4" className="fill-muted-foreground/30" />
      <rect x="62" y="140" width="76" height="6" rx="3" className="fill-muted" />
      <circle cx="140" cy="116" r="4" className="fill-primary" />

      {/* Arrow */}
      <path d="M172 130 h28" className="stroke-muted-foreground" strokeWidth="2" strokeDasharray="4 4" />
      <path d="M198 124 l8 6 -8 6" fill="none" className="stroke-muted-foreground" strokeWidth="2" />

      {/* Badge */}
      <rect x="222" y="34" width="140" height="160" rx="12" className="fill-background stroke-border" strokeWidth="2" />
      <rect x="222" y="34" width="140" height="30" rx="12" className="fill-primary" />
      <rect x="222" y="52" width="140" height="12" className="fill-primary" />
      <text x="292" y="54" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-primary-foreground">VISITOR</text>
      <circle cx="292" cy="94" r="18" className="fill-muted" />
      <circle cx="292" cy="89" r="7" className="fill-muted-foreground/60" />
      <path d="M279 106 a13 10 0 0 1 26 0" className="fill-muted-foreground/60" />
      <text x="292" y="134" textAnchor="middle" fontSize="11" fontWeight="700" className="fill-foreground">Kemi Ade</text>
      <text x="292" y="150" textAnchor="middle" fontSize="9" className="fill-muted-foreground">Visiting Tunde Bello</text>
      <rect x="270" y="164" width="44" height="14" rx="4" className="fill-muted" />
      <text x="292" y="174" textAnchor="middle" fontSize="7.5" fontWeight="600" className="fill-muted-foreground">Your logo</text>
    </Frame>
  )
}

/* 03 — company directory synced into Pass, hosts auto-filled */
export function DirectorySyncIllustration() {
  const sources = ["Okta", "Azure AD", "Google"]
  const hosts = [
    { name: "Ada Okafor", team: "Finance" },
    { name: "Tunde Bello", team: "Security" },
    { name: "Grace Mensah", team: "Legal" },
  ]
  return (
    <Frame label="Your staff list in Pass, with syncing from Okta, Azure AD and Google coming soon">
      <text x="28" y="28" fontSize="8.5" fontWeight="600" className="fill-muted-foreground">Sync: coming soon</text>
      {/* Sources */}
      {sources.map((s, i) => (
        <g key={s}>
          <rect x="28" y={38 + i * 54} width="96" height="36" rx="18" className="fill-background stroke-border" strokeWidth="2" strokeDasharray="5 4" />
          <circle cx="48" cy={56 + i * 54} r="7" className="fill-muted-foreground/40" />
          <text x="62" y={60 + i * 54} fontSize="11" fontWeight="600" className="fill-muted-foreground">{s}</text>
          <path d={`M124 ${56 + i * 54} C150 ${56 + i * 54} 150 110 172 110`} fill="none" className="stroke-primary/60" strokeWidth="2" strokeDasharray="4 4" />
        </g>
      ))}

      {/* Hub */}
      <circle cx="194" cy="110" r="22" className="fill-primary" />
      <path d="M184 106 a10 10 0 0 1 18 -3 m0 -5 v5 h-5" fill="none" className="stroke-primary-foreground" strokeWidth="2" strokeLinecap="round" />
      <path d="M204 114 a10 10 0 0 1 -18 3 m0 5 v-5 h5" fill="none" className="stroke-primary-foreground" strokeWidth="2" strokeLinecap="round" />
      <path d="M216 110 h20" className="stroke-primary/60" strokeWidth="2" />

      {/* Host directory */}
      <rect x="236" y="28" width="140" height="164" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      <text x="250" y="50" fontSize="11" fontWeight="700" className="fill-foreground">Pick your host</text>
      <rect x="250" y="58" width="112" height="20" rx="6" className="fill-muted/60" />
      <text x="258" y="72" fontSize="9" className="fill-muted-foreground">Search people…</text>
      {hosts.map((h, i) => (
        <g key={h.name}>
          <rect x="246" y={86 + i * 34} width="120" height="30" rx="8" className={i === 1 ? "fill-primary/10" : "fill-transparent"} />
          <circle cx="262" cy={101 + i * 34} r="9" className={i === 1 ? "fill-primary" : "fill-muted"} />
          <text x="276" y={99 + i * 34} fontSize="9.5" fontWeight="600" className="fill-foreground">{h.name}</text>
          <text x="276" y={110 + i * 34} fontSize="8.5" className="fill-muted-foreground">{h.team}</text>
        </g>
      ))}
    </Frame>
  )
}

/* 04 — host gets arrival message; marshal runs roll call */
export function AlertsIllustration() {
  const people = [true, true, true, true, true, true, true, false, true, true, false, true]
  return (
    <Frame label="A host gets an arrival message. Evacuation roll call is coming soon">
      {/* Notification */}
      <rect x="24" y="40" width="168" height="62" rx="12" className="fill-background stroke-border" strokeWidth="2" />
      <rect x="36" y="52" width="22" height="22" rx="6" className="fill-primary" />
      <path d="M41 64 a6 6 0 0 1 12 0 v3 h-12 z M45 69 h4" className="fill-primary-foreground stroke-primary-foreground" strokeWidth="1.2" />
      <text x="66" y="60" fontSize="10" fontWeight="700" className="fill-foreground">Your visitor is here</text>
      <text x="66" y="74" fontSize="9" className="fill-muted-foreground">Kemi Ade · Lobby, 9:42 AM</text>
      <rect x="66" y="82" width="52" height="12" rx="6" className="fill-primary/15" />
      <text x="92" y="91" textAnchor="middle" fontSize="8" fontWeight="600" className="fill-primary">On my way</text>

      <rect x="24" y="116" width="168" height="62" rx="12" className="fill-background stroke-border" strokeWidth="2" opacity="0.55" />
      <rect x="36" y="128" width="22" height="22" rx="6" className="fill-muted-foreground/40" />
      <rect x="66" y="130" width="96" height="6" rx="3" className="fill-muted" />
      <rect x="66" y="142" width="70" height="5" rx="2.5" className="fill-muted" />

      {/* Roll call */}
      <rect x="212" y="24" width="164" height="172" rx="12" className="fill-background stroke-border" strokeWidth="2" />
      <circle cx="228" cy="42" r="5" className="fill-red-500" />
      <text x="240" y="46" fontSize="10.5" fontWeight="700" className="fill-foreground">Evacuation roll call</text>
      <text x="228" y="76" fontSize="22" fontWeight="700" className="fill-foreground">46</text>
      <text x="258" y="76" fontSize="11" className="fill-muted-foreground">/ 48 safe</text>
      <rect x="228" y="86" width="132" height="8" rx="4" className="fill-muted" />
      <rect x="228" y="86" width="126" height="8" rx="4" className="fill-primary" />
      {people.map((ok, i) => {
        const cx = 238 + (i % 6) * 22
        const cy = 118 + Math.floor(i / 6) * 28
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="9" className={ok ? "fill-primary/15" : "fill-red-500/15"} />
            {ok ? (
              <path d={`M${cx - 4} ${cy} l3 3 5 -6`} fill="none" className="stroke-primary" strokeWidth="1.8" strokeLinecap="round" />
            ) : (
              <text x={cx} y={cy + 3.5} textAnchor="middle" fontSize="10" fontWeight="700" className="fill-red-500">?</text>
            )}
          </g>
        )
      })}
      <text x="228" y="182" fontSize="9" fontWeight="600" className="fill-primary">Coming soon</text>
    </Frame>
  )
}

/* Setup step 1 — turn on Slack and Teams alerts */
export function ConnectStackIllustration() {
  const apps = ["Email", "Slack", "Teams"]
  return (
    <Frame label="Email and Slack alerts switched on in the Pass settings" width={260} height={150}>
      <rect x="40" y="18" width="180" height="114" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      <text x="54" y="38" fontSize="10" fontWeight="700" className="fill-foreground">Alerts</text>
      {apps.map((a, i) => {
        const on = i < 2
        const y = 50 + i * 26
        return (
          <g key={a}>
            <rect x="54" y={y} width="16" height="16" rx="4" className={on ? "fill-primary/15" : "fill-muted"} />
            <text x="78" y={y + 12} fontSize="10" fontWeight="600" className={on ? "fill-foreground" : "fill-muted-foreground"}>
              {a}
            </text>
            <rect x="176" y={y + 1} width="28" height="14" rx="7" className={on ? "fill-primary" : "fill-muted"} />
            <circle cx={on ? 197 : 183} cy={y + 8} r="5" className="fill-background" />
          </g>
        )
      })}
    </Frame>
  )
}

/* Setup step 2 — sign-in page open on a tablet at the front desk */
export function UnboxKioskIllustration() {
  return (
    <Frame label="The Pass sign-in page open on a tablet at the front desk" width={260} height={150}>
      {/* Desk */}
      <rect x="40" y="122" width="180" height="10" rx="3" className="fill-muted-foreground/25" />
      {/* Stand */}
      <path d="M122 104 l-10 18 h36 l-10 -18 z" className="fill-foreground/70" />
      {/* Tablet */}
      <rect x="82" y="16" width="96" height="90" rx="8" className="fill-foreground" />
      <rect x="88" y="22" width="84" height="78" rx="4" className="fill-background" />
      <text x="130" y="42" textAnchor="middle" fontSize="8" fontWeight="700" className="fill-foreground">Welcome</text>
      <rect x="104" y="50" width="52" height="5" rx="2.5" className="fill-muted" />
      <rect x="100" y="64" width="60" height="12" rx="6" className="fill-primary" />
      <text x="130" y="72.5" textAnchor="middle" fontSize="6.5" fontWeight="600" className="fill-primary-foreground">Sign in</text>
      <rect x="100" y="82" width="60" height="12" rx="6" className="fill-muted" />
    </Frame>
  )
}

/* Setup step 3 — every visit saved */
export function AuditReadyIllustration() {
  return (
    <Frame label="A log with every visit saved and easy to search" width={260} height={150}>
      <rect x="60" y="16" width="120" height="118" rx="10" className="fill-background stroke-border" strokeWidth="2" />
      <text x="74" y="36" fontSize="10" fontWeight="700" className="fill-foreground">Visit log</text>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <circle cx="80" cy={52 + i * 16} r="5" className="fill-primary/15" />
          <path d={`M77.5 ${52 + i * 16} l2 2 3.5 -4`} fill="none" className="stroke-primary" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="92" y={49 + i * 16} width={70 - (i % 2) * 18} height="6" rx="3" className="fill-muted" />
        </g>
      ))}
      <rect x="74" y="114" width="54" height="12" rx="6" className="fill-primary" />
      <text x="101" y="123" textAnchor="middle" fontSize="7.5" fontWeight="600" className="fill-primary-foreground">Search</text>
      {/* Shield */}
      <path d="M190 52 l18 -7 18 7 v14 c0 14 -8 22 -18 26 c-10 -4 -18 -12 -18 -26 z" className="fill-primary" />
      <path d="M200 68 l6 6 11 -12" fill="none" className="stroke-primary-foreground" strokeWidth="2.5" strokeLinecap="round" />
    </Frame>
  )
}
