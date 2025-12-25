import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ItemStatus = "bought" | "delivered" | "received";

export interface InventoryItem {
  id: string;
  product_name: string;
  customer_name: string;
  bought_from: string;
  sold_to: string;
  bought_price: number;
  sold_price: number;
  image_url: string | null;
  status: ItemStatus;
  created_at: string;
  user_id: string;
}

export interface FilterOptions {
  status?: ItemStatus | "all";
  minPrice?: number;
  maxPrice?: number;
  searchQuery?: string;
}

export async function getAllItems(): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getFilteredItems(filters: FilterOptions): Promise<InventoryItem[]> {
  let query = supabase.from("items").select("*");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.minPrice !== undefined) {
    query = query.gte("sold_price", filters.minPrice);
  }

  if (filters.maxPrice !== undefined) {
    query = query.lte("sold_price", filters.maxPrice);
  }

  if (filters.searchQuery) {
    query = query.or(
      `product_name.ilike.%${filters.searchQuery}%,customer_name.ilike.%${filters.searchQuery}%,bought_from.ilike.%${filters.searchQuery}%,sold_to.ilike.%${filters.searchQuery}%`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function searchItems(query: string): Promise<InventoryItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .or(
      `product_name.ilike.%${query}%,customer_name.ilike.%${query}%,bought_from.ilike.%${query}%,sold_to.ilike.%${query}%`
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addItem(
  item: Omit<InventoryItem, "id" | "created_at">
): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("items")
    .insert([item])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateItemStatus(id: string, status: ItemStatus): Promise<InventoryItem> {
  const { data, error } = await supabase
    .from("items")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

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

  const { error } = await supabase.storage.from("item-images").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    console.error("Upload error:", error);
    throw error;
  }

  const { data } = supabase.storage.from("item-images").getPublicUrl(fileName);

  console.log("Image URL:", data.publicUrl);
  return data.publicUrl;
}
