import type { Metadata } from "next";
import { EvalRunner } from "@/components/eval/EvalRunner";

export const metadata: Metadata = { title: "FirstWords: Evaluation" };

export default function EvalPage() {
  return <EvalRunner />;
}
