from pathlib import Path
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForSequenceClassification, ORTQuantizer
from optimum.onnxruntime.configuration import (
    QuantizationConfig,
    QuantizationMode,
)
from ml.config import load_config


def move_onnx_files(src: Path, dst: Path):
    dst.mkdir(parents=True, exist_ok=True)
    for p in src.glob("*.onnx"):
        p.rename(dst / p.name)


def main():
    cfg = load_config()

    model_path = Path(cfg["paths"]["output_dir"])
    base_url = Path("artifacts/models/emotion-model/v1")
    onnx_dir = base_url / "onnx"

    # Export base ONNX
    model = ORTModelForSequenceClassification.from_pretrained(model_path, export=True)
    tokenizer = AutoTokenizer.from_pretrained(model_path)

    model.save_pretrained(base_url)
    tokenizer.save_pretrained(base_url)

    # Optimize (couldn't get quantize to work on the optimized model)
    # optimizer = ORTOptimizer.from_pretrained(base_url)
    # optimization_config = OptimizationConfig(
    #    optimization_level=2,
    #    enable_transformers_specific_optimizations=True,
    # )

    # optimizer.optimize(save_dir=base_url, optimization_config=optimization_config)

    # Quantize model
    quantizer = ORTQuantizer.from_pretrained(
        base_url,
        file_name="model.onnx",
    )

    quantization_config = QuantizationConfig(
        is_static=False,
        mode=QuantizationMode.IntegerOps,
        format="QOperator",
        per_channel=True,
        reduce_range=True,
    )

    quantizer.quantize(
        save_dir=base_url,
        quantization_config=quantization_config,
    )
    move_onnx_files(base_url, onnx_dir)

    # Print model sizes
    quantized_model = onnx_dir / "model_quantized.onnx"
    if quantized_model.exists():
        print(f"ONNX model saved to {onnx_dir}")
        size_mb = quantized_model.stat().st_size / (1024 * 1024)
        print(f"Quantized model size: {size_mb:.1f} MB")


if __name__ == "__main__":
    main()
