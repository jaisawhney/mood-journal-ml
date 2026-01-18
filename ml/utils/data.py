from pathlib import Path
import numpy as np
from datasets import load_dataset, DatasetDict, Sequence, Value
from iterstrat.ml_stratifiers import MultilabelStratifiedShuffleSplit
import torch


def tokenize(batch, tokenizer, max_length):
    """Tokenize a batch of text inputs."""
    return tokenizer(
        batch["text"],
        truncation=True,
        padding=False,
        max_length=max_length,
    )


def build_multi_hot_from_cols(batch, label_cols):
    """Build multi-hot encoded labels from specified columns in the batch."""
    return [[float(batch[col][i]) for col in label_cols] for i in range(len(batch["text"]))]


def load_go_emotions():
    """Load and preprocess the GoEmotions dataset."""
    dataset = load_dataset("google-research-datasets/go_emotions", "simplified")
    label_names = dataset["train"].features["labels"].feature.names
    num_labels = len(label_names)

    def multi_hot_encode(batch):
        multi_hot = torch.zeros(num_labels, dtype=torch.float32)
        multi_hot[batch["labels"]] = 1.0
        batch["labels"] = multi_hot
        return batch

    dataset = dataset.map(multi_hot_encode)
    features = dataset["train"].features.copy()
    features["labels"] = Sequence(Value("float32"), length=num_labels)
    dataset = dataset.cast(features)

    id2label = {i: label for i, label in enumerate(label_names)}
    label2id = {label: i for i, label in enumerate(label_names)}

    return dataset, label_names, id2label, label2id


EMOTION_COLS = [
    "Answer.f1.afraid.raw",
    "Answer.f1.angry.raw",
    "Answer.f1.anxious.raw",
    "Answer.f1.ashamed.raw",
    "Answer.f1.awkward.raw",
    "Answer.f1.bored.raw",
    "Answer.f1.calm.raw",
    "Answer.f1.confused.raw",
    "Answer.f1.disgusted.raw",
    "Answer.f1.excited.raw",
    "Answer.f1.frustrated.raw",
    "Answer.f1.happy.raw",
    "Answer.f1.jealous.raw",
    "Answer.f1.nostalgic.raw",
    "Answer.f1.proud.raw",
    "Answer.f1.sad.raw",
    "Answer.f1.satisfied.raw",
    "Answer.f1.surprised.raw",
]

EMOTION_LABELS = [col.split(".")[2] for col in EMOTION_COLS]


def stratified_split(dataset, test_size: float = 0.15, seed: int = 42):
    """Perform a stratified split of the dataset into train and test sets."""
    labels = np.asarray(dataset["labels"]).astype(np.float32)
    indices = np.arange(len(dataset))

    splitter = MultilabelStratifiedShuffleSplit(n_splits=1, test_size=test_size, random_state=seed)
    train_idx, test_idx = next(splitter.split(indices, labels))

    return dataset.select(train_idx.tolist()), dataset.select(test_idx.tolist())


def load_and_split_lemotif(test_size: float = 0.15, seed: int = 42):
    """Load the Lemotif dataset and split it into train, validation, and test sets."""
    data_path = Path("ml/datasets/lemotif-data-augmented.csv")
    dataset = load_dataset("csv", data_files=str(data_path), split="train").rename_column(
        "Answer", "text"
    )

    dataset = dataset.map(
        lambda batch: {
            "labels": build_multi_hot_from_cols(batch, EMOTION_COLS),
            "intensity": [float(x) for x in batch["intensity"]],
        },
        batched=True,
    )
    dataset = dataset.remove_columns(
        [col for col in dataset.column_names if col not in ["text", "labels", "intensity"]]
    )

    train_ds, test_ds = stratified_split(dataset, test_size=test_size, seed=seed)
    val_size = test_size / (1 - test_size)
    train_ds, val_ds = stratified_split(train_ds, test_size=val_size, seed=seed)

    id2label = {i: name for i, name in enumerate(EMOTION_LABELS)}
    label2id = {name: i for i, name in enumerate(EMOTION_LABELS)}

    return (
        DatasetDict({"train": train_ds, "validation": val_ds, "test": test_ds}),
        EMOTION_LABELS,
        id2label,
        label2id,
    )
