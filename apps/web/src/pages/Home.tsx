import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
import PageHeader from "../components/ui/PageHeader";
import { EntryList } from "../components/home/EntryList";
import TodaySummary from "../components/home/TodaySummary";
import { useInsightStats } from "../hooks/useInsightStats";
import { chartXAxisTickCallback, chartYAxisTickCallback } from "../utils/chartUtils";
import { getPrimaryEmotion } from "../utils/emotionHelpers";
import { useJournalEntriesForDays } from "../hooks/useJournalEntries";
import { useMemo } from "react";
import type { Emotion } from "../types/types";
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
        callback: chartXAxisTickCallback,
      },
    },
    y: {
      grid: { color: "rgba(15,23,42,0.04)" },
      ticks: {
        stepSize: 0.625,
        callback: chartYAxisTickCallback,
      },
      min: 0,
      max: 1.25,
    },
  },
};

export default function Home() {
  const { entries } = useJournalEntriesForDays(HISTORY_DAYS);
  const { overallSeries, rawSeries, labels } = useInsightStats(entries, HISTORY_DAYS);

  const todayEntries = useMemo(() => {
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    return entries.filter(e => e.createdAt >= startOfToday);
  }, [entries]);

  const todayDominant = useMemo(() => {
    const lastIndex = labels.length - 1;
    if (lastIndex < 0) return null;

    const buckets = Object.fromEntries(
      Object.entries(rawSeries).map(([emotion, values]) => [
        emotion,
        values[lastIndex] ?? 0
      ])
    ) as Record<Emotion, number>;

    return getPrimaryEmotion(buckets);
  }, [rawSeries, labels]);

  const chartData = useMemo(() => ({
    labels: labels,
    datasets: [
      {
        data: overallSeries,
        spanGaps: true,
        fill: true,
        tension: 0.5,
        borderWidth: 1.2,
        pointRadius: 0,
        borderColor: "#7c3aed",
        backgroundColor: "#ede9fe",
      },
    ],
  }), [labels, overallSeries]);
  return (
    <div className="page-container">
      <div className="page-content-wide md:space-y-10 space-y-5">
        <PageHeader title="Your Mood Overview" description="A snapshot of how you've been feeling recently" />
        <div className="space-y-4">
          <TodaySummary entriesCount={todayEntries.length} primaryEmotion={todayDominant} />
          <section className="card p-6">
            <h2 className="header">Daily Intensity (last {HISTORY_DAYS} days)</h2>
            <div style={{ height: 160 }} className="mt-3">
              <Line data={chartData} options={chartOptions} />
            </div>
            <p className="text-secondary mt-3">How intense your days felt.</p>
          </section>
          <EntryList entries={entries} />
        </div>
      </div>
    </div>
  );
}