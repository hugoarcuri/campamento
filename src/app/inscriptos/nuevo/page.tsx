"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";

export default function NuevoInscriptoPage() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const formData = new FormData(e.currentTarget);
      const supabase = createClient();

      const camperData = {
        first_name: formData.get("first_name") as string,
        last_name: formData.get("last_name") as string,
        email: formData.get("email") as string,
        phone: formData.get("phone") as string,
        age: Number(formData.get("age")),
        gender: formData.get("gender") as string,
        church: (formData.get("church") as string) || null,
        medical_notes: (formData.get("medical_notes") as string) || null,
        emergency_contact: formData.get("emergency_contact") as string,
        emergency_phone: formData.get("emergency_phone") as string,
      };

      const { data: camper, error: camperError } = await supabase
        .from("campers")
        .insert(camperData)
        .select()
        .single();

      if (camperError) {
        setError(camperError.message);
        setIsPending(false);
        return;
      }

      await supabase.from("enrollments").insert({
        camper_id: camper.id,
        camp_name: "La Lucila",
        camp_year: 2026,
        status: "pending",
      });

      router.push("/inscriptos");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setIsPending(false);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Nuevo Inscripto"
        description="Registrar un nuevo participante al campamento"
      />

      <Card>
        <CardHeader>Datos Personales</CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              Error: {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Nombre *
                </label>
                <input
                  type="text"
                  name="first_name"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Nombre del inscripto"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Apellido *
                </label>
                <input
                  type="text"
                  name="last_name"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Apellido del inscripto"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="+54 11 1234-5678"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Edad *
                </label>
                <input
                  type="number"
                  name="age"
                  required
                  min={12}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="18"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Género *
                </label>
                <select
                  name="gender"
                  required
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Seleccionar...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Iglesia / Comunidad
                </label>
                <input
                  type="text"
                  name="church"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Iglesia o comunidad de origen (opcional)"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Contacto de Emergencia
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="emergency_contact"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="Contacto de emergencia"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    name="emergency_phone"
                    required
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    placeholder="+54 11 1234-5678"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                Notas Médicas
              </h3>
              <textarea
                name="medical_notes"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                rows={3}
                placeholder="Alergias, medicaciones, condiciones especiales..."
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
              <Link href="/inscriptos">
                <Button variant="secondary" type="button">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  "Guardando..."
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Registrar Inscripto
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}
