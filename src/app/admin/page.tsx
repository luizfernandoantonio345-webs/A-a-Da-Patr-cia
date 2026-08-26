"use client";
import { StaffGate } from "@/components/StaffGate";
import { GlowNav } from "@/components/GlowNav";
import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Plus, Trash2, Pencil, X, FolderPlus, TrendingUp, ShoppingBag, Wallet, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { brl, C } from "@/lib/format";
import type { Category, Product, Comanda } from "@/lib/types";

type Draft = { id?: string; name: string; description: string; price: string; is_build: boolean; category_id: string; image_url: string };

type Metrics = {
  todayRevenue: number;
  todayOrders: number;
  weekRevenue: number;
  activeComandas: number;
  queueNovos: number;
  queuePreparando: number;
  queueProntos: number;
  topProducts: { name: string; qty: number; revenue: number }[];
};

const EMPTY_METRICS: Metrics = {
  todayRevenue: 0, todayOrders: 0, weekRevenue: 0,
  activeComandas: 0, queueNovos: 0, queuePreparando: 0, queueProntos: 0,
  topProducts: [],
};

function AdminInner() {
  const [tab, setTab] = useState<"dashboard" | "cardapio" | "comandas">("dashboard");
  const [cats, setCats] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [comandas, setComandas] = useState<Comanda[]>([]);
  const [origin, setOrigin] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [newCat, setNewCat] = useState("");
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);

  async function loadMenuData() {
    const { data: c } = await supabase.from("categories").select("*").order("sort");
    const { data: p } = await supabase.from("products").select("*").order("sort");
    const { data: cm } = await supabase.from("comandas").select("*").order("number");
    setCats((c || []) as Category[]);
    setProducts((p || []) as Product[]);
    setComandas((cm || []) as Comanda[]);
  }

  async function loadDashboard() {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const weekStart  = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);

    const [{ data: todayOrd }, { data: weekOrd }, { data: liveOrd }, { data: activeCmd }] = await Promise.all([
      supabase.from("orders").select("total, status, order_items(name, qty, unit_price)").gte("created_at", todayStart.toISOString()),
      supabase.from("orders").select("total").gte("created_at", weekStart.toISOString()),
      supabase.from("orders").select("status, comanda:comandas(status)"),
      supabase.from("comandas").select("id").eq("status", "aberta"),
    ]);

    type TodayOrder = { total: number; status: string; order_items: { name: string; qty: number; unit_price: number }[] };
    const today = (todayOrd || []) as unknown as TodayOrder[];
    const todayRevenue = today.reduce((s, o) => s + Number(o.total), 0);
    const todayOrders  = today.length;
    const weekRevenue  = (weekOrd || []).reduce((s: number, o: { total: number }) => s + Number(o.total), 0);

    type LiveOrder = { status: string; comanda?: { status: string } };
    const live = ((liveOrd || []) as unknown as LiveOrder[]).filter((o) => o.comanda?.status === "aberta");

    const itemMap: Record<string, { qty: number; revenue: number }> = {};
    today.forEach((o) => o.order_items.forEach((it) => {
      if (!itemMap[it.name]) itemMap[it.name] = { qty: 0, revenue: 0 };
      itemMap[it.name].qty += it.qty;
      itemMap[it.name].revenue += it.qty * Number(it.unit_price);
    }));
    const topProducts = Object.entries(itemMap)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    setMetrics({
      todayRevenue, todayOrders,
      weekRevenue,
      activeComandas: (activeCmd || []).length,
      queueNovos:      live.filter((o) => o.status === "novo").length,
      queuePreparando: live.filter((o) => o.status === "preparando").length,
      queueProntos:    live.filter((o) => o.status === "pronto").length,
      topProducts,
    });
  }

  useEffect(() => {
    setOrigin(window.location.origin);
    loadMenuData();
    loadDashboard();
    // atualiza dashboard e fila em tempo real
    const ch = supabase.channel("admin-dash")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, loadDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "comandas" }, () => { loadDashboard(); loadMenuData(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- mutações de cardápio ---- */
  const patch = async (id: string, fields: Partial<Product>) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...fields } : p)));
    await supabase.from("products").update(fields).eq("id", id);
  };
  const removeProduct = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    setProducts((ps) => ps.filter((p) => p.id !== id));
    await supabase.from("products").delete().eq("id", id);
  };
  const saveDraft = async () => {
    if (!draft || !draft.name.trim()) return;
    const payload = { name: draft.name.trim(), description: draft.description.trim() || null, price: parseFloat(draft.price) || 0, is_build: draft.is_build, category_id: draft.category_id, image_url: draft.image_url.trim() || null };
    if (draft.id) { await supabase.from("products").update(payload).eq("id", draft.id); }
    else { const sort = products.filter((p) => p.category_id === draft.category_id).length + 1; await supabase.from("products").insert({ ...payload, sort }); }
    setDraft(null); loadMenuData();
  };
  const addCategory = async () => {
    if (!newCat.trim()) return;
    await supabase.from("categories").insert({ name: newCat.trim(), sort: cats.length + 1 });
    setNewCat(""); loadMenuData();
  };
  const removeCategory = async (id: string) => {
    if (!confirm("Excluir a categoria e todos os produtos dela?")) return;
    await supabase.from("categories").delete().eq("id", id); loadMenuData();
  };
  const resetComanda = async (id: string) => {
    await supabase.from("comandas").update({ status: "livre", opened_at: null, closed_at: null }).eq("id", id);
    loadMenuData();
  };

  const avgTicket = metrics.todayOrders > 0 ? metrics.todayRevenue / metrics.todayOrders : 0;
  const maxQty = Math.max(1, ...metrics.topProducts.map((p) => p.qty));
  const todayDate = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const tabIdx = tab === "dashboard" ? 0 : tab === "cardapio" ? 1 : 2;

  return (
    <div style={{ minHeight: "100vh", background: "#F8F4FC" }}>
      {/* Header */}
      <div style={{ background: `linear-gradient(135deg,${C.acaiDeep},${C.acaiDk2})`, padding: "16px 24px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div className="disp" style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>Açaí da Patrícia</div>
            <div style={{ fontSize: 11, color: "#C9AEE4", marginTop: 1 }}>Painel administrativo</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* indicador de fila ao vivo */}
            {metrics.queueNovos > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 700,
                padding: "5px 10px", borderRadius: 8, background: "rgba(47,125,58,.3)", color: C.lime }}>
                <span className="pulseDot" style={{ width: 6, height: 6, borderRadius: "50%", background: C.lime, display: "inline-block" }} />
                {metrics.queueNovos} novo{metrics.queueNovos > 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
        <GlowNav
          tabs={["Dashboard", "Cardápio", "Comandas & QR"]}
          active={tabIdx}
          onChange={(i) => setTab(i === 0 ? "dashboard" : i === 1 ? "cardapio" : "comandas")}
        />
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>

        {/* ======================== DASHBOARD ======================== */}
        {tab === "dashboard" && (
          <>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.muted, marginBottom: 18, textTransform: "capitalize" }}>{todayDate}</div>

            {/* Métricas principais */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
              <MetCard icon={<Wallet size={18} color={C.lime} />} label="Receita hoje" value={brl(metrics.todayRevenue)} accent={C.lime} />
              <MetCard icon={<ShoppingBag size={18} color="#C09FD8" />} label="Pedidos hoje" value={String(metrics.todayOrders)} accent="#C09FD8" />
              <MetCard icon={<TrendingUp size={18} color="#E8B130" />} label="Ticket médio" value={brl(avgTicket)} accent="#E8B130" />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <MetCard icon={<Users size={18} color={C.berry} />} label="Comandas ativas agora" value={String(metrics.activeComandas)} accent={C.berry} />
              <MetCard icon={<TrendingUp size={18} color={C.acai} />} label="Esta semana (7 dias)" value={brl(metrics.weekRevenue)} accent={C.acai} />
            </div>

            {/* Fila em tempo real */}
            <div style={{ borderRadius: 20, background: "#fff", border: `1px solid ${C.line}`, padding: "16px 20px", marginBottom: 20 }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 14, color: C.acaiDeep, marginBottom: 14 }}>Fila em tempo real</div>
              <div style={{ display: "flex", gap: 10 }}>
                <QueuePill count={metrics.queueNovos}      label="Novos"      color={C.leaf}    bg="rgba(47,125,58,.1)" pulse />
                <QueuePill count={metrics.queuePreparando} label="Preparando" color="#C08A18"   bg="rgba(192,138,24,.1)" />
                <QueuePill count={metrics.queueProntos}    label="Prontos"    color={C.acai}    bg="rgba(91,42,136,.1)" />
                {metrics.queueNovos + metrics.queuePreparando + metrics.queueProntos === 0 && (
                  <span style={{ fontSize: 13, color: C.muted, alignSelf: "center" }}>Fila vazia — nenhum pedido aberto</span>
                )}
              </div>
            </div>

            {/* Top produtos */}
            <div style={{ borderRadius: 20, background: "#fff", border: `1px solid ${C.line}`, padding: "16px 20px" }}>
              <div className="disp" style={{ fontWeight: 800, fontSize: 14, color: C.acaiDeep, marginBottom: 14 }}>Top produtos hoje</div>
              {metrics.topProducts.length === 0 && (
                <div style={{ fontSize: 13, color: C.muted, padding: "20px 0", textAlign: "center" }}>Sem vendas registradas hoje ainda.</div>
              )}
              {metrics.topProducts.map((p, i) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: C.muted, width: 16, textAlign: "right" }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "55%" }}>{p.name}</span>
                      <div style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.muted }}>{p.qty}×</span>
                        <span className="disp" style={{ fontSize: 12, fontWeight: 800, color: C.acai }}>{brl(p.revenue)}</span>
                      </div>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: C.line, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 999, width: `${(p.qty / maxQty) * 100}%`,
                        background: i === 0 ? `linear-gradient(90deg,${C.acai},${C.lime})` : `linear-gradient(90deg,${C.acai},${C.grape})`,
                        transition: "width .6s ease" }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ======================== CARDÁPIO ======================== */}
        {tab === "cardapio" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nova categoria (ex: Açaí no copo)"
                style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 14, background: "#fff" }} />
              <button className="press" onClick={addCategory}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", borderRadius: 12, border: "none", background: C.acai, color: "#fff", fontWeight: 700, fontSize: 13 }}>
                <FolderPlus size={16} /> Categoria
              </button>
            </div>
            {cats.map((cat) => (
              <div key={cat.id} style={{ marginBottom: 26 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0" }}>
                  <div className="disp" style={{ fontSize: 16, fontWeight: 800, color: C.acaiDeep, flex: 1 }}>{cat.name}</div>
                  <button className="press" onClick={() => setDraft({ name: "", description: "", price: "", is_build: false, category_id: cat.id, image_url: "" })}
                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 10, border: `1.5px solid ${C.acai}`, background: "#fff", color: C.acai, fontWeight: 700, fontSize: 12.5 }}>
                    <Plus size={15} /> Produto
                  </button>
                  <button className="press" onClick={() => removeCategory(cat.id)}
                    style={{ padding: 7, borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.muted }}><Trash2 size={15} /></button>
                </div>
                {products.filter((p) => p.category_id === cat.id).length === 0 && (
                  <div style={{ fontSize: 13, color: C.muted, padding: "10px 2px" }}>Sem produtos — clique em "Produto" para adicionar.</div>
                )}
                {products.filter((p) => p.category_id === cat.id).map((p) => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, marginBottom: 10, borderRadius: 16, background: "#fff", border: `1px solid ${C.line}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="disp" style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.is_build ? "montável · " : ""}{p.description || "sem descrição"}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: C.muted }}>R$</span>
                      <input type="number" step="0.01" defaultValue={Number(p.price).toFixed(2)}
                        onBlur={(e) => patch(p.id, { price: parseFloat(e.target.value) || 0 })}
                        style={{ width: 72, padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.line}`, fontSize: 13, fontWeight: 700, color: C.acai }} />
                    </div>
                    <Toggle label="Ativo"    on={p.active}    onClick={() => patch(p.id, { active: !p.active })} onColor={C.leaf} />
                    <Toggle label="Esgotado" on={p.sold_out}  onClick={() => patch(p.id, { sold_out: !p.sold_out })} onColor={C.berry} />
                    <button className="press" onClick={() => setDraft({ id: p.id, name: p.name, description: p.description || "", price: String(p.price), is_build: p.is_build, category_id: p.category_id, image_url: p.image_url || "" })}
                      style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.acai }}><Pencil size={15} /></button>
                    <button className="press" onClick={() => removeProduct(p.id)}
                      style={{ padding: 8, borderRadius: 10, border: `1px solid ${C.line}`, background: "#fff", color: C.berry }}><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

        {/* ======================== COMANDAS & QR ======================== */}
        {tab === "comandas" && (
          <>
            <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>Imprima um cartão por comanda. Cada QR abre o cardápio amarrado à comanda certa.</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 14 }}>
              {comandas.map((cm) => (
                <div key={cm.id} style={{ borderRadius: 16, padding: 14, background: "#fff", border: `1px solid ${C.line}`, textAlign: "center" }}>
                  <div className="disp" style={{ fontSize: 18, fontWeight: 800, color: C.acaiDeep }}>Nº {cm.number}</div>
                  <div style={{ display: "grid", placeItems: "center", padding: "10px 0" }}>
                    {origin && <QRCodeCanvas value={`${origin}/c/${cm.token}`} size={112} fgColor={C.acaiDeep} />}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: cm.status === "aberta" ? C.leaf : cm.status === "fechada" ? C.berry : C.muted }}>
                    {cm.status === "aberta" ? "EM USO" : cm.status === "fechada" ? "FECHADA" : "LIVRE"}
                  </div>
                  {cm.status === "fechada" && (
                    <button className="press" onClick={() => resetComanda(cm.id)}
                      style={{ marginTop: 6, width: "100%", padding: "5px 0", borderRadius: 8, border: "none", fontSize: 10, fontWeight: 700, background: "#EDE0F5", color: C.acai }}>
                      Liberar
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {draft && <ProductForm draft={draft} setDraft={setDraft} onSave={saveDraft} />}
    </div>
  );
}

/* ---- sub-componentes do admin ---- */

function MetCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div className="fu" style={{ borderRadius: 18, padding: "14px 16px", background: "#fff", border: `1px solid ${C.line}`,
      boxShadow: "0 4px 20px -10px rgba(42,14,63,.15)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <div style={{ display: "grid", placeItems: "center", width: 32, height: 32, borderRadius: 10,
          background: `${accent}18` }}>
          {icon}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>{label}</span>
      </div>
      <div className="disp" style={{ fontSize: 20, fontWeight: 800, color: C.acaiDeep, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

function QueuePill({ count, label, color, bg, pulse }: { count: number; label: string; color: string; bg: string; pulse?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, background: bg }}>
      {pulse && count > 0 && (
        <span className="pulseDot" style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
      )}
      <div>
        <div className="disp" style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{count}</div>
        <div style={{ fontSize: 10, fontWeight: 700, color, opacity: .7, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function ProductForm({ draft, setDraft, onSave }:
  { draft: Draft; setDraft: (d: Draft | null) => void; onSave: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, display: "grid", placeItems: "center", padding: 16, background: "rgba(20,8,30,.55)" }}
      onClick={() => setDraft(null)}>
      <div className="fu" onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 22, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px", background: C.acaiDeep }}>
          <span className="disp" style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{draft.id ? "Editar produto" : "Novo produto"}</span>
          <button onClick={() => setDraft(null)} style={{ color: "#fff", background: "none", border: "none" }}><X size={20} /></button>
        </div>
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <Field label="Nome"><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex: Taça Especial" style={inp} /></Field>
          <Field label="Descrição"><input value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Ex: 500ml com morango e Nutella" style={inp} /></Field>
          <Field label="Preço (R$)"><input type="number" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0,00" style={inp} /></Field>
          <Field label="URL da foto (opcional)"><input value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://…" style={inp} /></Field>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 600, color: C.ink }}>
            <input type="checkbox" checked={draft.is_build} onChange={(e) => setDraft({ ...draft, is_build: e.target.checked })} />
            É um açaí montável (abre o passo a passo de tamanho/adicionais)
          </label>
          <button className="press" onClick={onSave}
            style={{ marginTop: 4, padding: 14, borderRadius: 14, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, background: `linear-gradient(120deg,${C.acai},${C.acaiDk2})` }}>
            {draft.id ? "Salvar alterações" : "Adicionar ao cardápio"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "11px 13px", borderRadius: 12, border: `1px solid ${C.line}`, fontSize: 14 };
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
      {children}
    </div>
  );
}
function Toggle({ label, on, onClick, onColor }: { label: string; on: boolean; onClick: () => void; onColor: string }) {
  return (
    <button onClick={onClick} className="press" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none" }}>
      <span style={{ width: 42, height: 24, borderRadius: 999, position: "relative", background: on ? onColor : "#D9CEE2", transition: "background .2s" }}>
        <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
      </span>
      <span style={{ fontSize: 10, fontWeight: 700, color: C.muted }}>{label}</span>
    </button>
  );
}

export default function Admin() {
  return <StaffGate><AdminInner /></StaffGate>;
}
