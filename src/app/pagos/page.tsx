"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CreditCard, DollarSign, Clock, CheckCircle, FileDown, Pencil, Check, X, Eye, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { ActionsMenu } from "@/components/ui/ActionsMenu";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

const methodLabels: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
  card: "Tarjeta",
  other: "Otro",
};

const statusConfig: Record<string, { label: string; variant: "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  failed: { label: "Fallido", variant: "danger" },
  refunded: { label: "Reembolsado", variant: "info" },
};

function getTierForDate(dateStr: string, tiers: { label: string; deadline: string; price: number }[]) {
  if (!dateStr || tiers.length === 0) return null;
  const d = new Date(dateStr + "T12:00:00");
  for (const t of tiers) {
    if (d <= new Date(t.deadline + "T23:59:59")) return t;
  }
  return tiers[tiers.length - 1] ?? null;
}

export default function PagosPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [campers, setCampers] = useState<any[]>([]);
  const [stats, setStats] = useState({ total_revenue: 0, total_pending: 0, total_this_month: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterMethod, setFilterMethod] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const [tiers, setTiers] = useState<{ label: string; deadline: string; price: number }[]>([]);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [suggestedAmount, setSuggestedAmount] = useState(0);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [editingObs, setEditingObs] = useState<string | null>(null);
  const [obsText, setObsText] = useState("");
  const [viewPayment, setViewPayment] = useState<any | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Stats from payments
  const statsData = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const completed = payments.filter((p) => p.status === "completed");
    return {
      total_revenue: completed.reduce((s, p) => s + Number(p.amount), 0),
      total_pending: payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0),
      total_this_month: completed.filter((p) => p.paid_at >= startOfMonth).reduce((s, p) => s + Number(p.amount), 0),
    };
  }, [payments]);

  // Accumulated by enrollment
  const accumulatedByEnrollment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      if (p.status === "completed" && p.enrollment_id) {
        map[p.enrollment_id] = (map[p.enrollment_id] || 0) + Number(p.amount);
      }
    }
    return map;
  }, [payments]);

  // Group by camper with search + filter
  const groupedByCamper = useMemo(() => {
    const map: Record<string, { camperName: string; enrollmentId: string; payments: any[] }> = {};
    const q = search.toLowerCase().trim();

    for (const p of payments) {
      if (filterMethod && p.payment_method !== filterMethod) continue;
      if (filterStatus && p.status !== filterStatus) continue;

      // Real-time search by name or reference
      if (q) {
        const camper = p.enrollment?.camper;
        const name = camper ? `${camper.first_name} ${camper.last_name}`.toLowerCase() : "";
        const ref = (p.reference || "").toLowerCase();
        if (!name.includes(q) && !ref.includes(q)) continue;
      }

      const camper = p.enrollment?.camper;
      const name = camper ? `${camper.first_name} ${camper.last_name}` : "—";
      const eid = p.enrollment_id;
      if (!map[eid]) {
        map[eid] = { camperName: name, enrollmentId: eid, payments: [] };
      }
      map[eid].payments.push(p);
    }
    return Object.values(map);
  }, [payments, filterMethod, filterStatus, search]);

  const selectedTier = useMemo(() => getTierForDate(paidAt, tiers), [paidAt, tiers]);
  const selectedPaid = selectedEnrollmentId ? (accumulatedByEnrollment[selectedEnrollmentId] || 0) : 0;
  const selectedTotal = selectedTier?.price ?? 0;
  const selectedRemaining = Math.max(0, selectedTotal - selectedPaid);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [paymentsRes, campersForPaymentRes, settingsRes] = await Promise.all([
          supabase
            .from("payments")
            .select("*, enrollment:enrollments(camper_id, camp_name, status, camper:campers(first_name, last_name))")
            .order("paid_at", { ascending: false }),
          supabase
            .from("enrollments")
            .select("id, status, camper:campers(id, first_name, last_name)")
            .order("registered_at", { ascending: false }),
          supabase.from("settings").select("key, value"),
        ]);

        setPayments(paymentsRes.data || []);
        setCampers(campersForPaymentRes.data || []);

        const settingsMap: Record<string, string> = {};
        (settingsRes.data || []).forEach((r: any) => { settingsMap[r.key] = r.value; });

        const loadedTiers = [1, 2, 3]
          .map((t) => ({
            label: settingsMap[`tier${t}_label`] || "",
            deadline: settingsMap[`tier${t}_deadline`] || "",
            price: Number(settingsMap[`tier${t}_price`]) || 0,
          }))
          .filter((t) => t.deadline && t.price > 0);
        setTiers(loadedTiers);
        if (loadedTiers.length > 0) {
          const today = new Date().toISOString().slice(0, 10);
          setSuggestedAmount(getTierForDate(today, loadedTiers)?.price ?? 0);
        }
      } catch (err) {
        console.error("Error loading payments:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);
    try {
      const formData = new FormData(e.currentTarget);
      const supabase = createClient();
      const paidDate = (formData.get("paid_at") as string) || new Date().toISOString().slice(0, 10);
      const { error: insertError } = await supabase.from("payments").insert({
        enrollment_id: formData.get("enrollment_id") as string,
        amount: Number(formData.get("amount")),
        currency: (formData.get("currency") as string) || "ARS",
        payment_method: formData.get("payment_method") as string,
        status: (formData.get("status") as string) || "completed",
        reference: (formData.get("reference") as string) || null,
        paid_at: new Date(paidDate + "T12:00:00").toISOString(),
        tier_label: selectedTier?.label ?? null,
        tier_price: selectedTier?.price ?? null,
        observaciones: (formData.get("observaciones") as string) || null,
      });
      if (insertError) { setError(insertError.message); setIsPending(false); return; }
      const res = await supabase
        .from("payments")
        .select("*, enrollment:enrollments(camper_id, camp_name, status, camper:campers(first_name, last_name))")
        .order("paid_at", { ascending: false });
      setPayments(res.data || []);
      const campersRes = await supabase
        .from("enrollments")
        .select("id, status, camper:campers(id, first_name, last_name)")
        .order("registered_at", { ascending: false });
      setCampers(campersRes.data || []);
      setSelectedEnrollmentId("");
      setShowForm(false);
      setIsPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setIsPending(false);
    }
  }

  async function handleDelete(paymentId: string) {
    setDeletingId(paymentId);
    try {
      const supabase = createClient();
      await supabase.from("payments").delete().eq("id", paymentId);
      setPayments((prev) => prev.filter((p) => p.id !== paymentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
    setDeletingId(null);
  }

  async function saveObs(paymentId: string) {
    const supabase = createClient();
    await supabase.from("payments").update({ observaciones: obsText }).eq("id", paymentId);
    setPayments((prev) => prev.map((p) => (p.id === paymentId ? { ...p, observaciones: obsText } : p)));
    setEditingObs(null);
  }

  function exportToExcel() {
    const data = payments.map((p: any) => ({
      Inscripto: p.enrollment?.camper ? `${p.enrollment.camper.first_name} ${p.enrollment.camper.last_name}` : "—",
      Monto: Number(p.amount),
      Promo: p.tier_label || "",
      Método: methodLabels[p.payment_method] || p.payment_method,
      Referencia: p.reference || "",
      Estado: statusConfig[p.status]?.label || p.status,
      Fecha: new Date(p.paid_at).toLocaleDateString("es-AR"),
      Observaciones: p.observaciones || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pagos");
    XLSX.writeFile(wb, "pagos.xlsx");
  }

  return (
    <AppShell>
      <PageHeader
        title="Pagos"
        description="Gestión de pagos y cobranzas del campamento"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportToExcel}>
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button onClick={() => setShowForm(!showForm)}>
              {showForm ? "Cancelar" : "+ Registrar Pago"}
            </Button>
          </div>
        }
      />

      {/* KPI Cards - compactas (30% menos altura) */}
      <div className="mb-6 grid grid-cols-3 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
              ${statsData.total_revenue.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">Pendiente</p>
            <p className="text-sm font-bold text-amber-600 truncate">
              ${statsData.total_pending.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/20">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-500 dark:text-slate-400">Este mes</p>
            <p className="text-sm font-bold text-blue-600 truncate">
              ${statsData.total_this_month.toLocaleString("es-AR")}
            </p>
          </div>
        </div>
      </div>

      {/* Formulario de pago */}
      {showForm && (
        <Card className="mb-6" ref={formRef}>
          <CardContent className="p-4 sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-white">Registrar Pago</h3>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tiers.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/20">
                  <p className="mb-1.5 text-xs font-semibold text-blue-800 dark:text-blue-400">Precios según fecha</p>
                  {tiers.map((t, i) => (
                    <div key={i} className="flex justify-between text-xs text-blue-700 dark:text-blue-300">
                      <span>{t.label}</span>
                      <span className="font-semibold">${t.price.toLocaleString("es-AR")}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Inscripto *</label>
                  <select
                    name="enrollment_id"
                    required
                    value={selectedEnrollmentId}
                    onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Seleccionar...</option>
                    {campers.map((enr: any) => {
                      const camper = enr.camper;
                      if (!camper) return null;
                      return <option key={enr.id} value={enr.id}>{camper.first_name} {camper.last_name}</option>;
                    })}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Método de Pago *</label>
                  <select name="payment_method" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="">Seleccionar...</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Fecha de Pago *</label>
                  <input type="date" name="paid_at" value={paidAt} onChange={(e) => { setPaidAt(e.target.value); setSuggestedAmount(getTierForDate(e.target.value, tiers)?.price ?? 0); }} required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Monto *</label>
                  <input type="number" name="amount" value={suggestedAmount} onChange={(e) => setSuggestedAmount(Number(e.target.value))} required step="1" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Referencia</label>
                  <input type="text" name="reference" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="N° de recibo..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Observaciones</label>
                  <input type="text" name="observaciones" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Aclaraciones..." />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Registrar Pago"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filtros y búsqueda */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o referencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500"
          />
        </div>
        <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="card">Tarjeta</option>
          <option value="other">Otro</option>
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="completed">Completado</option>
          <option value="failed">Fallido</option>
          <option value="refunded">Reembolsado</option>
        </select>
      </div>

      {/* Lista de pagos en Acordeón */}
      {loading ? (
        <LoadingSpinner className="py-12" />
      ) : payments.length === 0 ? (
        <Card><EmptyState icon={<CreditCard className="h-8 w-8 text-slate-400" />} title="No hay pagos registrados" description="Los pagos aparecerán aquí una vez que se registren." /></Card>
      ) : groupedByCamper.length === 0 ? (
        <Card><EmptyState icon={<Search className="h-8 w-8 text-slate-400" />} title="Sin resultados" description="No se encontraron pagos con ese filtro." /></Card>
      ) : (
        <Accordion className="bg-white dark:bg-slate-900">
          {groupedByCamper.map((group) => {
            const latestTierPayment = [...group.payments].reverse().find((p) => p.tier_label);
            const tierLabel = latestTierPayment?.tier_label ?? "—";
            const tierPrice = latestTierPayment?.tier_price ?? 0;
            const totalPaid = group.payments
              .filter((p) => p.status === "completed")
              .reduce((s, p) => s + Number(p.amount), 0);
            const remaining = Math.max(0, Number(tierPrice) - totalPaid);

            return (
              <AccordionItem key={group.enrollmentId} value={group.enrollmentId} defaultOpen trigger={
                <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-semibold text-slate-900 dark:text-white">{group.camperName}</span>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {tierLabel !== "—" && (
                      <Badge variant="info">{tierLabel}</Badge>
                    )}
                    <span className="text-slate-500">
                      Pagado: <strong className="text-emerald-600">${totalPaid.toLocaleString("es-AR")}</strong>
                    </span>
                    <span className="text-slate-500">
                      Saldo: <strong className={remaining > 0 ? "text-amber-600" : "text-emerald-600"}>${remaining.toLocaleString("es-AR")}</strong>
                    </span>
                    <div className="w-24 sm:w-32">
                      <ProgressBar value={totalPaid} max={tierPrice || 1} />
                    </div>
                  </div>
                </div>
              }>
                {/* Mobile: card layout, Desktop: table */}
                <div className="hidden sm:block">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800">
                        <th className="pb-2 font-medium text-slate-400">Monto</th>
                        <th className="pb-2 font-medium text-slate-400">Método</th>
                        <th className="pb-2 font-medium text-slate-400">Referencia</th>
                        <th className="pb-2 font-medium text-slate-400">Observaciones</th>
                        <th className="pb-2 font-medium text-slate-400">Estado</th>
                        <th className="pb-2 font-medium text-slate-400">Fecha</th>
                        <th className="pb-2 font-medium text-slate-400"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                      {group.payments.map((payment: any) => {
                        const statusInfo = statusConfig[payment.status] || statusConfig.pending;
                        return (
                          <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-1.5 font-semibold text-slate-900 dark:text-white">${Number(payment.amount).toLocaleString("es-AR")}</td>
                            <td className="py-1.5 text-slate-500">{methodLabels[payment.payment_method] || payment.payment_method}</td>
                            <td className="py-1.5 text-slate-500">{payment.reference || "—"}</td>
                            <td className="py-1.5 max-w-[120px]">
                              {editingObs === payment.id ? (
                                <div className="flex items-center gap-1">
                                  <input type="text" value={obsText} onChange={(e) => setObsText(e.target.value)} className="w-20 rounded border border-slate-200 px-1 py-0.5 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                                  <button onClick={() => saveObs(payment.id)} className="text-emerald-500 hover:text-emerald-700"><Check className="h-3 w-3" /></button>
                                  <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3 w-3" /></button>
                                </div>
                              ) : (
                                <div className="group flex items-center gap-1">
                                  <span className="truncate text-slate-600 dark:text-slate-400">{payment.observaciones || ""}</span>
                                  <button onClick={() => { setObsText(payment.observaciones || ""); setEditingObs(payment.id); }} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity"><Pencil className="h-3 w-3" /></button>
                                </div>
                              )}
                            </td>
                            <td className="py-1.5"><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></td>
                            <td className="py-1.5 text-slate-500">{new Date(payment.paid_at).toLocaleDateString("es-AR")}</td>
                            <td className="py-1.5">
                              <ActionsMenu actions={[
                                { label: "Ver", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setViewPayment(payment) },
                                { label: "Eliminar", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setConfirmDelete(payment.id), variant: "danger" },
                              ]} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="space-y-2 sm:hidden">
                  {group.payments.map((payment: any) => {
                    const statusInfo = statusConfig[payment.status] || statusConfig.pending;
                    return (
                      <div key={payment.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-900 dark:text-white">${Number(payment.amount).toLocaleString("es-AR")}</span>
                          <ActionsMenu actions={[
                            { label: "Ver", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setViewPayment(payment) },
                            { label: "Eliminar", icon: <Trash2 className="h-3.5 w-3.5" />, onClick: () => setConfirmDelete(payment.id), variant: "danger" },
                          ]} />
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>Método: {methodLabels[payment.payment_method] || payment.payment_method}</span>
                          <span>Fecha: {new Date(payment.paid_at).toLocaleDateString("es-AR")}</span>
                          {payment.reference && <span>Ref: {payment.reference}</span>}
                          <span><Badge variant={statusInfo.variant}>{statusInfo.label}</Badge></span>
                        </div>
                        {payment.observaciones && (
                          <p className="mt-1 text-xs text-slate-400">{payment.observaciones}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Modal Ver pago */}
      {viewPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewPayment(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg dark:bg-slate-900" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Detalle del Pago</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Inscripto</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {viewPayment.enrollment?.camper ? `${viewPayment.enrollment.camper.first_name} ${viewPayment.enrollment.camper.last_name}` : "—"}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Monto</span>
                <span className="font-bold text-slate-900 dark:text-white">${Number(viewPayment.amount).toLocaleString("es-AR")}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Método</span>
                <span className="text-slate-900 dark:text-white">{methodLabels[viewPayment.payment_method] || viewPayment.payment_method}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Promo</span>
                <span className="text-slate-900 dark:text-white">{viewPayment.tier_label || "—"}</span>
              </div>
              {viewPayment.reference && (
                <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="text-slate-500">Referencia</span>
                  <span className="text-slate-900 dark:text-white">{viewPayment.reference}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-100 pb-2 dark:border-slate-800">
                <span className="text-slate-500">Estado</span>
                <Badge variant={statusConfig[viewPayment.status]?.variant || "default"}>{statusConfig[viewPayment.status]?.label || viewPayment.status}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fecha</span>
                <span className="text-slate-900 dark:text-white">{new Date(viewPayment.paid_at).toLocaleDateString("es-AR")}</span>
              </div>
              {viewPayment.observaciones && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Observaciones</span>
                  <span className="text-slate-900 dark:text-white">{viewPayment.observaciones}</span>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="secondary" onClick={() => setViewPayment(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog open={confirmDelete !== null} title="Eliminar pago" message="¿Estás seguro de eliminar este pago? Esta acción no se puede deshacer." onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete); setConfirmDelete(null); }} onCancel={() => setConfirmDelete(null)} />
    </AppShell>
  );
}
