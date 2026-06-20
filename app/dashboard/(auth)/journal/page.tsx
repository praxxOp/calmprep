import { getAuth } from "@/lib/supabase/auth";
import { getJournalEntries } from "@/lib/wellness/queries";
import { JournalEditor } from "./components/journal-editor";
import { JournalList } from "./components/journal-list";

export const metadata = { title: "Journal · Saathi" };

export default async function JournalPage() {
  const { sb } = (await getAuth())!;
  const entries = await getJournalEntries(sb, { limit: 20 });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Daily Journal</h1>
        <p className="text-muted-foreground">
          Write freely about your day. Saathi reads between the lines to surface what&apos;s really
          driving your stress.
        </p>
      </header>
      <JournalEditor />
      <JournalList entries={entries} />
    </div>
  );
}
