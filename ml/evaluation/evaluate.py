import datetime
import json
import os
import torch

from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    DataCollatorWithPadding,
    Trainer,
    TrainingArguments,
)
from sklearn.metrics import f1_score, accuracy_score

from ml.config import load_config

def tokenize(batch, tokenizer, max_length):
    return tokenizer(
        batch["text"],
        truncation=True,
        padding=False,
        max_length=max_length,
    )

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)
    
    return {
        "macro_f1": f1_score(labels, predictions, average="macro"),
        "accuracy": accuracy_score(labels, predictions),
    }

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

def main():
    try:
        # Load configuration
        cfg = load_config()

        model_name = cfg["model"]["name"]

        # Load Dataset
        dataset = load_dataset("dair-ai/emotion")
                
        # Initialize tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
        
        # Tokenize test set
        num_proc = max(1, (os.cpu_count() or 1) // 2)
        tokenized_test = dataset["test"].map(
            lambda x: tokenize(x, tokenizer, int(cfg["model"]["max_length"])),
            batched=True,
            remove_columns=["text"],
            num_proc=num_proc,
        )
        tokenized_test.set_format("torch")

        # Define Trainer for evaluation
        args = TrainingArguments(
            per_device_eval_batch_size=int(cfg["evaluation"]["eval_batch_size"]),
            report_to="none",
            fp16=torch.cuda.is_available(),
        )
        
        # Load the trained model
        model = AutoModelForSequenceClassification.from_pretrained(cfg["paths"]["output_dir"])
        model.eval()

        trainer = Trainer(
            model=model,
            args=args,
            eval_dataset=tokenized_test,
            data_collator=DataCollatorWithPadding(tokenizer),
            compute_metrics=compute_metrics,
        )

        # Run evaluation
        metrics = trainer.evaluate()
        for k, v in metrics.items():
            print(f"{k}: {v:.4f}")
        
        # Save metrics
        save_metrics(cfg, metrics, cfg["paths"]["output_dir"])

    except (OSError, ValueError, RuntimeError) as e:
        print(f"Error during evaluation: {e}")
        raise

if __name__ == "__main__":
    main()
