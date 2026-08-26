"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { C } from "@/lib/format";
import type { Session } from "@supabase/supabase-js";

export function StaffGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const login = async () => {
    setBusy(true); setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) setErr("E-mail ou senha inválidos.");
    setBusy(false);
  };

  if (!ready) return <Screen>Carregando…</Screen>;
  if (session) return (
    <>
      {children}
      <button
        onClick={() => supabase.auth.signOut()}
        style={{
          position: "fixed", top: 10, right: 12, zIndex: 9999,
          padding: "6px 12px", borderRadius: 8, border: "none",
          background: "rgba(0,0,0,.35)", color: "#fff",
          fontSize: 11, fontWeight: 700, cursor: "pointer",
        }}
      >
        Sair
      </button>
    </>
  );

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, background: `linear-gradient(165deg,${C.acaiDk2},${C.acaiDeep})` }}>
      <div style={{ width: "100%", maxWidth: 380, background: "#fff", borderRadius: 22, padding: 24 }}>
        <div className="disp" style={{ fontSize: 22, fontWeight: 800, color: C.acaiDeep }}>Acesso da equipe 🫐</div>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 6, marginBottom: 18 }}>Entre para acessar o painel da loja.</p>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" type="email"
          style={inp} />
        <input value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Senha" type="password"
          onKeyDown={(e) => e.key === "Enter" && login()} style={{ ...inp, marginTop: 10 }} />
        {err && <div style={{ color: C.berry, fontSize: 12, fontWeight: 600, marginTop: 10 }}>{err}</div>}
        <button onClick={login} disabled={busy} className="press"
          style={{ width: "100%", marginTop: 16, padding: 14, borderRadius: 14, border: "none", color: "#fff", fontWeight: 700, fontSize: 14,
            background: `linear-gradient(120deg,${C.acai},${C.acaiDk2})`, opacity: busy ? .6 : 1 }}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 14, lineHeight: 1.4 }}>
          As contas da equipe são criadas no Supabase (Authentication → Users). Crie um usuário para a Patrícia e um para o balcão.
        </p>
      </div>
    </div>
  );
}
const inp: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 14 };
function Screen({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: C.muted, background: C.cream }}>{children}</div>;
}
