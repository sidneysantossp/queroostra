"use client";

import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Check,
  CircleDollarSign,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Filter,
  ImageIcon,
  MapPin,
  Package,
  PackageCheck,
  Plus,
  Save,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Truck,
  Users,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminHeading, AdminShell } from "@/components/admin-shell";
import { addons as initialAddons, deliveryWindows, products as initialProducts } from "@/lib/catalog";
import { sampleOrder } from "@/lib/demo-data";
import type { AddonRecord, ProductRecord } from "@/lib/domain";
import type { CreatedOrder } from "@/lib/domain";
import { supabaseConfigured } from "@/lib/supabase/config";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const PRODUCTS_KEY = "quero-ostra-admin-products";
const ADDONS_KEY = "quero-ostra-admin-addons";

const mockOrders = [
  sampleOrder,
  { ...sampleOrder, id: "order-2", number: "QO-2026-0147", status: "em_preparacao" as const, customer: { ...sampleOrder.customer, fullName: "Marina Costa" }, totals: { ...sampleOrder.totals, total: 167.8 }, dates: ["2026-06-14"] },
  { ...sampleOrder, id: "order-3", number: "QO-2026-0146", status: "aguardando_pagamento" as const, paymentStatus: "pending" as const, customer: { ...sampleOrder.customer, fullName: "Rafael Lima" }, totals: { ...sampleOrder.totals, total: 447.4 }, dates: ["2026-06-19", "2026-06-26"] },
  { ...sampleOrder, id: "order-4", number: "QO-2026-0145", status: "saiu_para_entrega" as const, customer: { ...sampleOrder.customer, fullName: "Bianca Alves" }, totals: { ...sampleOrder.totals, total: 98.8 }, dates: ["2026-06-14"] },
];

function useAdminOrders() {
  const [orders, setOrders] = useState<CreatedOrder[]>(mockOrders);
  useEffect(() => {
    if (!supabaseConfigured) return;
    const load = async () => {
      const response = await fetch("/api/admin/orders", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as { orders: CreatedOrder[] };
      setOrders(data.orders);
    };
    void load();
  }, []);
  return orders;
}

function MetricCard({ icon: Icon, label, value, note, alert = false }: { icon: typeof PackageCheck; label: string; value: string; note: string; alert?: boolean }) {
  return (
    <article className={`rounded-2xl border p-5 ${alert ? "border-amber-400/25 bg-amber-400/[0.04]" : "border-white/10 bg-[#0A0A0A]"}`}>
      <div className="flex items-start justify-between">
        <span className={`grid size-10 place-items-center rounded-full ${alert ? "bg-amber-400/10 text-amber-300" : "bg-gold/[0.07] text-gold"}`}><Icon size={19} /></span>
        <TrendingUp size={16} className="text-emerald-300/60" />
      </div>
      <p className="mt-5 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">{label}</p>
      <p className="mt-2 font-display text-3xl">{value}</p>
      <p className="mt-2 text-[0.68rem] text-white/30">{note}</p>
    </article>
  );
}

export function AdminDashboard() {
  const adminOrders = useAdminOrders();
  const monthRevenue = adminOrders
    .filter((order) => new Date(order.createdAt).getMonth() === new Date().getMonth())
    .reduce((total, order) => total + order.totals.total, 0);
  const pendingPayments = adminOrders.filter(
    (order) => order.paymentStatus === "pending",
  );
  const upcomingReservations = adminOrders.reduce(
    (total, order) =>
      total +
      order.dates.filter((date) => new Date(`${date}T23:59:59`) >= new Date())
        .length,
    0,
  );
  return (
    <AdminShell>
      <AdminHeading eyebrow="Visão geral" title="Operação de hoje" description="Reservas, pagamentos e capacidade em um único painel." action={<Link href="/admin/pedidos" className="gold-button">Ver pedidos <ArrowRight size={16} /></Link>} />
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={ShoppingBag} label="Pedidos recentes" value={String(adminOrders.length)} note="Base operacional atual" />
        <MetricCard icon={CircleDollarSign} label="Receita no mês" value={money.format(monthRevenue)} note="Pedidos carregados" />
        <MetricCard icon={WalletCards} label="Pagamentos pendentes" value={String(pendingPayments.length)} note={`${money.format(pendingPayments.reduce((total, order) => total + order.totals.total, 0))} aguardando`} alert />
        <MetricCard icon={CalendarDays} label="Próximas reservas" value={String(upcomingReservations)} note="Datas futuras confirmadas" />
      </div>

      <div className="mt-7 grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <section className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-5 md:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Pedidos recentes</p><h2 className="mt-2 font-display text-3xl">Fila operacional</h2></div><PackageCheck className="text-gold" /></div>
          <div className="mt-6 overflow-x-auto">
            <table className="admin-table min-w-[700px]">
              <thead><tr><th>Pedido</th><th>Cliente</th><th>Reserva</th><th>Status</th><th>Total</th><th /></tr></thead>
              <tbody>{adminOrders.slice(0, 6).map((order) => <tr key={order.id}><td className="font-semibold text-pearl">{order.number}</td><td>{order.customer.fullName}</td><td>{new Date(`${order.dates[0]}T12:00:00`).toLocaleDateString("pt-BR")}</td><td><AdminStatus status={order.status} /></td><td className="text-champagne">{money.format(order.totals.total)}</td><td><Link href={`/admin/pedidos/${order.id}`} className="admin-icon-button"><Eye size={15} /></Link></td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#0A0A0A] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-gold">Capacidade</p>
            <h2 className="mt-2 font-display text-3xl">Próximos dias</h2>
            <div className="mt-6 space-y-5">
              {[["Qua, 17/06", 18, 24], ["Qui, 18/06", 21, 24], ["Sex, 19/06", 29, 32], ["Sáb, 20/06", 32, 36]].map(([label, used, total]) => {
                const percentage = (Number(used) / Number(total)) * 100;
                return <div key={String(label)}><div className="flex justify-between text-xs"><span className="text-white/55">{label}</span><span className="text-champagne">{used}/{total}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gold" style={{ width: `${percentage}%` }} /></div></div>;
              })}
            </div>
          </section>
          <section className="rounded-2xl border border-amber-400/25 bg-amber-400/[0.04] p-6">
            <div className="flex gap-3"><AlertTriangle className="shrink-0 text-amber-300" size={20} /><div><p className="font-semibold text-amber-100">2 alertas operacionais</p><p className="mt-2 text-xs leading-6 text-white/40">Estoque da Reserva Premium abaixo de 10 unidades. Sexta-feira está com 90% da capacidade.</p></div></div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}

function AdminStatus({ status }: { status: string }) {
  const label: Record<string, string> = {
    aguardando_pagamento: "Aguardando",
    reserva_confirmada: "Confirmada",
    em_preparacao: "Preparação",
    saiu_para_entrega: "Em rota",
    entregue: "Entregue",
    cancelado: "Cancelado",
  };
  return <span className="rounded-full border border-gold/20 bg-gold/[0.05] px-3 py-1.5 text-[0.58rem] font-semibold uppercase tracking-[0.09em] text-champagne">{label[status] ?? status}</span>;
}

export function AdminOrdersPage() {
  const adminOrders = useAdminOrders();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = adminOrders.filter((order) => {
    const matchesQuery = `${order.number} ${order.customer.fullName}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (status === "all" || order.status === status);
  });
  return (
    <AdminShell>
      <AdminHeading eyebrow="Operação" title="Pedidos" description="Filtre, acompanhe e atualize todas as reservas." />
      <div className="mt-7 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4 md:flex-row">
        <label className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-11" placeholder="Pedido ou cliente" /></label>
        <label className="relative md:w-64"><Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={17} /><select value={status} onChange={(event) => setStatus(event.target.value)} className="field appearance-none pl-11"><option value="all">Todos os status</option><option value="aguardando_pagamento">Aguardando pagamento</option><option value="reserva_confirmada">Reserva confirmada</option><option value="em_preparacao">Em preparação</option><option value="saiu_para_entrega">Saiu para entrega</option></select></label>
      </div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
        <table className="admin-table min-w-[900px]">
          <thead><tr><th>Pedido</th><th>Cliente</th><th>Data da reserva</th><th>Pagamento</th><th>Status</th><th>CEP</th><th>Total</th><th /></tr></thead>
          <tbody>{filtered.map((order) => <tr key={order.id}><td className="font-semibold text-pearl">{order.number}</td><td>{order.customer.fullName}<span className="block text-[0.62rem] text-white/25">{order.customer.email}</span></td><td>{order.dates.map((date) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR")).join(", ")}</td><td>{order.paymentStatus === "confirmed" ? "Confirmado" : "Pendente"}</td><td><AdminStatus status={order.status} /></td><td>{order.address.cep}</td><td className="text-champagne">{money.format(order.totals.total)}</td><td><Link href={`/admin/pedidos/${order.id}`} className="admin-icon-button"><Eye size={15} /></Link></td></tr>)}</tbody>
        </table>
      </div>
    </AdminShell>
  );
}

export function AdminOrderDetail({ orderId }: { orderId: string }) {
  const adminOrders = useAdminOrders();
  const source = adminOrders.find((order) => order.id === orderId) ?? sampleOrder;
  const [status, setStatus] = useState(source.status);
  const [statusSaved, setStatusSaved] = useState(false);
  useEffect(() => setStatus(source.status), [source.status]);
  async function saveStatus() {
    const response = await fetch(`/api/admin/orders/${source.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setStatusSaved(response.ok);
  }
  return (
    <AdminShell>
      <AdminHeading eyebrow={`Pedido ${source.number}`} title={source.customer.fullName} description="Detalhes operacionais, pagamento e histórico." action={<AdminStatus status={status} />} />
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="admin-panel"><h2 className="admin-panel-title"><Package size={21} /> Itens e reservas</h2><div className="mt-5 divide-y divide-white/10">{source.items.map((item) => <div key={item.id} className="flex justify-between gap-5 py-4"><div><p className="font-display text-xl">{item.quantity}× {item.name}</p><p className="mt-1 text-xs text-white/35">{item.addons.map((addon) => addon.name).join(", ") || "Sem adicionais"}</p></div><p className="text-champagne">{money.format(item.subtotal)}</p></div>)}</div><div className="mt-5 grid gap-4 sm:grid-cols-2"><InfoBlock icon={CalendarDays} label="Datas" value={source.dates.join(", ")} /><InfoBlock icon={Clock3} label="Janela" value={source.deliveryWindow} /></div></section>
          <section className="grid gap-6 md:grid-cols-2"><div className="admin-panel"><h2 className="admin-panel-title"><Users size={20} /> Cliente</h2><p className="mt-5 text-sm leading-7 text-white/50">{source.customer.fullName}<br />{source.customer.email}<br />{source.customer.whatsapp}</p></div><div className="admin-panel"><h2 className="admin-panel-title"><MapPin size={20} /> Entrega</h2><p className="mt-5 text-sm leading-7 text-white/50">{source.address.street}, {source.address.number}<br />{source.address.neighborhood}<br />{source.address.city} - {source.address.state}, {source.address.cep}</p></div></section>
          <section className="admin-panel"><h2 className="admin-panel-title"><FileText size={20} /> Histórico</h2><div className="mt-5 space-y-4">{["Pedido criado pelo checkout", "Pagamento confirmado via Asaas", "Reserva confirmada pela operação"].map((text, index) => <div key={text} className="flex gap-4"><span className="mt-1 size-3 rounded-full bg-gold" /><div><p className="text-sm">{text}</p><p className="mt-1 text-[0.62rem] text-white/25">14/06/2026 às {10 + index}:20</p></div></div>)}</div></section>
        </div>
        <aside className="space-y-6">
          <section className="admin-panel"><h2 className="admin-panel-title"><Settings size={20} /> Atualizar status</h2><select value={status} onChange={(event) => setStatus(event.target.value as typeof status)} className="field mt-5"><option value="aguardando_pagamento">Aguardando pagamento</option><option value="pagamento_confirmado">Pagamento confirmado</option><option value="reserva_confirmada">Reserva confirmada</option><option value="em_preparacao">Em preparação</option><option value="saiu_para_entrega">Saiu para entrega</option><option value="entregue">Entregue</option><option value="cancelado">Cancelado</option></select><button onClick={saveStatus} className="gold-button mt-4 w-full justify-center"><Save size={16} /> Salvar status</button>{statusSaved && <p className="mt-3 text-xs text-emerald-200">Status atualizado.</p>}</section>
          <section className="admin-panel"><h2 className="admin-panel-title"><CircleDollarSign size={20} /> Pagamento</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between text-white/40"><span>Método</span><span className="text-pearl">{source.paymentMethod}</span></div><div className="flex justify-between text-white/40"><span>Status</span><span className="text-emerald-200">{source.paymentStatus}</span></div><div className="flex justify-between border-t border-white/10 pt-4"><span>Total</span><span className="font-display text-2xl text-champagne">{money.format(source.totals.total)}</span></div></div></section>
          <button className="outline-button w-full justify-center text-red-300"><Trash2 size={16} /> Cancelar pedido</button>
        </aside>
      </div>
    </AdminShell>
  );
}

function InfoBlock({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) {
  return <div className="rounded-xl bg-white/[0.025] p-4"><Icon className="text-gold" size={18} /><p className="mt-3 text-[0.58rem] uppercase tracking-[0.12em] text-white/30">{label}</p><p className="mt-2 text-sm">{value}</p></div>;
}

function useProductData() {
  const [items, setItems] = useState<ProductRecord[]>(initialProducts);
  useEffect(() => {
    const load = async () => {
      if (supabaseConfigured) {
        const response = await fetch("/api/admin/products", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { products: ProductRecord[] };
          setItems(data.products);
          return;
        }
      }
      const stored = window.localStorage.getItem(PRODUCTS_KEY);
      if (stored) setItems(JSON.parse(stored) as ProductRecord[]);
    };
    void load();
  }, []);
  function save(next: ProductRecord[]) {
    setItems(next);
    window.localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next));
    if (supabaseConfigured) {
      void fetch("/api/admin/products", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ products: next }),
      });
    }
  }
  return { items, save };
}

export function AdminProductsPage() {
  const { items, save } = useProductData();
  const [query, setQuery] = useState("");
  const filtered = items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <AdminShell>
      <AdminHeading eyebrow="Catálogo" title="Produtos" description="Gerencie experiências, bebidas, estoque, destaque e visibilidade." action={<Link href="/admin/produtos/novo" className="gold-button"><Plus size={16} /> Novo produto</Link>} />
      <div className="mt-7 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4"><label className="relative block"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="field pl-11" placeholder="Buscar produto" /></label></div>
      <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A] p-5">
        <table className="admin-table min-w-[850px]"><thead><tr><th>Produto</th><th>Categoria</th><th>Tipo</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Destaque</th><th /></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><span className="font-semibold text-pearl">{product.name}</span><span className="block text-[0.62rem] text-white/25">/{product.slug}</span></td><td>{product.category}</td><td>{product.type}</td><td className="text-champagne">{money.format(product.price)}</td><td>{product.stock}</td><td><button onClick={() => save(items.map((item) => item.id === product.id ? { ...item, active: !item.active } : item))} className={product.active ? "text-emerald-200" : "text-white/25"}>{product.active ? "Ativo" : "Inativo"}</button></td><td>{product.featured ? "Sim" : "Não"}</td><td><div className="flex gap-2"><Link href={`/admin/produtos/${product.id}`} className="admin-icon-button"><Edit3 size={15} /></Link><button onClick={() => save(items.filter((item) => item.id !== product.id))} className="admin-icon-button text-red-300"><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>
      </div>
    </AdminShell>
  );
}

export function AdminProductForm({ productId }: { productId?: string }) {
  const { items, save } = useProductData();
  const existing = items.find((item) => item.id === productId);
  const [form, setForm] = useState<ProductRecord>(existing ?? {
    id: crypto.randomUUID(),
    slug: "",
    name: "",
    shortDescription: "",
    fullDescription: "",
    type: "fresh",
    category: "experiencias",
    price: 0,
    stock: 0,
    active: true,
    featured: false,
    includedItems: [],
    preparationHours: 18,
    displayOrder: items.length + 1,
  });
  useEffect(() => {
    if (existing) setForm(existing);
  }, [existing]);
  const [saved, setSaved] = useState(false);
  function submit() {
    const next = existing ? items.map((item) => item.id === existing.id ? form : item) : [form, ...items];
    save(next);
    setSaved(true);
  }
  async function uploadProductImage(file?: File) {
    if (!file || !supabaseConfigured) return;
    const upload = new FormData();
    upload.append("file", file);
    const response = await fetch("/api/admin/upload", {
      method: "POST",
      body: upload,
    });
    if (!response.ok) return;
    const data = (await response.json()) as { url: string };
    setForm((current) => ({ ...current, image: data.url }));
  }
  return (
    <AdminShell>
      <AdminHeading eyebrow="Catálogo" title={existing ? "Editar produto" : "Novo produto"} description="Preencha os dados comerciais, operacionais e de exibição." action={<Link href="/admin/produtos" className="outline-button">Voltar</Link>} />
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_340px]">
        <section className="admin-panel">
          <div className="grid gap-5 md:grid-cols-2">
            <AdminField label="Nome" value={form.name} onChange={(name) => setForm({ ...form, name })} span />
            <AdminField label="Slug" value={form.slug} onChange={(slug) => setForm({ ...form, slug })} />
            <label className="field-label">Tipo<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ProductRecord["type"] })} className="field"><option value="fresh">Fresco</option><option value="gratinated">Gratinado</option><option value="beverage">Bebida</option></select></label>
            <AdminField label="Preço" type="number" value={String(form.price)} onChange={(price) => setForm({ ...form, price: Number(price) })} />
            <AdminField label="Estoque" type="number" value={String(form.stock)} onChange={(stock) => setForm({ ...form, stock: Number(stock) })} />
            <AdminField label="Descrição curta" value={form.shortDescription} onChange={(shortDescription) => setForm({ ...form, shortDescription })} span />
            <label className="field-label md:col-span-2">Descrição completa<textarea value={form.fullDescription} onChange={(event) => setForm({ ...form, fullDescription: event.target.value })} className="field min-h-32 resize-none" /></label>
          </div>
          <button type="button" onClick={submit} className="gold-button mt-7"><Save size={16} /> Salvar produto</button>
          {saved && <p className="mt-4 flex items-center gap-2 text-sm text-emerald-200"><Check size={16} /> Produto salvo no catálogo.</p>}
        </section>
        <aside className="space-y-6">
          <section className="admin-panel"><h2 className="admin-panel-title"><ImageIcon size={20} /> Imagens</h2><label className="group relative mt-5 grid aspect-video w-full cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-gold/25 bg-[#050505] text-xs text-white/35">{form.image && <Image src={form.image} alt={form.name || "Imagem do produto"} fill unoptimized={form.image.startsWith("http")} className="object-contain p-4" sizes="320px" />}<span className={`relative z-10 rounded-full bg-black/70 px-4 py-2 ${form.image ? "opacity-0 transition group-hover:opacity-100" : ""}`}>{form.image ? "Substituir imagem" : "Enviar imagem principal"}</span><input type="file" accept="image/*" className="sr-only" onChange={(event) => void uploadProductImage(event.target.files?.[0])} /></label>{form.image && <p className="mt-3 truncate text-[0.62rem] text-white/25">{form.image}</p>}</section>
          <section className="admin-panel"><h2 className="admin-panel-title"><Settings size={20} /> Publicação</h2><label className="check-row mt-5"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Produto ativo</label><label className="check-row mt-3"><input type="checkbox" checked={form.featured} onChange={(event) => setForm({ ...form, featured: event.target.checked })} /> Destaque na home</label></section>
        </aside>
      </div>
    </AdminShell>
  );
}

function AdminField({ label, value, onChange, span = false, type = "text" }: { label: string; value: string; onChange: (value: string) => void; span?: boolean; type?: string }) {
  return <label className={`field-label ${span ? "md:col-span-2" : ""}`}>{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="field" /></label>;
}

export function AdminAddonsPage() {
  const [items, setItems] = useState<AddonRecord[]>(initialAddons);
  const [name, setName] = useState("");
  useEffect(() => {
    const load = async () => {
      if (supabaseConfigured) {
        const response = await fetch("/api/admin/addons", { cache: "no-store" });
        if (response.ok) {
          const data = (await response.json()) as { addons: AddonRecord[] };
          setItems(data.addons);
          return;
        }
      }
      const saved = window.localStorage.getItem(ADDONS_KEY);
      if (saved) setItems(JSON.parse(saved) as AddonRecord[]);
    };
    void load();
  }, []);
  function save(next: AddonRecord[]) {
    setItems(next);
    window.localStorage.setItem(ADDONS_KEY, JSON.stringify(next));
    if (supabaseConfigured) {
      void fetch("/api/admin/addons", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addons: next }),
      });
    }
  }
  function add() { if (!name.trim()) return; save([{ id: crypto.randomUUID(), name, description: "Adicional cadastrado pelo admin.", price: 0, stock: 100, active: true, productIds: [] }, ...items]); setName(""); }
  return (
    <AdminShell>
      <AdminHeading eyebrow="Catálogo" title="Adicionais" description="Itens extras globais ou vinculados a produtos." />
      <div className="mt-7 flex gap-3 rounded-2xl border border-white/10 bg-[#0A0A0A] p-4"><input value={name} onChange={(event) => setName(event.target.value)} className="field" placeholder="Nome do novo adicional" /><button onClick={add} className="gold-button shrink-0"><Plus size={16} /> Adicionar</button></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{items.map((addon) => <article key={addon.id} className="admin-panel"><div className="flex justify-between gap-4"><div><h2 className="font-display text-2xl">{addon.name}</h2><p className="mt-2 text-xs text-white/35">{addon.description}</p></div><button onClick={() => save(items.filter((item) => item.id !== addon.id))} className="admin-icon-button text-red-300"><Trash2 size={15} /></button></div><div className="mt-5 flex items-end justify-between"><div><p className="text-[0.58rem] uppercase tracking-[0.12em] text-white/30">Preço</p><p className="mt-1 font-display text-2xl text-champagne">{money.format(addon.price)}</p></div><button onClick={() => save(items.map((item) => item.id === addon.id ? { ...item, active: !item.active } : item))} className={addon.active ? "text-xs text-emerald-200" : "text-xs text-white/25"}>{addon.active ? "Ativo" : "Inativo"}</button></div></article>)}</div>
    </AdminShell>
  );
}

export function AdminUsersPage() {
  type AdminUser = {
    id: string;
    full_name: string;
    email: string;
    role: "customer" | "admin";
    active: boolean;
    orderCount: number;
    lastOrder?: string;
  };
  const fallbackUsers: AdminUser[] = [
    { id: "demo-customer", full_name: "Cliente Quero Ostra", email: "cliente@queroostra.com.br", role: "customer", active: true, orderCount: 4, lastOrder: "2026-06-12" },
    { id: "demo-admin", full_name: "Operação Quero Ostra", email: "admin@queroostra.com.br", role: "admin", active: true, orderCount: 0 },
  ];
  const [users, setUsers] = useState<AdminUser[]>(fallbackUsers);
  useEffect(() => {
    if (!supabaseConfigured) return;
    void fetch("/api/admin/users", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { users?: AdminUser[] } | null) => data?.users && setUsers(data.users));
  }, []);
  async function updateRole(user: AdminUser, role: AdminUser["role"]) {
    setUsers((current) => current.map((item) => item.id === user.id ? { ...item, role } : item));
    if (!supabaseConfigured) return;
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: user.id, role }),
    });
  }
  return <AdminShell><AdminHeading eyebrow="Relacionamento" title="Usuários" description="Clientes, histórico de compras e permissões administrativas." /><div className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A] p-5"><table className="admin-table min-w-[800px]"><thead><tr><th>Nome</th><th>E-mail</th><th>Pedidos</th><th>Último pedido</th><th>Role</th><th>Status</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td className="font-semibold text-pearl">{user.full_name}</td><td>{user.email}</td><td>{user.orderCount}</td><td>{user.lastOrder ? new Date(user.lastOrder).toLocaleDateString("pt-BR") : "-"}</td><td><select value={user.role} onChange={(event) => updateRole(user, event.target.value as AdminUser["role"])} className="rounded-lg border border-white/10 bg-black px-3 py-2 text-xs"><option value="customer">cliente</option><option value="admin">admin</option></select></td><td className={user.active ? "text-emerald-200" : "text-red-200"}>{user.active ? "Ativo" : "Inativo"}</td></tr>)}</tbody></table></div></AdminShell>;
}

export function AdminDeliveryPage() {
  type Zone = { id?: string; name: string; cepStart: string; cepEnd: string; neighborhood?: string; city: string; fee: number; minimumOrder: number; active: boolean };
  const [zones, setZones] = useState<Zone[]>([
    { name: "Zona Sul central", cepStart: "04500000", cepEnd: "04799999", city: "São Paulo", fee: 14, minimumOrder: 60, active: true },
    { name: "Zona Sul estendida", cepStart: "04000000", cepEnd: "04999999", city: "São Paulo", fee: 18, minimumOrder: 60, active: true },
  ]);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured) return;
    void fetch("/api/admin/delivery-zones", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { zones?: Zone[] } | null) => data?.zones && setZones(data.zones));
  }, []);
  function update(index: number, patch: Partial<Zone>) {
    setZones((current) => current.map((zone, zoneIndex) => zoneIndex === index ? { ...zone, ...patch } : zone));
  }
  async function saveZones() {
    if (supabaseConfigured) {
      const response = await fetch("/api/admin/delivery-zones", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ zones }),
      });
      if (!response.ok) return;
    }
    setSaved(true);
  }
  return <AdminShell><AdminHeading eyebrow="Logística" title="Áreas de entrega" description="Defina faixas de CEP, taxas e pedido mínimo." action={<button onClick={() => setZones([...zones, { name: "Nova região", cepStart: "00000000", cepEnd: "00000000", city: "São Paulo", fee: 0, minimumOrder: 0, active: true }])} className="gold-button"><Plus size={16} /> Nova região</button>} /><div className="mt-7 grid gap-5">{zones.map((zone, index) => <section key={zone.id ?? index} className="admin-panel"><div className="grid gap-4 md:grid-cols-5"><AdminField label="Região" value={zone.name} onChange={(value) => update(index, { name: value })} /><AdminField label="CEP inicial" value={zone.cepStart} onChange={(value) => update(index, { cepStart: value })} /><AdminField label="CEP final" value={zone.cepEnd} onChange={(value) => update(index, { cepEnd: value })} /><AdminField label="Taxa" type="number" value={String(zone.fee)} onChange={(value) => update(index, { fee: Number(value) })} /><AdminField label="Pedido mínimo" type="number" value={String(zone.minimumOrder)} onChange={(value) => update(index, { minimumOrder: Number(value) })} /></div></section>)}</div><button onClick={saveZones} className="gold-button mt-5"><Save size={16} /> Salvar regiões</button>{saved && <p className="mt-3 text-sm text-emerald-200">Regiões salvas.</p>}</AdminShell>;
}

export function AdminCalendarPage() {
  type OperationWindow = { id?: string; label: string; capacity: number; active: boolean };
  const weekdayOptions = [
    ["Segunda", 1], ["Terça", 2], ["Quarta", 3], ["Quinta", 4],
    ["Sexta", 5], ["Sábado", 6], ["Domingo", 0],
  ] as const;
  const [availableWeekdays, setAvailableWeekdays] = useState([0, 3, 4, 5, 6]);
  const [dailyCapacity, setDailyCapacity] = useState(32);
  const [minimumPreparationHours, setMinimumPreparationHours] = useState(18);
  const [cutoffHour, setCutoffHour] = useState("18:00");
  const [windows, setWindows] = useState<OperationWindow[]>(
    deliveryWindows.map((label) => ({ label, capacity: 8, active: true })),
  );
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideAvailable, setOverrideAvailable] = useState(false);
  const [overrideCapacity, setOverrideCapacity] = useState(32);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) return;
    void fetch("/api/admin/operations", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: {
        rules?: { availableWeekdays: number[]; dailyCapacity: number; minimumPreparationHours: number; cutoffHour: string };
        windows?: OperationWindow[];
      } | null) => {
        if (data?.rules) {
          setAvailableWeekdays(data.rules.availableWeekdays);
          setDailyCapacity(data.rules.dailyCapacity);
          setMinimumPreparationHours(data.rules.minimumPreparationHours);
          setCutoffHour(data.rules.cutoffHour);
        }
        if (data?.windows?.length) setWindows(data.windows);
      });
  }, []);

  async function saveCalendar() {
    if (supabaseConfigured) {
      const response = await fetch("/api/admin/operations", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          availableWeekdays,
          dailyCapacity,
          minimumPreparationHours,
          cutoffHour,
          windows,
          ...(overrideDate ? {
            override: {
              date: overrideDate,
              available: overrideAvailable,
              capacity: overrideCapacity,
              reason: overrideAvailable ? "Data extra liberada pelo admin" : "Data bloqueada pelo admin",
            },
          } : {}),
        }),
      });
      if (!response.ok) return;
    }
    setSaved(true);
  }

  return (
    <AdminShell>
      <AdminHeading eyebrow="Operação" title="Calendário operacional" description="Controle dias, janelas, capacidade e antecedência." />
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_380px]">
        <section className="admin-panel">
          <h2 className="admin-panel-title"><CalendarDays size={20} /> Dias disponíveis</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {weekdayOptions.map(([day, value]) => {
              const enabled = availableWeekdays.includes(value);
              return <button key={day} onClick={() => setAvailableWeekdays(enabled ? availableWeekdays.filter((item) => item !== value) : [...availableWeekdays, value])} className={`rounded-xl border p-4 text-left ${enabled ? "border-gold/50 bg-gold/[0.07] text-champagne" : "border-white/10 text-white/30"}`}><span className="text-sm font-semibold">{day}</span><span className="mt-1 block text-[0.62rem]">{enabled ? "Entregas ativas" : "Bloqueado"}</span></button>;
            })}
          </div>
          <h2 className="admin-panel-title mt-8"><Clock3 size={20} /> Janelas de entrega</h2>
          <div className="mt-5 space-y-3">
            {windows.map((window, index) => <div key={window.id ?? window.label} className="flex items-center justify-between rounded-xl border border-white/10 p-4"><button onClick={() => setWindows(windows.map((item, itemIndex) => itemIndex === index ? { ...item, active: !item.active } : item))} className={`text-sm ${window.active ? "text-pearl" : "text-white/25"}`}>{window.label}</button><div className="flex items-center gap-3"><span className="text-xs text-white/35">Capacidade</span><input value={window.capacity} onChange={(event) => setWindows(windows.map((item, itemIndex) => itemIndex === index ? { ...item, capacity: Number(event.target.value) } : item))} className="w-16 rounded-lg border border-white/10 bg-black p-2 text-center text-sm" /></div></div>)}
          </div>
        </section>
        <aside className="space-y-6">
          <section className="admin-panel">
            <h2 className="admin-panel-title"><Settings size={20} /> Regras gerais</h2>
            <div className="mt-5 space-y-5">
              <AdminField label="Capacidade diária" type="number" value={String(dailyCapacity)} onChange={(value) => setDailyCapacity(Number(value))} />
              <AdminField label="Antecedência mínima (horas)" type="number" value={String(minimumPreparationHours)} onChange={(value) => setMinimumPreparationHours(Number(value))} />
              <AdminField label="Horário limite" value={cutoffHour} onChange={setCutoffHour} />
            </div>
          </section>
          <section className="admin-panel">
            <h2 className="admin-panel-title"><AlertTriangle size={20} /> Exceção por data</h2>
            <label className="field-label mt-5">Data<input type="date" value={overrideDate} onChange={(event) => setOverrideDate(event.target.value)} className="field" /></label>
            <AdminField label="Capacidade" type="number" value={String(overrideCapacity)} onChange={(value) => setOverrideCapacity(Number(value))} />
            <label className="check-row mt-4"><input type="checkbox" checked={overrideAvailable} onChange={(event) => setOverrideAvailable(event.target.checked)} /> Liberar a data; desmarcado bloqueia.</label>
          </section>
        </aside>
      </div>
      <button onClick={saveCalendar} className="gold-button mt-6"><Save size={16} /> Salvar calendário</button>
      {saved && <p className="mt-3 text-sm text-emerald-200">Calendário salvo.</p>}
    </AdminShell>
  );
}

export function AdminPaymentsPage() {
  const adminOrders = useAdminOrders();
  const confirmed = adminOrders.filter((order) => order.paymentStatus === "confirmed");
  const pending = adminOrders.filter((order) => order.paymentStatus === "pending");
  const refunded = adminOrders.filter((order) => order.paymentStatus === "refunded");
  return <AdminShell><AdminHeading eyebrow="Financeiro" title="Pagamentos" description="Cobranças Asaas, conciliação e eventos de webhook." /><div className="mt-7 grid gap-4 sm:grid-cols-3"><MetricCard icon={WalletCards} label="Confirmados" value={money.format(confirmed.reduce((total, order) => total + order.totals.total, 0))} note={`${confirmed.length} pagamentos`} /><MetricCard icon={Clock3} label="Pendentes" value={money.format(pending.reduce((total, order) => total + order.totals.total, 0))} note={`${pending.length} cobranças`} alert /><MetricCard icon={CircleDollarSign} label="Estornados" value={money.format(refunded.reduce((total, order) => total + order.totals.total, 0))} note={`${refunded.length} pagamentos`} /></div><div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A] p-5"><table className="admin-table min-w-[800px]"><thead><tr><th>Pagamento</th><th>Pedido</th><th>Método</th><th>Status</th><th>Data</th><th>Valor</th></tr></thead><tbody>{adminOrders.map((order) => <tr key={order.id}><td>{order.paymentId}</td><td className="text-pearl">{order.number}</td><td>{order.paymentMethod}</td><td className={order.paymentStatus === "confirmed" ? "text-emerald-200" : "text-amber-200"}>{order.paymentStatus}</td><td>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</td><td className="text-champagne">{money.format(order.totals.total)}</td></tr>)}</tbody></table></div></AdminShell>;
}

export function AdminSettingsPage() {
  const [environment, setEnvironment] = useState<"sandbox" | "production">("sandbox");
  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [pixEnabled, setPixEnabled] = useState(true);
  const [cardEnabled, setCardEnabled] = useState(true);
  const [installments, setInstallments] = useState(1);
  const [pixExpirationHours, setPixExpirationHours] = useState(24);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [webhookSecretConfigured, setWebhookSecretConfigured] = useState(false);
  const [persistenceConfigured, setPersistenceConfigured] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("/api/webhooks/asaas");

  useEffect(() => {
    setWebhookUrl(`${window.location.origin}/api/webhooks/asaas`);
    if (!supabaseConfigured) return;
    const load = async () => {
      const response = await fetch("/api/admin/settings/asaas", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as {
        environment: "sandbox" | "production";
        pixEnabled: boolean;
        cardEnabled: boolean;
        installments: number;
        pixExpirationHours: number;
        apiKeyConfigured: boolean;
        webhookSecretConfigured: boolean;
        persistenceConfigured: boolean;
      };
      setEnvironment(data.environment);
      setPixEnabled(data.pixEnabled);
      setCardEnabled(data.cardEnabled);
      setInstallments(data.installments);
      setPixExpirationHours(data.pixExpirationHours);
      setApiKeyConfigured(data.apiKeyConfigured);
      setWebhookSecretConfigured(data.webhookSecretConfigured);
      setPersistenceConfigured(data.persistenceConfigured);
    };
    void load();
  }, []);

  async function saveSettings() {
    setSaved(false);
    setError("");
    const response = await fetch("/api/admin/settings/asaas", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        environment,
        apiKey: apiKey || undefined,
        webhookSecret: webhookSecret || undefined,
        pixEnabled,
        cardEnabled,
        installments,
        pixExpirationHours,
      }),
    });
    const data = (await response.json()) as { saved?: boolean; error?: string };
    if (!response.ok || !data.saved) {
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setSaved(true);
    if (apiKey) setApiKeyConfigured(true);
    if (webhookSecret) setWebhookSecretConfigured(true);
    setApiKey("");
    setWebhookSecret("");
  }

  return (
    <AdminShell>
      <AdminHeading
        eyebrow="Integrações"
        title="Configurações de pagamento"
        description="Credenciais criptografadas no servidor e nunca devolvidas ao navegador."
      />
      <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
        <section className="admin-panel">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="field-label">
              Ambiente
              <select value={environment} onChange={(event) => setEnvironment(event.target.value as typeof environment)} className="field">
                <option value="sandbox">Sandbox</option>
                <option value="production">Produção</option>
              </select>
            </label>
            <AdminField label="Expiração PIX (horas)" type="number" value={String(pixExpirationHours)} onChange={(value) => setPixExpirationHours(Number(value))} />
            <AdminField label="Parcelas máximas" type="number" value={String(installments)} onChange={(value) => setInstallments(Number(value))} />
            <label className="field-label md:col-span-2">
              Token Asaas
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} type="password" className="field" placeholder={apiKeyConfigured ? "Token já configurado. Digite para substituir." : "$aact_..."} />
            </label>
            <label className="field-label md:col-span-2">
              Webhook secret
              <input value={webhookSecret} onChange={(event) => setWebhookSecret(event.target.value)} type="password" className="field" placeholder={webhookSecretConfigured ? "Webhook já configurado. Digite para substituir." : "Digite para cadastrar"} />
            </label>
            <AdminField label="URL de webhook" value={webhookUrl} onChange={() => undefined} span />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="check-row"><input type="checkbox" checked={pixEnabled} onChange={(event) => setPixEnabled(event.target.checked)} /> PIX ativo</label>
            <label className="check-row"><input type="checkbox" checked={cardEnabled} onChange={(event) => setCardEnabled(event.target.checked)} /> Cartão ativo</label>
          </div>
          <button onClick={saveSettings} className="gold-button mt-6"><Save size={16} /> Salvar configuração</button>
          {saved && <p className="mt-4 text-sm text-emerald-200">Configuração salva com segurança.</p>}
          {error && <p className="mt-4 text-sm text-red-200">{error}</p>}
          {(apiKeyConfigured || webhookSecretConfigured) && <p className="mt-4 text-xs leading-6 text-white/35">Por segurança, os tokens salvos não são exibidos novamente. Use os campos apenas quando quiser substituir uma credencial.</p>}
        </section>
        <aside className="admin-panel">
          <ShieldCheck className="text-gold" size={26} />
          <h2 className="mt-5 font-display text-3xl">Status da integração</h2>
          <div className={`mt-5 flex items-center gap-3 rounded-xl border p-4 ${apiKeyConfigured && webhookSecretConfigured && persistenceConfigured ? "border-emerald-400/20 bg-emerald-400/[0.05]" : "border-amber-400/20 bg-amber-400/[0.05]"}`}>
            <span className={`size-2 rounded-full ${apiKeyConfigured && webhookSecretConfigured && persistenceConfigured ? "bg-emerald-300" : "bg-amber-300"}`} />
            <p className={`text-sm ${apiKeyConfigured && webhookSecretConfigured && persistenceConfigured ? "text-emerald-100" : "text-amber-100"}`}>
              {apiKeyConfigured && webhookSecretConfigured && persistenceConfigured
                ? "Integração configurada"
                : !persistenceConfigured
                  ? "Persistência indisponível"
                  : `Falta configurar: ${[
                      !apiKeyConfigured ? "Token Asaas" : "",
                      !webhookSecretConfigured ? "Webhook secret" : "",
                    ].filter(Boolean).join(" e ")}`}
            </p>
          </div>
          <p className="mt-5 text-xs leading-6 text-white/35">
            O token é criptografado com AES-256-GCM. Configure `SETTINGS_ENCRYPTION_KEY` e `SUPABASE_SERVICE_ROLE_KEY` no ambiente do servidor.
          </p>
        </aside>
      </div>
    </AdminShell>
  );
}

export function AdminContentPage() {
  const [content, setContent] = useState({
    title: "O mar mais perto de você",
    subtitle: "Ostras frescas selecionadas e entregues com data programada.",
    institutional: "Cada pedido é planejado sob demanda para preservar frescor, qualidade e uma apresentação especial.",
    seoTitle: "Quero Ostra | Ostras frescas",
    seoDescription: "Reserve ostras frescas com entrega programada.",
    heroImage: "/images/hero-oysters.png",
  });
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured) return;
    void fetch("/api/admin/content", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { content?: typeof content } | null) => data?.content && setContent(data.content));
  }, []);
  async function publish() {
    if (supabaseConfigured) {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!response.ok) return;
    }
    setSaved(true);
  }
  async function uploadHero(file?: File) {
    if (!file || !supabaseConfigured) return;
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body: form });
    if (!response.ok) return;
    const data = (await response.json()) as { url: string };
    setContent((current) => ({ ...current, heroImage: data.url }));
  }
  return <AdminShell><AdminHeading eyebrow="Site" title="Conteúdos da plataforma" description="Edite textos, banners, destaques e SEO da experiência pública." /><div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]"><section className="admin-panel"><h2 className="admin-panel-title"><FileText size={20} /> Hero da home</h2><div className="mt-5 space-y-5"><AdminField label="Título" value={content.title} onChange={(title) => setContent({ ...content, title })} span /><AdminField label="Subtítulo" value={content.subtitle} onChange={(subtitle) => setContent({ ...content, subtitle })} span /><label className="field-label">Texto institucional<textarea className="field min-h-32 resize-none" value={content.institutional} onChange={(event) => setContent({ ...content, institutional: event.target.value })} /></label></div></section><aside className="space-y-6"><section className="admin-panel"><h2 className="admin-panel-title"><ImageIcon size={20} /> Mídia</h2><label className="mt-5 grid aspect-video w-full cursor-pointer place-items-center rounded-xl border border-dashed border-gold/25 text-xs text-white/35">Enviar imagem do hero<input type="file" accept="image/*" className="sr-only" onChange={(event) => void uploadHero(event.target.files?.[0])} /></label><p className="mt-3 truncate text-[0.62rem] text-white/25">{content.heroImage}</p></section><section className="admin-panel"><h2 className="admin-panel-title"><Search size={20} /> SEO</h2><AdminField label="SEO title" value={content.seoTitle} onChange={(seoTitle) => setContent({ ...content, seoTitle })} /><div className="mt-4"><AdminField label="SEO description" value={content.seoDescription} onChange={(seoDescription) => setContent({ ...content, seoDescription })} /></div></section></aside></div><button onClick={publish} className="gold-button mt-6"><Save size={16} /> Publicar alterações</button>{saved && <p className="mt-3 text-sm text-emerald-200">Conteúdo publicado.</p>}</AdminShell>;
}
