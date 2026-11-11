import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Card, DemoTag, PageHeader, StatusPill } from "../../components/shell";
import { useAllBookings, useCancelBooking, useCompleteBooking, useScheduleBooking } from "../../queries/bookings";
import { useTestList } from "../../queries/tests";
import { ErrorNote, Loading, btn, inputCls } from "../../components/empty-states";
import { DataTable, Pill, Tabs, money } from "../../components/table";
import { PaymentBadge } from "../../components/payment-badge";
import { fmtDate, type ReportStatus } from "../../lib/demo-data";
import { errorMessage } from "../../lib/api";

export const BOOKING_LABEL: Record<string, { label: string; tone: "forest" | "ochre" | "clay" | "stone" }> = {
  requested: { label: "Requested", tone: "ochre" },
  scheduled: { label: "Scheduled", tone: "forest" },
  completed: { label: "Completed · awaiting results", tone: "stone" },
  cancelled: { label: "Cancelled", tone: "clay" },
};
export const BOOKING_PAY: Record<string, string> = {
  not_charged: "Not charged",
  awaiting_card: "Awaiting card payment",
  paid_card: "Paid by card",
  verified_admin: "Verified by admin",
  waived: "Waived",
};

type Tab = "bookings" | "tests" | "new";

export default function TestingManagement() {
  const [tab, setTab] = useState<Tab>("bookings");
  const [, navigate] = useLocation();
  return (
    <div>
      <PageHeader eyebrow="Practitioner" title="Testing management">
        <button className={btn("primary")} onClick={() => navigate("/practitioner/testing/entry")}>
          New test
        </button>
        <DemoTag />
      </PageHeader>
      <Tabs
        tabs={[
          { id: "bookings", label: "Bookings" },
          { id: "tests", label: "Tests" },
          { id: "new", label: "New test" },
        ]}
        value={tab}
        onChange={(v) => (v === "new" ? navigate("/practitioner/testing/entry") : setTab(v))}
      />
      {tab === "bookings" ? <BookingsTab /> : <TestsTab />}
    </div>
  );
}

function BookingsTab() {
  const q = useAllBookings();
  const schedule = useScheduleBooking();
  const complete = useCompleteBooking();
  const cancel = useCancelBooking();
  const [dates, setDates] = useState<Record<string, string>>({});
  const [err, setErr] = useState<unknown>(null);
  const run = (p: Promise<unknown>) => {
    setErr(null);
    p.catch((e) => setErr(errorMessage(e)));
  };
  if (q.isPending) return <Loading label="Loading bookings" />;
  return (
    <Card pad={false}>
      <ErrorNote error={err ?? q.error} className="m-4" />
      <DataTable
        head={["Requested by", "Athletes", "Tests", "Preferred / scheduled", "Status", "Payment", "Actions"]}
        empty="No booking requests yet."
        rows={(q.data ?? []).map((b) => {
          const st = BOOKING_LABEL[b.status] ?? { label: b.status, tone: "stone" as const };
          const open = b.status === "requested" || b.status === "scheduled";
          return [
            <div>
              <div className="font-semibold">{b.requesterName}</div>
              <div className="text-[12px] text-muted-foreground">{b.teamName ?? "Individual"}</div>
            </div>,
            <div className="max-w-[220px] text-[13px]">
              {b.athleteNames.slice(0, 4).join(", ")}
              {b.athleteNames.length > 4 && <span className="text-muted-foreground"> +{b.athleteNames.length - 4} more</span>}
            </div>,
            <div className="text-[13px]">
              {b.testTypes.join(", ")}
              <div className="text-[12px] text-muted-foreground">
                {b.quantity} athlete-test{b.quantity === 1 ? "" : "s"} · {money(b.totalCents, b.currency)}
              </div>
            </div>,
            <div className="text-[13px] num">
              {b.scheduledFor ? <span className="font-semibold">{fmtDate(b.scheduledFor)}</span> : b.preferredDates.map((d) => fmtDate(d)).join(" or ")}
              <div className="text-[12px] text-muted-foreground">{b.location}</div>
            </div>,
            <Pill tone={st.tone}>{st.label}</Pill>,
            <span className="text-[12.5px]">{BOOKING_PAY[b.paymentStatus] ?? b.paymentStatus}</span>,
            open ? (
              <div className="flex flex-col gap-2 min-w-[190px]">
                <div className="flex gap-1.5">
                  <input
                    type="date"
                    aria-label="Schedule date"
                    value={dates[b.id] ?? b.scheduledFor ?? b.preferredDates[0] ?? ""}
                    onChange={(e) => setDates((d) => ({ ...d, [b.id]: e.target.value }))}
                    className={inputCls + " h-8 text-[12.5px] px-2"}
                  />
                  <button
                    className={btn("ghost", "h-8 px-2.5 text-[12.5px]")}
                    disabled={schedule.isPending}
                    onClick={() => run(schedule.mutateAsync({ bookingId: b.id, date: dates[b.id] ?? b.scheduledFor ?? b.preferredDates[0] }))}
                  >
                    {b.status === "scheduled" ? "Reschedule" : "Schedule"}
                  </button>
                </div>
                <div className="flex gap-1.5">
                  <button className={btn("primary", "h-8 px-2.5 text-[12.5px]")} disabled={complete.isPending} onClick={() => run(complete.mutateAsync({ bookingId: b.id }))}>
                    Complete
                  </button>
                  <button
                    className={btn("danger", "h-8 px-2.5 text-[12.5px]")}
                    disabled={cancel.isPending}
                    onClick={() => confirm("Cancel this booking?") && run(cancel.mutateAsync({ bookingId: b.id }))}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <span className="text-[12.5px] text-muted-foreground">{b.status === "completed" ? "Draft tests created" : "—"}</span>
            ),
          ];
        })}
      />
    </Card>
  );
}

function TestsTab() {
  const q = useTestList("all");
  if (q.isPending) return <Loading label="Loading tests" />;
  return (
    <Card pad={false}>
      <ErrorNote error={q.error} className="m-4" />
      <DataTable
        head={["Athlete", "Test", "Date", "Status", "Payment", ""]}
        empty="No tests yet."
        rows={(q.data ?? []).map((t) => [
          <span className="font-semibold">{t.athleteName}</span>,
          t.type,
          <span className="num">{fmtDate(t.date)}</span>,
          <StatusPill status={t.status as ReportStatus} />,
          <PaymentBadge status={t.paymentStatus as never} />,
          <span className="flex gap-3 whitespace-nowrap">
            <Link href={`/practitioner/testing/entry/${t.id}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
              Enter results
            </Link>
            <Link href={`/practitioner/athletes/${t.athleteId}/tests/${t.id}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
              Open report
            </Link>
          </span>,
        ])}
      />
    </Card>
  );
}
