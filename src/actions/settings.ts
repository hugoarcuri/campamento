"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getSettings() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("settings").select("*");

  if (error) {
    console.error("Error fetching settings:", error);
    return {};
  }

  const settings: Record<string, string> = {};
  data.forEach((row) => {
    settings[row.key] = row.value;
  });
  return settings;
}

export async function updateSettings(formData: FormData) {
  const supabase = await createClient();

  const entries: { key: string; value: string }[] = [];
  for (const [key, value] of formData.entries()) {
    entries.push({ key, value: value as string });
  }

  for (const { key, value } of entries) {
    const { error } = await supabase
      .from("settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });

    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      return { success: false, error: error.message };
    }
  }

  revalidatePath("/configuracion");
  return { success: true };
}
