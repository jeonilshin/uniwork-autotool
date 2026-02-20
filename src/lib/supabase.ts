import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ItemStatus = "inquired" | "bought" | "arrived" | "delivered";
export type FreightType = "sea" | "land" | "air";
export type VatType = "vat_inclusive" | "non_vat";
export type UserRole = "admin" | "secretary";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_by: string | null;
  created_at: string;
}

export interface InquiredSupplier {
  supplier_name: string;
  supplier_contact: string;
  cost: number;
  discount: string | null;
}

export interface InventoryItem {
  id: string;
  image_url: string | null;
  brand: string;
  part_number: string | null;
  qty: number;
  unit: string;
  particular: string;
  cost: number;
  discount: string | null;
  vat_type: VatType;
  supplier_name: string;
  supplier_contact: string;
  customer_name: string;
  customer_contact: string | null;
  sale: number;
  freight_cost: number;
  freight_type: FreightType;
  status: ItemStatus;
  is_inquired: boolean;
  inquired_list: InquiredSupplier[] | null;
  delivered_at: string | null;
  payment_collected: boolean;
  remark: string | null;
  created_at: string;
  user_id: string;
}

export interface FilterOptions {
  status?: ItemStatus | "all";
  freightType?: FreightType | "all";
  inquired?: boolean | "all";
  minCost?: number;
  maxCost?: number;
  searchQuery?: string;
}

// User Profile functions
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("id", userId).single();
  if (error) return null;
  return data;
}

export async function createUserProfile(profile: Omit<UserProfile, "created_at">): Promise<UserProfile> {
  const { data, error } = await supabase.from("user_profiles").insert([profile]).select().single();
  if (error) throw error;
  return data;
}

export async function getSecretaries(adminId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase.from("user_profiles").select("*").eq("created_by", adminId).eq("role", "secretary");
  if (error) throw error;
  return data || [];
}

export async function deleteSecretary(secretaryId: string): Promise<boolean> {
  const { error } = await supabase.from("user_profiles").delete().eq("id", secretaryId);
  if (error) throw error;
  return true;
}

// Items functions
export async function getAllItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getFilteredItems(filters: FilterOptions): Promise<InventoryItem[]> {
  let query = supabase.from("items").select("*");

  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.freightType && filters.freightType !== "all") query = query.eq("freight_type", filters.freightType);
  if (filters.inquired !== undefined && filters.inquired !== "all") query = query.eq("is_inquired", filters.inquired);
  if (filters.minCost !== undefined) query = query.gte("cost", filters.minCost);
  if (filters.maxCost !== undefined) query = query.lte("cost", filters.maxCost);
  if (filters.searchQuery) {
    query = query.or(`brand.ilike.%${filters.searchQuery}%,part_number.ilike.%${filters.searchQuery}%,particular.ilike.%${filters.searchQuery}%,supplier_name.ilike.%${filters.searchQuery}%,customer_name.ilike.%${filters.searchQuery}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addItem(item: Omit<InventoryItem, "id" | "created_at">): Promise<InventoryItem> {
  const { data, error } = await supabase.from("items").insert([item]).select().single();
  if (error) {
    console.error("Supabase addItem error:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      fullError: error,
    });
    throw new Error(error.message || error.details || "Failed to add item");
  }
  if (!data) throw new Error("No data returned from insert");
  return data;
}

export async function updateItem(id: string, updates: Partial<Omit<InventoryItem, "id" | "created_at" | "user_id">>): Promise<InventoryItem> {
  const { data, error } = await supabase.from("items").update(updates).eq("id", id).select().single();
  if (error) {
    console.error("Supabase error:", error);
    throw new Error(error.message || "Failed to update item");
  }
  if (!data) throw new Error("No data returned");
  return data;
}

export async function updateItemStatus(id: string, status: ItemStatus): Promise<InventoryItem> {
  const updateData: { status: ItemStatus; delivered_at?: string | null } = { status };
  if (status === 'delivered') {
    updateData.delivered_at = new Date().toISOString();
  } else {
    updateData.delivered_at = null;
  }
  const { data, error } = await supabase.from("items").update(updateData).eq("id", id).select().single();
  if (error) {
    console.error("Supabase error:", error);
    throw new Error(error.message || "Failed to update status");
  }
  if (!data) throw new Error("No data returned");
  return data;
}

export async function collectPayment(id: string): Promise<InventoryItem> {
  const { data, error } = await supabase.from("items").update({ payment_collected: true }).eq("id", id).select().single();
  if (error) {
    console.error("Supabase error:", error);
    throw new Error(error.message || "Failed to collect payment");
  }
  if (!data) throw new Error("No data returned");
  return data;
}

export async function deleteItem(id: string): Promise<boolean> {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function uploadImage(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${userId}/${Date.now()}.${fileExt}`;

  const { error } = await supabase.storage.from("item-images").upload(fileName, file, { cacheControl: "3600", upsert: false });
  if (error) { console.error("Upload error:", error); throw error; }

  const { data } = supabase.storage.from("item-images").getPublicUrl(fileName);
  return data.publicUrl;
}

export async function inviteSecretary(email: string, password: string, adminId: string): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Failed to create user");

    const profile = await createUserProfile({
      id: data.user.id,
      email: email,
      role: "secretary",
      created_by: adminId,
    });

    return { success: true, profile };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create secretary" };
  }
}
