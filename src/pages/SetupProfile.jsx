import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { getUserOrBypass } from "../utils/authBypass";

function SetupProfile() {
  const [username, setUsername] = useState("");
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getUserOrBypass().then(({ user }) => {
      if (!user) return navigate("/login");
      setUser(user);
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return alert("Username cannot be empty.");

    const { error } = await supabase
      .from("profiles")
      .update({ username })
      .eq("id", user.id);

    if (error) {
      alert("Error saving username: " + error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center text-white">
      <div className="glass p-8 w-full max-w-md">
        <p className="pill mb-2">Profile</p>
        <h1 className="text-3xl font-semibold mb-2">Choose your collector name</h1>
        <p className="text-white/70 text-sm mb-4">
          This is how other traders will see you across packs, collections, and offers.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            className="p-3 rounded-lg bg-white/5 border border-white/10 text-white"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter a username"
          />
          <button
            type="submit"
            className="cta w-full"
          >
            Save & Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default SetupProfile;
