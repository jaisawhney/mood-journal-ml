import classNames from "classnames";
import { EntryList } from "../components/home/EntryList";
import { EmotionDistribution } from "../components/home/EmotionDistribution";
import { TodaySummary } from "../components/home/TodaySummary";
import PageHeader from "../components/ui/PageHeader";
import { useJournalEntries } from "../hooks/useJournalEntries";
import { emotionDistribution, summarizeToday } from "../utils/emotionAggregation";

export default function Home() {
  const { entries, loading } = useJournalEntries();

  const today = summarizeToday(entries);
  const emotionSummary = emotionDistribution(entries);

  return (
    <div className="page-container">
      <div className="page-content-wide md:space-y-10 space-y-5">
        <PageHeader title="Your Mood Overview" description="A snapshot of how you've been feeling recently" />
        {loading ? (
          <div className={classNames("card", "p-6")}>Loading your mood overview...</div>
        ) : (
          <>
            <TodaySummary
              entriesCount={today?.count ?? 0}
              primaryEmotion={today?.emotion ?? "joy"}
            />
            <EmotionDistribution
              items={emotionSummary}
            />
            <EntryList entries={entries} />
          </>
        )}
      </div>
    </div>
  );
}