from datasets import load_dataset
from ml.config import load_config

cfg = load_config()


def build_multi_hot_from_cols(batch, label_cols):
    """Build multi-hot encoded labels from specified columns in the batch."""
    return [[float(batch[col][i]) for col in label_cols] for i in range(len(batch["text"]))]


EMOTION_COLS = [f"Answer.f1.{label}.raw" for label in cfg.model.labels]


def load_journaling_dataset():
    """Load the journaling dataset train/validation/test splits."""

    train_path = cfg.dataset.train
    val_path = cfg.dataset.validation
    test_path = cfg.dataset.test

    dataset = load_dataset(
        "csv",
        data_files={
            "train": str(train_path),
            "validation": str(val_path),
            "test": str(test_path),
        },
    )
    dataset = dataset.rename_column("Answer", "text")

    dataset = dataset.map(
        lambda batch: {
            "labels": build_multi_hot_from_cols(batch, EMOTION_COLS),
        },
        batched=True,
    )

    cols_to_remove = [col for col in dataset["train"].column_names if col not in ["text", "labels"]]

    dataset = dataset.remove_columns(cols_to_remove)

    id2label = {i: name for i, name in enumerate(cfg.model.labels)}
    label2id = {name: i for i, name in enumerate(cfg.model.labels)}

    return (
        dataset,
        cfg.model.labels,
        id2label,
        label2id,
    )
