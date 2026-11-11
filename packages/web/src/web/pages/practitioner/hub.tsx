import { Link } from "wouter";
import { DemoTag, PageHeader, Card, StatusPill } from "../../components/shell";
import { useCoachList, useHub, useIndividualList } from "../../queries/practitioner";
import { useTestList } from "../../queries/tests";
import { ErrorNote, Loading } from "../../components/empty-states";
import { DataTable } from "../../components/table";
import { PaymentBadge } from "../../components/payment-badge";
import { fmtDate, type ReportStatus } from "../../lib/demo-data";

export default function PractitionerHub() {
  const hub = useHub();
  const h = hub.data;
  const tiles: { title: string; value?: number; body: string; href?: string; soon?: boolean }[] = [
    { title: "Practitioner Dashboard", body: "Advanced dashboard features are not part of this build.", soon: true },
    { title: "Coaches", value: h?.coaches, body: "Coach accounts and their teams.", href: "/practitioner/coaches" },
    { title: "Individuals", value: h?.individuals, body: "Individual athlete accounts.", href: "/practitioner/individuals" },
    { title: "Testing Management", value: h?.openBookings, body: "Open bookings, test entry and the publish workflow.", href: "/practitioner/testing" },
    { title: "Pending Results", value: h?.pendingResults, body: "Tests not yet published.", href: "/practitioner/pending" },
    { title: "Published Results", value: h?.publishedResults, body: "Tests visible to coaches and athletes.", href: "/practitioner/published" },
  ];
  return (
    <div>
      <PageHeader eyebrow="Practitioner" title="Practitioner Management System">
        <DemoTag />
      </PageHeader>
      <div className="rounded-[10px] border border-[#b9793a]/40 bg-[#b9793a]/10 px-5 py-4 mb-6 text-[15px] font-semibold text-[#6b431a]">
        Practitioner Management System — Further Customisation Coming Soon.
      </div>
      <ErrorNote error={hub.error} className="mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {tiles.map((t) => {
          const inner = (
            <div className={`h-full rounded-[10px] border border-border bg-card p-5 transition-colors ${t.href ? "hover:border-[#2f5d46]/50" : "opacity-80"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="font-display text-[22px] uppercase leading-tight">{t.title}</div>
                {t.soon && <span className="text-[11px] uppercase tracking-wider text-muted-foreground border border-border rounded px-1.5 py-0.5">Coming soon</span>}
              </div>
              {t.value !== undefined && <div className="font-display text-[44px] leading-none mt-3 num text-[#2f5d46]">{t.value}</div>}
              {t.value === undefined && !t.soon && hub.isPending && <div className="mt-3 text-muted-foreground text-[13px]">Loading…</div>}
              <p className="text-[13px] text-muted-foreground mt-2">{t.body}</p>
            </div>
          );
          return t.href ? (
            <Link key={t.title} href={t.href} className="block">
              {inner}
            </Link>
          ) : (
            <div key={t.title}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

export function ResultsList({ status }: { status: "pending" | "published" }) {
  const q = useTestList(status);
  return (
    <div>
      <PageHeader eyebrow="Practitioner" title={status === "pending" ? "Pending results" : "Published results"}>
        <DemoTag />
      </PageHeader>
      <Card pad={false}>
        {q.isPending ? (
          <Loading />
        ) : (
          <DataTable
            head={["Athlete", "Test", "Date", "Status", "Payment", ""]}
            empty={status === "pending" ? "No tests waiting for publication." : "No published tests yet."}
            rows={(q.data ?? []).map((t) => [
              <span className="font-semibold">{t.athleteName}</span>,
              t.type,
              <span className="num">{fmtDate(t.date)}</span>,
              <StatusPill status={t.status as ReportStatus} />,
              <PaymentBadge status={t.paymentStatus as never} />,
              <span className="flex gap-3 whitespace-nowrap">
                {status === "pending" && (
                  <Link href={`/practitioner/testing/entry/${t.id}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                    Enter results
                  </Link>
                )}
                <Link href={`/practitioner/athletes/${t.athleteId}/tests/${t.id}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                  Open report
                </Link>
              </span>,
            ])}
          />
        )}
        <ErrorNote error={q.error} className="m-4" />
      </Card>
    </div>
  );
}

export function CoachList() {
  const q = useCoachList();
  return (
    <div>
      <PageHeader eyebrow="Practitioner" title="Coaches">
        <DemoTag />
      </PageHeader>
      <Card pad={false}>
        {q.isPending ? (
          <Loading />
        ) : (
          <DataTable
            head={["Coach", "Email", "Teams", "Active athletes"]}
            empty="No coach accounts yet."
            rows={(q.data ?? []).map((c) => [
              <span className="font-semibold">
                {c.name} {c.isDemo && <span className="ml-1 text-[11px] text-[#7a4c1c]">(demo)</span>}
              </span>,
              <span className="text-muted-foreground">{c.email}</span>,
              c.teams.length ? c.teams.map((t) => t.name).join(", ") : "—",
              <span className="num">{c.teams.reduce((s, t) => s + t.athletes, 0)}</span>,
            ])}
          />
        )}
        <ErrorNote error={q.error} className="m-4" />
      </Card>
    </div>
  );
}

export function IndividualList() {
  const q = useIndividualList();
  return (
    <div>
      <PageHeader eyebrow="Practitioner" title="Individuals">
        <DemoTag />
      </PageHeader>
      <Card pad={false}>
        {q.isPending ? (
          <Loading />
        ) : (
          <DataTable
            head={["Name", "Email", "Sport", ""]}
            empty="No individual accounts yet."
            rows={(q.data ?? []).map((p) => [
              <span className="font-semibold">{p.name}</span>,
              <span className="text-muted-foreground">{p.email}</span>,
              p.sport ?? "Not recorded",
              p.athleteId ? (
                <Link href={`/practitioner/athletes/${p.athleteId}`} className="text-[13px] font-semibold text-[#2f5d46] hover:underline">
                  Open passport
                </Link>
              ) : (
                <span className="text-muted-foreground text-[13px]">No profile yet</span>
              ),
            ])}
          />
        )}
        <ErrorNote error={q.error} className="m-4" />
      </Card>
    </div>
  );
}
