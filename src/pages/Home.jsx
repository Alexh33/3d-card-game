import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { v4 as uuidv4 } from "uuid";

function Home() {
  const [points, setPoints] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const PACK_COST = 100;

  // Fetch user and profile data
  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setUser(user);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch profile:", error.message);
      } else if (profile) {
        setPoints(profile.points);
      } else {
        // If profile row is missing, create a default one so the UI works.
        const { error: insertError } = await supabase.from("profiles").upsert({
          id: user.id,
          username: user.email || "anonymous",
          points: 1000,
        });
        if (insertError) {
          console.error("Failed to create profile:", insertError.message);
        } else {
          setPoints(1000);
        }
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  // Buy pack(s) and deduct points
  const buyPacks = async (amount) => {
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Failed to fetch latest profile:", profileError?.message);
      return alert("Error fetching profile.");
    }

    const totalCost = amount * PACK_COST;

    if (profile.points < totalCost) {
      return alert("Not enough points to buy packs.");
    }

    const updatedPoints = profile.points - totalCost;

    // Update points in DB
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: updatedPoints })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update points:", updateError.message);
      return alert("Error updating points.");
    }

    // Insert packs
    const newPacks = Array.from({ length: amount }).map(() => ({
      id: uuidv4(),
      owner_id: user.id,
      pack_type: "basic",
      opened: false,
      drop_id: "001",
    }));

    const { error: insertError } = await supabase
      .from("packs")
      .insert(newPacks);

    if (insertError) {
      console.error("Failed to insert packs:", insertError.message);
      return alert("Error buying packs.");
    }

    setPoints(updatedPoints);
    alert(`🎉 Bought ${amount} pack${amount > 1 ? "s" : ""}!`);
  };

  if (loading) return <div className="text-white text-center mt-10">Loading...</div>;

  return (
    <div className="flex flex-col gap-8 text-white">
      <div className="glass p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="max-w-xl">
            <span className="pill mb-3">Live drop · Meme season</span>
            <h1 className="text-3xl md:text-4xl font-semibold leading-tight">
              Unlock premium meme collectibles with a cinematic 3D pack rip.
            </h1>
            <p className="text-white/70 mt-3">
              Earn points, snag packs, and grow a collection of internet legends. Every pack
              guarantees three on-chain-inspired meme cards with rarity and clarity scores.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={() => buyPacks(1)} className="cta">
                Buy 1 Pack · 100 pts
              </button>
              <button
                onClick={() => buyPacks(5)}
                className="px-4 py-3 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 transition font-semibold"
              >
                Buy 5 Packs · 500 pts
              </button>
            </div>
          </div>

          <div className="w-full md:w-[380px]">
            <div className="glass p-5 border border-purple-400/30 floaty">
              <p className="text-white/70 text-sm mb-2">Your balance</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold text-white">{points}</span>
                <span className="text-white/60 mb-1">points</span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/70">
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-semibold">Guaranteed</p>
                  <p className="text-white/70">3 cards per pack</p>
                </div>
                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-white font-semibold">Live rarity</p>
                  <p className="text-white/70">Legendary pulls in play</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="section">
          <p className="pill mb-2">1</p>
          <h3 className="text-xl font-semibold">Earn & redeem</h3>
          <p className="text-white/70 text-sm mt-2">
            Use points to buy packs and unlock iconic meme drops. Claim bonuses through the daily
            spin.
          </p>
        </div>
        <div className="section">
          <p className="pill mb-2">2</p>
          <h3 className="text-xl font-semibold">Open in 3D</h3>
          <p className="text-white/70 text-sm mt-2">
            Rip packs with our 3D experience. Each card flies out with its own rarity and clarity.
          </p>
        </div>
        <div className="section">
          <p className="pill mb-2">3</p>
          <h3 className="text-xl font-semibold">Collect & trade</h3>
          <p className="text-white/70 text-sm mt-2">
            Manage your collection, filter by rarity, and negotiate trades with other collectors.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
