import type { Metadata } from "next";
import { DemoView } from "@/components/demo/DemoView";

export const metadata: Metadata = { title: "FirstWords: Demo" };

export default function DemoPage() {
  return <DemoView />;
}
