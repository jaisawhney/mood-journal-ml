import classNames from "classnames"
import PageHeader from "../components/ui/PageHeader"
import { clearAllJournalEntries } from "../storage/db"

export default function SettingsPage() {
    function handleClearData() {
        clearAllJournalEntries().then(() => {
            alert("All journal data cleared.")
        })
    }

    function handleExport() {
        // generate and download JSON
        alert("Export coming soon.")
    }
    function handleImport() {
        // open file picker and import JSON
        alert("Import coming soon.")
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
                                Import journal entries
                            </p>
                            <p className="text-muted">
                                Upload a JSON file to import entries
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleImport}
                            className="btn"
                        >
                            Import
                        </button>
                    </div>
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <p className="text-medium-sm">
                                Export journal entries
                            </p>
                            <p className="text-muted">
                                Download a copy of your entries for your records
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

                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
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
                            Clear data
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
            </div>
        </div>
    )
}
