"use client";

import { useState } from "react";
import { UserPlus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function InscribirsePage() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        dni: (formData.get("dni") as string) || null,
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
        promo_month: (formData.get("promo_month") as string) || null,
      });

      setSuccess(true);
      setIsPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
      setIsPending(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4 dark:from-slate-950 dark:to-slate-900">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-slate-900 dark:text-white">Inscripción Confirmada</h1>
          <p className="mb-6 text-slate-600 dark:text-slate-400">
            Tu inscripción al Campamento La Lucila 2026 se registró correctamente. Te contactaremos a la brevedad.
          </p>
          <Button onClick={() => setSuccess(false)}>Nueva Inscripción</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-8 text-center">
          <img
            src="/campamento/logoJh.jpeg"
            alt="Logo"
            className="mx-auto mb-4 h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
            Campamento La Lucila 2026
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Completá el formulario para inscribirte
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-8">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Datos Personales</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre *</label>
                  <input type="text" name="first_name" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Nombre" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Apellido *</label>
                  <input type="text" name="last_name" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Apellido" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">DNI</label>
                  <input type="text" name="dni" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="DNI (opcional)" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email *</label>
                  <input type="email" name="email" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="email@ejemplo.com" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono *</label>
                  <input type="tel" name="phone" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="+54 11 1234-5678" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Edad *</label>
                  <input type="number" name="age" required min={12} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="18" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Género *</label>
                  <select name="gender" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="">Seleccionar...</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Mes tope de pago</label>
                  <select name="promo_month" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="">Seleccionar...</option>
                    <option value="Septiembre">Septiembre</option>
                    <option value="Noviembre">Noviembre</option>
                    <option value="Enero">Enero</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Iglesia / Comunidad</label>
                  <input type="text" name="church" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Iglesia o comunidad de origen (opcional)" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Contacto de Emergencia</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Nombre *</label>
                  <input type="text" name="emergency_contact" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="Contacto de emergencia" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Teléfono *</label>
                  <input type="tel" name="emergency_phone" required className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" placeholder="+54 11 1234-5678" />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-6 dark:border-slate-700">
              <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Notas Médicas</h2>
              <textarea name="medical_notes" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" rows={3} placeholder="Alergias, medicaciones, condiciones especiales..." />
            </div>

            <div className="flex justify-center border-t border-slate-200 pt-6 dark:border-slate-700">
              <Button type="submit" disabled={isPending} size="lg">
                {isPending ? "Enviando..." : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    Inscribirme
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Campamento La Lucila 2026 &mdash; Iglesia Jesucristo la Hermosa
        </p>
      </div>
    </div>
  );
}
