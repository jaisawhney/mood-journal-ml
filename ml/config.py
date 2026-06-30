from pathlib import Path
from pydantic import BaseModel, field_validator

import yaml

CONFIG_PATH = Path(__file__).resolve().parent / "config.yaml"
PROJECT_ROOT = Path(__file__).resolve().parent.parent


class DatasetConfig(BaseModel):
    train: Path
    validation: Path
    test: Path

    @field_validator("train", "validation", "test", mode="before")
    @classmethod
    def resolve_path(cls, v):
        return (PROJECT_ROOT / v).resolve()


class ModelConfig(BaseModel):
    base: str
    version: str
    labels: list[str]


class BatchSizeConfig(BaseModel):
    embedding: int
    classifier: int


class EpochConfig(BaseModel):
    embedding: int
    classifier: int


class TrainingConfig(BaseModel):
    output_dir: Path

    batch_size: BatchSizeConfig
    epochs: EpochConfig

    body_learning_rate: float
    head_learning_rate: float
    l2_weight: float

    sampling_strategy: str
    max_length: int

    @field_validator("output_dir", mode="before")
    @classmethod
    def resolve_path(cls, v):
        return (PROJECT_ROOT / v).resolve()


class InferenceConfig(BaseModel):
    tau: float


class EvaluationConfig(BaseModel):
    threshold_file: Path
    temperature_file: Path

    @field_validator("threshold_file", "temperature_file", mode="before")
    @classmethod
    def resolve_path(cls, v):
        return (PROJECT_ROOT / v).resolve()


class ExportConfig(BaseModel):
    output_dir: Path
    opset: int

    @field_validator("output_dir", mode="before")
    @classmethod
    def resolve_path(cls, v):
        return (PROJECT_ROOT / v).resolve()


class ProjectConfig(BaseModel):
    seed: int


class Config(BaseModel):
    project: ProjectConfig
    dataset: DatasetConfig
    model: ModelConfig
    training: TrainingConfig
    inference: InferenceConfig
    evaluation: EvaluationConfig
    export: ExportConfig


def load_config() -> Config:
    with CONFIG_PATH.open() as f:
        return Config.model_validate(yaml.safe_load(f))
