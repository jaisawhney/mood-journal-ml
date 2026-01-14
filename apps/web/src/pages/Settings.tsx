import classNames from "classnames"
import PageHeader from "../components/ui/PageHeader"
import { replaceAllEntries, clearAllEntries } from "../storage/journalRepository"
import { useState } from "react";
import { toast } from "sonner";
import { useJournalEntries } from "../hooks/useJournalEntries";
import type { JournalEntry } from "../storage/JournalDB";

const CONFIRM_WINDOW_MS = 60_000;
const URL_REVOKE_DELAY_MS = 1000;
export default function SettingsPage() {
    const { entries } = useJournalEntries();
    const [armedClear, setArmedClear] = useState(false);
    const [armedImport, setArmedImport] = useState(false);

    function validateEntry(entry: JournalEntry): boolean {
        return (
            typeof entry.text === "string" &&
            typeof entry.createdAt === "number" &&
            typeof entry.updatedAt === "number" &&
            typeof entry.raw === "object" &&
            typeof entry.analysis === "object"
        );
    }

    function handleClearData() {
        if (armedClear) {
            clearAllEntries()
                .then(() => {
                    toast.success("All journal data cleared.");
                })
                .catch((err) => {
                    console.error(err);
                    toast.error("Failed to clear journal data.");
                });
            setArmedClear(false);
            return;
        }
        setArmedClear(true);
        navigator.vibrate?.(30);
        window.setTimeout(() => setArmedClear(false), CONFIRM_WINDOW_MS);
    }

    function handleExport() {
        try {
            const payload = {
                exportedAt: new Date().toISOString(),
                version: 1,
                entries: entries,
            }
            const blob = new Blob(
                [JSON.stringify(payload)],
                { type: "application/json" }
            )
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `mood-tracker-journal-export-${new Date().toISOString()}.json`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), URL_REVOKE_DELAY_MS);
            toast.success("Export started. Check your downloads.");
        } catch (err) {
            console.error(err);
            toast.error("Failed to export data.");
        }
    }

    async function handleImport() {
        if (!armedImport) {
            setArmedImport(true);
            navigator.vibrate?.(30);
            setTimeout(() => setArmedImport(false), CONFIRM_WINDOW_MS);
            return;
        }
        setArmedImport(false);
        try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json,application/json";
            input.onchange = async () => {
                const file = input.files?.[0];
                if (!file) return;
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    if (
                        data === null ||
                        typeof data !== "object" ||
                        data.version !== 1 ||
                        !Array.isArray(data.entries)
                    ) {
                        throw new Error("Invalid import format");
                    }

                    for (const entry of data.entries) {
                        if (!validateEntry(entry)) {
                            throw new Error("Invalid entry structure");
                        }
                    }

                    await replaceAllEntries(data.entries);
                    toast.success(`Imported ${data.entries.length} entries.`);
                } catch (err) {
                    console.error(err);
                    toast.error("Failed to import data. Invalid file?");
                }
            };
            input.click();
        } catch (err) {
            console.error(err);
            toast.error("Failed to start import.");
        }
    }

    return (
        <div className="page-container">
            <div className="page-content">
                <PageHeader title="Settings" description="Manage your data and how this app works on your device" hideSettings />

                <section className={classNames("card", "p-6 space-y-2")}>
                    <h2 className="header">
                        Privacy
                    </h2>
                    <p className="text-muted">
                        All journal entries are stored and processed entirely on
                        your device. Nothing is sent to our servers.
                    </p>
                </section>

                <section className={classNames("card", "p-6 space-y-4")}>
                    <h2 className="header">
                        Your data
                    </h2>

                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-medium-sm">
                                Clear all journal data
                            </p>
                            <p className="text-sm text-slate-500">
                                Permanently remove all entries from this device
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClearData}
                            className="btn bg-red-50 text-red-700 hover:bg-red-100"
                        >
                            {armedClear ? "Press again to confirm" : "Clear data"}
                        </button>
                    </div>
                </section>

                <section className={classNames("card", "p-6 space-y-2")}>
                    <h2 className="header">
                        About
                    </h2>
                    <p className="text-muted">
                        This app is designed to help you reflect privately.
                        Your writing stays with you, on this device.
                    </p>
                </section>

                <details className="rounded-lg border border-slate-200 p-4 card ">
                    <summary className="header cursor-pointer select-none">
                        Advanced
                    </summary>

                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-medium-sm">
                                    Import journal entries
                                </p>
                                <p className="text-muted">
                                    Upload a JSON file to import entries. This will overwrite your current entries!
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleImport}
                                className={classNames("btn", armedImport ? "bg-red-50 text-red-700 hover:bg-red-100" : "")}
                            >
                                {armedImport ? "Press again to confirm" : "Import"}
                            </button>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-medium-sm">
                                    Export journal entries
                                </p>
                                <p className="text-muted">
                                    Download a copy of your entries
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleExport}
                                className="btn"
                            >
                                Export
                            </button>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    )
}
