import type { Metadata } from "next";
import { Suspense } from "react";
import { PatientRoute } from "./PatientRoute";

export const metadata: Metadata = { title: "FirstWords: Patient" };

export default function PatientPage() {
  return (
    <Suspense fallback={null}>
      <PatientRoute />
    </Suspense>
  );
}
