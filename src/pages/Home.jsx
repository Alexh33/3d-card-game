import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";
import { v4 as uuidv4 } from "uuid";

const PACK_COST = 100;
const DAILY_REWARDS = [120, 150, 180, 220, 260, 320, 600]; // pack juice per day, day 7 = mega day
const LOCAL_LAST = "mm_daily_last_claim_v1";
const LOCAL_STREAK = "mm_daily_streak_v1";

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dayDiff(from, to) {
  const ms = startOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function Home() {
  const [packJuice, setPackJuice] = useState(0);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [lastClaim, setLastClaim] = useState(null);
  const [supportsDailyFields, setSupportsDailyFields] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const hasClaimedToday = lastClaim ? dayDiff(new Date(lastClaim), new Date()) === 0 : false;
  const cycleDay = streak ? ((streak - 1) % 7) + 1 : 0;
  const nextCycleDay = (() => {
    if (hasClaimedToday) return ((cycleDay % 7) || 0) + 1;
    const diff = lastClaim ? dayDiff(new Date(lastClaim), new Date()) : null;
    const simulatedStreak = diff === 1 ? (streak || 0) + 1 : 1;
    return ((simulatedStreak - 1) % 7) + 1;
  })();
  const nextReward = DAILY_REWARDS[nextCycleDay - 1];

  useEffect(() => {
    const fetchData = async () => {
      const { user: authedUser } = await getUserOrBypass();
      if (!authedUser) return;

      setUser(authedUser);

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authedUser.id)
        .maybeSingle();

      const fallbackLast = localStorage.getItem(LOCAL_LAST);
      const fallbackStreak = Number(localStorage.getItem(LOCAL_STREAK) || 0);

      if (error) {
        console.error("Failed to fetch profile:", error.message);
        setPackJuice(0);
        setStreak(fallbackStreak);
        setLastClaim(fallbackLast);
      } else if (profile) {
        setPackJuice(profile.points ?? 0);
        setSupportsDailyFields("daily_streak" in profile || "last_daily_claim" in profile);
        setStreak(profile.daily_streak ?? fallbackStreak ?? 0);
        setLastClaim(profile.last_daily_claim ?? fallbackLast ?? null);
      } else {
        const { error: insertError } = await supabase.from("profiles").upsert({
          id: authedUser.id,
          username: authedUser.email || "anonymous",
          points: 1000,
        });
        if (insertError) {
          console.error("Failed to create profile:", insertError.message);
        } else {
          setPackJuice(1000);
        }
        setStreak(fallbackStreak);
        setLastClaim(fallbackLast);
      }

      setLoading(false);
    };

    fetchData();
  }, []);

  const persistDailyLocal = (last, streakValue) => {
    if (last) localStorage.setItem(LOCAL_LAST, last);
    localStorage.setItem(LOCAL_STREAK, String(streakValue));
  };

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

    if ((profile.points ?? 0) < totalCost) {
      return alert("Not enough pack juice to buy packs.");
    }

    const updatedPoints = (profile.points ?? 0) - totalCost;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: updatedPoints })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update pack juice:", updateError.message);
      return alert("Error updating balance.");
    }

    const newPacks = Array.from({ length: amount }).map(() => ({
      id: uuidv4(),
      owner_id: user.id,
      pack_type: "basic",
      opened: false,
      drop_id: "001",
    }));

    const { error: insertError } = await supabase.from("packs").insert(newPacks);

    if (insertError) {
      console.error("Failed to insert packs:", insertError.message);
      return alert("Error buying packs.");
    }

    setPackJuice(updatedPoints);
    alert(`🎉 Bought ${amount} pack${amount > 1 ? "s" : ""}!`);
  };

  const purchaseJuice = async (amount) => {
    if (!user || purchasing) return;
    setPurchasing(true);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error("Failed to fetch balance:", error?.message);
      alert("Error fetching balance.");
      setPurchasing(false);
      return;
    }

    const updated = (profile.points ?? 0) + amount;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: updated })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to add pack juice:", updateError.message);
      alert("Error topping up.");
      setPurchasing(false);
      return;
    }

    setPackJuice(updated);
    setPurchasing(false);
  };

  const claimDaily = async () => {
    if (!user || claiming || hasClaimedToday) return;
    setClaiming(true);
    setClaimError("");
    setClaimSuccess("");

    const today = new Date();
    const diff = lastClaim ? dayDiff(new Date(lastClaim), today) : null;
    const calculatedStreak = diff === 1 ? (streak || 0) + 1 : diff === 0 ? streak : 1;
    const rewardDay = ((calculatedStreak - 1) % 7) + 1;
    const rewardJuice = DAILY_REWARDS[rewardDay - 1];
    const newBalance = packJuice + rewardJuice;
    const updatePayload = { points: newBalance };
    const isMegaDay = rewardDay === 7;

    if (supportsDailyFields) {
      updatePayload.daily_streak = calculatedStreak;
      updatePayload.last_daily_claim = today.toISOString();
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update daily reward:", updateError.message);
      setClaimError("Could not save daily reward. Try again in a bit.");
      setClaiming(false);
      return;
    }

    if (isMegaDay) {
      const megaPack = {
        id: uuidv4(),
        owner_id: user.id,
        pack_type: "mega",
        opened: false,
        drop_id: "mega-streak",
      };
      const { error: insertError } = await supabase.from("packs").insert([megaPack]);
      if (insertError) {
        console.error("Failed to grant mega pack:", insertError.message);
        setClaimError("Daily bonus saved, but mega pack failed. Try again from inventory.");
      } else {
        setClaimSuccess("Mega reward unlocked! A mega pack was added to your inventory.");
      }
    } else {
      setClaimSuccess(`+${rewardJuice} pack juice added to your balance.`);
    }

    setPackJuice(newBalance);
    setStreak(calculatedStreak);
    setLastClaim(today.toISOString());
    persistDailyLocal(today.toISOString(), calculatedStreak);
    setClaiming(false);
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
              Earn pack juice, snag packs, and grow a collection of internet legends. Every pack
              guarantees three on-chain-inspired meme cards with rarity and clarity scores.
            </p>
            <div className="flex flex-wrap gap-3 mt-5">
              <button onClick={() => buyPacks(1)} className="cta">
                Buy 1 Pack · 100 juice
              </button>
              <button
                onClick={() => buyPacks(5)}
                className="px-4 py-3 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 transition font-semibold"
              >
                Buy 5 Packs · 500 juice
              </button>
            </div>
          </div>

          <div className="w-full md:w-[380px]">
            <div className="glass p-5 border border-purple-400/30 floaty">
              <p className="text-white/70 text-sm mb-2">Your balance</p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-semibold text-white">{packJuice}</span>
                <span className="text-white/60 mb-1">pack juice</span>
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

      <div className="glass p-6 border border-purple-400/20">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="pill mb-2">Daily reward</p>
            <h3 className="text-2xl font-semibold">Return daily, reach day 7 for a mega pack.</h3>
            <p className="text-white/70 text-sm mt-1">
              Next reward: +{nextReward} pack juice {nextCycleDay === 7 ? "and a mega pack." : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {[...Array(7)].map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border flex items-center justify-center text-xs"
                  style={{
                    borderColor: i < cycleDay ? "#a855f7" : "rgba(255,255,255,0.2)",
                    background: i < cycleDay ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.05)",
                    color: i < cycleDay ? "#e9d5ff" : "#aaa",
                  }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            <button
              onClick={claimDaily}
              disabled={claiming || hasClaimedToday}
              className="cta px-5 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasClaimedToday ? "Already claimed today" : claiming ? "Claiming..." : "Claim daily"}
            </button>
          </div>
        </div>
        {(claimError || claimSuccess) && (
          <div className="mt-3 text-sm">
            {claimError && <p className="text-red-400">{claimError}</p>}
            {claimSuccess && <p className="text-green-400">{claimSuccess}</p>}
          </div>
        )}
      </div>

      <div className="glass p-6 border border-purple-400/20">
        <p className="pill mb-2">Top up</p>
        <h3 className="text-2xl font-semibold">Grab more pack juice</h3>
        <p className="text-white/70 text-sm mt-1">Instantly add juice to rip more packs.</p>
        <div className="flex flex-wrap gap-3 mt-4">
          {[500, 1200, 2500].map((amount) => (
            <button
              key={amount}
              onClick={() => purchaseJuice(amount)}
              disabled={purchasing}
              className="px-4 py-3 rounded-xl border border-white/20 text-white/90 hover:bg-white/10 transition font-semibold"
            >
              +{amount} juice
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="section">
          <p className="pill mb-2">1</p>
          <h3 className="text-xl font-semibold">Earn & redeem</h3>
          <p className="text-white/70 text-sm mt-2">
            Use pack juice to buy packs and unlock iconic meme drops. Claim bonuses through the daily
            reward and spin.
          </p>
        </div>
        <div className="section">
          <p className="pill mb-2">2</p>
          <h3 className="text-xl font-semibold">Open in 3D</h3>
          <p className="text-white/70 text-sm mt-2">
            Rip packs with our cinematic experience. Each card flies out with its own rarity and clarity.
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
