import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import type { Scale, Tick } from "chart.js";
import { useLiveQuery } from "dexie-react-hooks";
import PageHeader from "../components/ui/PageHeader";
import { EntryList } from "../components/home/EntryList";
import TodaySummary from "../components/home/TodaySummary";
import { db, type JournalEntry } from "../storage/JournalDB";
import type { Emotion } from "../types/types";
import { getAnalysis, normalizeToPercentile } from "../utils/emotionHelpers";

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);
const HISTORY_DAYS = 14;
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { enabled: false },
  },
  elements: { line: {} },
  scales: {
    x: {
      grid: { display: false },
      ticks: {
        maxRotation: 0,
        autoSkip: true,
        maxTicksLimit: 7,
        callback: function (this: Scale, tickValue: string | number, _idx: number, _ticks: Tick[]) {
          const label = (this as Scale).getLabelForValue(tickValue as number);
          const date = new Date(label);
          return `${date.toLocaleString(undefined, { month: "short" })} ${date.getDate()}`;
        },
      },
    },
    y: {
      grid: { color: "rgba(15,23,42,0.04)" },
      ticks: {
        stepSize: 0.5,
        callback: function (this: Scale, tickValue: string | number) {
          if (tickValue === 0) return "Low";
          if (tickValue === 0.5) return "Moderate";
          if (tickValue === 1) return "High";
          return "";
        }
      },
      suggestedMin: 0,
      suggestedMax: 1,
    },
  },
};

function getChartData(entries: JournalEntry[], days: number) {
  const labels: string[] = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    return date.toDateString();
  });

  const entriesByDate = new Map<string, JournalEntry[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.createdAt).toDateString();
    if (!entriesByDate.has(dateKey)) entriesByDate.set(dateKey, []);
    entriesByDate.get(dateKey)!.push(entry);
  }

  const dailyAverages: number[] = labels.map(label => {
    const dayEntries = entriesByDate.get(label) ?? [];
    if (!dayEntries.length) return 0;
    const sum = dayEntries.reduce((acc, e) => acc + (e.analysis?.intensity ?? 0), 0);
    return sum / dayEntries.length;
  });

  //const reference = entries.map(e => e.analysis?.intensity ?? 0);
  const normalizedDaily: number[] = normalizeToPercentile(dailyAverages, dailyAverages);
  return {
    labels,
    datasets: [
      {
        data: normalizedDaily,
        fill: true,
        tension: 0.2,
        borderWidth: 1.2,
        pointRadius: 0,
        borderColor: "#7c3aed",
        backgroundColor: "#ede9fe",
      },
    ],
  };
}

function getPrimaryEmotion(entries: JournalEntry[]): Emotion | null {
  const emotionSums: Record<string, number> = {};
  let primaryEmotion: Emotion | null = null;
  for (const entry of entries) {
    const buckets = getAnalysis(entry).buckets;
    if (Object.keys(buckets).length === 0) continue;
    const highestDailyBucket = Object.entries(buckets).reduce<[string, number]>(
      (max, bucketEntry) => (bucketEntry[1] > max[1] ? bucketEntry : max),
      ["", 0]
    );
    const [emotion, intensity] = highestDailyBucket as [Emotion, number];
    emotionSums[emotion] = (emotionSums[emotion] || 0) + intensity;
    if (primaryEmotion === null || emotionSums[emotion] > emotionSums[primaryEmotion]) {
      primaryEmotion = emotion;
    }
  }
  return primaryEmotion;
}

export default function Home() {
  const recentEntries = useLiveQuery(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HISTORY_DAYS + 1);
    return db.entries.where("createdAt").aboveOrEqual(cutoff.getTime()).reverse().toArray();
  }, []) ?? [];

  const primaryEmotion = getPrimaryEmotion(recentEntries);
  const chartData = getChartData(recentEntries, HISTORY_DAYS);

  return (
    <div className="page-container">
      <div className="page-content-wide md:space-y-10 space-y-5">
        <PageHeader title="Your Mood Overview" description="A snapshot of how you've been feeling recently" />
        <div className="space-y-4">
          <TodaySummary entriesCount={recentEntries.length} primaryEmotion={primaryEmotion} />
          <section className="card p-6">
            <h3 className="header">Intensity (last {HISTORY_DAYS} days)</h3>
            <div style={{ height: 160 }} className="mt-3">
              <Line data={chartData} options={chartOptions} />
            </div>
            <p className="text-sm text-slate-500 mt-3">Intensity over time.</p>
          </section>
          <EntryList entries={recentEntries} />
        </div>
      </div>
    </div>
  );
}
