import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ConfiguracionPage() {
  return (
    <AppShell>
      <PageHeader
        title="Configuración"
        description="Ajustes generales del sistema"
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>Datos del Campamento</CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nombre del Campamento
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="La Lucila 2026"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Año
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="2026"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Guardar Cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Configuración de Pagos</CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Costo de Inscripción
                  </label>
                  <input
                    type="number"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Moneda
                  </label>
                  <select className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="ARS">Peso Argentino (ARS)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button>Guardar Cambios</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Zona de Peligro</CardHeader>
          <CardContent>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
              <h4 className="text-sm font-semibold text-red-800 dark:text-red-400">
                Eliminar todos los datos
              </h4>
              <p className="mt-1 text-sm text-red-600 dark:text-red-300">
                Esta acción eliminará permanentemente todos los inscriptos, pagos
                y datos del campamento. Esta acción no se puede deshacer.
              </p>
              <Button variant="danger" className="mt-4">
                Eliminar Todos los Datos
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
