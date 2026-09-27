/**
 * The front-desk picture at the top of the visitor sign-in screen: a
 * receptionist at a desk, with the company's initials on the wall sign.
 * Drawn in the theme's colours so it matches light and dark mode.
 */
export function ReceptionIllustration({ initials, className }: { initials: string; className?: string }) {
  return (
    <svg viewBox="0 0 240 210" className={className} aria-hidden="true">
      {/* Back wall and ceiling */}
      <rect x="40" y="0" width="200" height="176" fill="var(--primary)" opacity="0.06" />
      <rect x="40" y="0" width="200" height="10" fill="var(--primary)" opacity="0.08" />

      {/* Pendant lamps */}
      <line x1="112" y1="10" x2="112" y2="34" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M103 44 L121 44 L117 34 L107 34 Z" fill="var(--foreground)" opacity="0.7" />
      <ellipse cx="112" cy="46" rx="9" ry="2" fill="var(--primary)" opacity="0.18" />
      <line x1="206" y1="10" x2="206" y2="28" stroke="var(--foreground)" strokeOpacity="0.35" strokeWidth="1.2" />
      <path d="M197 38 L215 38 L211 28 L201 28 Z" fill="var(--foreground)" opacity="0.7" />
      <ellipse cx="206" cy="40" rx="9" ry="2" fill="var(--primary)" opacity="0.18" />

      {/* Wall sign */}
      <rect x="150" y="52" width="66" height="34" rx="5" fill="var(--primary)" opacity="0.14" />
      <text x="183" y="75" textAnchor="middle" fontSize="16" fontWeight="600" fill="var(--primary)" opacity="0.75" fontFamily="inherit">
        {initials}
      </text>

      {/* Receptionist */}
      <path d="M150 113 C150 96 162 88 172 88 C184 88 194 97 194 112 C194 124 188 132 186 136 L158 136 C155 130 150 124 150 113 Z" fill="#1d1a24" />
      <ellipse cx="172" cy="112" rx="13" ry="15" fill="#8d5a3b" />
      <path d="M158 107 C160 96 168 93 174 93 C182 93 187 99 187 106 C181 101 170 100 158 107 Z" fill="#1d1a24" />
      <circle cx="167" cy="113" r="1.3" fill="#1d1a24" />
      <circle cx="177" cy="113" r="1.3" fill="#1d1a24" />
      <path d="M167.5 120 Q172 123.5 176.5 120" stroke="#1d1a24" strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <rect x="167" y="125" width="10" height="8" fill="#7a4d32" />
      <path d="M140 176 L144 146 C146 137 154 132 164 131 L180 131 C190 132 198 137 200 146 L204 176 Z" fill="var(--foreground)" opacity="0.88" />
      <path d="M164 131 L172 150 L180 131 Z" fill="var(--background)" />

      {/* Laptop, seen from the front */}
      <path d="M118 150 L150 150 L146 176 L114 176 Z" fill="var(--foreground)" opacity="0.8" />
      <circle cx="132" cy="163" r="2.2" fill="var(--background)" opacity="0.5" />

      {/* Plant */}
      <path d="M70 176 L72 154 L90 154 L92 176 Z" fill="var(--background)" stroke="var(--border)" />
      <path d="M81 154 C74 140 64 128 58 124 C66 126 78 136 81 154 Z" fill="#5f9e7c" />
      <path d="M81 154 C80 136 84 118 92 110 C90 122 88 138 81 154 Z" fill="#7bb595" />
      <path d="M81 154 C86 140 96 130 106 128 C98 134 90 144 81 154 Z" fill="#5f9e7c" />
      <path d="M81 154 C76 144 70 138 62 138 C70 142 76 148 81 154 Z" fill="#7bb595" />

      {/* Desk */}
      <rect x="30" y="176" width="210" height="8" rx="2" fill="var(--background)" stroke="var(--border)" />
      <rect x="44" y="184" width="196" height="26" fill="var(--background)" opacity="0.9" />
      <rect x="44" y="184" width="196" height="26" fill="var(--primary)" opacity="0.04" />
    </svg>
  )
}
