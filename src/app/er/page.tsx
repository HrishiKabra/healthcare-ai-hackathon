import type { Metadata } from "next";
import { Suspense } from "react";
import { ErRoute } from "./ErRoute";

export const metadata: Metadata = { title: "FirstWords: ER handoff" };

export default function ErPage() {
  return (
    <Suspense fallback={null}>
      <ErRoute />
    </Suspense>
  );
}
