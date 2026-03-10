import sys

from main import Config, build_report, validate_report


def main() -> int:
    cfg = Config(
        job_id="test-job",
        raw_bucket="raw-bucket",
        raw_key="raw/test-job/input.mp4",
        derived_bucket="derived-bucket",
        mode="full",
        tier="free",
    )

    metrics = {
        "duration": 30.0,
        "fps": 30.0,
        "resolution": {"width": 1920, "height": 1080},
        "hasAudio": True,
        "audioRms": 1500.0,
        "frameCountExtracted": 5,
        "tier": cfg.tier,
        "mode": cfg.mode,
    }

    ffprobe_data = {}
    report = build_report(cfg, metrics, ffprobe_data, metrics["audioRms"])

    try:
        validate_report(report, cfg)
    except Exception as exc:  # pragma: no cover - simple smoke test
        print(f"Report validation failed: {exc}", file=sys.stderr)
        return 1

    print("Report validation succeeded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

