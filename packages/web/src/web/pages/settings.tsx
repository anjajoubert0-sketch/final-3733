import { useState } from "react";
import { Link } from "wouter";
import { Card, DemoTag, PageHeader } from "../components/shell";
import { useMe, useRename } from "../queries/me";
import { useMyPlan } from "../queries/plans";
import { ErrorNote, Loading, btn, inputCls, labelCls } from "../components/empty-states";
import { MyBookings } from "./book";
import { money } from "../components/table";
import { roleLabel } from "../lib/roles";

export default function SettingsPage() {
  const { data: me } = useMe();
  if (!me) return <Loading />;
  const isCoach = me.role === "coach";
  return (
    <div>
      <PageHeader eyebrow={roleLabel(me)} title="Settings">
        <DemoTag />
      </PageHeader>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        <div className="space-y-6">
          <AccountCard />
          {isCoach && <BillingCard />}
          {me.isAdmin && (
            <Card title="Admin">
              <p className="text-[13.5px] text-muted-foreground mb-3">Practitioner requests, invites, payment verification, pricing and demo reset.</p>
              <Link href="/admin" className={btn("ghost")}>
                Open admin
              </Link>
            </Card>
          )}
        </div>
        {isCoach && <MyBookings />}
      </div>
    </div>
  );
}

export function AccountCard() {
  const { data: me } = useMe();
  const rename = useRename();
  const [name, setName] = useState(me?.name ?? "");
  const [saved, setSaved] = useState(false);
  if (!me) return null;
  return (
    <Card title="Account">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          rename.mutateAsync({ name }).then(() => setSaved(true));
        }}
      >
        <label className="block">
          <span className={labelCls}>Display name</span>
          <input required minLength={2} value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
        </label>
        <div className="mt-3 text-[13px] text-muted-foreground">
          {me.email} · {roleLabel(me)}
        </div>
        <button className={btn("ghost", "mt-4")} disabled={rename.isPending}>
          Save name
        </button>
        {saved && <span className="ml-3 text-[13px] font-semibold text-[#2f5d46]">Saved.</span>}
        <ErrorNote error={rename.error} className="mt-3" />
      </form>
    </Card>
  );
}

export function BillingCard() {
  const q = useMyPlan();
  const d = q.data;
  return (
    <Card title="Plan and billing">
      {q.isPending ? (
        <Loading />
      ) : !d ? (
        <p className="text-[13.5px] text-muted-foreground">No plan chosen yet.</p>
      ) : (
        <div className="text-[13.5px] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold">{d.plan?.name ?? d.subscription.planId}</span>
            <span className="rounded-full border border-[#b9793a]/40 bg-[#b9793a]/10 text-[#7a4c1c] px-2 py-0.5 text-[12px] font-semibold capitalize">{d.subscription.status}</span>
          </div>
          {d.subscription.status === "trial" && (
            <div className="text-muted-foreground">{d.subscription.trialEndsAt ? `Trial ends ${new Date(d.subscription.trialEndsAt).toLocaleDateString("en-ZA")}` : "Trial · length to be confirmed"}</div>
          )}
          <div>
            Active athletes: <strong className="num">{d.activeAthletes}</strong>
          </div>
          <div className="text-muted-foreground">
            {d.plan && (d.plan.baseFeeCents !== null || d.plan.perAthleteFeeCents !== null)
              ? `${money(d.plan.baseFeeCents, d.plan.currency)} base + ${money(d.plan.perAthleteFeeCents, d.plan.currency)} per active athlete / month`
              : "Base fee + fee per active athlete, price to be confirmed. Nothing is charged during the trial."}
          </div>
        </div>
      )}
    </Card>
  );
}
