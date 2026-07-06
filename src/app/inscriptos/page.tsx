"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Users, Trash2, Mail, Phone, Church } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";

const statusMap: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  pending: { label: "Pendiente", variant: "warning" },
  confirmed: { label: "Confirmado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "danger" },
};

export default function InscriptosPage() {
  const [campers, setCampers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCampers() {
      const supabase = createClient();
      const { data } = await supabase
        .from("campers")
        .select("*, enrollments (*)")
        .order("created_at", { ascending: false });
      setCampers(data || []);
      setLoading(false);
    }
    loadCampers();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este inscripto?")) return;
    const supabase = createClient();
    await supabase.from("campers").delete().eq("id", id);
    setCampers(campers.filter((c) => c.id !== id));
  }

  return (
    <AppShell>
      <PageHeader
        title="Inscriptos"
        description="Gestión de todos los inscriptos al campamento"
        actions={
          <Link href="/inscriptos/nuevo">
            <Button>+ Nuevo Inscripto</Button>
          </Link>
        }
      />

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-slate-500">Cargando...</p>
          </div>
        ) : campers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-400" />}
            title="No hay inscriptos"
            description="Comienza agregando el primer inscripto al campamento."
            action={
              <Link href="/inscriptos/nuevo">
                <Button>Agregar Inscripto</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Nombre
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Contacto
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Edad
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Iglesia
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Estado
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {campers.map((camper) => {
                  const enrollment = camper.enrollments?.[0];
                  const status = enrollment?.status || "pending";
                  const statusInfo = statusMap[status] || statusMap.pending;

                  return (
                    <tr
                      key={camper.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {camper.first_name} {camper.last_name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {camper.gender === "M" ? "Masculino" : camper.gender === "F" ? "Femenino" : "Otro"}
                          </p>
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Mail className="h-3 w-3" />
                            {camper.email}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                            <Phone className="h-3 w-3" />
                            {camper.phone}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 text-slate-900 dark:text-white">
                        {camper.age} años
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Church className="h-3 w-3" />
                          {camper.church || "-"}
                        </div>
                      </td>
                      <td className="py-4">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => handleDelete(camper.id)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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
