"use client";

import { useEffect, useState, useMemo } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { BarChart3, Users, TrendingUp, DollarSign, PieChart, FileDown, Church, CreditCard, Goal } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { createClient } from "@/lib/supabase/client";
import * as XLSX from "xlsx";

export default function ReportesPage() {
  const [raw, setRaw] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const [campersRes, enrollmentsRes, paymentsRes] = await Promise.all([
          supabase.from("campers").select("age, gender, church"),
          supabase.from("enrollments").select("status, promo_month"),
          supabase.from("payments").select("amount, status, paid_at, payment_method, tier_label"),
        ]);
        setRaw({
          campers: campersRes.data || [],
          enrollments: enrollmentsRes.data || [],
          payments: paymentsRes.data || [],
        });
      } catch (err) {
        console.error("Error loading report data:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  const data = useMemo(() => {
    if (!raw) return null;
    const { campers, enrollments, payments } = raw;
    const total_enrolled = enrollments.length;
    const confirmed = enrollments.filter((e: any) => e.status === "confirmed").length;
    const pending_count = enrollments.filter((e: any) => e.status === "pending").length;
    const cancelled = enrollments.filter((e: any) => e.status === "cancelled").length;
    const confirmation_rate = total_enrolled > 0 ? Math.round((confirmed / total_enrolled) * 100) : 0;

    const completedPayments = payments.filter((p: any) => p.status === "completed");
    const total_revenue = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
    const avg_per_camper = confirmed > 0 ? total_revenue / confirmed : 0;

    const ageGroups = {
      "12-14": campers.filter((c: any) => c.age >= 12 && c.age <= 14).length,
      "15-17": campers.filter((c: any) => c.age >= 15 && c.age <= 17).length,
      "18-25": campers.filter((c: any) => c.age >= 18 && c.age <= 25).length,
      "26+": campers.filter((c: any) => c.age >= 26).length,
    };

    const genderDist = {
      M: campers.filter((c: any) => c.gender === "M").length,
      F: campers.filter((c: any) => c.gender === "F").length,
    };

    const churchCount: Record<string, number> = {};
    campers.forEach((c: any) => {
      if (c.church) {
        churchCount[c.church] = (churchCount[c.church] || 0) + 1;
      }
    });
    const topChurches = Object.entries(churchCount)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5);

    const paymentsByMethod: Record<string, number> = {};
    completedPayments.forEach((p: any) => {
      const method = p.payment_method || "other";
      paymentsByMethod[method] = (paymentsByMethod[method] || 0) + Number(p.amount);
    });

    const promoCount: Record<string, number> = {};
    enrollments.forEach((e: any) => {
      if (e.promo_month) {
        promoCount[e.promo_month] = (promoCount[e.promo_month] || 0) + 1;
      }
    });

    const paymentsByMonth: Record<string, number> = {};
    completedPayments.forEach((p: any) => {
      const month = p.paid_at ? new Date(p.paid_at).toLocaleString("es-AR", { month: "long", year: "numeric" }) : "Sin fecha";
      paymentsByMonth[month] = (paymentsByMonth[month] || 0) + Number(p.amount);
    });

    return {
      total_enrolled, confirmed, pending: pending_count, cancelled,
      confirmation_rate, total_revenue, avg_per_camper,
      ageGroups, genderDist, topChurches, paymentsByMethod, promoCount, paymentsByMonth, campers, enrollments, payments,
    };
  }, [raw]);

  function exportToExcel() {
    if (!data) return;
    const rows: any[] = [];
    data.enrollments.forEach((e: any) => {
      const camper = data.campers.find((c: any) => c.enrollment_id === e.id);
      rows.push({
        Estado: e.status,
        Promo: e.promo_month || "",
      });
    });
    const summary = [
      { Métrica: "Total Inscriptos", Valor: data.total_enrolled },
      { Métrica: "Confirmados", Valor: data.confirmed },
      { Métrica: "Pendientes", Valor: data.pending },
      { Métrica: "Cancelados", Valor: data.cancelled },
      { Métrica: "Tasa Confirmación", Valor: `${data.confirmation_rate}%` },
      { Métrica: "Ingreso Total", Valor: `$${data.total_revenue.toLocaleString("es-AR")}` },
      { Métrica: "Promedio x Inscripto", Valor: `$${Math.round(data.avg_per_camper).toLocaleString("es-AR")}` },
      { Métrica: "Hombres", Valor: data.genderDist.M },
      { Métrica: "Mujeres", Valor: data.genderDist.F },
    ];
    Object.entries(data.paymentsByMethod).forEach(([k, v]) => {
      const labels: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };
      summary.push({ Métrica: `Recaudado ${labels[k] || k}`, Valor: `$${(v as number).toLocaleString("es-AR")}` });
    });
    const ws1 = XLSX.utils.json_to_sheet(summary);
    const ws2 = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Resumen");
    XLSX.utils.book_append_sheet(wb, ws2, "Inscripciones");
    XLSX.writeFile(wb, "reportes.xlsx");
  }

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Reportes" description="Estadísticas y reportes del campamento" />
        <LoadingSpinner className="py-12" />
      </AppShell>
    );
  }

  if (!data) return null;

  const methodLabels: Record<string, string> = { cash: "Efectivo", transfer: "Transferencia", card: "Tarjeta", other: "Otro" };
  const methodColors: Record<string, string> = { cash: "bg-emerald-500", transfer: "bg-blue-500", card: "bg-purple-500", other: "bg-slate-500" };
  const promoColors: Record<string, string> = { Septiembre: "bg-red-500", Noviembre: "bg-amber-500", Enero: "bg-blue-500" };

  return (
    <AppShell>
      <PageHeader
        title="Reportes"
        description="Estadísticas y reportes del campamento"
        actions={
          <Button variant="secondary" onClick={exportToExcel}>
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
        }
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
                {Object.entries(data.paymentsByMonth).map(([month, amount]) => {
                  const maxVal = Math.max(...Object.values(data.paymentsByMonth) as number[]);
                  return (
                    <div key={month}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">{month}</span>
                        <span className="text-slate-500">${(amount as number).toLocaleString("es-AR")}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-blue-500" style={{ width: `${(amount as number) / maxVal * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Inscriptos por Edad</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BarItem label="12-14 años" value={data.ageGroups["12-14"]} total={data.total_enrolled} color="bg-purple-500" />
              <BarItem label="15-17 años" value={data.ageGroups["15-17"]} total={data.total_enrolled} color="bg-indigo-500" />
              <BarItem label="18-25 años" value={data.ageGroups["18-25"]} total={data.total_enrolled} color="bg-blue-500" />
              <BarItem label="26+ años" value={data.ageGroups["26+"]} total={data.total_enrolled} color="bg-teal-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Distribución por Género</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BarItem label="Hombres" value={data.genderDist.M} total={data.total_enrolled} color="bg-sky-500" />
              <BarItem label="Mujeres" value={data.genderDist.F} total={data.total_enrolled} color="bg-pink-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Ingresos por Método de Pago</CardHeader>
          <CardContent>
            {Object.keys(data.paymentsByMethod).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CreditCard className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                <p className="mt-4 text-sm text-slate-500">Sin datos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.paymentsByMethod).map(([method, amount]) => {
                  const maxVal = Math.max(...Object.values(data.paymentsByMethod) as number[]);
                  return (
                    <div key={method}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{methodLabels[method] || method}</span>
                        <span className="text-slate-500">${(amount as number).toLocaleString("es-AR")}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-2 rounded-full ${methodColors[method] || "bg-slate-500"}`} style={{ width: `${(amount as number) / maxVal * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Inscriptos por Promo (Mes Tope)</CardHeader>
          <CardContent>
            {Object.keys(data.promoCount).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Goal className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                <p className="mt-4 text-sm text-slate-500">Sin datos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(data.promoCount).map(([promo, count]) => {
                  const maxVal = Math.max(...Object.values(data.promoCount) as number[]);
                  return (
                    <div key={promo}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium text-slate-700 dark:text-slate-300">{promo}</span>
                        <span className="text-slate-500">{count as number} inscriptos</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-2 rounded-full ${promoColors[promo] || "bg-slate-500"}`} style={{ width: `${(count as number) / maxVal * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Top 5 Iglesias</CardHeader>
          <CardContent>
            {data.topChurches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Church className="h-12 w-12 text-slate-200 dark:text-slate-800" />
                <p className="mt-4 text-sm text-slate-500">Sin datos</p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.topChurches.map(([church, count]: [string, number], i: number) => {
                  const maxVal = data.topChurches[0][1] as number;
                  return (
                    <div key={church}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="text-xs text-slate-400">#{i + 1}</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{church}</span>
                        </span>
                        <span className="text-slate-500">{count}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className="h-2 rounded-full bg-rose-500" style={{ width: `${count / maxVal * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Resumen General</CardHeader>
          <CardContent>
            <div className="space-y-3">
              <SummaryRow label="Total de inscriptos" value={data.total_enrolled} />
              <SummaryRow label="Confirmados" value={data.confirmed} />
              <SummaryRow label="Pendientes" value={data.pending} />
              <SummaryRow label="Cancelados" value={data.cancelled} />
              <SummaryRow label="Tasa de confirmación" value={`${data.confirmation_rate}%`} valueClass="text-green-600" />
              <SummaryRow label="Ingreso total" value={`$${data.total_revenue.toLocaleString("es-AR")}`} />
              <SummaryRow label="Promedio por inscripto" value={`$${Math.round(data.avg_per_camper).toLocaleString("es-AR")}`} />
              <SummaryRow label="Hombres" value={data.genderDist.M} />
              <SummaryRow label="Mujeres" value={data.genderDist.F} />
              {Object.entries(data.paymentsByMethod).map(([k, v]) => (
                <SummaryRow key={k} label={`Recaudado en ${methodLabels[k] || k}`} value={`$${(v as number).toLocaleString("es-AR")}`} />
              ))}
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
    <div className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`font-semibold text-slate-900 dark:text-white ${valueClass || ""}`}>{value}</span>
    </div>
  );
}
