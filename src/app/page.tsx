import type { Metadata } from "next";
import { ScenarioMenu } from "@/components/start/ScenarioMenu";
import { SettingsPanel } from "@/components/start/SettingsPanel";
import { StartScreen } from "@/components/start/StartScreen";

export const metadata: Metadata = { title: "FirstWords" };

export default function StartPage() {
  return (
    <StartScreen
      scenarios={
        <>
          <ScenarioMenu />
          <SettingsPanel />
        </>
      }
    />
  );
}
