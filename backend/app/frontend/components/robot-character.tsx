import { useEffect, useRef } from "react"

/**
 * A friendly robot mascot whose eyes follow the cursor. Appearance (color) is
 * derived from `seed` so every agent/template gets its own consistent look.
 *
 * Performance: all robots on a page share ONE pointermove listener and ONE
 * requestAnimationFrame loop, and pupils are repositioned by writing directly
 * to the SVG transform (no React re-render). The loop only does work on frames
 * where the pointer actually moved, so idle robots cost nothing.
 */

// ---- shared pointer tracker -------------------------------------------------
let pointerX = 0
let pointerY = 0
let lastX = -1
let lastY = -1
let installed = false
let rafId: number | null = null
const subscribers = new Set<() => void>()

function ensureInstalled() {
  if (installed || typeof window === "undefined") return
  installed = true
  pointerX = window.innerWidth / 2
  pointerY = window.innerHeight / 2
  window.addEventListener(
    "pointermove",
    (e) => {
      pointerX = e.clientX
      pointerY = e.clientY
    },
    { passive: true },
  )
}

function loop() {
  if (pointerX !== lastX || pointerY !== lastY) {
    lastX = pointerX
    lastY = pointerY
    for (const fn of subscribers) fn()
  }
  rafId = requestAnimationFrame(loop)
}

function subscribe(fn: () => void): () => void {
  ensureInstalled()
  subscribers.add(fn)
  fn() // position once on mount
  if (rafId == null) rafId = requestAnimationFrame(loop)
  return () => {
    subscribers.delete(fn)
    if (subscribers.size === 0 && rafId != null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }
}

// ---- appearance -------------------------------------------------------------
const PALETTE = [
  { body: "#6366f1", accent: "#a5b4fc" }, // indigo
  { body: "#06b6d4", accent: "#67e8f9" }, // cyan
  { body: "#8b5cf6", accent: "#c4b5fd" }, // violet
  { body: "#10b981", accent: "#6ee7b7" }, // emerald
  { body: "#f59e0b", accent: "#fcd34d" }, // amber
  { body: "#ec4899", accent: "#f9a8d4" }, // pink
  { body: "#f43f5e", accent: "#fda4af" }, // rose
  { body: "#3b82f6", accent: "#93c5fd" }, // blue
]

function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

const MAX_DEFLECTION = 4 // SVG user units a pupil can travel from center
const EYE = { lx: 45, rx: 75, cy: 52 } // eye centers in viewBox space

export function RobotCharacter({
  seed = "",
  size = 96,
  className,
}: {
  seed?: string
  size?: number
  className?: string
}) {
  const { body, accent } = PALETTE[hashString(seed) % PALETTE.length]

  const leftEye = useRef<SVGCircleElement>(null)
  const rightEye = useRef<SVGCircleElement>(null)
  const leftPupil = useRef<SVGGElement>(null)
  const rightPupil = useRef<SVGGElement>(null)

  useEffect(() => {
    const pairs: Array<
      [React.RefObject<SVGCircleElement | null>, React.RefObject<SVGGElement | null>]
    > = [
      [leftEye, leftPupil],
      [rightEye, rightPupil],
    ]
    const update = () => {
      for (const [eyeRef, pupilRef] of pairs) {
        const eye = eyeRef.current
        const pupil = pupilRef.current
        if (!eye || !pupil) continue
        const r = eye.getBoundingClientRect()
        const cx = r.left + r.width / 2
        const cy = r.top + r.height / 2
        const dx = pointerX - cx
        const dy = pointerY - cy
        const dist = Math.hypot(dx, dy) || 1
        const ox = (dx / dist) * MAX_DEFLECTION
        const oy = (dy / dist) * MAX_DEFLECTION
        // px on an SVG element is interpreted in user units, so this scales
        // correctly regardless of the rendered `size`.
        pupil.style.transform = `translate(${ox}px, ${oy}px)`
      }
    }
    return subscribe(update)
  }, [])

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 140"
      className={className}
      role="img"
      aria-label="Robot mascot"
    >
      {/* antenna */}
      <line x1="60" y1="24" x2="60" y2="12" stroke={body} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="9" r="4" fill={accent} className="animate-pulse" />

      {/* head */}
      <rect x="22" y="24" width="76" height="62" rx="18" fill={body} />
      <rect x="22" y="24" width="76" height="62" rx="18" fill="#000" opacity="0.06" />
      {/* side bolts / ears */}
      <rect x="14" y="44" width="9" height="22" rx="4" fill={body} />
      <rect x="97" y="44" width="9" height="22" rx="4" fill={body} />

      {/* visor */}
      <rect x="30" y="38" width="60" height="34" rx="16" fill="#0f172a" />

      {/* eyes (white) */}
      <circle ref={leftEye} cx={EYE.lx} cy={EYE.cy} r="11" fill="#f8fafc" />
      <circle ref={rightEye} cx={EYE.rx} cy={EYE.cy} r="11" fill="#f8fafc" />

      {/* pupils — these groups get repositioned to track the cursor */}
      <g ref={leftPupil}>
        <circle cx={EYE.lx} cy={EYE.cy} r="5.5" fill="#0f172a" />
        <circle cx={EYE.lx - 2} cy={EYE.cy - 2} r="1.8" fill="#f8fafc" />
      </g>
      <g ref={rightPupil}>
        <circle cx={EYE.rx} cy={EYE.cy} r="5.5" fill="#0f172a" />
        <circle cx={EYE.rx - 2} cy={EYE.cy - 2} r="1.8" fill="#f8fafc" />
      </g>

      {/* cheeks */}
      <circle cx="34" cy="66" r="3" fill={accent} opacity="0.7" />
      <circle cx="86" cy="66" r="3" fill={accent} opacity="0.7" />

      {/* body */}
      <rect x="34" y="90" width="52" height="40" rx="12" fill={body} />
      <rect x="34" y="90" width="52" height="40" rx="12" fill="#000" opacity="0.1" />
      {/* arms */}
      <rect x="20" y="96" width="9" height="26" rx="4" fill={body} />
      <rect x="91" y="96" width="9" height="26" rx="4" fill={body} />
      {/* chest light */}
      <circle cx="60" cy="108" r="6" fill={accent} className="animate-pulse" />
    </svg>
  )
}
