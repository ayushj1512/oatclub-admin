import EmailPreviewWorkspace from "@/components/email/EmailPreviewWorkspace";
import { getEmailPreviewTemplates } from "@/components/email/emailPreviewData";

export default async function EmailLibraryPage() {
  const templates = await getEmailPreviewTemplates();
  return <EmailPreviewWorkspace mode="library" templates={templates} />;
}
