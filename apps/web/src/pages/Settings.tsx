import classNames from "classnames"
import PageHeader from "../components/ui/PageHeader"
import { replaceAllEntries, clearAllEntries } from "../storage/journalRepository"
import { useState } from "react";
import { toast } from "sonner";
import { useJournalEntries } from "../hooks/useJournalEntries";
import type { JournalEntry } from "../storage/JournalDB";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const CONFIRM_WINDOW_MS = 3000;
const URL_REVOKE_DELAY_MS = 1000;
export default function SettingsPage() {
    const { entries } = useJournalEntries();
    const [armedClear, setArmedClear] = useState(false);
    const [armedImport, setArmedImport] = useState(false);
    const [expanded, setExpanded] = useState(false);

    function validateEntry(entry: JournalEntry): boolean {
        return (
            typeof entry.text === "string" &&
            typeof entry.createdAt === "number" &&
            typeof entry.updatedAt === "number" &&
            entry.raw !== null && typeof entry.raw === "object" &&
            entry.analysis !== null && typeof entry.analysis === "object"
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
            document.body.appendChild(a);
            a.click();
            a.remove();
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
                            <p className="text-secondary">
                                Permanently remove all entries from this device
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleClearData}
                            className="btn bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-white dark:hover:bg-red-800"
                        >
                            {armedClear ? "Press again to confirm" : "Clear data"}
                        </button>
                    </div>
                </section>

                <section className="card p-6 space-y-2">
                    <h2 className="header">
                        About
                    </h2>
                    <p className="text-muted">
                        This app is designed to help you reflect privately.
                        Your writing stays with you, on this device.
                    </p>
                </section>

                <section className="card p-6">
                    <button
                        type="button"
                        onClick={() => setExpanded(e => !e)}
                        aria-expanded={expanded}
                        aria-controls="advanced-panel"
                        className="w-full flex items-center justify-between header cursor-pointer select-none"
                    >
                        <span>Advanced</span>
                        <ChevronDown size={18} className={expanded ? "transform rotate-180" : ""} />
                    </button>
                    <AnimatePresence initial={false}>
                        {expanded && (
                            <motion.div
                                id="advanced-panel"
                                initial={{ opacity: 0, height: 0, y: -5 }}
                                animate={{ opacity: 1, height: "auto", y: 0 }}
                                exit={{ opacity: 0, height: 0, y: 5 }}
                                transition={{ duration: 0.15, ease: "easeInOut" }}
                            >
                                <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-medium-sm">
                                                Import journal entries
                                            </p>
                                            <p className="text-secondary">
                                                Upload a JSON file to import entries. This will overwrite your current entries!
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleImport}
                                            className={classNames("btn", armedImport ? "bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900 dark:text-white dark:hover:bg-red-800" : "")}
                                        >
                                            {armedImport ? "Press again to confirm" : "Import"}
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between gap-4">
                                        <div>
                                            <p className="text-medium-sm">
                                                Export journal entries
                                            </p>
                                            <p className="text-secondary">
                                                Download a copy of your entries
                                            </p>
                                        </div>
                                        <button type="button" onClick={handleExport} className="btn">Export</button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>
            </div>
        </div >
    )
}