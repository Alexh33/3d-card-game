import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CardReveal } from "../components/pack/CardReveal";
import { PackOpening } from "../components/pack/PackOpening";
import { PackResults } from "../components/pack/PackResults";
import { SealedPack } from "../components/pack/SealedPack";
import { generateRandomPack } from "../data/packCards";
import { supabase } from "../supabaseClient";

const toRarityLabel = (rarity = "") => rarity.charAt(0).toUpperCase() + rarity.slice(1);

export default function OpenPack() {
  const { id: packId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [pack, setPack] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState("sealed");
  const [isOpening, setIsOpening] = useState(false);
  const [streamerMode, setStreamerMode] = useState(false);

  useEffect(() => {
    const fetchPack = async () => {
      setLoading(true);
      const {
        data: { user: authedUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !authedUser) {
        console.error("User fetch error:", userError);
        navigate("/login");
        setLoading(false);
        return;
      }

      setUser(authedUser);

      const { data: packData, error: packError } = await supabase
        .from("packs")
        .select("*")
        .eq("id", packId)
        .eq("owner_id", authedUser.id)
        .single();

      if (packError || !packData) {
        alert("Pack not found or unauthorized.");
        navigate("/inventory");
        setLoading(false);
        return;
      }

      if (packData.opened) {
        alert("This pack has already been opened.");
        navigate("/inventory");
        setLoading(false);
        return;
      }

      setPack(packData);
      setLoading(false);
    };

    fetchPack();
  }, [packId, navigate]);

  const handleOpenPack = async () => {
    if (!pack || !user || isOpening) return;
    setIsOpening(true);

    try {
      const { data: latestPack, error: latestError } = await supabase
        .from("packs")
        .select("*")
        .eq("id", packId)
        .eq("owner_id", user.id)
        .single();

      if (latestError || !latestPack) {
        throw new Error(latestError?.message || "Pack not found");
      }

      if (latestPack.opened) {
        alert("This pack has already been opened.");
        navigate("/inventory");
        return;
      }

      const generatedCards = generateRandomPack().map((card, index) => ({
        ...card,
        order: index,
      }));

      const dbPayload = generatedCards.map(({ name, image, rarity, description, clarityIndex }) => ({
        owner_id: user.id,
        name,
        image,
        rarity: toRarityLabel(rarity),
        description,
        clarity_index: clarityIndex,
        pack_id: latestPack.id,
      }));

      const { error: insertError } = await supabase.from("cards").insert(dbPayload);
      if (insertError) {
        throw new Error(insertError.message);
      }

      const { error: updateError } = await supabase
        .from("packs")
        .update({ opened: true })
        .eq("id", latestPack.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setCards(generatedCards);
      setGameState("opening");
    } catch (error) {
      console.error("Failed to open pack:", error);
      alert("There was an issue opening your pack. Please try again.");
      setGameState("sealed");
    } finally {
      setIsOpening(false);
    }
  };

  const goToInventory = () => navigate("/inventory");

  if (loading) return <div className="text-white text-center mt-10">Loading pack...</div>;

  if (gameState === "results" && cards.length > 0) {
    return <PackResults cards={cards} onOpenAnother={goToInventory} />;
  }

  return (
    <div className="relative min-h-screen bg-[#080613] text-white overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(168,85,247,0.18),transparent_40%),radial-gradient(circle_at_80%_0%,rgba(236,72,153,0.14),transparent_40%),radial-gradient(circle_at_50%_70%,rgba(124,58,237,0.1),transparent_45%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_35%)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 pt-10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div className="space-y-3">
            <p className="text-sm text-purple-200/70 uppercase tracking-[0.3em]">
              Pack #{pack?.id?.slice(0, 8) ?? ""}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold drop-shadow-lg">
              Digital Trading Card Pack
            </h1>
            <p className="text-white/70 max-w-2xl">
              Rip the booster to reveal five meme collectibles with rarity colors, clarity scores, and a streamer-friendly reveal flow.
            </p>
            <div className="flex flex-wrap gap-3 text-sm text-white/80">
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-purple-200/20 backdrop-blur">
                5 cards inside
              </div>
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-purple-200/20 backdrop-blur">
                Cinematic reveal
              </div>
              <div className="px-4 py-2 rounded-lg bg-white/5 border border-purple-200/20 backdrop-blur">
                Stored to your wallet on finish
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-3">
            <button
              onClick={goToInventory}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/80 hover:border-white/30 transition"
            >
              Back to inventory
            </button>

            {gameState === "sealed" && (
              <button
                onClick={() => setStreamerMode((prev) => !prev)}
                className="px-6 py-3 rounded-lg backdrop-blur-md transition-all duration-300 border-2"
                style={{
                  background: streamerMode ? "rgba(168, 85, 247, 0.2)" : "rgba(136, 136, 160, 0.1)",
                  borderColor: streamerMode ? "#a855f7" : "#444",
                  boxShadow: streamerMode ? "0 0 20px rgba(168, 85, 247, 0.4)" : "none",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="relative w-12 h-6 rounded-full transition-all duration-300"
                    style={{ background: streamerMode ? "#a855f7" : "#444" }}
                  >
                    <div
                      className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300"
                      style={{ left: streamerMode ? "26px" : "4px" }}
                    />
                  </div>
                  <span className="text-purple-300 tracking-wide" style={{ fontSize: "0.9rem", fontWeight: 600 }}>
                    STREAMER MODE
                  </span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>

      {gameState === "sealed" && (
        <div className="relative z-0">
          <SealedPack onOpen={handleOpenPack} isOpening={isOpening} />
        </div>
      )}

      {gameState === "opening" && <PackOpening onComplete={() => setGameState("revealing")} />}

      {gameState === "revealing" && cards.length > 0 && (
        <CardReveal cards={cards} onComplete={() => setGameState("results")} streamerMode={streamerMode} />
      )}
    </div>
  );
}
