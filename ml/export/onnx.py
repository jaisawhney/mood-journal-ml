from pathlib import Path
from transformers import AutoTokenizer
from optimum.onnxruntime import ORTModelForSequenceClassification, ORTOptimizer, ORTQuantizer
from optimum.onnxruntime.configuration import (
    OptimizationConfig,
    QuantizationConfig,
    QuantizationMode,
)
from ml.config import load_config

cfg = load_config()

model_path = Path(cfg["paths"]["output_dir"])
onnx_dir = model_path / "onnx"

# Export base ONNX
ort_model = ORTModelForSequenceClassification.from_pretrained(model_path, export=True)
ort_model.save_pretrained(onnx_dir)
AutoTokenizer.from_pretrained(model_path).save_pretrained(onnx_dir)

# Optimize
optimizer = ORTOptimizer.from_pretrained(onnx_dir)
optimization_config = OptimizationConfig(
    optimization_level=2,
    enable_transformers_specific_optimizations=True,
)

optimizer.optimize(save_dir=onnx_dir, optimization_config=optimization_config)

# Quantize unoptimized model
quantizer = ORTQuantizer.from_pretrained(onnx_dir, file_name="model.onnx")

quantization_config = QuantizationConfig(
    is_static=False,
    mode=QuantizationMode.IntegerOps,
    format="QOperator",
    per_channel=True,
    reduce_range=True,
)

quantizer.quantize(save_dir=onnx_dir, quantization_config=quantization_config)

# Print model sizes
quantized_model = onnx_dir / "model_quantized.onnx"
if quantized_model.exists():
    print(f"ONNX model saved to {onnx_dir}")
    size_mb = quantized_model.stat().st_size / (1024 * 1024)
    print(f"Quantized model size: {size_mb:.1f} MB")
