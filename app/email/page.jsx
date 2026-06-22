import EmailPreviewWorkspace from "@/components/email/EmailPreviewWorkspace";
import { getEmailPreviewTemplates } from "@/components/email/emailPreviewData";

export default async function EmailPage() {
  const templates = await getEmailPreviewTemplates();
  return <EmailPreviewWorkspace mode="dashboard" templates={templates} />;
}
