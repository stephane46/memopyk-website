import React, { useEffect, useMemo, useRef, useState } from "react";

/** RoundedPeelCorner — bottom-right "paper peel" that hugs the card radius. */
export default function RoundedPeelCorner({
  colorTop = "#F2A300",
  colorFold = "#D67C4A",
  className = "",
}: {
  colorTop?: string;
  colorFold?: string;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [Rdet, setRdet] = useState<number | null>(null);

  // Detect the card's bottom-right radius from the parent element
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (!parent) return;
    const read = () => {
      const cs = getComputedStyle(parent);
      const v = parseFloat(cs.borderBottomRightRadius || "0");
      setRdet(Number.isFinite(v) ? v : 16);
    };
    const ro = new ResizeObserver(read);
    ro.observe(parent);
    read();
    return () => ro.disconnect();
  }, []);

  // ---- Resolve geometry safely ----
  const { C, R, Rout, Rin, t, tip, pathFlap, pathInner } = useMemo(() => {
    const Rraw = Rdet ?? 16;

    // Pick a peel box size from card radius (keeps auto-sizing)
    const Cauto = Math.ceil(Rraw * 4.0);       // big hero curl; tweak 3.6–4.4 if desired
    const C = Math.max(10, Cauto);

    // Card corner radius, clamped so math never goes outside the box
    const R = Math.max(1, Math.min(Rraw, C - 2));

    // ✅ KEY FIX: use a MUCH LARGER outer radius for the flap (not the card radius)
    // Rout controls how far the peel runs along the bottom/right edges.
    // For a bold curl, aim ~ 2.5–3.2 × the card radius, but never exceed box.
    const Rout = Math.min(C - 2, R * 2.8);

    // Curl band thickness and rounded tip
    const t   = Math.max(12, Math.min(Rout * 0.45, C * 0.55));
    const tip = Math.min(t * 0.55, Rout * 0.75);

    // Inner radius (kept positive and not equal to Rout)
    const Rin = Math.max(1, Rout - t);

    // Geometry (quarter-circles centered at C,C)
    const p1x = C - Rout, p1y = C;       // outer arc start (bottom edge)
    const p2x = C,        p2y = C - Rout; // outer arc end   (right edge)

    const i1x = C - Rin,  i1y = C;       // inner arc start
    const i2x = C,        i2y = C - Rin; // inner arc end

    // Flap band between outer and inner quarter-circles, rounded toward the tip
    const pathFlap =
      `M ${p1x},${p1y} ` +
      `A ${Rout},${Rout} 0 0 0 ${p2x},${p2y} ` +
      `C ${C},${C - t * 0.68} ${C - t * 0.30},${C} ${C - tip},${C - tip} ` +
      `C ${C - t},${C - t * 0.30} ${C - t * 0.68},${C - t} ${i2x},${i2y} ` +
      `A ${Rin},${Rin} 0 0 1 ${i1x},${i1y} Z`;

    // Subtle "crease" highlight along the inner arc
    const pathInner = `M ${i1x},${i1y} A ${Rin},${Rin} 0 0 0 ${i2x},${i2y}`;

    return { C, R, Rout, Rin, t, tip, pathFlap, pathInner };
  }, [Rdet]);

  // expose peel size to the parent and ensure layering
  useEffect(() => {
    const parent = boxRef.current?.parentElement;
    if (!parent) return;
    parent.style.setProperty("--peel-c", `${C}px`);
    parent.style.setProperty("--peel-r", `${R}px`);
  }, [C, R]);

  // dev hint: expose what we used (look in Elements → Attributes)
  const dbg = `R=${Rdet ?? "?"}; C=${C ?? "?"}`;

  return (
    <div
      ref={boxRef}
      data-peel={dbg}
      className={className}
      style={{
        position: "absolute",
        right: 0,
        bottom: 0,
        width: C,
        height: C,
        pointerEvents: "none",
        willChange: "transform",
        contain: "layout paint size",
        zIndex: 10,
        backgroundColor: "transparent",
      }}
    >
      <svg
        viewBox={`0 0 ${C} ${C}`}
        width={C}
        height={C}
        style={{ width: C, height: C, display: "block" }}
        aria-hidden
      >
        <defs>
          <filter id="peelShadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodOpacity="0.18" />
            <feDropShadow dx="-2" dy="8" stdDeviation="7" floodOpacity="0.10" />
          </filter>
          <linearGradient id="peelTop" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%"  stopColor={shade(colorTop, -0.04)} />
            <stop offset="60%" stopColor={colorTop} />
            <stop offset="100%" stopColor={tint(colorTop, 0.10)} />
          </linearGradient>
          <linearGradient id="peelFold" x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%"  stopColor={shade(colorFold, 0.10)} />
            <stop offset="100%" stopColor={colorFold} />
          </linearGradient>
          <clipPath id="peelClip"><path d={pathFlap} /></clipPath>
        </defs>

        <g filter="url(#peelShadow)">
          <path d={pathFlap} fill="url(#peelTop)" />
          <path d={pathFlap} fill="url(#peelFold)" opacity="0.25" clipPath="url(#peelClip)" />
          <path d={pathInner} stroke="white" strokeOpacity="0.55" strokeWidth={Math.max(0.75, t * 0.06)} />
        </g>
      </svg>
    </div>
  );
}

/* tiny color helpers */
function clamp01(n: number){ return Math.max(0, Math.min(1, n)); }
function hexToRgb(hex: string){
  const h = hex.replace("#","").trim();
  const full = h.length===3 ? h.split("").map(c=>c+c).join("") : h;
  const n = parseInt(full, 16);
  return { r:(n>>16)&255, g:(n>>8)&255, b:n&255 };
}
function rgbToHex(r:number,g:number,b:number){
  const p=(v:number)=>v.toString(16).padStart(2,"0");
  return `#${p(r)}${p(g)}${p(b)}`;
}
function shade(hex:string, amt:number){
  const {r,g,b}=hexToRgb(hex);
  return rgbToHex(
    Math.round(clamp01((r/255)*(1+amt))*255),
    Math.round(clamp01((g/255)*(1+amt))*255),
    Math.round(clamp01((b/255)*(1+amt))*255)
  );
}
function tint(hex:string, amt:number){ return shade(hex, amt); }