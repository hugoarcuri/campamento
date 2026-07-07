"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CreditCard, DollarSign, Clock, CheckCircle, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";

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
  const [tiers, setTiers] = useState<{ label: string; deadline: string; price: number }[]>([]);
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [suggestedAmount, setSuggestedAmount] = useState(0);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const accumulatedByEnrollment = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of payments) {
      if (p.status === "completed" && p.enrollment_id) {
        map[p.enrollment_id] = (map[p.enrollment_id] || 0) + Number(p.amount);
      }
    }
    return map;
  }, [payments]);

  const groupedByCamper = useMemo(() => {
    const map: Record<string, { camperName: string; enrollmentId: string; payments: any[] }> = {};
    for (const p of payments) {
      if (filterMethod && p.payment_method !== filterMethod) continue;
      if (filterStatus && p.status !== filterStatus) continue;
      const camper = p.enrollment?.camper;
      const name = camper ? `${camper.first_name} ${camper.last_name}` : "—";
      const eid = p.enrollment_id;
      if (!map[eid]) {
        map[eid] = { camperName: name, enrollmentId: eid, payments: [] };
      }
      map[eid].payments.push(p);
    }
    return Object.values(map);
  }, [payments, filterMethod, filterStatus]);

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
            .from("campers")
            .select("id, first_name, last_name, enrollments!inner(id, status)")
            .eq("enrollments.status", "pending"),
          supabase.from("settings").select("key, value"),
        ]);

        const paymentsData = paymentsRes.data || [];
        setPayments(paymentsData);
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

        const today = new Date().toISOString().slice(0, 10);
        const initialTier = getTierForDate(today, loadedTiers);
        setSuggestedAmount(initialTier?.price ?? 0);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const total_revenue = paymentsData
          .filter((p: any) => p.status === "completed")
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const total_pending = paymentsData
          .filter((p: any) => p.status === "pending")
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
        const total_this_month = paymentsData
          .filter((p: any) => p.status === "completed" && p.paid_at >= startOfMonth)
          .reduce((sum: number, p: any) => sum + Number(p.amount), 0);

        setStats({ total_revenue, total_pending, total_this_month });
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
      });

      if (insertError) {
        setError(insertError.message);
        setIsPending(false);
        return;
      }

      const [paymentsRes, campersForPaymentRes] = await Promise.all([
        supabase
          .from("payments")
          .select("*, enrollment:enrollments(camper_id, camp_name, status, camper:campers(first_name, last_name))")
          .order("paid_at", { ascending: false }),
        supabase
          .from("campers")
          .select("id, first_name, last_name, enrollments!inner(id, status)")
          .eq("enrollments.status", "pending"),
      ]);

      const paymentsData = paymentsRes.data || [];
      setPayments(paymentsData);
      setCampers(campersForPaymentRes.data || []);
      setSelectedEnrollmentId("");

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      setStats({
        total_revenue: paymentsData.filter((p: any) => p.status === "completed").reduce((s: number, p: any) => s + Number(p.amount), 0),
        total_pending: paymentsData.filter((p: any) => p.status === "pending").reduce((s: number, p: any) => s + Number(p.amount), 0),
        total_this_month: paymentsData.filter((p: any) => p.status === "completed" && p.paid_at >= startOfMonth).reduce((s: number, p: any) => s + Number(p.amount), 0),
      });

      setShowForm(false);
      setIsPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setIsPending(false);
    }
  }

  async function handleDelete(paymentId: string) {
    if (!window.confirm("¿Estás seguro de eliminar este pago?")) return;
    setDeletingId(paymentId);
    try {
      const supabase = createClient();
      const { error: delError } = await supabase.from("payments").delete().eq("id", paymentId);
      if (delError) {
        setError(delError.message);
        setDeletingId(null);
        return;
      }
      setPayments((prev) => {
        const updated = prev.filter((p) => p.id !== paymentId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        setStats({
          total_revenue: updated.filter((p) => p.status === "completed").reduce((s, p) => s + Number(p.amount), 0),
          total_pending: updated.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0),
          total_this_month: updated.filter((p) => p.status === "completed" && p.paid_at >= startOfMonth).reduce((s, p) => s + Number(p.amount), 0),
        });
        return updated;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    }
    setDeletingId(null);
  }

  return (
    <AppShell>
      <PageHeader
        title="Pagos"
        description="Gestión de pagos y cobranzas del campamento"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancelar" : "+ Registrar Pago"}
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Recaudado"
          value={`$${stats.total_revenue.toLocaleString("es-AR")}`}
          icon={DollarSign}
          description="Pagos completados"
        />
        <StatCard
          title="Pendiente"
          value={`$${stats.total_pending.toLocaleString("es-AR")}`}
          icon={Clock}
          description="Esperando pago"
        />
        <StatCard
          title="Este Mes"
          value={`$${stats.total_this_month.toLocaleString("es-AR")}`}
          icon={CheckCircle}
          description="Ingresos del mes"
        />
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>Registrar Pago</CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              {tiers.length > 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                  <h4 className="mb-2 text-sm font-semibold text-blue-800 dark:text-blue-400">
                    Precios según fecha de pago
                  </h4>
                  <div className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                    {tiers.map((t, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{t.label} (hasta {new Date(t.deadline + "T12:00:00").toLocaleDateString("es-AR")})</span>
                        <span className="font-semibold">${t.price.toLocaleString("es-AR")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Inscripto *
                </label>
                <select
                  name="enrollment_id"
                  required
                  value={selectedEnrollmentId}
                  onChange={(e) => setSelectedEnrollmentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Seleccionar...</option>
                  {campers.map((camper: any) => {
                    const enrollment = camper.enrollments?.[0];
                    if (!enrollment) return null;
                    return (
                      <option key={enrollment.id} value={enrollment.id}>
                        {camper.first_name} {camper.last_name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {selectedEnrollmentId && selectedTier && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <h4 className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                    Resumen de {campers.find((c: any) => c.enrollments?.[0]?.id === selectedEnrollmentId)?.first_name ?? "—"}
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400">Total del programa</p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        ${selectedTotal.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400">Pagado</p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        ${selectedPaid.toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400">Saldo restante</p>
                      <p className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                        ${selectedRemaining.toLocaleString("es-AR")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fecha de Pago *
                  </label>
                  <input
                    type="date"
                    name="paid_at"
                    value={paidAt}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPaidAt(val);
                      const tier = getTierForDate(val, tiers);
                      setSuggestedAmount(tier?.price ?? 0);
                    }}
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                  {selectedTier && (
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Corresponde a: {selectedTier.label} — ${selectedTier.price.toLocaleString("es-AR")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Monto *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    value={suggestedAmount}
                    onChange={(e) => setSuggestedAmount(Number(e.target.value))}
                    required
                    step="1"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Método de Pago *
                  </label>
                  <select
                    name="payment_method"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Referencia
                  </label>
                  <input
                    type="text"
                    name="reference"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="N° de recibo, transferencia..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Estado
                  </label>
                  <select
                    name="status"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="completed">Completado</option>
                    <option value="pending">Pendiente</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Guardando..." : "Registrar Pago"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex flex-wrap gap-3">
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Todos los métodos</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="other">Otro</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
            <option value="failed">Fallido</option>
            <option value="refunded">Reembolsado</option>
          </select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-slate-500">Cargando...</p>
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-8 w-8 text-slate-400" />}
            title="No hay pagos registrados"
            description="Los pagos aparecerán aquí una vez que se registren."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Inscripto</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Monto</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Método</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Referencia</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Fecha</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {groupedByCamper.map((group) => {
                  const groupTotal = group.payments
                    .filter((p) => p.status === "completed")
                    .reduce((s, p) => s + Number(p.amount), 0);
                  return (
                    <Fragment key={group.enrollmentId}>
                      <tr className="bg-slate-50 dark:bg-slate-800/50">
                        <td className="py-3 font-semibold text-slate-900 dark:text-white" colSpan={7}>
                          <div className="flex items-center justify-between">
                            <span>{group.camperName}</span>
                            <span className="text-sm font-normal text-slate-500 dark:text-slate-400">
                              Total: ${groupTotal.toLocaleString("es-AR")}
                            </span>
                          </div>
                        </td>
                      </tr>
                      {group.payments.map((payment: any) => {
                        const camper = payment.enrollment?.camper;
                        const statusInfo = statusConfig[payment.status] || statusConfig.pending;
                        return (
                          <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <td className="py-3 pl-6">
                              <span className="text-slate-600 dark:text-slate-400">
                                {camper ? `${camper.first_name} ${camper.last_name}` : "—"}
                              </span>
                            </td>
                            <td className="py-3 text-slate-900 dark:text-white">
                              ${Number(payment.amount).toLocaleString("es-AR")}
                            </td>
                            <td className="py-3 text-slate-500 dark:text-slate-400">
                              {methodLabels[payment.payment_method] || payment.payment_method}
                            </td>
                            <td className="py-3 text-slate-500 dark:text-slate-400">
                              {payment.reference || "—"}
                            </td>
                            <td className="py-3">
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </td>
                            <td className="py-3 text-slate-500 dark:text-slate-400">
                              {new Date(payment.paid_at).toLocaleDateString("es-AR")}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => handleDelete(payment.id)}
                                disabled={deletingId === payment.id}
                                className="text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                                title="Eliminar pago"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AppShell>
  );
}
