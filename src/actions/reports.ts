"use server";

import { createClient } from "@/lib/supabase/server";

export async function getReportData() {
  const supabase = await createClient();

  const [campersRes, enrollmentsRes, paymentsRes] = await Promise.all([
    supabase.from("campers").select("age, gender, church"),
    supabase.from("enrollments").select("status"),
    supabase.from("payments").select("amount, status, paid_at"),
  ]);

  const campers = campersRes.data || [];
  const enrollments = enrollmentsRes.data || [];
  const payments = paymentsRes.data || [];
  const total_enrolled = enrollments.length;

  const confirmed = enrollments.filter((e) => e.status === "confirmed").length;
  const pending_count = enrollments.filter((e) => e.status === "pending").length;
  const cancelled = enrollments.filter((e) => e.status === "cancelled").length;
  const confirmation_rate = total_enrolled > 0 ? Math.round((confirmed / total_enrolled) * 100) : 0;

  const total_revenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const avg_per_camper = confirmed > 0 ? total_revenue / confirmed : 0;

  const ageGroups = {
    "12-14": campers.filter((c) => c.age >= 12 && c.age <= 14).length,
    "15-17": campers.filter((c) => c.age >= 15 && c.age <= 17).length,
    "18-25": campers.filter((c) => c.age >= 18 && c.age <= 25).length,
    "26+": campers.filter((c) => c.age >= 26).length,
  };

  const genderDistribution = {
    M: campers.filter((c) => c.gender === "M").length,
    F: campers.filter((c) => c.gender === "F").length,
    Otro: campers.filter((c) => c.gender === "Otro").length,
  };

  const paymentsByMonth: Record<string, number> = {};
  payments
    .filter((p) => p.status === "completed")
    .forEach((p) => {
      const month = p.paid_at ? new Date(p.paid_at).toLocaleString("es-AR", { month: "long", year: "numeric" }) : "Sin fecha";
      paymentsByMonth[month] = (paymentsByMonth[month] || 0) + Number(p.amount);
    });

  return {
    total_enrolled,
    confirmed,
    pending: pending_count,
    cancelled,
    confirmation_rate,
    total_revenue,
    avg_per_camper,
    ageGroups,
    genderDistribution,
    paymentsByMonth,
  };
}
