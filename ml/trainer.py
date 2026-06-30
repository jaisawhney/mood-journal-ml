import random
import numpy as np
import torch

from ml.config import load_config
from setfit import SetFitModel, Trainer, TrainingArguments
from ml.data import load_journaling_dataset

cfg = load_config()

torch.manual_seed(cfg.project.seed)
random.seed(cfg.project.seed)
np.random.seed(cfg.project.seed)
torch.manual_seed(cfg.project.seed)
torch.cuda.manual_seed_all(cfg.project.seed)


def train_model():
    dataset, label_names, _, _ = load_journaling_dataset()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = SetFitModel.from_pretrained(
        cfg.model.base,
        multi_target_strategy="one-vs-rest",
        device=device,
        use_differentiable_head=True,
        head_params={"out_features": len(label_names)},
    )

    args = TrainingArguments(
        output_dir=str(cfg.training.output_dir),
        batch_size=(cfg.training.batch_size.embedding, cfg.training.batch_size.classifier),
        num_epochs=(cfg.training.epochs.embedding, cfg.training.epochs.classifier),
        body_learning_rate=cfg.training.body_learning_rate,
        head_learning_rate=cfg.training.head_learning_rate,
        l2_weight=cfg.training.l2_weight,
        sampling_strategy=cfg.training.sampling_strategy,
        end_to_end=True,
        use_amp=torch.cuda.is_available(),
        seed=cfg.project.seed,
        max_length=cfg.training.max_length,
    )

    trainer = Trainer(
        model=model,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        column_mapping={
            "text": "text",
            "labels": "label",
        },
        args=args,
    )

    trainer.train(resume_from_checkpoint=False)
    trainer.model.save_pretrained(cfg.training.output_dir)


if __name__ == "__main__":
    train_model()
