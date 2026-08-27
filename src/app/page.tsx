import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 24px",
      background: "linear-gradient(165deg,#3A1556 0%,#2A0E3F 55%,#160C20 100%)",
      position: "relative", overflow: "hidden",
    }}>
      {/* orbs decorativos */}
      <div style={{ position:"absolute", width:520, height:520, right:-180, top:-160,
        borderRadius:"50%", background:"radial-gradient(circle,rgba(123,63,176,.28) 0%,transparent 70%)",
        pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:340, height:340, left:-110, bottom:-80,
        borderRadius:"50%", background:"radial-gradient(circle,rgba(166,212,90,.14) 0%,transparent 70%)",
        pointerEvents:"none" }} />
      <div style={{ position:"absolute", width:200, height:200, left:"40%", top:"15%",
        borderRadius:"50%", background:"radial-gradient(circle,rgba(166,212,90,.07) 0%,transparent 70%)",
        pointerEvents:"none" }} />

      <div style={{ position:"relative", width:"100%", maxWidth:400, display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
        {/* Logo */}
        <div style={{ marginBottom:36 }}>
          <BrandLogo scale={1.15} />
        </div>

        {/* divisor */}
        <div style={{ width:"100%", height:1, background:"linear-gradient(90deg,transparent,rgba(166,212,90,.3),transparent)", marginBottom:32 }} />

        {/* cards de acesso */}
        <div style={{ width:"100%", display:"flex", flexDirection:"column", gap:12 }}>
          <Link href="/balcao" style={{
            display:"flex", alignItems:"center", justifyContent:"space-between", textDecoration:"none",
            padding:"18px 20px", borderRadius:20,
            background:"rgba(255,255,255,.05)",
            border:"1px solid rgba(166,212,90,.22)",
            backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
          }}>
            <div>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:16, fontWeight:800, color:"#fff" }}>
                Balcão · Cozinha
              </div>
              <div style={{ fontSize:11, color:"#A98FBB", marginTop:3, fontWeight:500 }}>
                Fila de pedidos em tempo real
              </div>
            </div>
            <div style={{ width:38, height:38, borderRadius:12, background:"#A6D45A",
              display:"grid", placeItems:"center", flexShrink:0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="#2A0E3F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>

          <Link href="/admin" style={{
            display:"flex", alignItems:"center", justifyContent:"space-between", textDecoration:"none",
            padding:"18px 20px", borderRadius:20,
            background:"rgba(255,255,255,.05)",
            border:"1px solid rgba(123,63,176,.3)",
            backdropFilter:"blur(12px)", WebkitBackdropFilter:"blur(12px)",
          }}>
            <div>
              <div style={{ fontFamily:"'Bricolage Grotesque',sans-serif", fontSize:16, fontWeight:800, color:"#fff" }}>
                Administração
              </div>
              <div style={{ fontSize:11, color:"#A98FBB", marginTop:3, fontWeight:500 }}>
                Métricas, cardápio e comandas
              </div>
            </div>
            <div style={{ width:38, height:38, borderRadius:12,
              background:"rgba(123,63,176,.45)", border:"1px solid rgba(123,63,176,.5)",
              display:"grid", placeItems:"center", flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#D5C0EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </Link>
        </div>

        {/* nota QR */}
        <div style={{ marginTop:28, textAlign:"center", fontSize:11.5, color:"#5A456C", lineHeight:1.7 }}>
          Clientes acessam escaneando o QR da mesa
          <br />
          <span style={{ fontFamily:"monospace", background:"rgba(255,255,255,.06)", padding:"2px 10px", borderRadius:6, fontSize:10.5, color:"#8E72A8" }}>
            /c/&lt;token&gt;
          </span>
        </div>
      </div>
    </main>
  );
}
