import { PageHeader, Card, DemoTag } from "../components/shell";

export default function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <PageHeader eyebrow="Planned module" title={title} />
      <Card>
        <div className="py-10 text-center">
          <div className="font-display text-[26px] uppercase">Not in this prototype</div>
          <p className="text-muted-foreground text-[14px] mt-2 max-w-xl mx-auto">
            This section is part of the platform structure in the brief and is listed in the navigation. It is intentionally left empty until the visual structure is approved.
          </p>
          <div className="mt-4">
            <DemoTag />
          </div>
        </div>
      </Card>
    </div>
  );
}
