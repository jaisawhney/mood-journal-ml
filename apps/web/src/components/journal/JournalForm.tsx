import classNames from "classnames";
import React from "react";

interface JournalFormProps {
    text: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onSubmit: (e: React.FormEvent) => void;
    showHint: boolean;
    loading: boolean;
    hardLimit: number;
}

export default function JournalForm({
    text,
    onChange,
    onSubmit,
    showHint,
    loading,
    hardLimit,
}: JournalFormProps) {
    return (
        <form onSubmit={onSubmit} className="card p-6 space-y-4">
            <div className="space-y-1">
                <h2 className="header">Your entry</h2>
                <p className="text-sm text-slate-400">
                    Write about what stood out today, a moment that shifted your mood, or anything still lingering.
                </p>
            </div>
            <textarea
                value={text}
                onChange={onChange}
                rows={6}
                maxLength={hardLimit}
                placeholder="Start writing..."
                className="form-input"
                autoFocus
            />
            <div className="flex justify-between items-center text-xs text-slate-400">
                <span>
                    {showHint && (
                        <span className="text-slate-500">
                            Shorter entries often give clearer emotional insights.
                        </span>
                    )}
                </span>
                <span className={text.length >= hardLimit ? "text-red-500" : "text-slate-400"}>
                    {text.length}/{hardLimit}
                </span>
            </div>
            <div className="flex items-center justify-end pt-2">
                <button
                    type="submit"
                    disabled={!text.trim() || loading}
                    className={classNames(
                        "rounded-lg px-6 py-2 text-sm font-semibold transition cursor-pointer",
                        (!text.trim() || loading
                            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                            : "bg-neutral-900 text-white hover:bg-neutral-800")
                    )
                    }
                >
                    {loading ? "Saving..." : "Save entry"}
                </button>
            </div>
        </form>
    );
}
