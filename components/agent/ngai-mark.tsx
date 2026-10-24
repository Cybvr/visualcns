import { useId, type SVGProps } from "react"

/** Ngai's flower mark, drawn in the current text colour so it sits with the other sidebar icons. public/ngai-mark.svg is the same drawing. */
export function NgaiMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  // Each mark needs its own mask id, or two on one page would share the first one's eyes.
  const maskId = `ngai-eyes-${useId()}`
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} {...props}>
      <mask id={maskId}>
        <rect width="24" height="24" fill="#fff" />
        <ellipse cx="9.7" cy="11.7" rx="1.25" ry="1.45" fill="#000" />
        <ellipse cx="13.3" cy="11.4" rx="1.3" ry="1.5" fill="#000" />
      </mask>
      <g fill="currentColor" mask={`url(#${maskId})`}>
        <circle cx="12" cy="12.5" r="5" />
        <circle cx="12" cy="7.5" r="4.8" />
        <circle cx="16.76" cy="10.96" r="4.8" />
        <circle cx="14.94" cy="16.55" r="4.8" />
        <circle cx="9.06" cy="16.55" r="4.8" />
        <circle cx="7.24" cy="10.96" r="4.8" />
      </g>
    </svg>
  )
}
