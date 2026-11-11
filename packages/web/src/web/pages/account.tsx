import { useState } from "react";
import { Link, Redirect, useLocation, useParams } from "wouter";
import { authClient, storeBearer } from "../lib/auth";
import { queryClient } from "../components/provider";
import { ErrorNote, Loading, btn, inputCls, labelCls } from "../components/empty-states";
import { AuthLayout, AuthTitle, nextParam } from "../components/auth-layout";
import { useChooseRole, useMe, useMyRequest, useRequestPractitioner } from "../queries/me";
import { useAcceptInvite, useInvitePreview } from "../queries/invites";
import { homeFor, onboardingPath } from "../lib/roles";
import { errorMessage } from "../lib/api";
import { cn } from "@/lib/utils";

/** Name / email / password form. Calls onDone once the account exists and is signed in. */
function AccountForm({ onDone, cta, presetEmail }: { onDone: () => Promise<void> | void; cta: string; presetEmail?: string | null }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState(presetEmail ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        const res = await authClient.signUp.email({ name, email, password }, { ...storeBearer });
        if (res.error) {
          setBusy(false);
          return setError(res.error.message ?? "Could not create the account.");
        }
        await queryClient.invalidateQueries();
        try {
          await onDone();
        } catch (err) {
          setError(errorMessage(err));
        }
        setBusy(false);
      }}
    >
      <label className={labelCls} htmlFor="su-name">
        Full name
      </label>
      <input id="su-name" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <label className={labelCls + " mt-4"} htmlFor="su-email">
        Email
      </label>
      <input id="su-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
      <label className={labelCls + " mt-4"} htmlFor="su-password">
        Password
      </label>
      <input id="su-password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
      <p className="text-[12px] text-muted-foreground mt-1">At least 8 characters.</p>
      {error && <div className="mt-3 text-[13px] text-[#8f3320]">{error}</div>}
      <button disabled={busy} className={btn("primary", "w-full mt-5")}>
        {busy ? "Creating account…" : cta}
      </button>
    </form>
  );
}

const ROLES = [
  { id: "coach", title: "Coach", body: "Manage a team, book testing and see published results for your athletes." },
  { id: "individual", title: "Individual", body: "Your own performance passport, training log, recovery and testing history." },
] as const;

export function SignUpPage() {
  const { data: me, isPending } = useMe();
  const [, navigate] = useLocation();
  const choose = useChooseRole();
  const [role, setRole] = useState<"coach" | "individual" | null>(null);
  const next = nextParam();
  if (isPending) return <Loading />;
  // Already has an account type: continue where they left off.
  if (me?.role) return <Redirect to={onboardingPath(me) ?? homeFor(me)} />;

  const finish = async (r: "coach" | "individual") => {
    await choose.mutateAsync({ role: r });
    navigate("/onboarding/plan");
  };

  // Arrived from an invite link: just create the account and go back to the link.
  if (next && !me) {
    return (
      <AuthLayout>
        <AuthTitle title="Create account" body="Then we'll take you back to your invite." />
        <AccountForm cta="Create account" onDone={() => navigate(next)} />
        <SignInLink next={next} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <AuthTitle eyebrow="Step 1" title="Create account" body="Choose your account type. One account type per login." />
      <div className="grid gap-3 mb-6">
        {ROLES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={role === r.id}
            onClick={() => setRole(r.id)}
            className={cn("text-left rounded-[10px] border bg-card p-4 transition-colors", role === r.id ? "border-[#2f5d46] ring-2 ring-[#2f5d46]/15" : "border-border hover:border-[#2f5d46]/50")}
          >
            <div className="font-display text-[22px] uppercase leading-tight">{r.title}</div>
            <div className="text-[13px] text-muted-foreground mt-1">{r.body}</div>
          </button>
        ))}
      </div>
      {role &&
        (me ? (
          <button className={btn("primary", "w-full")} disabled={choose.isPending} onClick={() => finish(role)}>
            Continue as {role === "coach" ? "Coach" : "Individual"}
          </button>
        ) : (
          <AccountForm cta={`Create ${role === "coach" ? "Coach" : "Individual"} account`} onDone={() => finish(role)} />
        ))}
      <ErrorNote error={choose.error} className="mt-3" />
      <p className="mt-6 text-[13px] text-muted-foreground">
        Vert &amp; Dirt practitioner?{" "}
        <Link href="/request-access" className="font-semibold text-[#2f5d46] hover:underline">
          Request access
        </Link>{" "}
        instead. Practitioner accounts are approved by an admin.
      </p>
      {!me && <SignInLink />}
    </AuthLayout>
  );
}

function SignInLink({ next }: { next?: string | null }) {
  return (
    <p className="mt-4 text-[13.5px]">
      Already have an account?{" "}
      <Link href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-[#2f5d46] hover:underline">
        Sign in
      </Link>
    </p>
  );
}

export function RequestAccessPage() {
  const { data: me, isPending } = useMe();
  const [, navigate] = useLocation();
  const request = useRequestPractitioner();
  const [qualification, setQualification] = useState("");
  const [message, setMessage] = useState("");
  if (isPending) return <Loading />;
  if (me?.role === "pending_practitioner") return <Redirect to="/pending-approval" />;
  if (me?.role) return <Redirect to={homeFor(me)} />;

  const send = async () => {
    await request.mutateAsync({ qualification, message: message || undefined });
    navigate("/pending-approval");
  };
  const valid = qualification.trim().length >= 2;
  const details = (
    <>
      <label className={labelCls} htmlFor="ra-q">
        Qualification / role at Vert &amp; Dirt
      </label>
      <input id="ra-q" required minLength={2} value={qualification} onChange={(e) => setQualification(e.target.value)} placeholder="e.g. Sport scientist, MSc Exercise Science" className={inputCls} />
      <label className={labelCls + " mt-4"} htmlFor="ra-m">
        Message (optional)
      </label>
      <textarea id="ra-m" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className={inputCls + " h-auto py-2"} />
    </>
  );
  return (
    <AuthLayout>
      <AuthTitle eyebrow="Practitioners" title="Request access" body="An admin reviews every request. You can't see any athlete data until you're approved." />
      {me ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          {details}
          <button className={btn("primary", "w-full mt-5")} disabled={request.isPending}>
            Send request
          </button>
        </form>
      ) : (
        <>
          <div className="mb-5">{details}</div>
          {valid ? <AccountForm cta="Create account and send request" onDone={send} /> : <p className="text-[13px] text-muted-foreground">Enter your qualification to continue.</p>}
        </>
      )}
      <ErrorNote error={request.error} className="mt-3" />
      {!me && <SignInLink />}
    </AuthLayout>
  );
}

export function PendingApprovalPage() {
  const { data: me, isPending } = useMe();
  const req = useMyRequest();
  if (isPending) return <Loading />;
  if (!me) return <Redirect to="/sign-in" />;
  if (me.role !== "pending_practitioner") return <Redirect to={homeFor(me)} />;
  const status = req.data?.status;
  return (
    <AuthLayout>
      <AuthTitle eyebrow="Practitioner access" title={status === "declined" ? "Request declined" : "Waiting for approval"} />
      {status === "declined" ? (
        <p className="text-[14px] text-muted-foreground">An admin declined this request. Contact Vert &amp; Dirt if you think this is a mistake.</p>
      ) : (
        <p className="text-[14px] text-muted-foreground">
          Thanks, {me.name}. An admin will review your request. Until then this account can't open any athlete data. Refresh this page after you've been told it's approved.
        </p>
      )}
      {req.data && (
        <div className="mt-5 rounded-md border border-border bg-card p-4 text-[13.5px]">
          <div className="text-muted-foreground text-[12px] uppercase tracking-wider">Qualification</div>
          <div className="mt-1">{req.data.qualification}</div>
        </div>
      )}
      <button className={btn("ghost", "mt-5")} onClick={() => queryClient.invalidateQueries()}>
        Check again
      </button>
    </AuthLayout>
  );
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { data: me, isPending } = useMe();
  const preview = useInvitePreview(token);
  const accept = useAcceptInvite();
  const [, navigate] = useLocation();
  if (isPending || preview.isPending) return <Loading label="Checking your link" />;
  const p = preview.data;
  const here = `/invite/${token}`;
  if (!p || !p.valid) {
    return (
      <AuthLayout>
        <AuthTitle title="Link not valid" body={p && !p.valid ? p.reason : errorMessage(preview.error, "This link isn't valid.")} />
        <Link href="/sign-in" className={btn("ghost")}>
          Go to sign in
        </Link>
      </AuthLayout>
    );
  }
  const isClaim = p.kind === "claim";
  return (
    <AuthLayout>
      <AuthTitle
        eyebrow={isClaim ? "Claim your profile" : "Practitioner invite"}
        title={isClaim ? `Hi ${p.athleteName?.split(" ")[0] ?? "there"}` : "You're invited"}
        body={
          isClaim
            ? `${p.teamName ?? "Your coach"} created a performance profile for you. Claim it to own your passport and choose what your coach sees.`
            : `Practitioner access to the Vert & Dirt portal${p.email ? ` for ${p.email}` : ""}.`
        }
      />
      {!me ? (
        <div className="grid gap-2">
          <Link href={`/sign-up?next=${encodeURIComponent(here)}`} className={btn("primary", "w-full")}>
            Create account
          </Link>
          <Link href={`/sign-in?next=${encodeURIComponent(here)}`} className={btn("ghost", "w-full")}>
            I already have an account
          </Link>
        </div>
      ) : (
        <>
          <p className="text-[13.5px] text-muted-foreground mb-4">Signed in as {me.email}.</p>
          <button
            className={btn("primary", "w-full")}
            disabled={accept.isPending}
            onClick={async () => {
              const r = await accept.mutateAsync({ token });
              await queryClient.invalidateQueries();
              navigate(r.next);
            }}
          >
            {isClaim ? "Claim my profile" : "Accept practitioner access"}
          </button>
          <ErrorNote error={accept.error} className="mt-3" />
        </>
      )}
      <p className="text-[12px] text-muted-foreground mt-5">One-time link · expires {new Date(p.expiresAt).toLocaleDateString("en-ZA")}</p>
    </AuthLayout>
  );
}
