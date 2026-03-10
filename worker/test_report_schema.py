import sys

from main import (
    Config,
    add_report_metadata,
    build_report,
    merge_presence_into_heuristic,
    validate_report,
)


def test_heuristic_report() -> bool:
    """Heuristic report passes validation."""
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
    validate_report(report, cfg)
    return True


def test_heuristic_only_final_report_with_metadata() -> bool:
    """Final report with analysis_mode=standard, ai_used=false passes validation."""
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
    final = add_report_metadata(report, cfg, "standard", False, False)
    validate_report(final, cfg)
    assert final.get("analysis_mode") == "standard"
    assert final.get("ai_used") is False
    assert final.get("transcript_used") is False
    return True


def test_hybrid_final_report_metadata() -> bool:
    """Merged report with analysis_mode=hybrid, ai_used=true passes validation."""
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
    heuristic = build_report(cfg, metrics, ffprobe_data, metrics["audioRms"])
    ai_report = dict(heuristic)
    ai_report["presence"] = {"highlights": ["AI presence feedback"], "improvements": []}
    merged = merge_presence_into_heuristic(heuristic, ai_report)
    final = add_report_metadata(merged, cfg, "hybrid", True, False)
    validate_report(final, cfg)
    assert final.get("analysis_mode") == "hybrid"
    assert final.get("ai_used") is True
    assert final.get("transcript_used") is False
    assert final.get("presence", {}).get("highlights") == ["AI presence feedback"]
    return True


def main() -> int:
    tests = [
        ("heuristic report", test_heuristic_report),
        ("heuristic-only final report with metadata", test_heuristic_only_final_report_with_metadata),
        ("hybrid final report metadata", test_hybrid_final_report_metadata),
    ]
    for name, fn in tests:
        try:
            fn()
            print(f"PASS: {name}")
        except Exception as exc:
            print(f"FAIL: {name} - {exc}", file=sys.stderr)
            return 1
    print("All report schema tests passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

