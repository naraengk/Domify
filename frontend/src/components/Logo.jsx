// the domify mark. a house outline with the scales of justice inside.
// uses a purple gradient stroke so it pops on light or dark backgrounds.

export function Logo({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Domify"
    >
      <defs>
        <linearGradient id="dl-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b80ff" />
          <stop offset="100%" stopColor="#4f46e5" />
        </linearGradient>
      </defs>
      <g
        stroke="url(#dl-grad)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* house outline: peaked roof, walls, floor */}
        <path d="M9 30 L32 9 L55 30 L55 55 L9 55 Z" />
        {/* tiny ridge cap at the peak */}
        <path d="M30 10.5 L34 10.5" />

        {/* scales of justice inside */}
        {/* vertical post */}
        <line x1="32" y1="22" x2="32" y2="44" />
        {/* base of the post */}
        <line x1="28" y1="44" x2="36" y2="44" />
        {/* balance beam */}
        <line x1="20" y1="28" x2="44" y2="28" />
        {/* left pan */}
        <path d="M20 28 L17 36 L23 36 Z" />
        {/* right pan */}
        <path d="M44 28 L41 36 L47 36 Z" />
      </g>
    </svg>
  );
}

// monochrome version for places where we already have a colored background
// (e.g. a filled badge). currentColor lets the parent set the color.
export function LogoMono({ size = 32, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 30 L32 9 L55 30 L55 55 L9 55 Z" />
        <path d="M30 10.5 L34 10.5" />
        <line x1="32" y1="22" x2="32" y2="44" />
        <line x1="28" y1="44" x2="36" y2="44" />
        <line x1="20" y1="28" x2="44" y2="28" />
        <path d="M20 28 L17 36 L23 36 Z" />
        <path d="M44 28 L41 36 L47 36 Z" />
      </g>
    </svg>
  );
}
