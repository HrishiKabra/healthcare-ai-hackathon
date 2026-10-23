import type { Metadata } from "next";
import { StartScreen } from "@/components/start/StartScreen";

export const metadata: Metadata = { title: "FirstWords" };

export default function StartPage() {
  return <StartScreen />;
}
