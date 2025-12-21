import os
import torch

from datasets import load_dataset
from transformers import (
    DataCollatorWithPadding,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    Trainer,
    TrainingArguments,
)
from sklearn.metrics import f1_score

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
    }

def main():
    try:
        # Load configuration
        cfg = load_config()

        model_name = cfg["model"]["name"]
        output_dir = cfg["paths"]["output_dir"]

        # Load Dataset
        dataset = load_dataset("dair-ai/emotion")
        
        label_names = dataset["train"].features["label"].names
        num_labels = len(label_names)
        
        # Tokenization
        tokenizer = AutoTokenizer.from_pretrained(model_name, use_fast=True)
        num_proc = max(1, (os.cpu_count() or 1) // 2)
        tokenized = dataset.map(
            lambda x: tokenize(x, tokenizer, int(cfg["model"]["max_length"])),
            batched=True,
            remove_columns=["text"],
            num_proc=num_proc
        )
        tokenized.set_format("torch")

        # Model Initialization
        id2label = {i: label for i, label in enumerate(label_names)}
        label2id = {label: i for i, label in enumerate(label_names)}

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

            logging_dir=f"{output_dir}/logs",
            report_to="none",
            
            fp16=torch.cuda.is_available(),
        )
        
        # Trainer Setup
        data_collator = DataCollatorWithPadding(tokenizer=tokenizer)
        trainer = Trainer(
            model=model,
            args=training_args,
            train_dataset=tokenized["train"],
            eval_dataset=tokenized["validation"],
            data_collator=data_collator,
            compute_metrics=compute_metrics,
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