import json
import torch
from pathlib import Path
from ml.inference.classifier import EmotionClassifier
from ml.utils.data import load_and_split_lemotif


def compute_label_baselines(logits: torch.Tensor, labels: list[str]):
    """Compute baseline statistics for each label given the logits tensor."""

    return {
        label: {
            "mean": logits[:, idx].mean().item(),
            "std": logits[:, idx].std().item(),
            "min": logits[:, idx].min().item(),
            "max": logits[:, idx].max().item(),
        }
        for idx, label in enumerate(labels)
    }


def main(batch_size: int = 32) -> None:
    classifier = EmotionClassifier()
    dataset_dict, _, _, _ = load_and_split_lemotif()
    val_dataset = dataset_dict["validation"]
    texts = val_dataset["text"]

    emotion_logits = []
    intensity_logits = []
    for i in range(0, len(texts), batch_size):
        logits_emotion, logits_intensity = classifier.predict_logits(texts[i : i + batch_size])
        emotion_logits.append(logits_emotion)
        intensity_logits.append(logits_intensity)

    emotion_tensor = torch.cat(emotion_logits)
    intensity_tensor = torch.cat(intensity_logits)

    label_baselines = compute_label_baselines(emotion_tensor, classifier.labels)

    baselines = {
        "emotion": label_baselines,
        "intensity": {
            "mean": intensity_tensor.mean().item(),
            "std": intensity_tensor.std().item(),
            "min": intensity_tensor.min().item(),
            "max": intensity_tensor.max().item(),
        },
    }

    output_path = Path(classifier.cfg["paths"]["artifacts_dir"]) / "final_model" / "baselines.json"
    with open(output_path, "w") as f:
        json.dump(baselines, f, indent=2)
    print(f"Baselines saved to {output_path}")


if __name__ == "__main__":
    main()
