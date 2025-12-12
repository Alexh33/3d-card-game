import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { supabase } from "./supabaseClient";
import { getUserOrBypass } from "./utils/authBypass";

import Home from "./pages/Home";
import Inventory from "./pages/Inventory";
import Collection from "./pages/Collection";
import OpenPack from "./pages/OpenPack";
import Login from "./pages/Login";
import Spin from "./pages/Spin";
import TradeCreate from "./pages/TradeCreate";
import TradesInbox from "./pages/TradesInbox";
import SetupProfile from "./pages/SetupProfile";
import NavBar from "./components/NavBar";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe;
    (async () => {
      const { user: fetchedUser, bypass } = await getUserOrBypass();
      setUser(fetchedUser);
      setLoading(false);
      if (bypass) return;

      const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsubscribe = listener?.subscription;
    })();

    return () => unsubscribe?.unsubscribe();
  }, []);

  if (loading) return <div className="text-white text-center mt-10">Loading...</div>;

  if (!user) {
    // Not logged in: Only show login page
    return <Login />;
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="page-shell">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/collection" element={<Collection />} />
          <Route path="/open-pack/:id" element={<OpenPack />} />
          <Route path="/spin" element={<Spin />} />
          <Route path="/trades" element={<TradesInbox />} />
          <Route path="/trades/create" element={<TradeCreate />} />
          <Route path="/setup-profile" element={<SetupProfile />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
