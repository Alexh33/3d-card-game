import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";
import { enableBypass } from "../utils/authBypass";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    // Admin bypass (local-only)
    if (email.toLowerCase() === "admin" && password === "1234") {
      enableBypass();
      navigate("/");
      return;
    }

    if (isSignUp) {
      // 🔐 Sign up user
      const { error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      alert("🎉 Account created! Check your email to confirm.");
      navigate("/login");

    } else {
      // 🔓 Log in user
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      navigate("/");
    }
  };

  // ✅ Profile creation after confirmation
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        const user = session.user;

        // Upsert profile so we always have pack juice/username for new users.
        // Using maybeSingle to avoid 406 when no row exists yet.
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();

        if (!existingProfile) {
          const { error: insertError } = await supabase.from("profiles").upsert({
            id: user.id,
            username: username || user.email || "anonymous",
            points: 1200,
          });

          if (insertError) {
            console.error("❌ Failed to insert profile:", insertError.message);
          } else {
            console.log("✅ Profile created");
          }
        }
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, [username]);

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="glass p-8 w-full max-w-md">
        <div className="mb-6">
          <p className="pill mb-2">{isSignUp ? "Create account" : "Welcome back"}</p>
          <h1 className="text-3xl font-semibold">
            {isSignUp ? "Join Meme Mint" : "Sign in to Meme Mint"}
          </h1>
          <p className="text-white/70 text-sm mt-2">
            Securely access your packs, collection, and trades.
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            className="p-3 rounded-lg bg-white/5 border border-white/10 text-white"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="p-3 rounded-lg bg-white/5 border border-white/10 text-white"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {isSignUp && (
            <input
              type="text"
              placeholder="Username"
              className="p-3 rounded-lg bg-white/5 border border-white/10 text-white"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          )}

          <button type="submit" className="cta w-full">
            {isSignUp ? "Create account" : "Log in"}
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>

        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="mt-4 text-sm text-white/70 hover:text-white underline"
        >
          {isSignUp ? "Already have an account? Log in" : "No account? Sign up"}
        </button>
      </div>
    </div>
  );
}

export default Login;
