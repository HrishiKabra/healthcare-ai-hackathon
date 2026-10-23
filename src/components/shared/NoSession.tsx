import Link from "next/link";

export function NoSession({ what }: { what: string }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-2xl font-semibold">No active call</h1>
      <p className="text-ink-soft">The {what} opens from a call. Start a new call first, then open this window from the EMT console.</p>
      <Link href="/" className="w-fit rounded-lg bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong">
        Go to start
      </Link>
    </main>
  );
}
