import { useState } from "react";
import { useLocation } from "wouter";
import { authClient, signInWithGoogle, storeBearer } from "../lib/auth";
import { queryClient } from "../components/provider";
import { btn, inputCls, labelCls } from "../components/empty-states";

export default function SignInPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email, password }, { ...storeBearer });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Sign-in failed.");
    await queryClient.invalidateQueries();
    navigate("/");
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#0f1411] text-white p-12">
        <img src="/images/vad-logo-white.png" alt="Vert & Dirt" className="w-[140px]" />
        <div>
          <div className="font-display text-[56px] uppercase leading-[0.95]">Team Performance Portal</div>
          <p className="text-[#c9cdc5] mt-4 max-w-md">Official physiological testing, published by Vert &amp; Dirt practitioners, for coaches and athletes.</p>
        </div>
        <div className="text-[12px] text-[#7c8f86]">Fictional demo data</div>
      </div>
      <div className="grid place-items-center px-6 py-12">
        <form onSubmit={submit} className="w-full max-w-sm">
          <img src="/images/vad-logo-dark.png" alt="Vert & Dirt" className="w-[110px] lg:hidden mb-8" />
          <h1 className="font-display text-[40px] uppercase leading-none">Sign in</h1>
          <p className="text-muted-foreground text-[14px] mt-2 mb-6">Use your Vert &amp; Dirt account.</p>
          <button
            type="button"
            className={btn("ghost", "w-full")}
            onClick={async () => {
              const err = await signInWithGoogle();
              if (err) setError(err);
              else {
                await queryClient.invalidateQueries();
                navigate("/");
              }
            }}
          >
            Continue with Google
          </button>
          <div className="my-5 text-center text-[12px] uppercase tracking-[0.14em] text-muted-foreground">or</div>
          <label className={labelCls} htmlFor="email">Email</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          <label className={labelCls + " mt-4"} htmlFor="password">Password</label>
          <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
          {error && <div className="mt-3 text-[13px] text-[#8f3320]">{error}</div>}
          <button disabled={busy} className={btn("primary", "w-full mt-5")}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="mt-6 text-[12.5px] text-muted-foreground">Create account and Request practitioner access are coming in the next build step.</p>
        </form>
      </div>
    </div>
  );
}
