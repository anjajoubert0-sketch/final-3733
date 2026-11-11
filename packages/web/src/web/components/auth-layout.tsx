import type { ReactNode } from "react";
import { useLocation } from "wouter";
import { signOut } from "../lib/auth";
import { queryClient } from "./provider";
import { useMe } from "../queries/me";

/** Split-screen layout for sign-in, sign-up, invites, pending approval and onboarding. */
export function AuthLayout({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const { data: me } = useMe();
  const [, navigate] = useLocation();
  return (
    <div className={`min-h-screen grid ${wide ? "" : "lg:grid-cols-2"}`}>
      {!wide && (
        <div className="hidden lg:flex flex-col justify-between bg-[#0f1411] text-white p-12">
          <img src="/images/vad-logo-white.png" alt="Vert & Dirt" className="w-[140px]" />
          <div>
            <div className="font-display text-[56px] uppercase leading-[0.95]">Team Performance Portal</div>
            <p className="text-[#c9cdc5] mt-4 max-w-md">Official physiological testing, published by Vert &amp; Dirt practitioners, for coaches and athletes.</p>
          </div>
          <div className="text-[12px] text-[#7c8f86] uppercase tracking-wider">Fictional demo data</div>
        </div>
      )}
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6">
          <img src="/images/vad-logo-dark.png" alt="Vert & Dirt" className={`w-[100px] ${wide ? "" : "lg:invisible"}`} />
          {me && (
            <button
              className="text-[13px] text-muted-foreground hover:text-foreground"
              onClick={async () => {
                await signOut();
                queryClient.clear();
                navigate("/sign-in");
              }}
            >
              Sign out ({me.email})
            </button>
          )}
        </div>
        <div className="flex-1 grid place-items-center px-6 py-10">
          <div className={`w-full ${wide ? "max-w-4xl" : "max-w-sm"}`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AuthTitle({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <div className="text-[12px] uppercase tracking-[0.16em] text-[#2f5d46] font-semibold mb-1">{eyebrow}</div>}
      <h1 className="font-display text-[40px] uppercase leading-none">{title}</h1>
      {body && <p className="text-muted-foreground text-[14px] mt-2">{body}</p>}
    </div>
  );
}

/** Read ?next= (only same-site paths). */
export function nextParam() {
  const n = new URLSearchParams(window.location.search).get("next");
  return n && n.startsWith("/") && !n.startsWith("//") ? n : null;
}
