import { useEffect, useState } from "react";
import { Card, DemoTag, PageHeader } from "../components/shell";
import { useMe } from "../queries/me";
import { useMyTeams, useTeamMembers } from "../queries/teams";
import { usePricing } from "../queries/plans";
import { useCheckout, useConfirmPayment, useCreateBooking, useMyBookings, useCancelBooking } from "../queries/bookings";
import { useActiveTeamId } from "../hooks/use-active-team";
import { ErrorNote, Loading, btn, inputCls, labelCls } from "../components/empty-states";
import { DataTable, Pill, money } from "../components/table";
import { BOOKING_LABEL, BOOKING_PAY } from "./practitioner/testing";
import { fmtDate } from "../lib/demo-data";
import { cn } from "@/lib/utils";

const TYPES = ["Lactate threshold", "VO2 max", "Sweat"] as const;
const TYPE_LABEL: Record<string, string> = { "Lactate threshold": "Lactate", "VO2 max": "VO₂max", Sweat: "Sweat" };
const LOCATIONS = ["Vert & Dirt lab", "At our venue"] as const;

/** Coach team id: the switcher's team when it's one of mine, otherwise the first. */
export function useCoachTeamId(enabled: boolean) {
  const active = useActiveTeamId();
  const teams = useMyTeams();
  const list = enabled ? (teams.data ?? []) : [];
  return { teamId: list.find((t) => t.id === active)?.id ?? list[0]?.id, teams: list, isPending: enabled && teams.isPending };
}

export default function BookPage({ embedded }: { embedded?: boolean }) {
  const { data: me } = useMe();
  const isCoach = me?.role === "coach";
  const { teamId, isPending } = useCoachTeamId(isCoach);
  const members = useTeamMembers(isCoach ? teamId : undefined);
  const pricing = usePricing();
  const create = useCreateBooking();
  const checkout = useCheckout();
  const confirmPay = useConfirmPayment();

  const [athleteIds, setAthleteIds] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>(["Lactate threshold"]);
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("Vert & Dirt lab");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [created, setCreated] = useState<{ id: string; cardCheckout: boolean } | null>(null);
  const [payMsg, setPayMsg] = useState<string | null>(null);

  // Returning from card checkout: the server confirms with the payment provider before marking it paid.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("confirm");
    if (!id) return;
    confirmPay.mutateAsync({ bookingId: id }).then((r) => setPayMsg(r.paid ? "Payment confirmed. Thank you." : "We couldn't confirm the payment yet. Vert & Dirt will verify it."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!me || isPending) return <Loading />;
  if (isCoach && !teamId) return <ErrorNote error="Create a team first on the Team page." />;
  const selfId = me.athleteId;
  const ids = isCoach ? athleteIds : selfId ? [selfId] : [];
  const qty = ids.length * types.length;
  const price = pricing.data?.testPriceCents ?? null;
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const valid = ids.length > 0 && types.length > 0 && !!d1;

  const submit = async () => {
    const r = await create.mutateAsync({
      teamId: isCoach ? teamId : null,
      athleteIds: ids,
      testTypes: types as (typeof TYPES)[number][],
      preferredDates: [d1, d2].filter(Boolean),
      location,
      phone: phone || null,
      notes: notes || null,
    });
    setCreated(r);
  };

  const form = created ? (
    <Card title="Booking requested">
      <p className="text-[14px]">Vert &amp; Dirt will confirm a date with you. You'll see the status under Testing bookings.</p>
      {created.cardCheckout && (
        <button
          className={btn("ochre", "mt-4")}
          disabled={checkout.isPending}
          onClick={() => checkout.mutateAsync({ bookingId: created.id, returnUrl: `${window.location.origin}${window.location.pathname}?confirm=${created.id}` }).then((r) => (window.location.href = r.paymentUrl))}
        >
          Pay by card
        </button>
      )}
      <ErrorNote error={checkout.error} className="mt-3" />
      <button className={btn("ghost", "mt-4 ml-2")} onClick={() => setCreated(null)}>
        Book another
      </button>
    </Card>
  ) : (
    <Card title="Request testing">
      <div className="space-y-5 text-[13.5px]">
        <div>
          <div className={labelCls}>Athletes</div>
          {isCoach ? (
            members.isPending ? (
              <Loading />
            ) : (
              <>
                <div className="flex gap-3 mb-2 text-[12.5px]">
                  <button type="button" className="text-[#2f5d46] font-semibold hover:underline" onClick={() => setAthleteIds((members.data?.members ?? []).map((m) => m.athleteId))}>
                    Select all
                  </button>
                  <button type="button" className="text-muted-foreground hover:underline" onClick={() => setAthleteIds([])}>
                    Clear
                  </button>
                  <span className="text-muted-foreground">{athleteIds.length} selected</span>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border border-border bg-card divide-y divide-border/70">
                  {(members.data?.members ?? []).map((m) => (
                    <label key={m.athleteId} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer">
                      <input type="checkbox" checked={athleteIds.includes(m.athleteId)} onChange={() => setAthleteIds((l) => toggle(l, m.athleteId))} />
                      <span>{m.name}</span>
                      <span className="text-muted-foreground text-[12px]">{m.position ?? ""}</span>
                    </label>
                  ))}
                  {!members.data?.members.length && <div className="px-3 py-4 text-muted-foreground">No athletes on this team yet.</div>}
                </div>
              </>
            )
          ) : selfId ? (
            <div className="rounded-md border border-border bg-card px-3 py-2">Me ({me.name})</div>
          ) : (
            <ErrorNote error="Create your profile first in Settings." />
          )}
        </div>
        <div>
          <div className={labelCls}>Tests</div>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={types.includes(t)}
                onClick={() => setTypes((l) => toggle(l, t))}
                className={cn("rounded-full border px-3.5 h-9 font-semibold", types.includes(t) ? "bg-[#2f5d46] text-white border-[#2f5d46]" : "bg-card border-border text-muted-foreground")}
              >
                {TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Preferred date</span>
            <input type="date" required value={d1} onChange={(e) => setD1(e.target.value)} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>Second option (optional)</span>
            <input type="date" value={d2} onChange={(e) => setD2(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div>
          <div className={labelCls}>Location</div>
          <div className="flex flex-wrap gap-2">
            {LOCATIONS.map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={location === l}
                onClick={() => setLocation(l)}
                className={cn("rounded-md border px-3.5 h-9 font-semibold", location === l ? "border-[#2f5d46] bg-[#2f5d46]/8 text-[#2f5d46]" : "bg-card border-border text-muted-foreground")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Contact phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} />
          </label>
        </div>
        <div className="rounded-md bg-background border border-border px-3 py-2.5">
          {price === null ? (
            <>Price per athlete per test: to be confirmed</>
          ) : (
            <>
              {ids.length} athlete{ids.length === 1 ? "" : "s"} × {types.length} test{types.length === 1 ? "" : "s"} × {money(price, pricing.data?.currency)} = <strong>{money(price * qty, pricing.data?.currency)}</strong>
            </>
          )}
        </div>
        <button className={btn("primary")} disabled={!valid || create.isPending} onClick={submit}>
          {create.isPending ? "Sending…" : "Request booking"}
        </button>
        <ErrorNote error={create.error} />
      </div>
    </Card>
  );

  return (
    <div>
      {!embedded && (
        <PageHeader eyebrow={isCoach ? "Coach" : "Testing"} title={isCoach ? "Book Performance Testing" : "Book a test"}>
          <DemoTag />
        </PageHeader>
      )}
      {payMsg && <div className="mb-4 rounded-md border border-[#2f5d46]/30 bg-[#2f5d46]/8 px-4 py-3 text-[13.5px]">{payMsg}</div>}
      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6 items-start">
        {form}
        <MyBookings />
      </div>
    </div>
  );
}

export function MyBookings() {
  const q = useMyBookings();
  const cancel = useCancelBooking();
  return (
    <Card title="Testing bookings" pad={false}>
      {q.isPending ? (
        <Loading />
      ) : (
        <DataTable
          head={["Tests", "Date", "Status", ""]}
          empty="No bookings yet."
          rows={(q.data ?? []).map((b) => {
            const st = BOOKING_LABEL[b.status] ?? { label: b.status, tone: "stone" as const };
            return [
              <div>
                <div className="font-semibold">{b.testTypes.map((t) => TYPE_LABEL[t] ?? t).join(" + ")}</div>
                <div className="text-[12px] text-muted-foreground">
                  {b.athleteNames.length} athlete{b.athleteNames.length === 1 ? "" : "s"} · {BOOKING_PAY[b.paymentStatus] ?? b.paymentStatus}
                </div>
              </div>,
              <span className="num text-[13px]">{b.scheduledFor ? fmtDate(b.scheduledFor) : `Preferred ${fmtDate(b.preferredDates[0])}`}</span>,
              <Pill tone={st.tone}>{st.label}</Pill>,
              b.status === "requested" ? (
                <button className="text-[12.5px] font-semibold text-[#8f3320] hover:underline" onClick={() => confirm("Cancel this booking request?") && cancel.mutate({ bookingId: b.id })}>
                  Cancel
                </button>
              ) : (
                ""
              ),
            ];
          })}
        />
      )}
      <ErrorNote error={q.error ?? cancel.error} className="m-4" />
      <div className="px-4 pb-3 text-[12px] text-muted-foreground">
        Results appear after a Vert &amp; Dirt practitioner publishes them.
      </div>
    </Card>
  );
}
