"use client";
import { StaffGate } from "@/components/StaffGate";
import { useEffect, useRef, useState } from "react";
import { Check, ScanLine } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl, C } from "@/lib/format";
import type { Order } from "@/lib/types";

function BalcaoInner() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"fila" | "comandas">("fila");
  const prevNovos = useRef(0);

  async function load() {
    const { data } = await supabase
      .from("orders")
      .select("*, order_items(*, order_item_options(*)), comanda:comandas(number,status)")
      .order("created_at");
    const open = ((data || []) as unknown as Order[]).filter((o) => o.comanda?.status === "aberta");
    // som ao chegar pedido novo
    const novos = open.filter((o) => o.status === "novo").length;
    if (novos > prevNovos.current) beep();
    prevNovos.current = novos;
    setOrders(open);
  }

  useEffect(() => {
    load();
    const ch = supabase.channel("balcao")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "order_items" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
  };
  const fechar = async (comandaId: string) => {
    await supabase.from("comandas").update({ status: "fechada", closed_at: new Date().toISOString() }).eq("id", comandaId);
  };

  const stC: Record<string, string> = { novo: C.leaf, preparando: "#C08A18", pronto: C.acai };
  const stL: Record<string, string> = { novo: "Novo", preparando: "Preparando", pronto: "Pronto" };

  const comandas = Object.values(orders.reduce((m: Record<string, { id: string; number: number; total: number; n: number; ord: number }>, o) => {
    const k = o.comanda_id;
    (m[k] ||= { id: k, number: o.comanda?.number ?? 0, total: 0, n: 0, ord: 0 });
    m[k].total += Number(o.total);
    m[k].n += o.order_items.reduce((a, l) => a + l.qty, 0);
    m[k].ord += 1;
    return m;
  }, {}));

  return (
    <div style={{ minHeight: "100vh", background: "#160C20" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 20px", background: "#100817" }}>
        <div style={{ display: "grid", placeItems: "center", borderRadius: 12, flex: "none", width: 34, height: 34, background: C.lime }}><ScanLine size={17} color={C.acaiDeep} /></div>
        <div style={{ flex: 1 }}>
          <div className="disp" style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Balcão · Açaí da Patrícia</div>
          <div style={{ fontSize: 11, color: "#A98FBB" }}>Pedidos em tempo real</div></div>
        <div style={{ fontSize: 12, fontWeight: 700, padding: "6px 12px", borderRadius: 8, background: "rgba(166,212,90,.16)", color: C.lime }}>
          {orders.filter((o) => o.status === "novo").length} novos</div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "12px 20px" }}>
        {(["fila", "comandas"] as const).map((t) => { const on = tab === t; return (
          <button key={t} onClick={() => setTab(t)} className="press" style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 8, border: "none",
            background: on ? C.acai : "#241531", color: on ? "#fff" : "#A98FBB" }}>{t === "fila" ? "Fila da cozinha" : "Comandas abertas"}</button>); })}
      </div>

      <div style={{ padding: "0 20px 24px" }}>
        {tab === "fila" ? (
          orders.length === 0 ? <Empty text="Sem pedidos abertos no momento." /> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {orders.map((o) => (
              <div key={o.id} className="fu" style={{ borderRadius: 16, overflow: "hidden", background: "#211330", border: `1px solid ${o.status === "novo" ? C.leaf : "#332145"}` }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #332145" }}>
                  <span className="disp" style={{ color: "#fff", fontWeight: 800, fontSize: 15 }}>Comanda {o.comanda?.number}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: stC[o.status], color: "#fff" }}>{stL[o.status]}</span></div>
                <div style={{ padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, marginBottom: 8, color: "#A98FBB" }}>{new Date(o.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</div>
                  {o.order_items.map((l) => (
                    <div key={l.id} style={{ fontSize: 11.5, marginBottom: 6, color: "#E6D7F0" }}>
                      <b style={{ color: "#fff" }}>{l.qty}× {l.name}</b>
                      {l.order_item_options.length > 0 && <em style={{ fontStyle: "normal", display: "block", paddingLeft: 12, fontSize: 10, color: "#C3A4D6" }}>+ {l.order_item_options.map((x) => x.name).join(", ")}</em>}
                    </div>))}
                </div>
                <div style={{ padding: "0 12px 12px" }}>
                  {o.status === "novo" && <BtnFull color="#C08A18" onClick={() => setStatus(o.id, "preparando")}>Iniciar preparo</BtnFull>}
                  {o.status === "preparando" && <BtnFull color={C.acai} onClick={() => setStatus(o.id, "pronto")}>Marcar pronto</BtnFull>}
                  {o.status === "pronto" && <BtnFull color={C.leaf} onClick={() => setStatus(o.id, "entregue")}>Confirmar entrega</BtnFull>}
                </div>
              </div>))}
          </div>
        ) : (
          comandas.length === 0 ? <Empty text="Nenhuma comanda aberta." /> :
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {comandas.map((cm) => (
              <div key={cm.id} className="fu" style={{ borderRadius: 16, padding: 16, display: "flex", alignItems: "center", gap: 16, background: "#211330", border: "1px solid #332145" }}>
                <div style={{ flex: 1 }}>
                  <div className="disp" style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>Comanda {cm.number}</div>
                  <div style={{ fontSize: 11, marginTop: 2, color: "#A98FBB" }}>{cm.n} itens · {cm.ord} pedido(s)</div></div>
                <div className="disp" style={{ fontSize: 24, fontWeight: 800, color: C.lime }}>{brl(cm.total)}</div>
                <button className="press" onClick={() => fechar(cm.id)} style={{ padding: "10px 16px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#fff", border: "none", background: C.leaf }}>Fechar (pago)</button>
              </div>))}
          </div>
        )}
      </div>
    </div>
  );
}

function BtnFull({ color, onClick, children }: { color: string; onClick: () => void; children: React.ReactNode }) {
  return <button className="press" onClick={onClick} style={{ width: "100%", padding: 8, borderRadius: 8, fontSize: 11, fontWeight: 700, color: "#fff", border: "none", background: color }}>{children}</button>;
}
function Empty({ text }: { text: string }) {
  return <div style={{ textAlign: "center", fontSize: 13, marginTop: 80, color: "#8A72A0" }}>{text}</div>;
}
function beep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = "sine"; o.frequency.value = 880; g.gain.value = 0.08;
    o.start(); o.stop(ctx.currentTime + 0.18);
  } catch { /* ignore */ }
}

export default function Balcao() {
  return <StaffGate><BalcaoInner /></StaffGate>;
}
