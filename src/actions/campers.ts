"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createCamper(formData: FormData) {
  const supabase = await createClient();

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

  // Insertar camper
  const { data: camper, error: camperError } = await supabase
    .from("campers")
    .insert(camperData)
    .select()
    .single();

  if (camperError) {
    console.error("Error creating camper:", camperError);
    return { success: false, error: camperError.message };
  }

  // Crear inscripción automática
  const { error: enrollmentError } = await supabase
    .from("enrollments")
    .insert({
      camper_id: camper.id,
      camp_name: "La Lucila",
      camp_year: 2026,
      status: "pending",
    });

  if (enrollmentError) {
    console.error("Error creating enrollment:", enrollmentError);
    return { success: false, error: enrollmentError.message };
  }

  revalidatePath("/inscriptos");
  revalidatePath("/dashboard");
  return { success: true, data: camper };
}

export async function getCampers() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campers")
    .select(`
      *,
      enrollments (*)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching campers:", error);
    return [];
  }

  return data;
}

export async function getCamperById(id: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("campers")
    .select(`
      *,
      enrollments (*)
    `)
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching camper:", error);
    return null;
  }

  return data;
}

export async function updateCamper(id: string, formData: FormData) {
  const supabase = await createClient();

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
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("campers")
    .update(camperData)
    .eq("id", id);

  if (error) {
    console.error("Error updating camper:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/inscriptos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteCamper(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("campers").delete().eq("id", id);

  if (error) {
    console.error("Error deleting camper:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/inscriptos");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function getDashboardStats() {
  const supabase = await createClient();

  const [enrollmentsRes, paymentsRes] = await Promise.all([
    supabase.from("enrollments").select("status"),
    supabase.from("payments").select("amount, status"),
  ]);

  const enrollments = enrollmentsRes.data || [];
  const payments = paymentsRes.data || [];

  return {
    total_enrolled: enrollments.length,
    total_pending: enrollments.filter((e) => e.status === "pending").length,
    total_confirmed: enrollments.filter((e) => e.status === "confirmed").length,
    total_revenue: payments
      .filter((p) => p.status === "completed")
      .reduce((sum, p) => sum + Number(p.amount), 0),
  };
}
