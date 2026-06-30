from pathlib import Path
import onnx
import shutil

from onnxsim import simplify

from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import QuantFormat, QuantizationConfig, QuantizationMode

from setfit import SetFitModel
from setfit.exporters.onnx import export_onnx
from ml.config import load_config

cfg = load_config()


def simplify_onnx(input_onnx: Path, output_onnx: Path):
    """Simplify an ONNX model and save the simplified version."""
    model = onnx.load(str(input_onnx))
    model_simp, check = simplify(model)
    if not check:
        raise RuntimeError("Simplified ONNX model failed validation")
    onnx.save(model_simp, str(output_onnx))


def main():
    shutil.copytree(
        cfg.training.output_dir,
        cfg.export.output_dir,
        dirs_exist_ok=True,
    )

    output_dir = cfg.export.output_dir
    onnx_dir = output_dir / "onnx"
    onnx_dir.mkdir(parents=True, exist_ok=True)

    # Load model and tokenizer
    model = SetFitModel.from_pretrained(
        cfg.export.output_dir, device="cpu", use_differentiable_head=True
    )

    # Export and simplify
    orig_onnx = onnx_dir / "model.onnx"
    simplified_onnx = onnx_dir / "model_simplified.onnx"

    # Make pylance happy
    assert model.model_body is not None
    assert model.model_head is not None

    export_onnx(
        model_body=model.model_body,
        model_head=model.model_head,
        opset=cfg.export.opset,
        output_path=str(orig_onnx),
    )

    simplify_onnx(orig_onnx, simplified_onnx)

    print(simplified_onnx.name)

    # Quantize
    quantizer = ORTQuantizer.from_pretrained(output_dir, file_name="onnx/" + simplified_onnx.name)
    quant_config = QuantizationConfig(
        is_static=False,
        mode=QuantizationMode.IntegerOps,
        format=QuantFormat.QDQ,
        per_channel=True,
        reduce_range=True,
    )
    quantizer.quantize(save_dir=onnx_dir, quantization_config=quant_config)

    quantized_src = onnx_dir / f"{simplified_onnx.stem}_quantized.onnx"
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
