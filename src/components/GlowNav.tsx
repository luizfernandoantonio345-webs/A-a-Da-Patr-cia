"use client";
import { useEffect, useRef } from "react";

type Props = {
  tabs: string[];
  active: number;
  onChange: (i: number) => void;
};

const INK = "#B49BC6";
const BG1 = "#3A1556";
const BG2 = "#26103A";

export function GlowNav({ tabs, active, onChange }: Props) {
  const navRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const state = useRef({ Lx: 0, Rx: 0, vL: 0, vR: 0, laid: false, rects: [] as {left:number;right:number;top:number;height:number}[], navH: 56, active });

  state.current.active = active;

  useEffect(() => {
    const measure = () => {
      const nav = navRef.current, svg = svgRef.current;
      if (!nav || !svg) return;
      const nr = nav.getBoundingClientRect();
      const rects = Array.from(nav.querySelectorAll<HTMLButtonElement>("[data-tab]")).map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left - nr.left, right: r.right - nr.left, top: r.top - nr.top, height: r.height };
      });
      state.current.rects = rects;
      state.current.navH = nr.height;
      svg.setAttribute("viewBox", `0 0 ${nr.width} ${nr.height}`);
      if (!state.current.laid && rects[active]) {
        state.current.Lx = rects[active].left; state.current.Rx = rects[active].right; state.current.laid = true;
      }
    };
    measure();
    window.addEventListener("resize", measure);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.032, (now - last) / 1000); last = now;
      const s = state.current, t = s.rects[s.active];
      if (t) {
        const curC = (s.Lx + s.Rx) / 2, tgtC = (t.left + t.right) / 2;
        const right = tgtC > curC;
        const kLead = 430, dLead = 34, kTrail = 150, dTrail = 24;
        const kR = right ? kLead : kTrail, dR = right ? dLead : dTrail;
        const kL = right ? kTrail : kLead, dL = right ? dTrail : dLead;
        s.vL += (-kL * (s.Lx - t.left) - dL * s.vL) * dt; s.Lx += s.vL * dt;
        s.vR += (-kR * (s.Rx - t.right) - dR * s.vR) * dt; s.Rx += s.vR * dt;
        const path = pathRef.current;
        if (path) {
          const rad = t.height / 2 + 2, cy = t.top + t.height / 2;
          const left = Math.min(s.Lx, s.Rx), rightX = Math.max(s.Lx, s.Rx);
          const x = left, w = Math.max(rad * 2, rightX - left), span = rightX - left;
          const y = cy - rad, r = rad, x2 = x + w;
          path.setAttribute("d", `M ${x+r} ${y} L ${x2-r} ${y} A ${r} ${r} 0 0 1 ${x2-r} ${y+2*r} L ${x+r} ${y+2*r} A ${r} ${r} 0 0 1 ${x+r} ${y} Z`);
          path.setAttribute("stroke-width", (2.2 + Math.min(span / 120, 1) * 1.5).toFixed(2));
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", measure); };
  }, [active]);

  return (
    <div ref={navRef} style={{ position: "relative", display: "flex", gap: 4, padding: 6, borderRadius: 999,
      background: `linear-gradient(160deg,${BG1},${BG2})`, border: "1px solid rgba(166,212,90,.14)",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,.06),0 12px 30px -16px rgba(42,14,63,.8)" }}>
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", zIndex: 1 }}>
        <defs>
          <linearGradient id="glowlit" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#7B3FB0" /><stop offset=".5" stopColor="#A6D45A" /><stop offset="1" stopColor="#7B3FB0" />
          </linearGradient>
        </defs>
        <path ref={pathRef} fill="none" stroke="url(#glowlit)" strokeLinejoin="round"
          style={{ filter: "drop-shadow(0 0 3px rgba(166,212,90,.9)) drop-shadow(0 0 9px rgba(123,63,176,.85))" }} />
      </svg>
      {tabs.map((label, i) => (
        <button key={label} data-tab aria-selected={i === active} onClick={() => onChange(i)}
          style={{ position: "relative", zIndex: 2, flex: 1, border: "none", background: "transparent",
            color: i === active ? "#fff" : INK, fontSize: 12.5, fontWeight: 700, padding: "11px 6px",
            borderRadius: 999, cursor: "pointer", transition: "color .3s", whiteSpace: "nowrap" }}>
          {label}
        </button>
      ))}
    </div>
  );
}
