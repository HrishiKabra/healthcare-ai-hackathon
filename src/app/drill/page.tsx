import type { Metadata } from "next";
import { DrillSetup } from "@/components/drill/DrillSetup";

export const metadata: Metadata = { title: "FirstWords: Field test" };

export default function Page() {
  return <DrillSetup />;
}
