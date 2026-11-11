import { useEffect, useState } from "react";
import { Card, DemoTag, PageHeader } from "../../components/shell";
import {
  useAdminInvites,
  useAdminPayments,
  useAdminPricing,
  useDecideRequest,
  useInvitePractitioner,
  usePractitionerRequests,
  useResetDemo,
  useRevokeInvite,
  useSetPlanFees,
  useSetPricing,
  useVerifyPayment,
} from "../../queries/admin";
import { ErrorNote, Loading, btn, inputCls } from "../../components/empty-states";
import { CopyLink, DataTable, Pill, dateTime, money } from "../../components/table";
import { fmtDate } from "../../lib/demo-data";
import { errorMessage } from "../../lib/api";
import { BOOKING_PAY } from "./testing";

export default function AdminPage() {
  return (
    <div>
      <PageHeader eyebrow="Admin only" title="Admin">
        <DemoTag />
      </PageHeader>
      <div className="space-y-6">
        <Requests />
        <Invites />
        <Payments />
        <Pricing />
        <ResetDemo />
      </div>
    </div>
  );
}

function Requests() {
  const q = usePractitionerRequests();
  const decide = useDecideRequest();
  return (
    <Card title="Practitioner requests" pad={false}>
      {q.isPending ? (
        <Loading />
      ) : (
        <DataTable
          head={["Name", "Email", "Qualification", "Requested", "Status", ""]}
          empty="No practitioner requests."
          rows={(q.data ?? []).map((r) => [
            <span className="font-semibold">{r.name}</span>,
            <span className="text-muted-foreground">{r.email}</span>,
            <div className="max-w-[260px]">
              {r.qualification}
              {r.message && <div className="text-[12px] text-muted-foreground mt-1">{r.message}</div>}
            </div>,
            dateTime(r.createdAt),
            <Pill tone={r.status === "approved" ? "forest" : r.status === "declined" ? "clay" : "ochre"}>{r.status}</Pill>,
            r.status === "pending" ? (
              <div className="flex gap-1.5">
                <button className={btn("primary", "h-8 px-3 text-[12.5px]")} disabled={decide.isPending} onClick={() => decide.mutate({ requestId: r.id, approve: true })}>
                  Approve
                </button>
                <button className={btn("danger", "h-8 px-3 text-[12.5px]")} disabled={decide.isPending} onClick={() => decide.mutate({ requestId: r.id, approve: false })}>
                  Decline
                </button>
              </div>
            ) : (
              ""
            ),
          ])}
        />
      )}
      <ErrorNote error={decide.error ?? q.error} className="m-4" />
    </Card>
  );
}

function Invites() {
  const q = useAdminInvites();
  const invite = useInvitePractitioner();
  const revoke = useRevokeInvite();
  const [email, setEmail] = useState("");
  const [path, setPath] = useState<string | null>(null);
  return (
    <Card title="Invite a practitioner">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutateAsync({ email }).then((r) => {
            setPath(r.path);
            setEmail("");
          });
        }}
      >
        <input type="email" required aria-label="Practitioner email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls + " max-w-sm"} />
        <button className={btn("primary")} disabled={invite.isPending}>
          Create invite link
        </button>
      </form>
      {path && <CopyLink path={path} note="One-time link, valid for 7 days. It is shown only once; send it to the practitioner yourself." />}
      <ErrorNote error={invite.error} className="mt-3" />
      <div className="mt-5 -mx-5">
        <DataTable
          head={["Email", "Created", "Expires", "Status", ""]}
          empty="No invites yet."
          rows={(q.data ?? []).map((i) => {
            const status = i.usedAt ? "Used" : i.revokedAt ? "Revoked" : i.expiresAt < Date.now() ? "Expired" : "Open";
            return [
              i.email ?? "—",
              dateTime(i.createdAt),
              dateTime(i.expiresAt),
              <Pill tone={status === "Open" ? "ochre" : status === "Used" ? "forest" : "stone"}>{status}</Pill>,
              status === "Open" ? (
                <button className="text-[13px] font-semibold text-[#8f3320] hover:underline" onClick={() => revoke.mutate({ inviteId: i.id })}>
                  Revoke
                </button>
              ) : (
                ""
              ),
            ];
          })}
        />
      </div>
    </Card>
  );
}

function Payments() {
  const q = useAdminPayments();
  const verify = useVerifyPayment();
  const [target, setTarget] = useState<{ testId?: string; bookingId?: string; label: string } | null>(null);
  const [reason, setReason] = useState("");
  const [method, setMethod] = useState<"verified_admin" | "waived">("verified_admin");
  const open = (t: { testId?: string; bookingId?: string; label: string }, m: "verified_admin" | "waived") => {
    setTarget(t);
    setMethod(m);
    setReason("");
    verify.reset();
  };
  if (q.isPending) return <Loading label="Loading payments" />;
  const d = q.data;
  const actions = (t: { testId?: string; bookingId?: string; label: string }) => (
    <div className="flex gap-1.5">
      <button className={btn("ghost", "h-8 px-2.5 text-[12.5px]")} onClick={() => open(t, "verified_admin")}>
        Mark verified
      </button>
      <button className={btn("ghost", "h-8 px-2.5 text-[12.5px]")} onClick={() => open(t, "waived")}>
        Waive
      </button>
    </div>
  );
  return (
    <Card title="Payments">
      <ErrorNote error={q.error} />
      {target && (
        <form
          className="mb-5 rounded-md border border-border bg-background p-4"
          onSubmit={(e) => {
            e.preventDefault();
            verify.mutateAsync({ testId: target.testId, bookingId: target.bookingId, method, reason }).then(() => setTarget(null));
          }}
        >
          <div className="text-[13.5px] font-semibold mb-2">
            {method === "waived" ? "Waive payment" : "Mark payment verified"}: {target.label}
          </div>
          <input required minLength={3} aria-label="Reason" placeholder="Reason (required, logged), e.g. EFT ref 1234" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
          <div className="flex gap-2 mt-3">
            <button className={btn("primary", "h-9")} disabled={verify.isPending}>
              Confirm
            </button>
            <button type="button" className={btn("ghost", "h-9")} onClick={() => setTarget(null)}>
              Cancel
            </button>
          </div>
          <ErrorNote error={verify.error} className="mt-3" />
        </form>
      )}
      <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1">Unpaid tests</div>
      <div className="-mx-5">
        <DataTable
          head={["Athlete", "Test", "Date", "Status", ""]}
          empty="No unpaid tests."
          rows={(d?.tests ?? []).map((t) => [t.athleteName, t.type, fmtDate(t.date), t.status, actions({ testId: t.id, label: `${t.athleteName} · ${t.type}` })])}
        />
      </div>
      <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1 mt-6">Open bookings</div>
      <div className="-mx-5">
        <DataTable
          head={["Athletes", "Tests", "Quantity", "Payment", ""]}
          empty="No bookings waiting for payment."
          rows={(d?.bookings ?? []).map((b) => [
            <div className="max-w-[240px]">{b.athleteNames.join(", ")}</div>,
            b.testTypes.join(", "),
            <span className="num">{b.quantity}</span>,
            BOOKING_PAY[b.paymentStatus] ?? b.paymentStatus,
            actions({ bookingId: b.id, label: `Booking for ${b.athleteNames.length} athlete(s)` }),
          ])}
        />
      </div>
      {!!d?.history.length && (
        <>
          <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1 mt-6">Recent payment records</div>
          <div className="-mx-5">
            <DataTable head={["Date", "Method", "Amount", "Reason / reference"]} rows={d.history.map((p) => [dateTime(p.verifiedAt), p.method, money(p.amountCents, p.currency), p.reason ?? p.reference ?? "—"])} />
          </div>
        </>
      )}
    </Card>
  );
}

const toCents = (s: string) => (s.trim() === "" ? null : Math.round(Number(s) * 100));
const fromCents = (c: number | null | undefined) => (c === null || c === undefined ? "" : String(c / 100));

function Pricing() {
  const q = useAdminPricing();
  const setPricing = useSetPricing();
  const setFees = useSetPlanFees();
  const [price, setPrice] = useState("");
  const [trial, setTrial] = useState("");
  const [fees, setFeesState] = useState<Record<string, { base: string; per: string }>>({});
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!q.data) return;
    setPrice(fromCents(q.data.pricing.testPriceCents));
    setTrial(q.data.trial.trialDays ? String(q.data.trial.trialDays) : "");
    setFeesState(Object.fromEntries(q.data.plans.map((p) => [p.id, { base: fromCents(p.baseFeeCents), per: fromCents(p.perAthleteFeeCents) }])));
  }, [q.data]);
  if (q.isPending) return <Loading label="Loading pricing" />;
  const savePricing = () => {
    setSaved(null);
    setPricing.mutateAsync({ testPriceCents: toCents(price), trialDays: trial.trim() ? Math.round(Number(trial)) : null }).then(() => setSaved("Pricing saved."));
  };
  return (
    <Card title="Pricing (ZAR)">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <label className="block text-[13.5px]">
          <span className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">Testing price per athlete per test (R)</span>
          <input inputMode="decimal" aria-label="Testing price" placeholder="To be confirmed" value={price} onChange={(e) => setPrice(e.target.value)} className={inputCls} />
          <span className="block text-[12px] text-muted-foreground mt-1">Empty = “to be confirmed” and card checkout stays off. Filling it switches card checkout on.</span>
        </label>
        <label className="block text-[13.5px]">
          <span className="block text-[11px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-1.5">Trial length (days)</span>
          <input inputMode="numeric" aria-label="Trial length" placeholder="Open-ended" value={trial} onChange={(e) => setTrial(e.target.value)} className={inputCls} />
        </label>
      </div>
      <button className={btn("primary", "mt-4")} onClick={savePricing} disabled={setPricing.isPending}>
        Save testing price and trial
      </button>
      <ErrorNote error={setPricing.error} className="mt-3" />

      <div className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground font-semibold mt-7 mb-1">Plan fees (monthly)</div>
      <div className="-mx-5">
        <DataTable
          head={["Plan", "Base fee (R)", "Per active athlete (R)", ""]}
          rows={(q.data?.plans ?? []).map((p) => {
            const f = fees[p.id] ?? { base: "", per: "" };
            const set = (k: "base" | "per", v: string) => setFeesState((s) => ({ ...s, [p.id]: { ...f, [k]: v } }));
            return [
              <div>
                <div className="font-semibold">{p.name}</div>
                <div className="text-[12px] text-muted-foreground">{p.contactOnly ? "Contact us" : p.audience}</div>
              </div>,
              <input aria-label={`${p.name} base fee`} placeholder="To be confirmed" value={f.base} onChange={(e) => set("base", e.target.value)} className={inputCls + " h-8 max-w-[140px]"} disabled={p.contactOnly} />,
              <input aria-label={`${p.name} per athlete fee`} placeholder="To be confirmed" value={f.per} onChange={(e) => set("per", e.target.value)} className={inputCls + " h-8 max-w-[140px]"} disabled={p.contactOnly} />,
              p.contactOnly ? (
                ""
              ) : (
                <button
                  className={btn("ghost", "h-8 px-3 text-[12.5px]")}
                  disabled={setFees.isPending}
                  onClick={() => setFees.mutateAsync({ planId: p.id, baseFeeCents: toCents(f.base), perAthleteFeeCents: toCents(f.per) }).then(() => setSaved(`${p.name} fees saved.`))}
                >
                  Save
                </button>
              ),
            ];
          })}
        />
      </div>
      <ErrorNote error={setFees.error} className="mt-3" />
      {saved && <p className="mt-3 text-[13px] font-semibold text-[#2f5d46]">{saved}</p>}
    </Card>
  );
}

function ResetDemo() {
  const reset = useResetDemo();
  const [done, setDone] = useState(false);
  return (
    <Card title="Reset demo data">
      <p className="text-[13.5px] text-muted-foreground max-w-2xl">Re-seeds the fictional demo teams, athletes and tests relative to today. Real accounts and teams are not touched.</p>
      <button
        className={btn("danger", "mt-4")}
        disabled={reset.isPending}
        onClick={() => confirm("Reset all fictional demo data?") && reset.mutateAsync(undefined).then(() => setDone(true))}
      >
        {reset.isPending ? "Resetting…" : "Reset demo data"}
      </button>
      {done && <p className="mt-3 text-[13px] font-semibold text-[#2f5d46]">Demo data reset.</p>}
      {reset.error && <ErrorNote error={errorMessage(reset.error)} className="mt-3" />}
    </Card>
  );
}
