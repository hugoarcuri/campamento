"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function ConfiguracionPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const supabase = createClient();
        const { data } = await supabase.from("settings").select("*");
        const map: Record<string, string> = {};
        (data || []).forEach((row) => { map[row.key] = row.value; });
        setSettings(map);
      } catch (err) {
        console.error("Error loading settings:", err);
      }
      setLoading(false);
    }
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const supabase = createClient();

      for (const [key, value] of formData.entries()) {
        const { error: upsertError } = await supabase
          .from("settings")
          .upsert({ key, value: value as string, updated_at: new Date().toISOString() });

        if (upsertError) {
          setError(upsertError.message);
          setSaving(false);
          return;
        }
      }

      const { data } = await supabase.from("settings").select("*");
      const map: Record<string, string> = {};
      (data || []).forEach((row) => { map[row.key] = row.value; });
      setSettings(map);
      setSuccess(true);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <PageHeader title="Configuración" description="Ajustes generales del sistema" />
        <div className="flex justify-center py-12">
          <p className="text-sm text-slate-500">Cargando...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="Configuración"
        description="Ajustes generales del sistema"
      />

      <div className="space-y-6">
        {success && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            Configuración guardada correctamente.
          </div>
        )}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Error: {error}
          </div>
        )}

        <Card>
          <CardHeader>Datos del Campamento</CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nombre del Campamento
                  </label>
                  <input
                    type="text"
                    name="camp_name"
                    defaultValue={settings.camp_name || ""}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Año
                  </label>
                  <input
                    type="number"
                    name="camp_year"
                    defaultValue={settings.camp_year || ""}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fecha de Inicio
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    defaultValue={settings.start_date || ""}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Fecha de Fin
                  </label>
                  <input
                    type="date"
                    name="end_date"
                    defaultValue={settings.end_date || ""}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>Configuración de Pagos</CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Costo de Inscripción
                  </label>
                  <input
                    type="number"
                    name="registration_fee"
                    defaultValue={settings.registration_fee || "0"}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Moneda
                  </label>
                  <select
                    name="currency"
                    defaultValue={settings.currency || "ARS"}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  >
                    <option value="ARS">Peso Argentino (ARS)</option>
                    <option value="USD">Dólar (USD)</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
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
