"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { CreditCard, DollarSign, Clock, CheckCircle } from "lucide-react";
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

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();

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

      const { error: insertError } = await supabase.from("payments").insert({
        enrollment_id: formData.get("enrollment_id") as string,
        amount: Number(formData.get("amount")),
        currency: (formData.get("currency") as string) || "ARS",
        payment_method: formData.get("payment_method") as string,
        status: (formData.get("status") as string) || "completed",
        reference: (formData.get("reference") as string) || null,
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

  const filteredPayments = payments.filter((p) => {
    if (filterMethod && p.payment_method !== filterMethod) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    return true;
  });

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
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Inscripto *
                </label>
                <select
                  name="enrollment_id"
                  required
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Monto *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    required
                    step="0.01"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="0.00"
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
        ) : filteredPayments.length === 0 ? (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredPayments.map((payment: any) => {
                  const camper = payment.enrollment?.camper;
                  const statusInfo = statusConfig[payment.status] || statusConfig.pending;
                  return (
                    <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-4">
                        <span className="font-medium text-slate-900 dark:text-white">
                          {camper ? `${camper.first_name} ${camper.last_name}` : "—"}
                        </span>
                      </td>
                      <td className="py-4 text-slate-900 dark:text-white">
                        ${Number(payment.amount).toLocaleString("es-AR")}
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400">
                        {methodLabels[payment.payment_method] || payment.payment_method}
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400">
                        {payment.reference || "—"}
                      </td>
                      <td className="py-4">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="py-4 text-slate-500 dark:text-slate-400">
                        {new Date(payment.paid_at).toLocaleDateString("es-AR")}
                      </td>
                    </tr>
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
