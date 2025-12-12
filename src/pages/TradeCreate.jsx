import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";

function TradeCreate() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [yourCards, setYourCards] = useState([]);
  const [theirCards, setTheirCards] = useState([]);
  const [selectedYours, setSelectedYours] = useState([]);
  const [selectedTheirs, setSelectedTheirs] = useState([]);
  const navigate = useNavigate();

  const targetUserId = searchParams.get("with");

  useEffect(() => {
    const fetchUserAndCards = async () => {
      const { user } = await getUserOrBypass();
      if (!user) return navigate("/login");
      setUser(user);

      const [yours, theirs] = await Promise.all([
        supabase.from("cards").select("*").eq("owner_id", user.id).eq("locked", false),
        supabase.from("cards").select("*").eq("owner_id", targetUserId).eq("locked", false),
      ]);

      if (yours.data) setYourCards(yours.data);
      if (theirs.data) setTheirCards(theirs.data);
    };

    fetchUserAndCards();
  }, [targetUserId, navigate]);

  const toggleSelect = (id, list, setList) => {
    setList(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const proposeTrade = async () => {
    const { error } = await supabase.from("trades").insert({
      from_user_id: user.id,
      to_user_id: targetUserId,
      offered_card_ids: selectedYours,
      requested_card_ids: selectedTheirs,
      status: "pending",
    });

    if (error) {
      alert("Error sending trade: " + error.message);
    } else {
      alert("Trade sent!");
      navigate("/trades");
    }
  };

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <p className="pill mb-2">Trades</p>
        <h1 className="text-3xl font-semibold">Propose a trade</h1>
        <p className="text-white/70 text-sm mt-1">
          Select your cards and what you want in return. Both sides must be unlocked to trade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-4">
          <h2 className="text-lg font-semibold mb-3">Your cards</h2>
          <div className="card-grid">
            {yourCards.map((card) => (
              <div
                key={card.card_id || card.id}
                className={`glass p-3 border ${selectedYours.includes(card.id) ? "border-green-400/60" : "border-white/10"} cursor-pointer`}
                onClick={() => toggleSelect(card.id, selectedYours, setSelectedYours)}
              >
                <img src={card.image} alt={card.name} className="w-full h-24 object-cover rounded" />
                <p className="text-sm mt-2 font-semibold truncate">{card.name}</p>
                <p className="text-xs text-white/60">{card.rarity}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass p-4">
          <h2 className="text-lg font-semibold mb-3">Their cards</h2>
          <div className="card-grid">
            {theirCards.map((card) => (
              <div
                key={card.card_id || card.id}
                className={`glass p-3 border ${selectedTheirs.includes(card.id) ? "border-purple-400/70" : "border-white/10"} cursor-pointer`}
                onClick={() => toggleSelect(card.id, selectedTheirs, setSelectedTheirs)}
              >
                <img src={card.image} alt={card.name} className="w-full h-24 object-cover rounded" />
                <p className="text-sm mt-2 font-semibold truncate">{card.name}</p>
                <p className="text-xs text-white/60">{card.rarity}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={proposeTrade}
          disabled={selectedYours.length === 0 || selectedTheirs.length === 0}
          className="cta px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send Trade Offer
        </button>
      </div>
    </div>
  );
}

export default TradeCreate;
