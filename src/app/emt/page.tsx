import type { Metadata } from "next";
import { Suspense } from "react";
import { EmtRoute } from "./EmtRoute";

export const metadata: Metadata = { title: "FirstWords: EMT console" };

export default function EmtPage() {
  return (
    <Suspense fallback={null}>
      <EmtRoute />
    </Suspense>
  );
}
