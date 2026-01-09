import os
from pathlib import Path

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from transformers import (
    AutoConfig,
    AutoModel,
    DataCollatorWithPadding,
    AutoTokenizer,
    AutoModelForSequenceClassification,
    EarlyStoppingCallback,
    PreTrainedModel,
    Trainer,
    TrainingArguments,
)
from pytorch_metric_learning.losses import SupConLoss

from ml.utils.config import load_config
from ml.utils.data import load_and_split_lemotif, load_go_emotions, tokenize
from ml.utils.metrics import compute_metrics

cfg = load_config()

MODEL_NAME = cfg["model"]["name"]
OUTPUT_DIR = Path(cfg["paths"]["artifacts_dir"])
MAX_LENGTH = int(cfg["model"]["max_length"])

NUM_PROC = max(1, (os.cpu_count() or 1) // 2)


class SimpleWeightedTrainer(Trainer):
    def __init__(self, *args, **kwargs):
        self.pos_weight = kwargs.pop("pos_weight", None)
        super().__init__(*args, **kwargs)

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.get("labels")
        outputs = model(**inputs)
        logits = outputs.get("logits")
        loss_fct = nn.BCEWithLogitsLoss(pos_weight=self.pos_weight)
        loss = loss_fct(logits, labels.float())
        return (loss, outputs) if return_outputs else loss


def train_go_emotions():
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, use_fast=True)
    dataset, label_names, id2label, label2id = load_go_emotions()

    tokenized = dataset.map(
        lambda x: tokenize(x, tokenizer, MAX_LENGTH),
        batched=True,
        num_proc=NUM_PROC,
    )
    tokenized.set_format("torch")

    model = AutoModelForSequenceClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(label_names),
        problem_type="multi_label_classification",
        id2label=id2label,
        label2id=label2id,
    )

    args = TrainingArguments(
        output_dir=OUTPUT_DIR / "pretrain",
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_auc",
        greater_is_better=True,
        seed=cfg["training"]["pretrain"]["seed"],
        learning_rate=float(cfg["training"]["pretrain"]["learning_rate"]),
        weight_decay=float(cfg["training"]["pretrain"]["weight_decay"]),
        per_device_train_batch_size=int(cfg["training"]["pretrain"]["train_batch_size"]),
        per_device_eval_batch_size=int(cfg["training"]["pretrain"]["eval_batch_size"]),
        num_train_epochs=int(cfg["training"]["pretrain"]["num_epochs"]),
        warmup_ratio=float(cfg["training"]["pretrain"]["warmup_ratio"]),
        report_to="none",
        bf16=getattr(torch.cuda, "is_bf16_supported", lambda: False)(),
        fp16=False,
    )
    labels = torch.from_numpy(np.asarray(tokenized["train"]["labels"])).float()
    pos_counts = labels.sum(dim=0)
    neg_counts = labels.shape[0] - pos_counts
    pos_weight = (neg_counts / (pos_counts + 1e-5)).clamp(max=50.0)
    trainer = SimpleWeightedTrainer(
        model=model,
        args=args,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
        pos_weight=pos_weight.to(args.device),
        callbacks=[
            EarlyStoppingCallback(
                early_stopping_patience=int(cfg["training"]["pretrain"]["early_stopping_patience"]),
                early_stopping_threshold=float(
                    cfg["training"]["pretrain"]["early_stopping_threshold"]
                ),
            )
        ],
    )
    trainer.train(resume_from_checkpoint=False)

    # Save encoder only
    base_out = Path(OUTPUT_DIR) / "base_model"
    model.base_model.save_pretrained(base_out)
    tokenizer.save_pretrained(base_out)


class EmotionModel(PreTrainedModel):
    config_class = AutoConfig

    def __init__(self, config, neutral_baseline_logits=None, intensity_prior=None):
        super().__init__(config)

        self.encoder = AutoModel.from_config(config)
        hidden = self.encoder.config.hidden_size

        self.emotion_projection = nn.Linear(hidden, hidden)
        self.emotion_head = nn.Linear(hidden, config.num_labels)
        if neutral_baseline_logits is not None:
            with torch.no_grad():
                self.emotion_head.bias.copy_(neutral_baseline_logits)

        self.intensity_projection = nn.Linear(hidden, hidden)
        self.intensity_head = nn.Linear(hidden, 1)
        if intensity_prior is not None:
            with torch.no_grad():
                self.intensity_head.bias.fill_(intensity_prior)

        self.metric_loss = SupConLoss()

    def forward(
        self,
        input_ids=None,
        attention_mask=None,
        labels=None,
        intensity=None,
        return_embeddings: bool = False,
        **kwargs,
    ):
        outputs = self.encoder(
            input_ids=input_ids,
            attention_mask=attention_mask,
        )

        pooled = outputs.last_hidden_state[:, 0]

        emotion_features = F.gelu(self.emotion_projection(pooled))
        intensity_features = F.gelu(self.intensity_projection(pooled.detach()))

        logits_emotion = self.emotion_head(emotion_features)
        logits_intensity = self.intensity_head(intensity_features)

        if return_embeddings:
            return logits_emotion, logits_intensity, emotion_features, intensity_features
        return logits_emotion, logits_intensity


class MultiLabelTrainer(Trainer):
    def __init__(self, *args, **kwargs):
        self.pos_weight = kwargs.pop("pos_weight", None)
        super().__init__(*args, **kwargs)

    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels = inputs.pop("labels").float()
        intensity_target = inputs.pop("intensity").float().unsqueeze(1)

        logits_emotion, logits_intensity, emotion_features, _ = model(
            **inputs, return_embeddings=True
        )
        embeddings_emotion = F.normalize(emotion_features, dim=1)

        emotion_loss = F.binary_cross_entropy_with_logits(
            logits_emotion,
            labels,
            pos_weight=self.pos_weight,
            reduction="mean",
        )

        is_neutral_mask = (labels.sum(dim=1) == 0).bool()

        emotion_conf = torch.sigmoid(logits_emotion).amax(dim=1).detach()
        neutral_like = is_neutral_mask | (emotion_conf < 0.05)

        non_neutral_like = ~neutral_like
        if non_neutral_like.any():
            non_neutral_loss = F.l1_loss(
                logits_intensity[non_neutral_like], intensity_target[non_neutral_like]
            )
        else:
            non_neutral_loss = torch.tensor(0.0, device=logits_intensity.device)

        if neutral_like.any():
            neutral_loss = torch.clamp(logits_intensity[neutral_like].abs() - 0.05, min=0.0).mean()
        else:
            neutral_loss = torch.tensor(0.0, device=logits_intensity.device)

        intensity_loss = non_neutral_loss + neutral_loss * 3.0

        # https://github.com/KevinMusgrave/pytorch-metric-learning/issues/178#issuecomment-675611566
        # Prepare indices tuple for metric loss following the GitHub issue above (no native support for multi-label)
        with torch.no_grad():
            non_neutral_mask = ~is_neutral_mask
            label_sum = labels.sum(dim=1)

            # pairwise overlap ratio
            shared = labels @ labels.t()
            denom = torch.minimum(
                label_sum.unsqueeze(1),
                label_sum.unsqueeze(0),
            )
            overlap_ratio = shared / (denom + 1e-6)

            non_neutral_pair = non_neutral_mask.unsqueeze(1) & non_neutral_mask.unsqueeze(0)
            mixed_pair = is_neutral_mask.unsqueeze(1) ^ is_neutral_mask.unsqueeze(0)

            pos_mask = (overlap_ratio >= 0.5) & non_neutral_pair
            neg_mask = ((overlap_ratio < 0.2) & non_neutral_pair) | mixed_pair
            pos_mask.fill_diagonal_(False)
            neg_mask.fill_diagonal_(False)

            pos_i, pos_j = pos_mask.nonzero(as_tuple=True)
            neg_i, neg_j = neg_mask.nonzero(as_tuple=True)

            indices_tuple = (pos_i, pos_j, neg_i, neg_j)
        loss_metric = model.metric_loss(
            embeddings_emotion,
            indices_tuple=indices_tuple,
        )
        w_int = cfg["training"]["fine_tune"]["common"]["intensity_loss_weight"]
        w_met = cfg["training"]["fine_tune"]["common"]["metric_loss_weight"]

        loss = emotion_loss + w_int * intensity_loss + w_met * loss_metric
        if return_outputs:
            return loss, {
                "logits": logits_emotion,
                "intensity": logits_intensity,
            }
        return loss


def train_lemotif():
    base_model_dir = Path(OUTPUT_DIR) / "base_model"
    tokenizer = AutoTokenizer.from_pretrained(base_model_dir, use_fast=True)
    dataset, label_names, id2label, label2id = load_and_split_lemotif()
    tokenized = dataset.map(
        lambda x: tokenize(x, tokenizer, MAX_LENGTH),
        batched=True,
        num_proc=NUM_PROC,
        remove_columns=["text"],
    )
    tokenized.set_format("torch")

    config = AutoConfig.from_pretrained(
        base_model_dir,
        num_labels=len(label_names),
        id2label=id2label,
        label2id=label2id,
    )

    labels = torch.from_numpy(np.asarray(tokenized["train"]["labels"])).float()
    priors = labels.mean(dim=0)
    neutral_baseline_logits = torch.log(priors / (1 - priors + 1e-5))

    all_intensities = torch.as_tensor(tokenized["train"]["intensity"], dtype=torch.float32)
    intensity_median = all_intensities.median()

    model = EmotionModel(
        config,
        neutral_baseline_logits=neutral_baseline_logits.cpu(),
        intensity_prior=float(intensity_median),
    )

    common_cfg = cfg["training"]["fine_tune"]["common"]
    frozen_cfg = cfg["training"]["fine_tune"]["frozen"]
    unfrozen_cfg = cfg["training"]["fine_tune"]["unfrozen"]

    args_frozen = TrainingArguments(
        output_dir=Path(OUTPUT_DIR) / "fine_tune_frozen",
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_auc",
        greater_is_better=True,
        seed=int(common_cfg["seed"]),
        learning_rate=float(frozen_cfg["learning_rate"]),
        weight_decay=float(common_cfg["weight_decay"]),
        per_device_train_batch_size=int(common_cfg["train_batch_size"]),
        per_device_eval_batch_size=int(common_cfg["eval_batch_size"]),
        num_train_epochs=int(frozen_cfg["num_epochs"]),
        lr_scheduler_type=frozen_cfg["lr_scheduler_type"],
        warmup_ratio=float(frozen_cfg["warmup_ratio"]),
        gradient_accumulation_steps=int(common_cfg["gradient_accumulation_steps"]),
        label_names=["labels", "intensity"],
        report_to="none",
        bf16=getattr(torch.cuda, "is_bf16_supported", lambda: False)(),
        fp16=False,
    )

    pos_counts = labels.sum(dim=0)
    neg_counts = labels.shape[0] - pos_counts
    pos_weight = (neg_counts / (pos_counts + 1e-5)).clamp(max=50.0)
    pos_weight_frozen = pos_weight.to(args_frozen.device)

    trainer_frozen = MultiLabelTrainer(
        model=model,
        args=args_frozen,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
        pos_weight=pos_weight_frozen,
        callbacks=[
            EarlyStoppingCallback(
                early_stopping_patience=int(frozen_cfg["early_stopping_patience"]),
                early_stopping_threshold=float(frozen_cfg["early_stopping_threshold"]),
            ),
        ],
    )

    for param in model.encoder.parameters():
        param.requires_grad = False
    trainer_frozen.train(resume_from_checkpoint=False)

    for param in model.encoder.parameters():
        param.requires_grad = True

    args_unfrozen = TrainingArguments(
        output_dir=Path(OUTPUT_DIR) / "fine_tune",
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_auc",
        greater_is_better=True,
        seed=int(common_cfg["seed"]),
        learning_rate=float(unfrozen_cfg["learning_rate"]),
        weight_decay=float(common_cfg["weight_decay"]),
        per_device_train_batch_size=int(common_cfg["train_batch_size"]),
        per_device_eval_batch_size=int(common_cfg["eval_batch_size"]),
        num_train_epochs=int(unfrozen_cfg["num_epochs"]),
        warmup_ratio=float(unfrozen_cfg["warmup_ratio"]),
        gradient_accumulation_steps=int(common_cfg["gradient_accumulation_steps"]),
        label_names=["labels", "intensity"],
        report_to="none",
        bf16=getattr(torch.cuda, "is_bf16_supported", lambda: False)(),
        fp16=False,
        lr_scheduler_type=unfrozen_cfg["lr_scheduler_type"],
        max_grad_norm=float(unfrozen_cfg["max_grad_norm"]),
    )

    pos_weight_unfrozen = pos_weight.to(args_unfrozen.device)

    trainer_unfrozen = MultiLabelTrainer(
        model=model,
        args=args_unfrozen,
        train_dataset=tokenized["train"],
        eval_dataset=tokenized["validation"],
        data_collator=DataCollatorWithPadding(tokenizer),
        compute_metrics=compute_metrics,
        pos_weight=pos_weight_unfrozen,
        callbacks=[
            EarlyStoppingCallback(
                early_stopping_patience=int(unfrozen_cfg["early_stopping_patience"]),
                early_stopping_threshold=float(unfrozen_cfg["early_stopping_threshold"]),
            ),
        ],
    )

    trainer_unfrozen.train(resume_from_checkpoint=False)
    trainer_unfrozen.save_model(Path(OUTPUT_DIR) / "final_model")
    tokenizer.save_pretrained(Path(OUTPUT_DIR) / "final_model")


if __name__ == "__main__":
    train_go_emotions()
    train_lemotif()
