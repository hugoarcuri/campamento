"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getPayments() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("payments")
    .select("*, enrollment:enrollments(camper_id, camp_name, status, camper:campers(first_name, last_name))")
    .order("paid_at", { ascending: false });

  if (error) {
    console.error("Error fetching payments:", error);
    return [];
  }

  return data;
}

export async function createPayment(formData: FormData) {
  const supabase = await createClient();

  const paymentData = {
    enrollment_id: formData.get("enrollment_id") as string,
    amount: Number(formData.get("amount")),
    currency: (formData.get("currency") as string) || "ARS",
    payment_method: formData.get("payment_method") as string,
    status: (formData.get("status") as string) || "completed",
    reference: (formData.get("reference") as string) || null,
  };

  const { error } = await supabase.from("payments").insert(paymentData);

  if (error) {
    console.error("Error creating payment:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getPaymentStats() {
  const supabase = await createClient();

  const { data: payments, error } = await supabase
    .from("payments")
    .select("amount, status, paid_at");

  if (error) {
    console.error("Error fetching payment stats:", error);
    return { total_revenue: 0, total_pending: 0, total_this_month: 0 };
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const total_revenue = payments
    .filter((p) => p.status === "completed")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const total_pending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const total_this_month = payments
    .filter((p) => p.status === "completed" && p.paid_at >= startOfMonth)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return { total_revenue, total_pending, total_this_month };
}

export async function getCampersForPayment() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campers")
    .select("id, first_name, last_name, enrollments!inner(id, status)")
    .eq("enrollments.status", "pending")
    .order("first_name", { ascending: true });

  if (error) {
    console.error("Error fetching campers for payment:", error);
    return [];
  }

  return data;
}
