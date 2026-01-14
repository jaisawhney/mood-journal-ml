import json
import numpy as np
from pathlib import Path
from ml.inference.classifier import EmotionClassifier


def analyze_global_emotion_distribution():
    classifier = EmotionClassifier()
    # Use validation split from load_and_split_lemotif, matching baselines.py
    from ml.utils.data import load_and_split_lemotif

    dataset_dict, _, _, _ = load_and_split_lemotif()
    val_dataset = dataset_dict["validation"]
    texts = val_dataset["text"]

    model_dir = Path(classifier.cfg["paths"]["artifacts_dir"]) / "final_model"
    baseline_path = model_dir / "baselines.json"

    with open(baseline_path) as f:
        baselines = json.load(f)

    all_zscores = []
    zscores_by_label = {label: [] for label in classifier.labels}
    intensity_values = []

    for text in texts:
        logits_emotion, logits_intensity = classifier.predict_logits([text])

        for idx, label in enumerate(classifier.labels):
            mean = baselines["emotion"][label]["mean"]
            std = baselines["emotion"][label]["std"]
            logit = logits_emotion[0, idx].item()
            z = (logit - mean) / std
            all_zscores.append(z)
            zscores_by_label[label].append(z)

        intensity_logit = logits_intensity[0, 0].item()
        intensity_value = (intensity_logit - baselines["intensity"]["mean"]) / baselines[
            "intensity"
        ]["std"]
        intensity_values.append(intensity_value)

    stats = {
        "global": {
            "mean": float(np.mean(all_zscores)),
            "std": float(np.std(all_zscores)),
            "median": float(np.median(all_zscores)),
            "percentiles": {
                "75": float(np.percentile(all_zscores, 75)),
                "90": float(np.percentile(all_zscores, 90)),
                "95": float(np.percentile(all_zscores, 95)),
                "99": float(np.percentile(all_zscores, 99)),
            },
        },
        "intensity": {
            "mean": float(np.mean(intensity_values)),
            "std": float(np.std(intensity_values)),
            "median": float(np.median(intensity_values)),
            "percentiles": {
                "25": float(np.percentile(intensity_values, 25)),
                "75": float(np.percentile(intensity_values, 75)),
                "90": float(np.percentile(intensity_values, 90)),
                "95": float(np.percentile(intensity_values, 95)),
                "99": float(np.percentile(intensity_values, 99)),
            },
        },
        "per_emotion": {},
    }

    for label, zscores in zscores_by_label.items():
        stats["per_emotion"][label] = {
            "mean": float(np.mean(zscores)),
            "std": float(np.std(zscores)),
            "median": float(np.median(zscores)),
            "90th": float(np.percentile(zscores, 90)),
        }

    return stats


def main():
    stats = analyze_global_emotion_distribution()

    classifier = EmotionClassifier()
    model_dir = Path(classifier.cfg["paths"]["artifacts_dir"]) / "final_model"
    output_path = model_dir / "thresholds.json"

    with open(output_path, "w") as f:
        json.dump(stats, f, indent=2)
    print(f"Thresholds saved to {output_path}")


if __name__ == "__main__":
    main()
