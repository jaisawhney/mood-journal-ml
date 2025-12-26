import os
import numpy as np
import torch

from transformers import (
    DataCollatorWithPadding,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    EarlyStoppingCallback,
    Trainer,
    TrainingArguments,
)
from sklearn.metrics import f1_score, accuracy_score
from ml.config import load_config
from ml.data import load_and_prepare_dataset, tokenize


def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = logits.argmax(axis=-1)

    return {
        "macro_f1": f1_score(labels, predictions, average="macro"),
        "accuracy": accuracy_score(labels, predictions),
    }


class WeightedTrainer(Trainer):
    # Override for class weights
    def __init__(self, *args, class_weights=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.class_weights = class_weights

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.get("labels")

        outputs = model(**inputs)
        logits = outputs.logits

        # If no labels or class weights, use default loss
        if labels is None or self.class_weights is None:
            loss = outputs.loss
            return (loss, outputs) if return_outputs else loss

        label_smoothing = getattr(self.args, "label_smoothing_factor", 0.0)

        # Custom weighted cross-entropy loss
        loss_fct = torch.nn.CrossEntropyLoss(
            weight=self.class_weights.to(logits.device),
            label_smoothing=label_smoothing,
        )
        loss = loss_fct(
            logits.view(-1, logits.size(-1)),
            labels.view(-1),
        )

        return (loss, outputs) if return_outputs else loss


def main():
    try:
        num_proc = max(1, (os.cpu_count() or 1) // 2)

        # Load configuration
        cfg = load_config()

        model_name = cfg["model"]["name"]
        output_dir = cfg["paths"]["output_dir"]

        # Load Dataset
        dataset, label_names, id2label, label2id = load_and_prepare_dataset()
        num_labels = len(label_names)

        # Tokenization
        tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
        tokenized = dataset.map(
            lambda x: tokenize(x, tokenizer, int(cfg["model"]["max_length"])),
            batched=True,
            remove_columns=["situation", "Unnamed: 0"],
            num_proc=num_proc,
        )

        tokenized.set_format("torch")
        # Model Initialization
        model = AutoModelForSequenceClassification.from_pretrained(
            model_name,
            num_labels=num_labels,
            id2label=id2label,
            label2id=label2id,
        )

        # Training Arguments
        training_args = TrainingArguments(
            output_dir=output_dir,
            eval_strategy="epoch",
            save_strategy="epoch",
            load_best_model_at_end=True,
            metric_for_best_model="macro_f1",
            greater_is_better=True,
            seed=42,
            learning_rate=float(cfg["training"]["learning_rate"]),
            weight_decay=float(cfg["training"]["weight_decay"]),
            per_device_train_batch_size=int(cfg["training"]["train_batch_size"]),
            per_device_eval_batch_size=int(cfg["training"]["eval_batch_size"]),
            num_train_epochs=int(cfg["training"]["num_epochs"]),
            warmup_ratio=float(cfg["training"].get("warmup_ratio", 0.1)),
            label_smoothing_factor=float(cfg["training"].get("label_smoothing_factor", 0.0)),
            logging_dir=f"{output_dir}/logs",
            report_to="none",
            dataloader_num_workers=num_proc,
            dataloader_pin_memory=True,
            bf16=getattr(torch.cuda, "is_bf16_supported", lambda: False)(),
            fp16=False,
        )

        train_cols = tokenized["train"].column_names
        label_col = "labels" if "labels" in train_cols else "label"
        y_train = np.array(tokenized["train"][label_col])

        # Compute Class Weights
        counts = np.bincount(y_train, minlength=num_labels).astype(np.float32)
        class_weights_np = (counts.mean() / counts) ** 0.5
        class_weights_np = class_weights_np / class_weights_np.mean()

        class_weights = torch.tensor(class_weights_np)

        # Trainer Setup
        data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
        trainer = WeightedTrainer(
            model=model,
            args=training_args,
            train_dataset=tokenized["train"],
            eval_dataset=tokenized["validation"],
            data_collator=data_collator,
            compute_metrics=compute_metrics,
            callbacks=[
                EarlyStoppingCallback(
                    early_stopping_patience=2,
                    early_stopping_threshold=0.0,
                )
            ],
            class_weights=class_weights,
        )
        # Training
        trainer.train()

        # Save Model and Tokenizer
        trainer.save_model(output_dir)
        tokenizer.save_pretrained(output_dir)

        print(f"Saved to {output_dir}")
        print(f"Labels: {label_names}")
    except (OSError, ValueError, RuntimeError) as e:
        print(f"Error during training: {e}")
        raise


if __name__ == "__main__":
    main()
