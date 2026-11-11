import { useEffect, useState } from "react";
import { Redirect, useLocation, useParams } from "wouter";
import { AuthLayout, AuthTitle } from "../../components/auth-layout";
import { ErrorNote, Loading, btn, inputCls, labelCls } from "../../components/empty-states";
import { useMe, useProfile, useSaveProfile, useSetOnboarding } from "../../queries/me";
import { useChoosePlan, usePlans } from "../../queries/plans";
import { useAddAthletes, useConfirmConsent, useCreateTeam, useMyLinks } from "../../queries/teams";
import { queryClient } from "../../components/provider";
import { homeFor, onboardingPath } from "../../lib/roles";
import { money } from "../../components/table";
import { setActiveTeam } from "../../hooks/use-active-team";
import { cn } from "@/lib/utils";

const AUDIENCE: Record<string, string[]> = { coach: ["coach", "team", "enterprise"], individual: ["individual", "enterprise"] };

/** /onboarding/:step — only the account's current step renders; anything else redirects to it. */
export default function OnboardingPage() {
  const { step } = useParams<{ step: string }>();
  const { data: me, isPending } = useMe();
  if (isPending) return <Loading />;
  if (!me) return <Redirect to="/sign-in" />;
  const current = onboardingPath(me);
  if (!current) return <Redirect to={homeFor(me)} />;
  if (current !== `/onboarding/${step}`) return <Redirect to={current} />;
  const body =
    step === "plan" ? <PlanStep role={me.role!} /> : step === "team" ? <TeamStep /> : step === "athletes" ? <AthletesStep teamId={me.teams[0]?.id} /> : step === "profile" ? <ProfileStep name={me.name} /> : <ConsentStep />;
  return <AuthLayout wide={step === "plan"}>{body}</AuthLayout>;
}

function useAdvance() {
  const [, navigate] = useLocation();
  return async () => {
    await queryClient.invalidateQueries(); // awaits the active me query, so the guard sees the new step
    navigate("/");
  };
}

function Steps({ n, total, label }: { n: number; total: number; label: string }) {
  return (
    <div className="text-[12px] uppercase tracking-[0.16em] text-[#2f5d46] font-semibold mb-1">
      Step {n} of {total} · {label}
    </div>
  );
}

function PlanStep({ role }: { role: string }) {
  const plans = usePlans();
  const choose = useChoosePlan();
  const advance = useAdvance();
  const list = (plans.data ?? []).filter((p) => AUDIENCE[role]?.includes(p.audience));
  return (
    <div>
      <Steps n={1} total={3} label="Plan" />
      <AuthTitle title="Choose your plan" body="Choosing a plan starts a free trial. Nothing is charged and no card is needed." />
      {plans.isPending && <Loading />}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => (
          <div key={p.id} className="rounded-[10px] border border-border bg-card p-5 flex flex-col">
            <div className="font-display text-[24px] uppercase leading-tight">{p.name}</div>
            <p className="text-[13px] text-muted-foreground mt-1 flex-1">{p.description}</p>
            <div className="text-[12.5px] mt-4 border-t border-border pt-3">
              {p.contactOnly ? (
                "Arranged with Vert & Dirt directly."
              ) : p.baseFeeCents === null && p.perAthleteFeeCents === null ? (
                <>Base fee + fee per active athlete, price to be confirmed</>
              ) : (
                <>
                  {money(p.baseFeeCents, p.currency)} base + {money(p.perAthleteFeeCents, p.currency)} per active athlete / month
                </>
              )}
            </div>
            {p.contactOnly ? (
              <a href="mailto:hello@vertdirt.example?subject=Enterprise%20plan" className={btn("ghost", "mt-4")}>
                Contact us
              </a>
            ) : (
              <button className={btn("primary", "mt-4")} disabled={choose.isPending} onClick={() => choose.mutateAsync({ planId: p.id }).then(advance)}>
                Start trial
              </button>
            )}
          </div>
        ))}
      </div>
      <ErrorNote error={choose.error} className="mt-4" />
    </div>
  );
}

function TeamStep() {
  const create = useCreateTeam();
  const advance = useAdvance();
  const [name, setName] = useState("");
  const [sport, setSport] = useState("Rugby union");
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        create.mutateAsync({ name, sport, season: season || null }).then((r) => {
          setActiveTeam(r.id);
          return advance();
        });
      }}
    >
      <Steps n={2} total={3} label="Team" />
      <AuthTitle title="Create your team" body="You can add more teams later from the Team page." />
      <label className={labelCls} htmlFor="ob-team">
        Team name
      </label>
      <input id="ob-team" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      <label className={labelCls + " mt-4"} htmlFor="ob-sport">
        Sport
      </label>
      <input id="ob-sport" required minLength={2} value={sport} onChange={(e) => setSport(e.target.value)} className={inputCls} />
      <label className={labelCls + " mt-4"} htmlFor="ob-season">
        Season
      </label>
      <input id="ob-season" value={season} onChange={(e) => setSeason(e.target.value)} className={inputCls} />
      <button className={btn("primary", "w-full mt-5")} disabled={create.isPending}>
        Create team
      </button>
      <ErrorNote error={create.error} className="mt-3" />
    </form>
  );
}

/** Lines like "Sipho Dlamini, Flanker, 7" → name, position, squad number. */
export function parseAthleteLines(text: string) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, position, num] = l.split(/\s*[,;\t]\s*/);
      const n = num ? parseInt(num, 10) : NaN;
      return { name, position: position || null, squadNumber: Number.isFinite(n) ? n : null };
    })
    .filter((a) => a.name && a.name.length >= 2);
}

function AthletesStep({ teamId }: { teamId?: string }) {
  const add = useAddAthletes();
  const setStep = useSetOnboarding();
  const advance = useAdvance();
  const [text, setText] = useState("");
  const parsed = parseAthleteLines(text);
  if (!teamId) return <Loading />;
  return (
    <div>
      <Steps n={3} total={3} label="Athletes" />
      <AuthTitle title="Add athletes" body="One per line: name, position, squad number (position and number optional). Untested athletes are fine." />
      <textarea
        aria-label="Athletes"
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Sipho Dlamini, Flanker, 7\nLiam van Wyk, Wing, 11"}
        className={inputCls + " h-auto py-2 font-mono text-[13px]"}
      />
      <p className="text-[12.5px] text-muted-foreground mt-1">{parsed.length} athlete(s) ready to add.</p>
      <button className={btn("primary", "w-full mt-4")} disabled={!parsed.length || add.isPending} onClick={() => add.mutateAsync({ teamId, athletes: parsed }).then(advance)}>
        Add {parsed.length || ""} athlete{parsed.length === 1 ? "" : "s"} and finish
      </button>
      <button className={btn("ghost", "w-full mt-2")} disabled={setStep.isPending} onClick={() => setStep.mutateAsync({ step: "done" }).then(advance)}>
        Skip for now
      </button>
      <ErrorNote error={add.error ?? setStep.error} className="mt-3" />
    </div>
  );
}

export function ProfileForm({ name, onSaved, cta }: { name: string; onSaved: () => void; cta: string }) {
  const profile = useProfile();
  const save = useSaveProfile();
  const [f, setF] = useState({ name, dob: "", sport: "", position: "", goals: "" });
  useEffect(() => {
    const p = profile.data;
    if (p) setF({ name: p.name, dob: p.dob ?? "", sport: p.sport ?? "", position: p.position ?? "", goals: (p.goals ?? []).join("\n") });
  }, [profile.data]);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save
          .mutateAsync({
            name: f.name,
            dob: f.dob || null,
            sport: f.sport || null,
            position: f.position || null,
            goals: f.goals
              .split("\n")
              .map((g) => g.trim())
              .filter(Boolean)
              .slice(0, 10),
          })
          .then(onSaved);
      }}
    >
      <label className={labelCls} htmlFor="pf-name">
        Name
      </label>
      <input id="pf-name" required minLength={2} value={f.name} onChange={set("name")} className={inputCls} />
      <label className={labelCls + " mt-4"} htmlFor="pf-dob">
        Date of birth (optional)
      </label>
      <input id="pf-dob" type="date" value={f.dob} onChange={set("dob")} className={inputCls} />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div>
          <label className={labelCls} htmlFor="pf-sport">
            Sport
          </label>
          <input id="pf-sport" value={f.sport} onChange={set("sport")} placeholder="e.g. Trail running" className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="pf-pos">
            Position or event
          </label>
          <input id="pf-pos" value={f.position} onChange={set("position")} placeholder="e.g. Ultra" className={inputCls} />
        </div>
      </div>
      <label className={labelCls + " mt-4"} htmlFor="pf-goals">
        Goals (one per line)
      </label>
      <textarea id="pf-goals" rows={3} value={f.goals} onChange={set("goals")} className={inputCls + " h-auto py-2"} />
      <button className={btn("primary", "w-full mt-5")} disabled={save.isPending}>
        {save.isPending ? "Saving…" : cta}
      </button>
      <ErrorNote error={save.error} className="mt-3" />
    </form>
  );
}

function ProfileStep({ name }: { name: string }) {
  const advance = useAdvance();
  return (
    <div>
      <Steps n={2} total={2} label="Profile" />
      <AuthTitle title="Your profile" body="One passport per person. You choose later what any coach can see." />
      <ProfileForm name={name} cta="Save and continue" onSaved={advance} />
    </div>
  );
}

export type Share = { testing: boolean; training: boolean; wellness: boolean };
export const SHARE_LABEL: Record<keyof Share, string> = { testing: "Testing results", training: "Training log", wellness: "Wellness check-ins" };

export function ShareSwitches({ value, onChange }: { value: Share; onChange: (s: Share) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(SHARE_LABEL) as (keyof Share)[]).map((k) => (
        <button
          key={k}
          type="button"
          role="switch"
          aria-checked={value[k]}
          onClick={() => onChange({ ...value, [k]: !value[k] })}
          className={cn("rounded-full border px-3 h-8 text-[12.5px] font-semibold", value[k] ? "bg-[#2f5d46] text-white border-[#2f5d46]" : "bg-card text-muted-foreground border-border")}
        >
          {SHARE_LABEL[k]}: {value[k] ? "Shared" : "Not shared"}
        </button>
      ))}
    </div>
  );
}

function ConsentStep() {
  const links = useMyLinks();
  const confirm = useConfirmConsent();
  const advance = useAdvance();
  const [share, setShare] = useState<Record<string, Share>>({});
  useEffect(() => {
    if (links.data) setShare(Object.fromEntries(links.data.map((l) => [l.teamId, l.share])));
  }, [links.data]);
  if (links.isPending) return <Loading />;
  return (
    <div>
      <AuthTitle eyebrow="Consent" title="What can your coach see?" body="You own your passport. Choose what each team sees. You can change this any time in Settings." />
      <div className="space-y-4">
        {(links.data ?? []).map((l) => (
          <div key={l.teamId} className="rounded-[10px] border border-border bg-card p-4">
            <div className="font-semibold mb-3">{l.name}</div>
            <ShareSwitches value={share[l.teamId] ?? l.share} onChange={(s) => setShare((x) => ({ ...x, [l.teamId]: s }))} />
          </div>
        ))}
        {!links.data?.length && <p className="text-[13.5px] text-muted-foreground">You're not in any team yet.</p>}
      </div>
      <button
        className={btn("primary", "w-full mt-5")}
        disabled={confirm.isPending}
        onClick={() => confirm.mutateAsync({ links: (links.data ?? []).map((l) => ({ teamId: l.teamId, share: share[l.teamId] ?? l.share })) }).then(advance)}
      >
        Confirm and continue
      </button>
      <ErrorNote error={confirm.error} className="mt-3" />
    </div>
  );
}
