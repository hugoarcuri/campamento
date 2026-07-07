export interface Camper {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  age: number;
  gender: "M" | "F";
  church?: string;
  medical_notes?: string;
  emergency_contact: string;
  emergency_phone: string;
  created_at: string;
  updated_at: string;
}

export interface Enrollment {
  id: string;
  camper_id: string;
  camp_name: string;
  camp_year: number;
  status: "pending" | "confirmed" | "cancelled";
  registered_at: string;
  camper?: Camper;
}

export interface Payment {
  id: string;
  enrollment_id: string;
  amount: number;
  currency: string;
  payment_method: "cash" | "transfer" | "card" | "other";
  status: "pending" | "completed" | "failed" | "refunded";
  reference?: string;
  paid_at: string;
  enrollment?: Enrollment;
}

export interface DashboardStats {
  total_enrolled: number;
  total_pending: number;
  total_confirmed: number;
  total_payments: number;
  total_revenue: number;
}

export type NavItem = {
  label: string;
  href: string;
  icon: string;
};
