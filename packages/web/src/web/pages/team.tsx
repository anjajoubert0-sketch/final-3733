import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Card, DemoTag, PageHeader } from "../components/shell";
import { useAddAthletes, useClaimLink, useCreateTeam, useRegenerateCode, useRemoveAthlete, useTeamMembers, useUpdateTeam, useUpdateTeamAthlete } from "../queries/teams";
import { setActiveTeam } from "../hooks/use-active-team";
import { useCoachTeamId } from "./book";
import { ErrorNote, Loading, btn, inputCls, labelCls } from "../components/empty-states";
import { CopyLink, DataTable, Pill } from "../components/table";
import { parseAthleteLines } from "./onboarding";

type Member = NonNullable<ReturnType<typeof useTeamMembers>["data"]>["members"][number];

function sharing(m: Member): { label: string; tone: "forest" | "ochre" | "clay" | "stone" } {
  if (!m.claimed) return { label: "Managed by coach", tone: "stone" };
  const n = [m.share.testing, m.share.training, m.share.wellness].filter(Boolean).length;
  return n === 3 ? { label: "Shared", tone: "forest" } : n === 0 ? { label: "Not shared", tone: "clay" } : { label: "Partly shared", tone: "ochre" };
}

export default function TeamPage() {
  const { teamId, isPending } = useCoachTeamId(true);
  const q = useTeamMembers(teamId);
  const [claim, setClaim] = useState<{ name: string; path: string } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const claimLink = useClaimLink();
  const remove = useRemoveAthlete();

  if (isPending || (teamId && q.isPending)) return <Loading label="Loading team" />;
  if (!teamId) return <NewTeam first />;
  const d = q.data;
  if (!d) return <ErrorNote error={q.error} />;

  return (
    <div>
      <PageHeader eyebrow="Coach" title="Team">
        <Link href="/book" className={btn("ochre")}>
          Book Performance Testing
        </Link>
        <DemoTag />
      </PageHeader>
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <div className="space-y-6 min-w-0">
          <Card title={`Members · ${d.members.length}`} pad={false}>
            {claim && (
              <div className="p-4 border-b border-border">
                <div className="text-[13px] font-semibold mb-2">Claim link for {claim.name}</div>
                <CopyLink path={claim.path} note="One-time link, valid for 7 days. The athlete creates an account, confirms their profile and chooses what you can see." />
              </div>
            )}
            <DataTable
              head={["#", "Athlete", "Position", "Account", "Sharing", ""]}
              empty="No athletes yet. Add them on the right."
              rows={d.members.map((m) =>
                editing === m.athleteId
                  ? [<EditRow key={m.athleteId} teamId={teamId} m={m} onDone={() => setEditing(null)} />, "", "", "", "", ""]
                  : [
                      <span className="num text-muted-foreground">{m.squadNumber ?? "—"}</span>,
                      <Link href={`/athletes/${m.athleteId}`} className="font-semibold hover:underline">
                        {m.name}
                      </Link>,
                      m.position ?? <span className="text-muted-foreground">Not recorded</span>,
                      m.claimed ? <Pill tone="forest">Claimed</Pill> : m.claimPending ? <Pill tone="ochre">Link sent</Pill> : <Pill>No account</Pill>,
                      <Pill tone={sharing(m).tone}>{sharing(m).label}</Pill>,
                      <div className="flex gap-3 whitespace-nowrap text-[12.5px] font-semibold">
                        <button className="text-[#2f5d46] hover:underline" onClick={() => setEditing(m.athleteId)}>
                          Edit
                        </button>
                        {!m.claimed && (
                          <button
                            className="text-[#2f5d46] hover:underline"
                            disabled={claimLink.isPending}
                            onClick={() => claimLink.mutateAsync({ teamId, athleteId: m.athleteId }).then((r) => setClaim({ name: m.name, path: r.path }))}
                          >
                            Claim link
                          </button>
                        )}
                        <button
                          className="text-[#8f3320] hover:underline"
                          onClick={() => confirm(`Remove ${m.name} from ${d.team.name}? Their passport and data stay with the athlete.`) && remove.mutate({ teamId, athleteId: m.athleteId })}
                        >
                          Remove
                        </button>
                      </div>,
                    ],
              )}
            />
            <ErrorNote error={claimLink.error ?? remove.error} className="m-4" />
          </Card>
        </div>
        <div className="space-y-6">
          <AddAthletes teamId={teamId} />
          <TeamDetails team={d.team} />
          <NewTeam />
        </div>
      </div>
    </div>
  );
}

function EditRow({ teamId, m, onDone }: { teamId: string; m: Member; onDone: () => void }) {
  const upd = useUpdateTeamAthlete();
  const [name, setName] = useState(m.name);
  const [position, setPosition] = useState(m.position ?? "");
  const [num, setNum] = useState(m.squadNumber?.toString() ?? "");
  return (
    <form
      className="flex flex-wrap items-end gap-2 min-w-[min(640px,80vw)]"
      onSubmit={(e) => {
        e.preventDefault();
        const n = num.trim() ? parseInt(num, 10) : null;
        upd.mutateAsync({ teamId, athleteId: m.athleteId, ...(m.claimed ? {} : { name }), position: position || null, squadNumber: Number.isFinite(n) ? n : null }).then(onDone);
      }}
    >
      <label className="w-16">
        <span className={labelCls}>#</span>
        <input value={num} onChange={(e) => setNum(e.target.value)} className={inputCls + " h-8"} />
      </label>
      <label className="flex-1 min-w-[140px]">
        <span className={labelCls}>Name</span>
        <input value={name} disabled={m.claimed} title={m.claimed ? "The athlete manages their own name" : undefined} onChange={(e) => setName(e.target.value)} className={inputCls + " h-8"} />
      </label>
      <label className="flex-1 min-w-[120px]">
        <span className={labelCls}>Position</span>
        <input value={position} onChange={(e) => setPosition(e.target.value)} className={inputCls + " h-8"} />
      </label>
      <button className={btn("primary", "h-8 px-3 text-[12.5px]")} disabled={upd.isPending}>
        Save
      </button>
      <button type="button" className={btn("ghost", "h-8 px-3 text-[12.5px]")} onClick={onDone}>
        Cancel
      </button>
      <ErrorNote error={upd.error} className="w-full" />
    </form>
  );
}

function AddAthletes({ teamId }: { teamId: string }) {
  const add = useAddAthletes();
  const [text, setText] = useState("");
  const parsed = parseAthleteLines(text);
  return (
    <Card title="Add athletes">
      <p className="text-[12.5px] text-muted-foreground mb-2">One per line: name, position, squad number. Position and number are optional.</p>
      <textarea aria-label="New athletes" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Sipho Dlamini, Flanker, 7" className={inputCls + " h-auto py-2 font-mono text-[13px]"} />
      <button className={btn("primary", "mt-3")} disabled={!parsed.length || add.isPending} onClick={() => add.mutateAsync({ teamId, athletes: parsed }).then(() => setText(""))}>
        Add {parsed.length || ""} athlete{parsed.length === 1 ? "" : "s"}
      </button>
      <ErrorNote error={add.error} className="mt-3" />
    </Card>
  );
}

function TeamDetails({ team }: { team: { id: string; name: string; sport: string; season: string | null; inviteCode: string } }) {
  const upd = useUpdateTeam();
  const regen = useRegenerateCode();
  const [f, setF] = useState({ name: team.name, sport: team.sport, season: team.season ?? "" });
  useEffect(() => setF({ name: team.name, sport: team.sport, season: team.season ?? "" }), [team]);
  const [saved, setSaved] = useState(false);
  return (
    <Card title="Team details">
      <div className="rounded-md border border-border bg-background p-3 mb-4">
        <div className={labelCls}>Team invite code</div>
        <div className="flex items-center gap-3">
          <code className="font-display text-[28px] tracking-[0.12em]">{team.inviteCode}</code>
          <button className={btn("ghost", "h-8 px-3 text-[12.5px]")} disabled={regen.isPending} onClick={() => confirm("Regenerate the code? The old code stops working.") && regen.mutate({ teamId: team.id })}>
            Regenerate
          </button>
        </div>
        <p className="text-[12px] text-muted-foreground mt-1">Athletes with their own account join with this code and choose what you can see.</p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(false);
          upd.mutateAsync({ teamId: team.id, name: f.name, sport: f.sport, season: f.season || null }).then(() => setSaved(true));
        }}
        className="space-y-3"
      >
        <label className="block">
          <span className={labelCls}>Name</span>
          <input required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={labelCls}>Sport</span>
            <input required minLength={2} value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })} className={inputCls} />
          </label>
          <label>
            <span className={labelCls}>Season</span>
            <input value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} className={inputCls} />
          </label>
        </div>
        <button className={btn("ghost")} disabled={upd.isPending}>
          Save team details
        </button>
        {saved && <span className="ml-3 text-[13px] font-semibold text-[#2f5d46]">Saved.</span>}
        <ErrorNote error={upd.error ?? regen.error} />
      </form>
    </Card>
  );
}

function NewTeam({ first }: { first?: boolean }) {
  const create = useCreateTeam();
  const [open, setOpen] = useState(!!first);
  const [f, setF] = useState({ name: "", sport: "Rugby union", season: String(new Date().getFullYear()) });
  return (
    <Card title={first ? "Create your first team" : "Create another team"}>
      {!open ? (
        <button className={btn("ghost")} onClick={() => setOpen(true)}>
          New team
        </button>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutateAsync({ name: f.name, sport: f.sport, season: f.season || null }).then((r) => {
              setActiveTeam(r.id);
              setOpen(!!first);
              setF({ ...f, name: "" });
            });
          }}
        >
          <label className="block">
            <span className={labelCls}>Team name</span>
            <input required minLength={2} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              <span className={labelCls}>Sport</span>
              <input required minLength={2} value={f.sport} onChange={(e) => setF({ ...f, sport: e.target.value })} className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Season</span>
              <input value={f.season} onChange={(e) => setF({ ...f, season: e.target.value })} className={inputCls} />
            </label>
          </div>
          <button className={btn("primary")} disabled={create.isPending}>
            Create team
          </button>
          <ErrorNote error={create.error} />
        </form>
      )}
    </Card>
  );
}
