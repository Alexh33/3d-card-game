import React, { useEffect, useState } from "react";
import { getUserOrBypass } from "../utils/authBypass";
import { acceptTrade, declineTrade, fetchPendingTrades } from "../services/tradeApi";
import { Link } from "react-router-dom";

function TradesInbox() {
  const [user, setUser] = useState(null);
  const [incomingTrades, setIncomingTrades] = useState([]);

  useEffect(() => {
    const fetchUserAndTrades = async () => {
      const { user } = await getUserOrBypass();
      if (!user) return;

      setUser(user);

      const data = await fetchPendingTrades();
      setIncomingTrades(data);
    };

    fetchUserAndTrades();
  }, []);

  const respondToTrade = async (tradeId, accept) => {
    try {
      if (accept) {
        await acceptTrade(tradeId);
      } else {
        await declineTrade(tradeId);
      }
      setIncomingTrades(prev => prev.filter(t => t.id !== tradeId));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Trades</p>
        <h1 className="text-3xl font-semibold">Incoming offers</h1>
        <p className="text-white/70 text-sm">Review, accept, or decline offers from other collectors.</p>
        <div className="mt-3">
          <Link
            to="/trades/create"
            className="inline-flex px-4 py-2 rounded-lg border border-purple-400/40 text-white/90 hover:bg-white/10 transition text-sm"
          >
            Start a trade
          </Link>
        </div>
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
