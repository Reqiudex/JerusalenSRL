// Fondo de mármol Calacatta con vetas doradas: SVG estático, sin animación (0 % de CPU).
export default function MarmolFondo() {
  return (
    <svg className="fondo-marmol" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="veta-oro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b8892f" stopOpacity="0" />
          <stop offset=".35" stopColor="#c9a86a" stopOpacity=".55" />
          <stop offset=".65" stopColor="#e8d3a2" stopOpacity=".6" />
          <stop offset="1" stopColor="#9c7d43" stopOpacity="0" />
        </linearGradient>
        <filter id="veta-suave" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.2" /></filter>
      </defs>
      <g fill="none" strokeLinecap="round" filter="url(#veta-suave)">
        <path d="M-40 180 C 220 120, 380 300, 620 260 S 1020 120, 1260 220 S 1560 340, 1680 300" stroke="url(#veta-oro)" strokeWidth="2.2" />
        <path d="M-60 640 C 180 560, 420 720, 700 660 S 1080 520, 1320 600 S 1580 700, 1700 660" stroke="url(#veta-oro)" strokeWidth="1.6" />
        <path d="M300 -40 C 340 160, 260 320, 360 520 S 520 820, 480 1060" stroke="#8a8d91" strokeOpacity=".16" strokeWidth="1.2" />
        <path d="M1120 -60 C 1060 140, 1180 360, 1100 560 S 980 860, 1060 1060" stroke="#8a8d91" strokeOpacity=".14" strokeWidth="1" />
        <path d="M620 260 C 700 340, 760 420, 900 450 S 1140 560, 1320 600" stroke="#c9a86a" strokeOpacity=".22" strokeWidth=".9" />
      </g>
    </svg>
  )
}
