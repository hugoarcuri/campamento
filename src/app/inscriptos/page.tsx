"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Users, Trash2, Mail, Phone, Church } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

export default function InscriptosPage() {
  const [campers, setCampers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    async function loadCampers() {
      const supabase = createClient();
      const [campersRes, paymentsRes] = await Promise.all([
        supabase
          .from("campers")
          .select("*, enrollments (*)")
          .order("created_at", { ascending: false }),
        supabase
          .from("payments")
          .select("enrollment_id, amount, status, tier_label, tier_price"),
      ]);

      const paymentsByEnrollment: Record<string, { paid: number; tierPrice: number }> = {};
      for (const p of paymentsRes.data || []) {
        if (p.status !== "completed") continue;
        if (!paymentsByEnrollment[p.enrollment_id]) {
          paymentsByEnrollment[p.enrollment_id] = { paid: 0, tierPrice: p.tier_price || 0 };
        }
        paymentsByEnrollment[p.enrollment_id].paid += Number(p.amount);
        if (p.tier_price) {
          paymentsByEnrollment[p.enrollment_id].tierPrice = Number(p.tier_price);
        }
      }

      const campersWithBalance = (campersRes.data || []).map((camper) => {
        const enrollment = camper.enrollments?.[0];
        const info = enrollment ? paymentsByEnrollment[enrollment.id] : null;
        return { ...camper, balance: info };
      });

      setCampers(campersWithBalance);
      setLoading(false);
    }
    loadCampers();
  }, []);

  const filteredCampers = useMemo(() => {
    return campers.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
        if (!fullName.includes(q) && !c.email?.toLowerCase().includes(q) && !c.church?.toLowerCase().includes(q))
          return false;
      }
      if (filterStatus === "paid") {
        if (!c.balance) return false;
        const remaining = c.balance.tierPrice - c.balance.paid;
        if (remaining > 0) return false;
      }
      if (filterStatus === "owes") {
        if (!c.balance) return false;
        const remaining = c.balance.tierPrice - c.balance.paid;
        if (remaining <= 0) return false;
      }
      if (filterStatus === "none") {
        if (c.balance) return false;
      }
      return true;
    });
  }, [campers, search, filterStatus]);

  async function handleDelete(id: string) {
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

      <Card className="mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Buscar por nombre, email, iglesia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="">Todos</option>
            <option value="paid">Saldados (azul)</option>
            <option value="owes">Con deuda (rojo)</option>
            <option value="none">Sin pagos</option>
          </select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12">
            <p className="text-sm text-slate-500">Cargando...</p>
          </div>
        ) : filteredCampers.length === 0 ? (
          <EmptyState
            icon={<Users className="h-8 w-8 text-slate-400" />}
            title="Sin resultados"
            description={search || filterStatus ? "No hay inscriptos que coincidan con los filtros." : "No hay inscriptos registrados."}
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
                    Saldo
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCampers.map((camper) => {
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
                        {camper.balance ? (() => {
                          const remaining = camper.balance.tierPrice - camper.balance.paid;
                          if (remaining <= 0) {
                            return (
                              <span className="font-medium text-blue-600 dark:text-blue-400">
                                ${camper.balance.paid.toLocaleString("es-AR")}
                              </span>
                            );
                          }
                          return (
                            <span className="font-medium text-red-600 dark:text-red-400">
                              -${remaining.toLocaleString("es-AR")}
                            </span>
                          );
                        })() : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-4">
                        <button
                          onClick={() => setConfirmDelete(camper.id)}
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

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Eliminar inscripto"
        message="¿Estás seguro de eliminar este inscripto? Se eliminarán también todas sus inscripciones y pagos."
        confirmLabel="Eliminar"
        onConfirm={() => {
          if (confirmDelete) handleDelete(confirmDelete);
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </AppShell>
  );
}
