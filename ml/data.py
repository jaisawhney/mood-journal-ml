from datasets import load_dataset, DatasetDict
from datasets import ClassLabel


def cast_emotion_to_classlabel(dataset_dict: DatasetDict) -> DatasetDict:
    emotions = sorted(set(dataset_dict["train"]["emotion"]))
    class_label = ClassLabel(names=emotions)

    return DatasetDict(
        {split: ds.cast_column("emotion", class_label) for split, ds in dataset_dict.items()}
    )


def tokenize(batch, tokenizer, max_length):
    return tokenizer(
        batch["situation"],
        truncation=True,
        padding=False,
        max_length=max_length,
    )


def load_and_prepare_dataset():
    dataset = load_dataset("bdotloh/empathetic-dialogues-contexts")
    dataset = cast_emotion_to_classlabel(dataset)
    dataset = dataset.rename_column("emotion", "labels")

    label_names = dataset["train"].features["labels"].names
    id2label = {i: label for i, label in enumerate(label_names)}
    label2id = {label: i for i, label in enumerate(label_names)}
    return dataset, label_names, id2label, label2id
