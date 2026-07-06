"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BarChart3, Users, TrendingUp, DollarSign, PieChart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { createClient } from "@/lib/supabase/client";

export default function ReportesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [campersRes, enrollmentsRes, paymentsRes] = await Promise.all([
          supabase.from("campers").select("age, gender, church"),
          supabase.from("enrollments").select("status"),
          supabase.from("payments").select("amount, status, paid_at"),
        ]);

        const campers = campersRes.data || [];
        const enrollments = enrollmentsRes.data || [];
        const payments = paymentsRes.data || [];
        const total_enrolled = enrollments.length;

        const confirmed = enrollments.filter((e) => e.status === "confirmed").length;
        const pending_count = enrollments.filter((e) => e.status === "pending").length;
        const cancelled = enrollments.filter((e) => e.status === "cancelled").length;
        const confirmation_rate = total_enrolled > 0 ? Math.round((confirmed / total_enrolled) * 100) : 0;

        const total_revenue = payments
          .filter((p) => p.status === "completed")
          .reduce((sum, p) => sum + Number(p.amount), 0);

        const avg_per_camper = confirmed > 0 ? total_revenue / confirmed : 0;

        const ageGroups = {
          "12-14": campers.filter((c) => c.age >= 12 && c.age <= 14).length,
          "15-17": campers.filter((c) => c.age >= 15 && c.age <= 17).length,
          "18-25": campers.filter((c) => c.age >= 18 && c.age <= 25).length,
          "26+": campers.filter((c) => c.age >= 26).length,
        };

        const paymentsByMonth: Record<string, number> = {};
        payments
          .filter((p) => p.status === "completed")
          .forEach((p) => {
            const month = p.paid_at ? new Date(p.paid_at).toLocaleString("es-AR", { month: "long", year: "numeric" }) : "Sin fecha";
            paymentsByMonth[month] = (paymentsByMonth[month] || 0) + Number(p.amount);
          });

        setData({
          total_enrolled,
          confirmed,
          pending: pending_count,
          cancelled,
          confirmation_rate,
          total_revenue,
          avg_per_camper,
          ageGroups,
          paymentsByMonth,
        });
      } catch (err) {
        console.error("Error loading report data:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Reportes" description="Estadísticas y reportes del campamento" />
        <div className="flex justify-center py-12">
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  return (
    <AppShell>
      <PageHeader
        title="Reportes"
        description="Estadísticas y reportes del campamento"
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard title="Total Inscriptos" value={data.total_enrolled} icon={Users} description="Registrados" />
        <StatCard title="Confirmados" value={data.confirmed} icon={TrendingUp} description={`${data.confirmation_rate}% del total`} />
        <StatCard title="Ingreso Total" value={`$${data.total_revenue.toLocaleString("es-AR")}`} icon={DollarSign} description="Pagos completados" />
        <StatCard title="Promedio x Inscripto" value={`$${Math.round(data.avg_per_camper).toLocaleString("es-AR")}`} icon={PieChart} description="Por confirmado" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Inscriptos por Estado</CardHeader>
          <CardContent>
            {data.total_enrolled === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                <p className="mt-4 text-sm text-slate-500">Sin datos</p>
              </div>
            ) : (
              <div className="space-y-4">
                <BarItem label="Confirmados" value={data.confirmed} total={data.total_enrolled} color="bg-green-500" />
                <BarItem label="Pendientes" value={data.pending} total={data.total_enrolled} color="bg-yellow-500" />
                <BarItem label="Cancelados" value={data.cancelled} total={data.total_enrolled} color="bg-red-500" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Pagos por Mes</CardHeader>
          <CardContent>
            {Object.keys(data.paymentsByMonth).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                <p className="mt-4 text-sm text-slate-500">Sin datos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.paymentsByMonth).map(([month, amount]) => (
                  <div key={month}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{month}</span>
                      <span className="text-slate-500">${(amount as number).toLocaleString("es-AR")}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.min(100, ((amount as number) / Math.max(...Object.values(data.paymentsByMonth) as number[])) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Inscriptos por Edad</CardHeader>
          <CardContent>
            {data.total_enrolled === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <PieChart className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                <p className="mt-4 text-sm text-slate-500">Sin datos</p>
              </div>
            ) : (
              <div className="space-y-4">
                <BarItem label="12-14 años" value={data.ageGroups["12-14"]} total={data.total_enrolled} color="bg-purple-500" />
                <BarItem label="15-17 años" value={data.ageGroups["15-17"]} total={data.total_enrolled} color="bg-indigo-500" />
                <BarItem label="18-25 años" value={data.ageGroups["18-25"]} total={data.total_enrolled} color="bg-blue-500" />
                <BarItem label="26+ años" value={data.ageGroups["26+"]} total={data.total_enrolled} color="bg-teal-500" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Resumen General</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SummaryRow label="Total de inscriptos" value={data.total_enrolled} />
              <SummaryRow label="Confirmados" value={data.confirmed} />
              <SummaryRow label="Pendientes" value={data.pending} />
              <SummaryRow label="Cancelados" value={data.cancelled} />
              <SummaryRow label="Tasa de confirmación" value={`${data.confirmation_rate}%`} valueClass="text-green-600" />
              <SummaryRow label="Ingreso total" value={`$${data.total_revenue.toLocaleString("es-AR")}`} />
              <SummaryRow label="Promedio por inscripto" value={`$${Math.round(data.avg_per_camper).toLocaleString("es-AR")}`} />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function BarItem({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-slate-500">{value} ({pct}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SummaryRow({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold text-slate-900 dark:text-white ${valueClass || ""}`}>{value}</span>
    </div>
  );
}
