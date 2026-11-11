import { useState } from "react";
import { Link, useLocation } from "wouter";
import { authClient, signInWithGoogle, storeBearer } from "../lib/auth";
import { queryClient } from "../components/provider";
import { btn, inputCls, labelCls } from "../components/empty-states";
import { AuthLayout, AuthTitle, nextParam } from "../components/auth-layout";

export default function SignInPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const next = nextParam();
  const done = async () => {
    await queryClient.invalidateQueries();
    navigate(next ?? "/");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await authClient.signIn.email({ email, password }, { ...storeBearer });
    setBusy(false);
    if (res.error) return setError(res.error.message ?? "Sign-in failed.");
    await done();
  }

  const q = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <AuthLayout>
      <form onSubmit={submit}>
        <AuthTitle title="Sign in" body="Use your Vert & Dirt account." />
        <button
          type="button"
          className={btn("ghost", "w-full")}
          onClick={async () => {
            const err = await signInWithGoogle();
            if (err) setError(err);
            else await done();
          }}
        >
          Continue with Google
        </button>
        <div className="my-5 text-center text-[12px] uppercase tracking-[0.14em] text-muted-foreground">or</div>
        <label className={labelCls} htmlFor="email">
          Email
        </label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        <label className={labelCls + " mt-4"} htmlFor="password">
          Password
        </label>
        <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
        {error && <div className="mt-3 text-[13px] text-[#8f3320]">{error}</div>}
        <button disabled={busy} className={btn("primary", "w-full mt-5")}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
        <div className="mt-6 space-y-2 text-[13.5px]">
          <p>
            New here?{" "}
            <Link href={`/sign-up${q}`} className="font-semibold text-[#2f5d46] hover:underline">
              Create an account
            </Link>
          </p>
          <p className="text-muted-foreground">
            Vert &amp; Dirt practitioner?{" "}
            <Link href="/request-access" className="font-semibold text-[#2f5d46] hover:underline">
              Request access
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  );
}
