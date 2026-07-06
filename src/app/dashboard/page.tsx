"use client";

import { AppShell } from "@/components/layout/AppShell";
import {
  Users,
  UserCheck,
  Clock,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_enrolled: 0,
    total_pending: 0,
    total_confirmed: 0,
    total_revenue: 0,
  });

  useEffect(() => {
    async function loadStats() {
      try {
        const supabase = createClient();
        const [enrollmentsRes, paymentsRes] = await Promise.all([
          supabase.from("enrollments").select("status"),
          supabase.from("payments").select("amount, status"),
        ]);

        const enrollments = enrollmentsRes.data || [];
        const payments = paymentsRes.data || [];

        setStats({
          total_enrolled: enrollments.length,
          total_pending: enrollments.filter((e) => e.status === "pending").length,
          total_confirmed: enrollments.filter((e) => e.status === "confirmed").length,
          total_revenue: payments
            .filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + Number(p.amount), 0),
        });
      } catch (err) {
        console.error("Error loading stats:", err);
      }
    }
    loadStats();
  }, []);

  return (
    <AppShell>
      <PageHeader
        title="Dashboard"
        description="Resumen general del campamento"
        actions={
          <Link href="/inscriptos/nuevo">
            <Button>+ Nuevo Inscripto</Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Inscriptos"
          value={stats.total_enrolled}
          icon={Users}
          description="Inscriptos este año"
        />
        <StatCard
          title="Confirmados"
          value={stats.total_confirmed}
          icon={UserCheck}
          description="Con pago confirmado"
        />
        <StatCard
          title="Pendientes"
          value={stats.total_pending}
          icon={Clock}
          description="Esperando confirmación"
        />
        <StatCard
          title="Recaudado"
          value={`$${stats.total_revenue.toLocaleString("es-AR")}`}
          icon={CreditCard}
          description="Total de pagos"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Actividad Reciente</CardHeader>
          <CardContent>
            {stats.total_enrolled === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-red-200 dark:text-red-900" />
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  No hay actividad reciente
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Hay <strong>{stats.total_enrolled}</strong> inscriptos registrados.
                  {stats.total_pending > 0 && (
                    <> <strong>{stats.total_pending}</strong> pendientes de confirmación.</>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Acciones Rápidas</CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/inscriptos/nuevo"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Registrar nuevo inscripto
                  </span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/pagos"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Registrar pago
                  </span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/reportes"
                className="flex items-center justify-between rounded-lg border border-slate-200 p-4 transition-colors hover:border-red-200 hover:bg-red-50 dark:border-slate-700 dark:hover:border-red-900 dark:hover:bg-red-950/30"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-red-600" />
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    Ver reportes
                  </span>
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
