import type { Metadata } from "next";
import { DrillResults } from "@/components/drill/DrillResults";

export const metadata: Metadata = { title: "FirstWords: Field test results" };

export default function Page() {
  return <DrillResults />;
}
