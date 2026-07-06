import { AppShell } from "@/components/layout/AppShell";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ReportesPage() {
  return (
    <AppShell>
      <PageHeader
        title="Reportes"
        description="Estadísticas y reportes del campamento"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>Inscriptos por Estado</CardHeader>
          <CardContent>
            <EmptyState
              icon={<BarChart3 className="h-8 w-8 text-slate-400" />}
              title="Sin datos"
              description="El gráfico se mostrará cuando haya inscriptos registrados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Pagos por Mes</CardHeader>
          <CardContent>
            <EmptyState
              icon={<BarChart3 className="h-8 w-8 text-slate-400" />}
              title="Sin datos"
              description="El gráfico se mostrará cuando haya pagos registrados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Inscriptos por Edad</CardHeader>
          <CardContent>
            <EmptyState
              icon={<BarChart3 className="h-8 w-8 text-slate-400" />}
              title="Sin datos"
              description="El gráfico se mostrará cuando haya inscriptos registrados."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Resumen General</CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Total de inscriptos
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  0
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Tasa de confirmación
                </span>
                <span className="font-semibold text-green-600">0%</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Ingreso total
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  $0
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Promedio por inscripto
                </span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  $0
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
