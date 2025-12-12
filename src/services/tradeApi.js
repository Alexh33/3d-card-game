import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";

const mapTrade = (row) => ({
  id: row.id,
  from: row.from_user_id,
  to: row.to_user_id,
  offered: row.offered_card_ids || [],
  requested: row.requested_card_ids || [],
  status: row.status,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

export async function fetchPendingTrades() {
  const { user } = await getUserOrBypass();
  if (!user) return [];

  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("to_user_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("fetchPendingTrades error", error);
    return [];
  }
  return (data || []).map(mapTrade);
}

export async function createTrade(toUserId, offeredIds, requestedIds) {
  const { user, bypass } = await getUserOrBypass();
  if (!user) throw new Error("Not authenticated");
  if (bypass) throw new Error("Trade RPC unavailable in bypass mode");

  const { data, error } = await supabase.rpc("create_trade", {
    p_to_user: toUserId,
    p_offered: offeredIds,
    p_requested: requestedIds,
  });

  if (error) {
    console.error("createTrade error", error);
    throw new Error(error.message || "Failed to create trade");
  }
  return data;
}

export async function acceptTrade(tradeId) {
  const { user, bypass } = await getUserOrBypass();
  if (!user) throw new Error("Not authenticated");
  if (bypass) throw new Error("Trade RPC unavailable in bypass mode");

  const { error } = await supabase.rpc("accept_trade", { p_trade_id: tradeId });
  if (error) {
    console.error("acceptTrade error", error);
    throw new Error(error.message || "Failed to accept trade");
  }
}

export async function declineTrade(tradeId) {
  const { user, bypass } = await getUserOrBypass();
  if (!user) throw new Error("Not authenticated");
  if (bypass) throw new Error("Trade RPC unavailable in bypass mode");

  const { error } = await supabase.rpc("decline_trade", { p_trade_id: tradeId });
  if (error) {
    console.error("declineTrade error", error);
    throw new Error(error.message || "Failed to decline trade");
  }
}
