import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";
import { useToast } from "../components/ToastProvider";

const PLACEHOLDER = "https://placehold.co/600x340/1e1b3a/ffffff?text=Preview";

const BUNDLES = [
  { id: "starter", title: "Starter", juice: 500, price: "$4.99", bonus: "Jumpstart your pulls", image: PLACEHOLDER },
  { id: "value", title: "Value", juice: 1200, price: "$9.99", bonus: "+ best per-juice", image: PLACEHOLDER },
  { id: "pro", title: "Pro", juice: 2500, price: "$18.99", bonus: "Great for pack rips", image: PLACEHOLDER },
  { id: "mega", title: "Mega", juice: 5000, price: "$34.99", bonus: "Stock up & trade", image: PLACEHOLDER },
];

const PACKS = [
  { id: "basic", title: "Regular Pack", cost: 100, contents: "3 cards · standard odds", image: PLACEHOLDER },
  { id: "premium", title: "Premium Pack", cost: 250, contents: "5 cards · boosted rare odds", image: PLACEHOLDER },
  { id: "mega", title: "Mega Pack", cost: 600, contents: "7 cards · best odds + shine", image: PLACEHOLDER },
];

function Store() {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [buyingPack, setBuyingPack] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { user, bypass } = await getUserOrBypass();
      if (!user || bypass) {
        setLoading(false);
        return;
      }
      setUser(user);
      const { data, error } = await supabase
        .from("profiles")
        .select("points")
        .eq("id", user.id)
        .maybeSingle();
      if (!error && data) setBalance(data.points ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const purchaseJuice = async (amount) => {
    if (!user || purchasing) return;
    setPurchasing(true);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      toast("Error fetching balance.", "error");
      setPurchasing(false);
      return;
    }

    const updated = (profile.points ?? 0) + amount;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ points: updated })
      .eq("id", user.id);

    if (updateError) {
      toast("Error topping up.", "error");
      setPurchasing(false);
      return;
    }

    setBalance(updated);
    toast(`Added ${amount} pack juice to your balance.`);
    setPurchasing(false);
  };

  const buyPackWithJuice = async (pack) => {
    if (!user || buyingPack) return;
    setBuyingPack(true);
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", user.id)
      .single();
    if (error || !profile) {
      toast("Error fetching balance.", "error");
      setBuyingPack(false);
      return;
    }
    if ((profile.points ?? 0) < pack.cost) {
      toast("Not enough pack juice.", "error");
      setBuyingPack(false);
      return;
    }

    const updatedPoints = (profile.points ?? 0) - pack.cost;
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ points: updatedPoints })
      .eq("id", user.id);
    if (updateErr) {
      toast("Failed to deduct juice.", "error");
      setBuyingPack(false);
      return;
    }

    const packRow = {
      owner_id: user.id,
      pack_type: pack.id,
      opened: false,
      drop_id: pack.id,
    };
    const { error: insertErr } = await supabase.from("packs").insert([packRow]);
    if (insertErr) {
      toast("Failed to grant pack.", "error");
      // refund
      await supabase.from("profiles").update({ points: profile.points }).eq("id", user.id);
      setBuyingPack(false);
      return;
    }

    setBalance(updatedPoints);
    toast(`${pack.title} added to your inventory.`);
    setBuyingPack(false);
  };

  if (loading) return <div className="text-white mt-10 text-center">Loading store...</div>;

  return (
    <div className="text-white flex flex-col gap-6">
      <div className="glass p-6 sticky top-[72px] z-10">
        <p className="pill mb-2">Store</p>
        <h1 className="text-3xl font-semibold">Pack Juice Bundles</h1>
        <p className="text-white/70 text-sm max-w-2xl">
          Buy curated bundles to rip more packs. Pricing is indicative; integrate your payment provider to charge users, then credit juice.
        </p>
        <div className="mt-3 text-white/80 text-sm">
          Current balance: <span className="font-semibold text-white">{balance}</span> juice
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {BUNDLES.map((bundle) => (
          <div key={bundle.id} className="glass p-5 border border-white/10 flex flex-col gap-3">
            <img src={bundle.image} alt={bundle.title} className="w-full h-40 object-cover rounded-lg" loading="lazy" />
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{bundle.title}</h3>
              <span className="text-sm text-white/70">{bundle.price}</span>
            </div>
            <p className="text-3xl font-bold text-white">{bundle.juice.toLocaleString()} juice</p>
            <p className="text-white/60 text-sm">{bundle.bonus}</p>
            <button
              onClick={() => purchaseJuice(bundle.juice)}
              disabled={purchasing || !user}
              className="cta px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {user ? (purchasing ? "Processing..." : "Buy bundle") : "Sign in to buy"}
            </button>
          </div>
        ))}
      </div>

      <div className="glass p-6 border border-white/10 sticky top-[156px] z-10">
        <p className="pill mb-2">Spend juice</p>
        <h2 className="text-2xl font-semibold">Buy packs with juice</h2>
        <p className="text-white/70 text-sm">Use your balance to grab packs instantly.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PACKS.map((pack) => (
          <div key={pack.id} className="glass p-5 border border-white/10 flex flex-col gap-3">
            <img src={pack.image} alt={pack.title} className="w-full h-40 object-cover rounded-lg" loading="lazy" />
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold">{pack.title}</h3>
              <span className="text-sm text-white/70">{pack.cost} juice</span>
            </div>
            <p className="text-white/70 text-sm">{pack.contents}</p>
            <button
              onClick={() => buyPackWithJuice(pack)}
              disabled={buyingPack || !user}
              className="cta px-4 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {user ? (buyingPack ? "Processing..." : "Buy with juice") : "Sign in to buy"}
            </button>
          </div>
        ))}
      </div>

      <div className="glass p-5 border border-white/10">
        <p className="text-white/80 text-sm">
          Note: Hook these buttons to your payment processor; on success, call the credit endpoint (current behavior) to add pack juice.
        </p>
      </div>
    </div>
  );
}

export default Store;
