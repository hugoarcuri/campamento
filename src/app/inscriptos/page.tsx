"use client";

import { AppShell } from "@/components/layout/AppShell";
import { Users, Trash2, Mail, Phone, Church, FileDown, Pencil, Check, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";

export default function InscriptosPage() {
  const [campers, setCampers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingObs, setEditingObs] = useState<string | null>(null);
  const [obsText, setObsText] = useState("");
  const [editingCamper, setEditingCamper] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", email: "", phone: "", age: 0, gender: "", church: "", medical_notes: "", emergency_contact: "", emergency_phone: "" });

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

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredCampers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCampers.map((c) => c.id)));
    }
  }

  async function saveObservaciones(camperId: string) {
    const supabase = createClient();
    const enrollment = campers.find((c) => c.id === camperId)?.enrollments?.[0];
    if (!enrollment) return;
    await supabase.from("enrollments").update({ observaciones: obsText }).eq("id", enrollment.id);
    setCampers((prev) =>
      prev.map((c) => {
        if (c.id === camperId && c.enrollments?.[0]) {
          return { ...c, enrollments: [{ ...c.enrollments[0], observaciones: obsText }] };
        }
        return c;
      })
    );
    setEditingObs(null);
  }

  function openEdit(camper: any) {
    setEditForm({
      first_name: camper.first_name,
      last_name: camper.last_name,
      email: camper.email || "",
      phone: camper.phone || "",
      age: camper.age || 0,
      gender: camper.gender || "M",
      church: camper.church || "",
      medical_notes: camper.medical_notes || "",
      emergency_contact: camper.emergency_contact || "",
      emergency_phone: camper.emergency_phone || "",
    });
    setEditingCamper(camper);
  }

  async function saveEdit() {
    if (!editingCamper) return;
    const supabase = createClient();
    await supabase.from("campers").update(editForm).eq("id", editingCamper.id);
    setCampers((prev) =>
      prev.map((c) => (c.id === editingCamper.id ? { ...c, ...editForm } : c))
    );
    setEditingCamper(null);
  }

  function exportToExcel() {
    const data = filteredCampers.map((c) => {
      const enrollment = c.enrollments?.[0];
      const remaining = c.balance ? c.balance.tierPrice - c.balance.paid : null;
      return {
        Nombre: `${c.first_name} ${c.last_name}`,
        Email: c.email,
        Teléfono: c.phone,
        Edad: c.age,
        Género: c.gender === "M" ? "Masculino" : c.gender === "F" ? "Femenino" : "Otro",
        Iglesia: c.church || "",
        "Saldo Total": c.balance ? `$${c.balance.tierPrice.toLocaleString("es-AR")}` : "",
        Pagado: c.balance ? `$${c.balance.paid.toLocaleString("es-AR")}` : "",
        Deuda: remaining !== null && remaining > 0 ? `-$${remaining.toLocaleString("es-AR")}` : remaining !== null ? `$${c.balance.paid.toLocaleString("es-AR")}` : "",
        Observaciones: enrollment?.observaciones || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inscriptos");
    XLSX.writeFile(wb, "inscriptos.xlsx");
  }

  return (
    <AppShell>
      <PageHeader
        title="Inscriptos"
        description="Gestión de todos los inscriptos al campamento"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportToExcel}>
              <FileDown className="h-4 w-4" />
              Exportar
            </Button>
            <Link href="/inscriptos/nuevo">
              <Button>+ Nuevo Inscripto</Button>
            </Link>
          </div>
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
                  <th className="pb-3 pr-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === filteredCampers.length && filteredCampers.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Nombre</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Contacto</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Edad</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Iglesia</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Saldo</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400">Observaciones</th>
                  <th className="pb-3 font-medium text-slate-500 dark:text-slate-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCampers.map((camper) => {
                  const enrollment = camper.enrollments?.[0];
                  return (
                    <tr key={camper.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="py-3 pr-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(camper.id)}
                          onChange={() => toggleSelect(camper.id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {camper.first_name} {camper.last_name}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {camper.gender === "M" ? "Masculino" : camper.gender === "F" ? "Femenino" : "Otro"}
                        </p>
                      </td>
                      <td className="py-3">
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
                      <td className="py-3 text-slate-900 dark:text-white">{camper.age} años</td>
                      <td className="py-3">
                        <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Church className="h-3 w-3" />
                          {camper.church || "-"}
                        </div>
                      </td>
                      <td className="py-3">
                        {camper.balance ? (() => {
                          const remaining = camper.balance.tierPrice - camper.balance.paid;
                          if (remaining <= 0) {
                            return <span className="font-medium text-blue-600 dark:text-blue-400">${camper.balance.paid.toLocaleString("es-AR")}</span>;
                          }
                          return <span className="font-medium text-red-600 dark:text-red-400">-${remaining.toLocaleString("es-AR")}</span>;
                        })() : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 max-w-[200px]">
                        {editingObs === camper.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={obsText}
                              onChange={(e) => setObsText(e.target.value)}
                              className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                              placeholder="Observaciones..."
                            />
                            <button onClick={() => saveObservaciones(camper.id)} className="text-emerald-500 hover:text-emerald-700"><Check className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setEditingObs(null)} className="text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <div className="group flex items-center gap-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                              {enrollment?.observaciones || ""}
                            </span>
                            <button
                              onClick={() => {
                                setObsText(enrollment?.observaciones || "");
                                setEditingObs(camper.id);
                              }}
                              className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(camper)}
                            className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(camper.id)}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
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

      {editingCamper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setEditingCamper(null)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl dark:bg-slate-800 max-h-[90vh] overflow-y-auto">
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Editar Inscripto</h3>
            <div className="space-y-3">
              {[
                { label: "Nombre", key: "first_name" },
                { label: "Apellido", key: "last_name" },
                { label: "Email", key: "email", type: "email" },
                { label: "Teléfono", key: "phone" },
                { label: "Edad", key: "age", type: "number" },
                { label: "Iglesia", key: "church" },
                { label: "Contacto emergencia", key: "emergency_contact" },
                { label: "Tel. emergencia", key: "emergency_phone" },
                { label: "Notas médicas", key: "medical_notes" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">{label}</label>
                  <input
                    type={type || "text"}
                    value={(editForm as any)[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: type === "number" ? Number(e.target.value) : e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-400">Género</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setEditingCamper(null)}>Cancelar</Button>
              <Button onClick={saveEdit}>Guardar</Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
