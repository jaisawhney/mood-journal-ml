from pathlib import Path
import json
import torch
import torch.nn as nn
import torch.optim as optim

from transformers import AutoTokenizer, AutoConfig, DataCollatorWithPadding
from torch.utils.data import DataLoader

from ml.utils.config import load_config
from ml.utils.data import load_and_split_lemotif, tokenize
from ml.training.trainer import EmotionModel


def fit_per_label_temperature(logits, labels, max_iter=100):
    device = logits.device
    logits = logits.float().to(device)
    labels = labels.float().to(device)

    log_T = nn.Parameter(torch.zeros(logits.shape[1], device=device))
    optimizer = optim.LBFGS([log_T], lr=0.1, max_iter=max_iter, line_search_fn="strong_wolfe")

    def closure():
        optimizer.zero_grad()
        T = torch.exp(log_T).clamp(min=1e-3)
        scaled_logits = logits / T
        loss = nn.BCEWithLogitsLoss()(scaled_logits, labels)
        loss.backward()
        return loss

    optimizer.step(closure)
    return torch.exp(log_T).detach().cpu()


def main():
    cfg = load_config()
    dataset, label_names, id2label, label2id = load_and_split_lemotif()

    model_dir = Path(cfg["paths"]["artifacts_dir"]) / "final_model"
    tokenizer = AutoTokenizer.from_pretrained(model_dir, use_fast=True)

    config = AutoConfig.from_pretrained(
        model_dir, num_labels=len(label_names), id2label=id2label, label2id=label2id
    )
    model = EmotionModel.from_pretrained(model_dir, config=config)
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.to(device)

    tokenized_val = dataset["validation"].map(
        lambda x: tokenize(x, tokenizer, int(cfg["model"]["max_length"])),
        batched=True,
        num_proc=1,
        remove_columns=["text"],
    )
    tokenized_val.set_format("torch")

    dataloader = DataLoader(
        tokenized_val,
        batch_size=int(cfg["evaluation"]["eval_batch_size"]),
        collate_fn=DataCollatorWithPadding(tokenizer),
    )

    all_logits, all_labels = [], []
    model.eval()
    with torch.no_grad():
        for batch in dataloader:
            labels = batch.pop("labels")
            batch = {k: v.to(device) for k, v in batch.items()}
            logits_emotion, _ = model(**batch)
            all_logits.append(logits_emotion.cpu())
            all_labels.append(labels.cpu())

    logits = torch.cat(all_logits)
    labels = torch.cat(all_labels)

    temperature = {
        "temperature": fit_per_label_temperature(logits, labels).tolist(),
        "label_order": label_names,
    }
    output_path = model_dir / "temperature.json"
    with open(output_path, "w") as f:
        json.dump(temperature, f, indent=2)
    print(f"Temperature scaling saved to {output_path}")


if __name__ == "__main__":
    main()
