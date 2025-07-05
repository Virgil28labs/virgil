export function VirgilLogo({ size = 32, className = "" }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="flameGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b2a5c1" />
          <stop offset="50%" stopColor="#6c3baa" />
          <stop offset="100%" stopColor="#39293e" />
        </linearGradient>
        <linearGradient id="flameGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#efb0c2" />
          <stop offset="50%" stopColor="#6c3baa" />
          <stop offset="100%" stopColor="#39293e" />
        </linearGradient>
      </defs>
      
      {/* Left flame elements */}
      <path 
        d="M20 80 Q15 70 18 60 Q22 50 25 45 Q30 35 28 25 Q26 15 30 10 Q35 8 32 20 Q30 30 35 40 Q40 50 42 60 Q45 70 40 80 Z" 
        fill="url(#flameGradient1)" 
        opacity="0.7"
      />
      
      {/* Right flame elements */}
      <path 
        d="M55 85 Q50 75 52 65 Q55 55 60 50 Q65 40 70 30 Q75 20 78 15 Q82 8 85 12 Q88 18 85 25 Q82 35 78 45 Q75 55 72 65 Q70 75 65 85 Z" 
        fill="url(#flameGradient2)"
      />
      
      {/* Center flame */}
      <path 
        d="M45 88 Q40 78 43 68 Q46 58 50 53 Q55 43 58 33 Q62 23 65 18 Q68 13 72 16 Q75 20 72 28 Q68 38 65 48 Q62 58 58 68 Q55 78 50 88 Z" 
        fill="url(#flameGradient1)"
      />
      
      {/* Additional flame details */}
      <path 
        d="M30 75 Q28 65 32 58 Q36 50 38 45 Q42 38 40 32 Q38 28 42 30 Q45 35 42 42 Q38 52 35 62 Q32 72 35 75 Z" 
        fill="url(#flameGradient2)" 
        opacity="0.8"
      />
    </svg>
  )
}