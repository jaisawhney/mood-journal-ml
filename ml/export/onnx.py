from pathlib import Path
import onnx
from onnxsim import simplify

import torch
from transformers import AutoConfig, AutoTokenizer
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import QuantizationConfig, QuantizationMode

from ml.utils.config import load_config
from ml.training.trainer import EmotionModel


def simplify_onnx(input_onnx: Path, output_onnx: Path):
    model = onnx.load(str(input_onnx))
    model_simp, check = simplify(model)
    if not check:
        raise RuntimeError("Simplified ONNX model failed validation")
    onnx.save(model_simp, str(output_onnx))


def export_onnx_torch(model, tokenizer, onnx_path: Path, max_length=128):
    model.eval()
    dummy = tokenizer(
        ["Example text", "Another example"],
        return_tensors="pt",
        max_length=max_length,
        padding="max_length",
        truncation=True,
    )

    torch.onnx.export(
        model,
        (dummy["input_ids"], dummy["attention_mask"]),
        onnx_path,
        input_names=["input_ids", "attention_mask"],
        output_names=["logits_emotion", "logits_intensity"],
        dynamic_axes={
            "input_ids": {0: "batch", 1: "sequence_length"},
            "attention_mask": {0: "batch", 1: "sequence_length"},
            "logits_emotion": {0: "batch"},
            "logits_intensity": {0: "batch"},
        },
    )


def main():
    cfg = load_config()

    model_path = Path(cfg["paths"]["artifacts_dir"]) / "final_model"
    output_dir = Path("artifacts/models/emotion-model/v1")
    onnx_dir = output_dir / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)

    # Load model and tokenizer
    config = AutoConfig.from_pretrained(model_path)
    model = EmotionModel.from_pretrained(model_path, config=config)
    tokenizer = AutoTokenizer.from_pretrained(model_path)

    # Save metadata
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)

    # Export and simplify
    orig_onnx = output_dir / "model.onnx"
    simplified_onnx = output_dir / "model_simplified.onnx"

    export_onnx_torch(model, tokenizer, orig_onnx)
    simplify_onnx(orig_onnx, simplified_onnx)

    # Quantize
    quantizer = ORTQuantizer.from_pretrained(output_dir, file_name=simplified_onnx.name)
    quant_config = QuantizationConfig(
        is_static=False,
        mode=QuantizationMode.IntegerOps,
        format="QDQ",
        per_channel=True,
        reduce_range=True,
    )
    quantizer.quantize(save_dir=output_dir, quantization_config=quant_config)

    quantized_src = output_dir / f"{simplified_onnx.stem}_quantized.onnx"
    quantized_dst = onnx_dir / "model_quantized.onnx"
    if quantized_src.exists():
        quantized_src.replace(quantized_dst)

    orig_onnx.unlink(missing_ok=True)
    simplified_onnx.unlink(missing_ok=True)

    # Report final size
    quantized_file = onnx_dir / "model_quantized.onnx"
    if quantized_file.exists():
        size_mb = quantized_file.stat().st_size / (1024 * 1024)
        print(f"Quantized ONNX: {quantized_file} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
