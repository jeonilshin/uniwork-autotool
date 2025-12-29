import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ItemStatus = "bought" | "arrived" | "delivered";
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

export interface InquiredInfo {
  name: string;
  price: number | null;
  contact: string;
  source: string;
}

export interface InventoryItem {
  id: string;
  product_name: string;
  customer_name: string;
  contact: string;
  bought_from: string;
  purchaser: string;
  bought_price: number;
  sold_price: number;
  image_url: string | null;
  status: ItemStatus;
  freight_type: FreightType;
  vat_type: VatType;
  is_inquired: boolean;
  inquired_list: InquiredInfo[] | null;
  delivered_at: string | null;
  payment_collected: boolean;
  created_at: string;
  user_id: string;
}

export interface InquiryItem {
  id: string;
  product_name: string;
  customer_name: string;
  contact: string;
  notes: string;
  created_at: string;
  user_id: string;
}

// Keep for backward compatibility but not used
export type { InquiryItem as _InquiryItem };

export interface FilterOptions {
  status?: ItemStatus | "all";
  freightType?: FreightType | "all";
  vatType?: VatType | "all";
  inquired?: boolean | "all";
  minPrice?: number;
  maxPrice?: number;
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
  // Delete from user_profiles
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
  if (filters.vatType && filters.vatType !== "all") query = query.eq("vat_type", filters.vatType);
  if (filters.inquired !== undefined && filters.inquired !== "all") query = query.eq("is_inquired", filters.inquired);
  if (filters.minPrice !== undefined) query = query.gte("sold_price", filters.minPrice);
  if (filters.maxPrice !== undefined) query = query.lte("sold_price", filters.maxPrice);
  if (filters.searchQuery) {
    query = query.or(`product_name.ilike.%${filters.searchQuery}%,customer_name.ilike.%${filters.searchQuery}%,bought_from.ilike.%${filters.searchQuery}%,purchaser.ilike.%${filters.searchQuery}%`);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function addItem(item: Omit<InventoryItem, "id" | "created_at">): Promise<InventoryItem> {
  const { data, error } = await supabase.from("items").insert([item]).select().single();
  if (error) throw error;
  return data;
}

export async function updateItemStatus(id: string, status: ItemStatus): Promise<InventoryItem> {
  const updateData: { status: ItemStatus; delivered_at?: string | null } = { status };
  // Set delivered_at when status changes to delivered
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

export async function updateItemInquired(id: string, is_inquired: boolean): Promise<InventoryItem> {
  const { data, error } = await supabase.from("items").update({ is_inquired }).eq("id", id).select().single();
  if (error) throw error;
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

// Create secretary account using Supabase Admin (requires service role key on server)
export async function inviteSecretary(email: string, password: string, adminId: string): Promise<{ success: boolean; error?: string; profile?: UserProfile }> {
  try {
    // Sign up the secretary
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Failed to create user");

    // Create their profile as secretary
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
