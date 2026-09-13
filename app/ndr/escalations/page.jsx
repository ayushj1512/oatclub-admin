// app/ndr/escalations/page.jsx

"use client";

import NdrCasesView from "@/components/ndr/NdrCasesView";

export default function NdrEscalationsPage() {
  return (
    <NdrCasesView
      title="NDR Escalations"
      description="Resolve rejected, fake-attempt and final-attempt cases."
      cases={[]}
    />
  );
}
