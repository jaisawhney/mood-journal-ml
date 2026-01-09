import json
import sys
import numpy as np
from pathlib import Path
from ml.inference.classifier import EmotionClassifier
from ml.utils.calibration import load_json_entries


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def analyze_global_delta_distribution(json_path: str):
    classifier = EmotionClassifier()
    texts = load_json_entries(Path(json_path))

    model_dir = Path(classifier.cfg["paths"]["artifacts_dir"]) / "final_model"
    baseline_path = model_dir / "baselines.json"

    with open(baseline_path) as f:
        baselines = json.load(f)

    all_deltas = []
    deltas_by_label = {label: [] for label in classifier.labels}
    intensity_values = []

    for text in texts:
        logits_emotion, logits_intensity = classifier.predict_logits([text])

        for idx, label in enumerate(classifier.labels):
            mean = baselines["emotion"][label]["mean"]
            temp = baselines["emotion"][label].get("temp", 1.0)
            logit = logits_emotion[0, idx].item()

            prob = sigmoid(logit / temp)
            mean_prob = sigmoid(mean / temp)
            delta = prob - mean_prob
            all_deltas.append(delta)
            deltas_by_label[label].append(delta)

        intensity_logit = logits_intensity[0, 0].item()
        intensity_value = intensity_logit - baselines["intensity"]["mean"]
        intensity_values.append(intensity_value)

    stats = {
        "global": {
            "mean": float(np.mean(all_deltas)),
            "std": float(np.std(all_deltas)),
            "median": float(np.median(all_deltas)),
            "percentiles": {
                "75": float(np.percentile(all_deltas, 75)),
                "90": float(np.percentile(all_deltas, 90)),
                "95": float(np.percentile(all_deltas, 95)),
                "99": float(np.percentile(all_deltas, 99)),
            },
        },
        "intensity": {
            "mean": float(np.mean(intensity_values)),
            "std": float(np.std(intensity_values)),
            "median": float(np.median(intensity_values)),
            "percentiles": {
                "75": float(np.percentile(intensity_values, 75)),
                "90": float(np.percentile(intensity_values, 90)),
                "95": float(np.percentile(intensity_values, 95)),
                "99": float(np.percentile(intensity_values, 99)),
            },
        },
        "per_emotion": {},
    }

    for label, deltas in deltas_by_label.items():
        stats["per_emotion"][label] = {
            "mean": float(np.mean(deltas)),
            "std": float(np.std(deltas)),
            "median": float(np.median(deltas)),
            "90th": float(np.percentile(deltas, 90)),
        }

    return stats


def main(json_path: str):
    stats = analyze_global_delta_distribution(json_path)

    classifier = EmotionClassifier()
    model_dir = Path(classifier.cfg["paths"]["artifacts_dir"]) / "final_model"
    output_path = model_dir / "thresholds.json"

    with open(output_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Thresholds saved to {output_path}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python thresholds.py <path_to_json>")

    main(sys.argv[1])
