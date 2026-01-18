import datetime
import json
import os
from pathlib import Path

import torch
from torch.utils.data import DataLoader
from transformers import AutoTokenizer, AutoConfig, DataCollatorWithPadding

from ml.utils.config import load_config
from ml.utils.data import load_and_split_lemotif, tokenize
from ml.training.trainer import EmotionModel
from ml.utils.metrics import compute_auc_metrics


def save_metrics(cfg, metrics, output_path):
    """Save evaluation metrics to a JSON file with metadata."""
    metrics_out = {
        "model": cfg["model"]["name"],
        "config": os.getenv("MODEL_CONFIG"),
        "timestamp": datetime.datetime.now().isoformat(),
        **metrics,
    }
    out_path = Path(output_path) / "analysis_metrics.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        json.dump(metrics_out, f, indent=2)
    print(f"Metrics saved to {out_path}")


def collect_predictions(model, dataloader, device):
    """Collect model predictions and true labels from the dataloader."""
    all_logits, all_labels = [], []
    model.eval()
    with torch.no_grad():
        for batch in dataloader:
            labels = batch.pop("labels")
            batch = {k: v.to(device) for k, v in batch.items()}
            logits_emotion, _ = model(**batch)
            all_logits.append(logits_emotion.cpu())
            all_labels.append(labels.cpu())
    return torch.cat(all_logits).numpy(), torch.cat(all_labels).numpy()


def main():
    try:
        cfg = load_config()
        dataset, label_names, id2label, label2id = load_and_split_lemotif()

        model_dir = Path(cfg["paths"]["artifacts_dir"]) / "final_model"
        tokenizer = AutoTokenizer.from_pretrained(model_dir, use_fast=True)

        config = AutoConfig.from_pretrained(
            model_dir, num_labels=len(label_names), id2label=id2label, label2id=label2id
        )
        model = EmotionModel.from_pretrained(model_dir, config=config)
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        model.to(device)

        # Tokenize test set
        num_proc = max(1, (os.cpu_count() or 1) // 2)
        tokenized_test = dataset["test"].map(
            lambda x: tokenize(x, tokenizer, int(cfg["model"]["max_length"])),
            batched=True,
            num_proc=num_proc,
            remove_columns=["text"],
        )
        tokenized_test.set_format("torch")

        dataloader = DataLoader(
            tokenized_test,
            batch_size=int(cfg["evaluation"]["eval_batch_size"]),
            collate_fn=DataCollatorWithPadding(tokenizer),
        )

        logits, labels = collect_predictions(model, dataloader, device)

        # Compute metrics
        metrics = compute_auc_metrics(logits, labels, label_names)

        save_metrics(cfg, metrics, Path(cfg["paths"]["artifacts_dir"]))
    except (OSError, ValueError, RuntimeError) as e:
        print(f"Error during evaluation: {e}")
        raise


if __name__ == "__main__":
    main()
