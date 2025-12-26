import datetime
import json
import os

from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
    DataCollatorWithPadding,
)
from sklearn.metrics import (
    f1_score,
    accuracy_score,
    precision_recall_fscore_support,
    confusion_matrix,
)

from ml.config import load_config
from ml.data import (
    load_and_prepare_dataset,
    tokenize,
)


def save_metrics(cfg, metrics, output_path):
    metrics_out = {
        "model": cfg["model"]["name"],
        "config": os.getenv("MODEL_CONFIG"),
        "timestamp": datetime.datetime.now().isoformat(),
        **metrics,
    }

    out_path = os.path.join(output_path, "test_metrics.json")

    with open(out_path, "w") as f:
        json.dump(metrics_out, f, indent=2)

    print(f"Metrics saved to {out_path}")


def compute_metrics_report(predictions, labels, label_names=None):
    # Per-class metrics
    precision, recall, f1, support = precision_recall_fscore_support(
        labels, predictions, average=None, zero_division=0
    )

    # Overall metrics
    accuracy = accuracy_score(labels, predictions)
    macro_f1 = f1_score(labels, predictions, average="macro")
    micro_f1 = f1_score(labels, predictions, average="micro")
    weighted_f1 = f1_score(labels, predictions, average="weighted")

    # Confusion matrix
    num_labels = len(label_names)
    cm = confusion_matrix(labels, predictions, labels=list(range(num_labels)))

    # Classification report
    if label_names is None:
        label_names = [f"class_{i}" for i in range(len(precision))]

    return {
        "accuracy": accuracy,
        "macro_f1": macro_f1,
        "micro_f1": micro_f1,
        "weighted_f1": weighted_f1,
        "per_class_precision": precision.tolist(),
        "per_class_recall": recall.tolist(),
        "per_class_f1": f1.tolist(),
        "per_class_support": support.tolist(),
        "confusion_matrix": cm.tolist(),
        "label_names": label_names,
    }


def main():
    try:
        # Load configuration
        cfg = load_config()

        model_name = cfg["model"]["name"]

        # Load and prepare dataset
        dataset, label_names, _, _ = load_and_prepare_dataset()

        # Determine number of processes for dataset mapping
        num_proc = max(1, (os.cpu_count() or 1) // 2)

        # Initialize tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)

        # Tokenize test set
        tokenized_test = dataset["test"].map(
            lambda x: tokenize(x, tokenizer, int(cfg["model"]["max_length"])),
            batched=True,
            remove_columns=["situation", "Unnamed: 0"],
            num_proc=num_proc,
        )
        tokenized_test.set_format("torch")

        # Define trainer for evaluation
        args = TrainingArguments(
            per_device_eval_batch_size=int(cfg["evaluation"]["eval_batch_size"]),
            report_to="none",
        )

        # Load the trained model
        model = AutoModelForSequenceClassification.from_pretrained(cfg["paths"]["output_dir"])
        model.eval()

        trainer = Trainer(
            model=model,
            args=args,
            eval_dataset=tokenized_test,
            data_collator=DataCollatorWithPadding(tokenizer=tokenizer),
        )

        # Run evaluation and get predictions
        predictions_output = trainer.predict(tokenized_test)

        # Extract predictions and labels
        logits = predictions_output.predictions
        labels = predictions_output.label_ids
        if labels.ndim > 1:
            labels = labels.argmax(axis=1)
        predictions = logits.argmax(axis=-1)

        # Compute and display metrics
        metrics = compute_metrics_report(predictions, labels, label_names)

        # Save metrics
        save_metrics(cfg, metrics, cfg["paths"]["output_dir"])
    except (OSError, ValueError, RuntimeError) as e:
        print(f"Error during evaluation: {e}")
        raise


if __name__ == "__main__":
    main()
