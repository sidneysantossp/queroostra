"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  MapPin,
  MessageCircle,
  Loader2,
  PackageCheck,
  Plus,
  QrCode,
  Save,
  Settings2,
  Truck,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardShell } from "@/components/dashboard-shell";
import { DEMO_ORDERS_KEY, sampleOrder } from "@/lib/demo-data";
import type { CreatedOrder } from "@/lib/domain";
import { supabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const statusLabels: Record<string, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  pagamento_confirmado: "Pagamento confirmado",
  reserva_confirmada: "Reserva confirmada",
  em_preparacao: "Em preparação",
  saiu_para_entrega: "Saiu para entrega",
  entregue: "Entregue",
  cancelado: "Cancelado",
};

function useOrders() {
  const [orders, setOrders] = useState<CreatedOrder[]>([sampleOrder]);
  const [loading, setLoading] = useState(supabaseConfigured);
  useEffect(() => {
    const load = async () => {
      try {
        const stored = JSON.parse(window.localStorage.getItem(DEMO_ORDERS_KEY) ?? "[]") as CreatedOrder[];
        if (supabaseConfigured) {
          const response = await fetch("/api/orders", { cache: "no-store" });
          if (response.ok) {
            const data = (await response.json()) as { orders: CreatedOrder[] };
            setOrders(data.orders);
            return;
          }
        }
        setOrders([...stored, ...(!stored.some((order) => order.id === sampleOrder.id) ? [sampleOrder] : [])]);
      } catch {
        setOrders([sampleOrder]);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);
  return { orders, loading };
}

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return (
    <div>
      <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
      <h1 className="mt-2 font-display text-4xl md:text-5xl">{title}</h1>
      {description && <p className="mt-3 text-sm leading-7 text-white/45">{description}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className="inline-flex rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-champagne">
      {statusLabels[status] ?? status}
    </span>
  );
}

export function DashboardOverview() {
  const { orders } = useOrders();
  const latest = orders[0] ?? sampleOrder;
  return (
    <DashboardShell>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <PageHeading eyebrow="Olá, seja bem-vindo" title="Sua próxima experiência" description="Tudo o que você precisa para acompanhar sua reserva." />
        <Link href="/cardapio" className="gold-button shrink-0">Nova reserva <Plus size={17} /></Link>
      </div>

      <section className="mt-8 overflow-hidden rounded-2xl border border-gold/25 bg-[#090909]">
        <div className="grid lg:grid-cols-[1fr_330px]">
          <div className="p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <StatusBadge status={latest.status} />
              <p className="text-xs text-white/35">Pedido {latest.number}</p>
            </div>
            <div className="mt-7 grid gap-6 sm:grid-cols-3">
              <div>
                <CalendarDays className="text-gold" size={21} />
                <p className="mt-3 text-[0.6rem] uppercase tracking-[0.14em] text-white/35">Próxima data</p>
                <p className="mt-2 font-display text-2xl capitalize">
                  {format(new Date(`${latest.dates[0]}T12:00:00`), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
              <div>
                <Clock3 className="text-gold" size={21} />
                <p className="mt-3 text-[0.6rem] uppercase tracking-[0.14em] text-white/35">Horário</p>
                <p className="mt-2 font-display text-2xl">{latest.deliveryWindow}</p>
              </div>
              <div>
                <PackageCheck className="text-gold" size={21} />
                <p className="mt-3 text-[0.6rem] uppercase tracking-[0.14em] text-white/35">Total</p>
                <p className="mt-2 font-display text-2xl text-champagne">{money.format(latest.totals.total)}</p>
              </div>
            </div>
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-xs text-white/40">{latest.items.map((item) => `${item.quantity}× ${item.name}`).join(" • ")}</p>
            </div>
          </div>
          <div className="relative min-h-64 overflow-hidden border-t border-white/10 lg:border-l lg:border-t-0">
            <Image src={latest.items.find((item) => item.image)?.image ?? "/images/hero-oysters.png"} alt="" fill className="object-cover opacity-65" sizes="330px" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
            <Link href={`/dashboard/pedidos/${latest.id}`} className="absolute bottom-5 left-5 right-5 gold-button justify-center">
              Ver detalhes <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {[
          [PackageCheck, "Pedidos realizados", orders.length.toString(), "/dashboard/pedidos"],
          [MapPin, "Endereços salvos", "1", "/dashboard/enderecos"],
          [UserRound, "Dados da conta", "Atualizados", "/dashboard/perfil"],
        ].map(([Icon, label, value, href]) => {
          const CardIcon = Icon as typeof PackageCheck;
          return (
            <Link key={String(label)} href={String(href)} className="group rounded-2xl border border-white/10 bg-[#090909] p-6 transition hover:border-gold/40">
              <div className="flex items-center justify-between">
                <span className="grid size-11 place-items-center rounded-full border border-gold/25 text-gold"><CardIcon size={20} /></span>
                <ChevronRight className="text-white/20 transition group-hover:text-gold" size={18} />
              </div>
              <p className="mt-6 text-xs text-white/35">{String(label)}</p>
              <p className="mt-2 font-display text-3xl">{String(value)}</p>
            </Link>
          );
        })}
      </div>
    </DashboardShell>
  );
}

export function OrdersPage() {
  const { orders } = useOrders();
  return (
    <DashboardShell>
      <PageHeading eyebrow="Histórico" title="Meus pedidos" description="Consulte reservas, pagamentos e entregas anteriores." />
      <div className="mt-8 space-y-4">
        {orders.map((order) => (
          <Link key={order.id} href={`/dashboard/pedidos/${order.id}`} className="group block rounded-2xl border border-white/10 bg-[#090909] p-5 transition hover:border-gold/40 md:p-6">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
              <div className="flex items-center gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full border border-gold/25 text-gold"><PackageCheck size={21} /></span>
                <div>
                  <p className="font-display text-2xl">{order.number}</p>
                  <p className="mt-1 text-xs text-white/35">{format(new Date(order.createdAt), "dd/MM/yyyy")} • {order.items.length} itens</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <StatusBadge status={order.status} />
                <p className="font-display text-2xl text-champagne">{money.format(order.totals.total)}</p>
                <ChevronRight className="text-white/25 group-hover:text-gold" size={18} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </DashboardShell>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const { orders, loading } = useOrders();
  const order = orders.find((item) => item.id === orderId) ?? (orderId === sampleOrder.id ? sampleOrder : undefined);
  const [copied, setCopied] = useState(false);
  const timeline = [
    ["Pedido criado", true],
    ["Pagamento confirmado", order?.paymentStatus === "confirmed"],
    ["Reserva confirmada", ["reserva_confirmada", "em_preparacao", "saiu_para_entrega", "entregue"].includes(order?.status ?? "")],
    ["Em preparação", ["em_preparacao", "saiu_para_entrega", "entregue"].includes(order?.status ?? "")],
    ["Saiu para entrega", ["saiu_para_entrega", "entregue"].includes(order?.status ?? "")],
    ["Entregue", order?.status === "entregue"],
  ] as const;

  if (!order) {
    if (loading) {
      return (
        <DashboardShell>
          <div className="grid min-h-[420px] place-items-center">
            <Loader2 className="animate-spin text-gold" />
          </div>
        </DashboardShell>
      );
    }
    return (
      <DashboardShell>
        <PageHeading eyebrow="Pedido" title="Reserva não encontrada" description="Este pedido não está disponível nesta sessão." />
        <Link href="/dashboard/pedidos" className="outline-button mt-7">Voltar aos pedidos</Link>
      </DashboardShell>
    );
  }

  const currentOrder = order;

  async function copyPix() {
    if (!currentOrder.pixCopyPaste) return;
    await navigator.clipboard.writeText(currentOrder.pixCopyPaste);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <DashboardShell>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <PageHeading eyebrow={`Pedido ${order.number}`} title="Detalhes da reserva" description={`Criado em ${format(new Date(order.createdAt), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`} />
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-white/10 bg-[#090909] p-6">
            <h2 className="font-display text-3xl">Itens do pedido</h2>
            <div className="mt-5 divide-y divide-white/10">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 py-5 first:pt-0 last:pb-0">
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-white/[0.03]">
                    {item.image ? <Image src={item.image} alt={item.name} fill className="object-cover" sizes="80px" /> : <PackageCheck className="m-7 text-gold" size={22} />}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-display text-2xl">{item.name}</h3>
                        <p className="mt-1 text-xs text-white/35">{item.quantity} × {money.format(item.unitPrice)}</p>
                      </div>
                      <p className="font-display text-xl text-champagne">{money.format(item.subtotal)}</p>
                    </div>
                    {item.addons.length > 0 && <p className="mt-3 text-xs text-white/40">Adicionais: {item.addons.map((addon) => addon.name).join(", ")}</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-[#090909] p-6">
              <CalendarDays className="text-gold" size={21} />
              <h2 className="mt-4 font-display text-2xl">Datas e horário</h2>
              <div className="mt-4 space-y-2">
                {order.dates.map((date) => <p key={date} className="text-sm capitalize text-white/55">{format(new Date(`${date}T12:00:00`), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>)}
              </div>
              <p className="mt-4 text-sm text-champagne">{order.deliveryWindow}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#090909] p-6">
              <MapPin className="text-gold" size={21} />
              <h2 className="mt-4 font-display text-2xl">Endereço</h2>
              <p className="mt-4 text-sm leading-7 text-white/50">
                {order.address.street}, {order.address.number}<br />
                {order.address.complement ? `${order.address.complement} • ` : ""}{order.address.neighborhood}<br />
                {order.address.city} - {order.address.state}, CEP {order.address.cep}
              </p>
            </div>
          </section>

          {order.paymentMethod === "PIX" && order.paymentStatus === "pending" && order.pixCopyPaste && (
            <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-6">
              <div className="flex items-center gap-3"><QrCode className="text-gold" /><h2 className="font-display text-3xl">Pague com PIX</h2></div>
              {order.pixQrCode && <img src={`data:image/png;base64,${order.pixQrCode}`} alt="QR Code PIX" className="mt-5 size-44 rounded-lg bg-white p-2" />}
              <p className="mt-5 break-all rounded-xl bg-black/30 p-4 text-xs leading-6 text-white/45">{order.pixCopyPaste}</p>
              <button type="button" onClick={copyPix} className="gold-button mt-4">{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Código copiado" : "Copiar PIX"}</button>
            </section>
          )}
          {order.paymentMethod === "CREDIT_CARD" && order.paymentStatus === "pending" && order.invoiceUrl && (
            <section className="rounded-2xl border border-gold/25 bg-gold/[0.05] p-6">
              <div className="flex items-center gap-3">
                <CreditCard className="text-gold" />
                <h2 className="font-display text-3xl">Concluir pagamento</h2>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/50">
                Finalize o pagamento no ambiente seguro do Asaas para confirmar sua reserva.
              </p>
              <a href={order.invoiceUrl} className="gold-button mt-5">
                Pagar com cartão <ArrowRight size={16} />
              </a>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-2xl border border-gold/25 bg-[#090909] p-6">
            <h2 className="font-display text-3xl">Resumo</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-white/45"><span>Produtos</span><span className="text-pearl">{money.format(order.totals.itemsSubtotal)}</span></div>
              <div className="flex justify-between text-white/45"><span>Entrega</span><span className="text-pearl">{money.format(order.totals.deliveryFees)}</span></div>
              <div className="flex justify-between border-t border-white/10 pt-4"><span>Total</span><span className="font-display text-3xl text-champagne">{money.format(order.totals.total)}</span></div>
            </div>
            <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/[0.025] p-4">
              <CreditCard className="text-gold" size={19} />
              <div><p className="text-xs text-white/35">Pagamento</p><p className="mt-1 text-sm">{order.paymentMethod === "PIX" ? "PIX" : "Cartão de crédito"}</p></div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-[#090909] p-6">
            <h2 className="font-display text-3xl">Andamento</h2>
            <div className="mt-6 space-y-0">
              {timeline.map(([label, complete], index) => (
                <div key={label} className="relative flex gap-4 pb-6 last:pb-0">
                  {index < timeline.length - 1 && <span className={`absolute left-[7px] top-4 h-full w-px ${complete ? "bg-gold" : "bg-white/10"}`} />}
                  <span className={`relative z-10 mt-1 size-4 shrink-0 rounded-full border-2 ${complete ? "border-gold bg-gold" : "border-white/15 bg-[#090909]"}`} />
                  <p className={`text-sm ${complete ? "text-pearl" : "text-white/25"}`}>{label}</p>
                </div>
              ))}
            </div>
          </section>

          <a href="https://wa.me/5511999999999" className="outline-button w-full justify-center"><MessageCircle size={17} /> Falar no WhatsApp</a>
        </aside>
      </div>
    </DashboardShell>
  );
}

export function AddressesPage() {
  type SavedAddress = {
    id?: string;
    label: string;
    cep: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    reference?: string;
    instructions?: string;
    isDefault: boolean;
  };
  const [addresses, setAddresses] = useState<SavedAddress[]>([{
    label: "Casa",
    cep: "04538000",
    street: "Rua Doutor Renato Paes de Barros",
    number: "750",
    neighborhood: "Itaim Bibi",
    city: "São Paulo",
    state: "SP",
    isDefault: true,
  }]);
  const [editing, setEditing] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured) return;
    void fetch("/api/addresses", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { addresses?: SavedAddress[] } | null) => data?.addresses && setAddresses(data.addresses));
  }, []);
  function update(index: number, patch: Partial<SavedAddress>) {
    setAddresses((current) => current.map((address, addressIndex) => addressIndex === index ? { ...address, ...patch } : address));
  }
  async function saveAddresses() {
    if (supabaseConfigured) {
      const response = await fetch("/api/addresses", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addresses }),
      });
      if (!response.ok) return;
    }
    setEditing(null);
    setSaved(true);
  }
  return (
    <DashboardShell>
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
        <PageHeading eyebrow="Entrega" title="Endereços salvos" description="Gerencie os locais usados nas suas reservas." />
        <button onClick={() => { setAddresses([...addresses, { label: "Novo endereço", cep: "", street: "", number: "", neighborhood: "", city: "São Paulo", state: "SP", isDefault: addresses.length === 0 }]); setEditing(addresses.length); }} className="gold-button"><Plus size={17} /> Novo endereço</button>
      </div>
      <div className="mt-8 space-y-5">
        {addresses.map((address, index) => <div key={address.id ?? index} className="rounded-2xl border border-gold/25 bg-[#090909] p-6">{editing === index ? <div className="grid gap-4 md:grid-cols-2"><label className="field-label">Nome<input className="field" value={address.label} onChange={(event) => update(index, { label: event.target.value })} /></label><label className="field-label">CEP<input className="field" value={address.cep} onChange={(event) => update(index, { cep: event.target.value })} /></label><label className="field-label md:col-span-2">Rua<input className="field" value={address.street} onChange={(event) => update(index, { street: event.target.value })} /></label><label className="field-label">Número<input className="field" value={address.number} onChange={(event) => update(index, { number: event.target.value })} /></label><label className="field-label">Bairro<input className="field" value={address.neighborhood} onChange={(event) => update(index, { neighborhood: event.target.value })} /></label><label className="field-label">Cidade<input className="field" value={address.city} onChange={(event) => update(index, { city: event.target.value })} /></label><label className="field-label">Estado<input className="field" value={address.state} onChange={(event) => update(index, { state: event.target.value })} /></label><label className="check-row md:col-span-2"><input type="checkbox" checked={address.isDefault} onChange={(event) => setAddresses(addresses.map((item, itemIndex) => ({ ...item, isDefault: event.target.checked && itemIndex === index })))} /> Endereço padrão</label></div> : <div className="flex flex-col justify-between gap-5 sm:flex-row"><div className="flex gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-full border border-gold/25 text-gold"><MapPin size={21} /></span><div><div className="flex items-center gap-3"><h2 className="font-display text-2xl">{address.label}</h2>{address.isDefault && <span className="rounded-full bg-gold px-2 py-1 text-[0.55rem] font-bold uppercase text-ink">Padrão</span>}</div><p className="mt-3 text-sm leading-7 text-white/45">{address.street}, {address.number}<br />{address.neighborhood}, {address.city} - {address.state}<br />CEP {address.cep}</p></div></div><button onClick={() => setEditing(index)} className="self-start text-xs font-semibold uppercase tracking-[0.12em] text-gold">Editar</button></div>}</div>)}
      </div>
      {editing !== null && <button onClick={saveAddresses} className="gold-button mt-5"><Save size={16} /> Salvar endereços</button>}
      {saved && <p className="mt-3 text-sm text-emerald-200">Endereços atualizados.</p>}
    </DashboardShell>
  );
}

export function ProfilePage() {
  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    cpfCnpj: "",
    whatsapp: "",
    alternatePhone: "",
    communicationPreferences: { email: true, whatsapp: true },
  });
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!supabaseConfigured) return;
    void fetch("/api/profile", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { profile?: { full_name: string; email: string; cpf_cnpj?: string; whatsapp: string; alternate_phone?: string; communication_preferences?: { email: boolean; whatsapp: boolean } } } | null) => {
        if (!data?.profile) return;
        setProfile({
          fullName: data.profile.full_name,
          email: data.profile.email,
          cpfCnpj: data.profile.cpf_cnpj ?? "",
          whatsapp: data.profile.whatsapp ?? "",
          alternatePhone: data.profile.alternate_phone ?? "",
          communicationPreferences: data.profile.communication_preferences ?? { email: true, whatsapp: true },
        });
      });
  }, []);
  async function saveProfile() {
    if (supabaseConfigured) {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!response.ok) return;
    }
    setMessage("Dados atualizados.");
  }
  async function resetPassword() {
    const supabase = createClient();
    if (supabase) {
      await supabase.auth.resetPasswordForEmail(profile.email, {
        redirectTo: `${window.location.origin}/dashboard/perfil`,
      });
    }
    setMessage("Enviamos as instruções de alteração de senha por e-mail.");
  }
  return (
    <DashboardShell>
      <PageHeading eyebrow="Conta" title="Dados pessoais" description="Mantenha seus contatos e preferências atualizados." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={(event) => { event.preventDefault(); void saveProfile(); }} className="rounded-2xl border border-white/10 bg-[#090909] p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="field-label md:col-span-2">Nome completo<input className="field" value={profile.fullName} onChange={(event) => setProfile({ ...profile, fullName: event.target.value })} /></label>
            <label className="field-label">E-mail<input className="field" value={profile.email} disabled /></label>
            <label className="field-label">CPF ou CNPJ<input className="field" value={profile.cpfCnpj} onChange={(event) => setProfile({ ...profile, cpfCnpj: event.target.value.replace(/\D/g, "") })} placeholder="Apenas números" /></label>
            <label className="field-label">WhatsApp<input className="field" value={profile.whatsapp} onChange={(event) => setProfile({ ...profile, whatsapp: event.target.value })} /></label>
          </div>
          <button type="submit" className="gold-button mt-7">Salvar alterações <ArrowRight size={16} /></button>
          {message && <p className="mt-4 text-sm text-emerald-200">{message}</p>}
        </form>
        <div className="space-y-5">
          <div className="rounded-2xl border border-white/10 bg-[#090909] p-6">
            <Settings2 className="text-gold" size={22} />
            <h2 className="mt-4 font-display text-2xl">Segurança</h2>
            <p className="mt-2 text-xs leading-6 text-white/40">Altere sua senha e revise os acessos da conta.</p>
            <button type="button" onClick={resetPassword} className="outline-button mt-5 w-full justify-center">Alterar senha</button>
          </div>
          <div className="rounded-2xl border border-white/10 bg-[#090909] p-6">
            <Truck className="text-gold" size={22} />
            <h2 className="mt-4 font-display text-2xl">Comunicação</h2>
            <label className="check-row mt-4"><input type="checkbox" checked={profile.communicationPreferences.whatsapp} onChange={(event) => setProfile({ ...profile, communicationPreferences: { ...profile.communicationPreferences, whatsapp: event.target.checked } })} /> Receber confirmações e atualizações pelo WhatsApp.</label>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
