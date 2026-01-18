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
from pytorch_metric_learning import losses, miners

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
    """Train a model on the GoEmotions dataset."""
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
        output_dir=OUTPUT_DIR / "goemotions",
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="macro_auc",
        greater_is_better=True,
        seed=cfg["training"]["goemotions"]["seed"],
        learning_rate=float(cfg["training"]["goemotions"]["learning_rate"]),
        weight_decay=float(cfg["training"]["goemotions"]["weight_decay"]),
        per_device_train_batch_size=int(cfg["training"]["goemotions"]["train_batch_size"]),
        per_device_eval_batch_size=int(cfg["training"]["goemotions"]["eval_batch_size"]),
        num_train_epochs=int(cfg["training"]["goemotions"]["num_epochs"]),
        warmup_ratio=float(cfg["training"]["goemotions"]["warmup_ratio"]),
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
                early_stopping_patience=int(
                    cfg["training"]["goemotions"]["early_stopping_patience"]
                ),
                early_stopping_threshold=float(
                    cfg["training"]["goemotions"]["early_stopping_threshold"]
                ),
            )
        ],
    )
    trainer.train(resume_from_checkpoint=False)

    # Save encoder only
    base_out = Path(OUTPUT_DIR) / "base_model"
    model.base_model.save_pretrained(base_out)
    tokenizer.save_pretrained(base_out)


# https://github.com/KevinMusgrave/pytorch-metric-learning/issues/669#issuecomment-1763542204
# Custom miner for multi-label data (see the issue for explanation why a custom miner is needed)
class MultiLabelEmotionMiner(miners.BaseMiner):
    def __init__(self, overlap_threshold=0.0, **kwargs):
        super().__init__(**kwargs)
        self.overlap_threshold = overlap_threshold

    def mine(self, embeddings, labels, ref_emb=None, ref_labels=None):
        labels = labels.bool()
        intersection = (labels.unsqueeze(1) & labels.unsqueeze(0)).sum(-1).float()
        union = (labels.unsqueeze(1) | labels.unsqueeze(0)).sum(-1).float()
        jaccard_sim = intersection / (union + 1e-8)

        pos_mask = jaccard_sim > self.overlap_threshold
        neg_mask = jaccard_sim == 0.0

        pos_mask.fill_diagonal_(False)
        neg_mask.fill_diagonal_(False)

        a1, p = torch.where(pos_mask)
        a2, n = torch.where(neg_mask)
        return (a1, p, a2, n)


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

        self.metric_loss = losses.MultiSimilarityLoss(alpha=2, beta=5, base=0.4)
        self.miner = MultiLabelEmotionMiner(overlap_threshold=0.15)

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

        mask = attention_mask.unsqueeze(-1).float()
        pooled = (outputs.last_hidden_state * mask).sum(dim=1) / mask.sum(dim=1)

        emotion_features = F.gelu(self.emotion_projection(pooled))
        intensity_features = F.gelu(self.intensity_projection(pooled))

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
        valid = labels.sum(dim=1) > 0
        embeddings_emotion_valid = embeddings_emotion[valid]
        labels_valid = labels[valid]

        with torch.no_grad():
            pairs = model.miner.mine(embeddings_emotion_valid, labels_valid)

        if pairs is not None and embeddings_emotion_valid.size(0) > 3:
            loss_metric = model.metric_loss(
                embeddings_emotion_valid,
                indices_tuple=pairs,
            )
        else:
            loss_metric = torch.tensor(0.0, device=embeddings_emotion.device)

        w_int = cfg["training"]["lemotif"]["common"]["intensity_loss_weight"]
        w_met = cfg["training"]["lemotif"]["common"]["metric_loss_weight"]

        loss = emotion_loss + w_int * intensity_loss + w_met * loss_metric
        if return_outputs:
            return loss, {
                "logits": logits_emotion,
                "intensity": logits_intensity,
            }
        return loss


def train_lemotif():
    """Train a model on the LemoTif dataset."""
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

    common_cfg = cfg["training"]["lemotif"]["common"]
    frozen_cfg = cfg["training"]["lemotif"]["frozen"]
    unfrozen_cfg = cfg["training"]["lemotif"]["unfrozen"]

    args_frozen = TrainingArguments(
        output_dir=Path(OUTPUT_DIR) / "lemotif_frozen",
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
    pos_weight = (neg_counts / (pos_counts + 1e-5)).clamp(max=2.0)
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
        output_dir=Path(OUTPUT_DIR) / "lemotif",
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
