import { PAYMENT_LABEL, type PaymentStatus } from "../lib/demo-data";
import { cn } from "@/lib/utils";

const STYLE: Record<PaymentStatus, string> = {
  unpaid: "bg-[#b3412b]/12 text-[#8f3320]",
  paid_card: "bg-[#2f5d46]/12 text-[#2f5d46]",
  verified_admin: "bg-[#2f5d46]/12 text-[#2f5d46]",
  waived: "bg-[#ecebe4] text-[#4f5550]",
  demo: "bg-[#2f5d46]/12 text-[#2f5d46]",
};

export function PaymentBadge({ status }: { status?: PaymentStatus | null }) {
  if (!status) return null;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap", STYLE[status])}>
      Payment: {PAYMENT_LABEL[status]}
    </span>
  );
}
