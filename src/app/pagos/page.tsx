import { AppShell } from "@/components/layout/AppShell";
import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";

export default function PagosPage() {
  return (
    <AppShell>
      <PageHeader
        title="Pagos"
        description="Gestión de pagos y cobranzas del campamento"
        actions={<Button>+ Registrar Pago</Button>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Total Recaudado
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            $0
          </p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pagos Pendientes
          </p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">$0</p>
        </Card>
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Pagos Este Mes
          </p>
          <p className="mt-1 text-2xl font-bold text-green-600">$0</p>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap gap-3">
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos los métodos</option>
            <option value="cash">Efectivo</option>
            <option value="transfer">Transferencia</option>
            <option value="card">Tarjeta</option>
            <option value="other">Otro</option>
          </select>
          <select className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
            <option value="failed">Fallido</option>
            <option value="refunded">Reembolsado</option>
          </select>
          <input
            type="date"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </div>
      </Card>

      <Card>
        <EmptyState
          icon={<CreditCard className="h-8 w-8 text-slate-400" />}
          title="No hay pagos registrados"
          description="Los pagos aparecerán aquí una vez que se registren."
        />
      </Card>
    </AppShell>
  );
}
