import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";

function TradesInbox() {
  const [user, setUser] = useState(null);
  const [incomingTrades, setIncomingTrades] = useState([]);

  useEffect(() => {
    const fetchUserAndTrades = async () => {
      const { user } = await getUserOrBypass();
      if (!user) return;

      setUser(user);

      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("to_user_id", user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch trades:", error);
      } else {
        setIncomingTrades(data);
      }
    };

    fetchUserAndTrades();
  }, []);

  const respondToTrade = async (tradeId, accept) => {
    const newStatus = accept ? "accepted" : "declined";
    const { error } = await supabase
      .from("trades")
      .update({ status: newStatus })
      .eq("id", tradeId);

    if (error) {
      console.error("Failed to update trade:", error);
    } else {
      setIncomingTrades(prev => prev.filter(t => t.id !== tradeId));
    }
  };

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Trades</p>
        <h1 className="text-3xl font-semibold">Incoming offers</h1>
        <p className="text-white/70 text-sm">Review, accept, or decline offers from other collectors.</p>
      </div>
      {incomingTrades.length === 0 ? (
        <div className="glass p-6 text-white/80">No pending trades right now.</div>
      ) : (
        incomingTrades.map((trade) => (
          <div key={trade.id} className="glass p-5 border border-purple-400/30">
            <p className="text-sm text-white/70">From</p>
            <p className="font-semibold">{trade.from_user_id}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/80 mt-3">
              <div>
                <p className="text-white/60 text-xs uppercase">Cards offered</p>
                <p className="font-mono text-white">{trade.offered_card_ids.join(", ")}</p>
              </div>
              <div>
                <p className="text-white/60 text-xs uppercase">Cards requested</p>
                <p className="font-mono text-white">{trade.requested_card_ids.join(", ")}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => respondToTrade(trade.id, true)}
                className="cta px-4 py-3"
              >
                Accept
              </button>
              <button
                onClick={() => respondToTrade(trade.id, false)}
                className="px-4 py-3 rounded-xl border border-white/15 text-white/80 hover:bg-white/10 transition"
              >
                Decline
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default TradesInbox;
