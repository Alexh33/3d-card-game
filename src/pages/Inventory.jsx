import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";

function Inventory() {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPacks = async () => {
      const { user } = await getUserOrBypass();

      if (!user) return;

      const { data, error } = await supabase
        .from("packs")
        .select("*")
        .eq("owner_id", user.id)
        .eq("opened", false)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching packs:", error.message);
      } else {
        setPacks(data);
      }

      setLoading(false);
    };

    fetchPacks();
  }, []);

  return (
    <div className="text-white flex flex-col gap-4">
      <div className="glass p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="pill mb-2">Packs</p>
            <h1 className="text-3xl font-semibold">Your unopened inventory</h1>
            <p className="text-white/70 text-sm mt-1">
              Rip a pack to reveal three meme collectibles with rarity and clarity scores.
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/60 text-sm">Unopened total</p>
            <p className="text-3xl font-semibold">{packs.length}</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass p-6 text-white/80">Loading packs...</div>
      ) : packs.length === 0 ? (
        <div className="glass p-6 text-white/80">
          <p className="text-lg font-semibold">No unopened packs</p>
          <p className="text-white/60 text-sm mt-2">Grab more packs on the home page to rip them here.</p>
        </div>
      ) : (
        <div className="card-grid">
          {packs.map((pack) => (
            <div key={pack.id} className="glass p-4 border border-purple-400/30">
              <p className="text-white/70 text-xs mb-1">Pack ID</p>
              <p className="text-sm font-mono truncate">{pack.id}</p>
              <p className="text-white/60 text-xs mt-2">Drop</p>
              <p className="font-semibold">{pack.drop_id || "—"}</p>
              <button
                onClick={() => (window.location.href = `/open-pack/${pack.id}`)}
                className="cta w-full mt-3"
              >
                Open pack
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Inventory;
