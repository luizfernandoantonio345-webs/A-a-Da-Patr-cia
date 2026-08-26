import Link from "next/link";

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
      background: "linear-gradient(165deg,#3A1556,#2A0E3F)", color: "#fff", textAlign: "center" }}>
      <div style={{ maxWidth: 420 }}>
        <div className="disp" style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.05 }}>
          Açaí da Patrícia 🫐
        </div>
        <p style={{ color: "#D9C7EA", marginTop: 12 }}>
          Este é o app da loja. O cliente entra escaneando o QR da comanda na mesa —
          o link tem o formato <code>/c/&lt;token&gt;</code>.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 24 }}>
          <Link href="/balcao" style={{ background: "#A6D45A", color: "#2A0E3F", fontWeight: 700,
            padding: "12px 18px", borderRadius: 14, textDecoration: "none" }}>Abrir Balcão</Link>
          <Link href="/admin" style={{ background: "rgba(255,255,255,.12)", color: "#fff", fontWeight: 700,
            padding: "12px 18px", borderRadius: 14, textDecoration: "none" }}>Abrir Admin</Link>
        </div>
      </div>
    </main>
  );
}
