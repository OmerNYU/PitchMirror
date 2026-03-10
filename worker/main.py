import json
import logging
import math
import os
import subprocess
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import wave
import audioop

import boto3
from botocore.exceptions import BotoCoreError, ClientError


LOG = logging.getLogger("worker")


@dataclass
class Config:
    job_id: str
    raw_bucket: str
    raw_key: str
    derived_bucket: str
    mode: str
    tier: str


ALLOWED_MODES = {"voice", "presence", "full"}
ALLOWED_TIERS = {"free", "pro", "max"}

DURATION_CAPS_SECONDS = {
    "free": 45.0,
    "pro": 120.0,
    "max": 300.0,
}

INPUT_PATH = "/tmp/input.mp4"
FFPROBE_JSON_PATH = "/tmp/ffprobe.json"
AUDIO_PATH = "/tmp/audio.wav"
METRICS_PATH = "/tmp/metrics.json"
REPORT_PATH = "/tmp/report.json"


def setup_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%SZ"
    )
    handler.setFormatter(formatter)
    LOG.addHandler(handler)
    LOG.setLevel(logging.INFO)


def log_event(event: str, **kwargs) -> None:
    payload = {"event": event, **kwargs}
    LOG.info(json.dumps(payload, default=str))


def load_config() -> Config:
    job_id = os.environ.get("JOB_ID", "").strip()
    raw_bucket = os.environ.get("RAW_BUCKET", "").strip()
    raw_key = os.environ.get("RAW_KEY", "").strip()
    derived_bucket = os.environ.get("DERIVED_BUCKET", "").strip()
    mode = os.environ.get("MODE", "").strip()
    tier = os.environ.get("TIER", "").strip()

    missing = [
        name
        for name, value in [
            ("JOB_ID", job_id),
            ("RAW_BUCKET", raw_bucket),
            ("RAW_KEY", raw_key),
            ("DERIVED_BUCKET", derived_bucket),
            ("MODE", mode),
            ("TIER", tier),
        ]
        if not value
    ]
    if missing:
        raise ValueError(f"Missing required env vars: {', '.join(missing)}")

    if mode not in ALLOWED_MODES:
        raise ValueError(f"Invalid MODE '{mode}', expected one of {sorted(ALLOWED_MODES)}")

    if tier not in ALLOWED_TIERS:
        raise ValueError(f"Invalid TIER '{tier}', expected one of {sorted(ALLOWED_TIERS)}")

    return Config(
        job_id=job_id,
        raw_bucket=raw_bucket,
        raw_key=raw_key,
        derived_bucket=derived_bucket,
        mode=mode,
        tier=tier,
    )


def init_s3_client():
    return boto3.client("s3")


def head_input_object(s3, cfg: Config) -> Dict:
    try:
        res = s3.head_object(Bucket=cfg.raw_bucket, Key=cfg.raw_key)
        size = res.get("ContentLength")
        content_type = res.get("ContentType")
        log_event(
            "head_object",
            jobId=cfg.job_id,
            mode=cfg.mode,
            tier=cfg.tier,
            rawBucket=cfg.raw_bucket,
            rawKey=cfg.raw_key,
            rawSizeBytes=size,
            rawContentType=content_type,
        )
        return res
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(f"Failed to head input object: {exc}") from exc


def download_input(s3, cfg: Config) -> None:
    os.makedirs(os.path.dirname(INPUT_PATH), exist_ok=True)
    log_event("download_start", jobId=cfg.job_id, mode=cfg.mode, tier=cfg.tier)
    try:
        with open(INPUT_PATH, "wb") as f:
            s3.download_fileobj(cfg.raw_bucket, cfg.raw_key, f)
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(f"Failed to download input object: {exc}") from exc
    log_event("download_complete", jobId=cfg.job_id, mode=cfg.mode, tier=cfg.tier, inputPath=INPUT_PATH)


def run_ffprobe(input_path: str) -> Dict:
    cmd = [
        "ffprobe",
        "-v",
        "error",
        "-show_streams",
        "-show_format",
        "-print_format",
        "json",
        input_path,
    ]
    log_event("ffprobe_start", inputPath=input_path)
    try:
        result = subprocess.run(
            cmd,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
    except subprocess.CalledProcessError as exc:
        # Capture and log stderr explicitly, but avoid giant payloads.
        stderr_snippet = (exc.stderr or "").strip()
        if len(stderr_snippet) > 4000:
            stderr_snippet = stderr_snippet[:4000] + "...(truncated)"
        log_event(
            "ffprobe_failed",
            inputPath=input_path,
            stderr=stderr_snippet,
        )
        raise RuntimeError("ffprobe failed") from exc

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"ffprobe produced invalid JSON: {exc}") from exc

    with open(FFPROBE_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    log_event("ffprobe_complete", ffprobePath=FFPROBE_JSON_PATH)
    return data


def parse_media_info(ffprobe_data: Dict) -> Tuple[float, float, Dict[str, int], bool]:
    duration = None
    fmt = ffprobe_data.get("format") or {}
    if "duration" in fmt:
        try:
            duration = float(fmt["duration"])
        except (TypeError, ValueError):
            duration = None

    video_stream = None
    audio_stream = None
    for stream in ffprobe_data.get("streams", []):
        if stream.get("codec_type") == "video" and video_stream is None:
            video_stream = stream
        if stream.get("codec_type") == "audio" and audio_stream is None:
            audio_stream = stream

    if duration is None and video_stream is not None and "duration" in video_stream:
        try:
            duration = float(video_stream["duration"])
        except (TypeError, ValueError):
            duration = None

    if duration is None:
        raise RuntimeError("Unable to determine media duration from ffprobe output")

    fps = 0.0
    if video_stream is not None:
        rate = video_stream.get("r_frame_rate") or video_stream.get("avg_frame_rate")
        if isinstance(rate, str) and "/" in rate:
            num_s, den_s = rate.split("/", 1)
            try:
                num = float(num_s)
                den = float(den_s)
                if den > 0:
                    fps = num / den
            except (TypeError, ValueError):
                fps = 0.0

    width = 0
    height = 0
    if video_stream is not None:
        width = int(video_stream.get("width") or 0)
        height = int(video_stream.get("height") or 0)

    has_audio = audio_stream is not None

    return duration, fps, {"width": width, "height": height}, has_audio


def enforce_duration_limit(cfg: Config, duration: float) -> None:
    cap = DURATION_CAPS_SECONDS.get(cfg.tier)
    if cap is None:
        raise RuntimeError(f"No duration cap configured for tier '{cfg.tier}'")
    if duration > cap:
        log_event(
            "duration_limit_exceeded",
            jobId=cfg.job_id,
            mode=cfg.mode,
            tier=cfg.tier,
            duration=duration,
            cap=cap,
        )
        raise RuntimeError(f"Duration {duration:.2f}s exceeds cap {cap:.2f}s for tier {cfg.tier}")


def extract_audio_if_needed(cfg: Config, input_path: str) -> Tuple[bool, Optional[float]]:
    if cfg.mode not in {"voice", "full"}:
        return False, None

    cmd = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-vn",
        "-ac",
        "1",
        "-ar",
        "16000",
        "-f",
        "wav",
        AUDIO_PATH,
    ]
    log_event("audio_extract_start", jobId=cfg.job_id, mode=cfg.mode, tier=cfg.tier)
    try:
        subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    except subprocess.CalledProcessError as exc:
        log_event("audio_extract_failed", stderr=exc.stderr)
        return False, None

    has_audio = True
    audio_rms = compute_audio_rms(AUDIO_PATH)
    log_event(
        "audio_extract_complete",
        jobId=cfg.job_id,
        mode=cfg.mode,
        tier=cfg.tier,
        audioRms=audio_rms,
        audioPath=AUDIO_PATH,
    )
    return has_audio, audio_rms


def compute_audio_rms(path: str) -> Optional[float]:
    try:
        with wave.open(path, "rb") as wf:
            sampwidth = wf.getsampwidth()
            if sampwidth <= 0:
                return None
            frames_per_chunk = 4096
            total_samples = 0
            total_energy = 0.0
            while True:
                chunk = wf.readframes(frames_per_chunk)
                if not chunk:
                    break
                rms = audioop.rms(chunk, sampwidth)
                n_samples = len(chunk) // sampwidth
                total_samples += n_samples
                total_energy += (rms * rms) * n_samples
            if total_samples == 0:
                return None
            return math.sqrt(total_energy / total_samples)
    except Exception:
        return None


def extract_frames_if_needed(cfg: Config, input_path: str, duration: float) -> Tuple[int, List[float]]:
    if cfg.mode not in {"presence", "full"}:
        return 0, []

    if duration <= 0:
        return 0, []

    if duration < 6.0:
        factors = [0.2, 0.5, 0.8]
    else:
        factors = [0.1, 0.3, 0.5, 0.7, 0.9]

    timestamps = [factor * duration for factor in factors]
    extracted = 0
    actual_timestamps: List[float] = []
    os.makedirs("/tmp", exist_ok=True)
    log_event(
        "frame_extract_start",
        jobId=cfg.job_id,
        mode=cfg.mode,
        tier=cfg.tier,
        timestamps=timestamps,
    )
    for idx, ts in enumerate(timestamps, start=1):
        frame_local = f"/tmp/frame_{idx:03d}.jpg"
        cmd = [
            "ffmpeg",
            "-y",
            "-ss",
            f"{ts:.3f}",
            "-i",
            input_path,
            "-frames:v",
            "1",
            "-q:v",
            "2",
            frame_local,
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        except subprocess.CalledProcessError:
            continue
        extracted += 1
        actual_timestamps.append(ts)

    log_event(
        "frame_extract_complete",
        jobId=cfg.job_id,
        mode=cfg.mode,
        tier=cfg.tier,
        requested=len(timestamps),
        extracted=extracted,
        timestamps=actual_timestamps,
    )
    return extracted, actual_timestamps


def upload_file(s3, local_path: str, bucket: str, key: str) -> None:
    try:
        s3.upload_file(local_path, bucket, key)
    except (ClientError, BotoCoreError) as exc:
        raise RuntimeError(f"Failed to upload {local_path} to s3://{bucket}/{key}: {exc}") from exc


def compute_metrics(
    duration: float,
    fps: float,
    resolution: Dict[str, int],
    has_audio: bool,
    audio_rms: Optional[float],
    frame_count: int,
    cfg: Config,
) -> Dict:
    metrics = {
        "duration": duration,
        "fps": fps,
        "resolution": resolution,
        "hasAudio": has_audio,
        "audioRms": audio_rms,
        "frameCountExtracted": frame_count,
        "tier": cfg.tier,
        "mode": cfg.mode,
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2)
    log_event("metrics_computed", **metrics)
    return metrics


def build_report(cfg: Config, metrics: Dict, ffprobe_data: Dict, audio_rms: Optional[float]) -> Dict:
    duration = metrics.get("duration", 0.0)
    has_audio = metrics.get("hasAudio", False)
    frame_count = metrics.get("frameCountExtracted", 0)

    # Simple deterministic scoring based on metrics
    score = 80
    if duration < 20:
        score -= 5
    if duration > 120:
        score -= 10
    if not has_audio:
        score -= 20
    if audio_rms is not None and audio_rms < 1000:
        score -= 10
    score = max(0, min(100, int(score)))

    overall_summary = "Automated analysis of your pitch video."

    top_fixes = [
        {
            "issue": "Vocal energy",
            "why": "Consistent vocal energy keeps the audience engaged.",
            "drill": "Practice reading a script varying volume and emphasis.",
            "expected_gain": "Clearer, more engaging delivery.",
        },
        {
            "issue": "Eye contact",
            "why": "Eye contact builds trust and connection with viewers.",
            "drill": "Record yourself speaking while looking directly at the camera.",
            "expected_gain": "Stronger presence and confidence.",
        },
        {
            "issue": "Message structure",
            "why": "A clear beginning, middle, and end make your pitch memorable.",
            "drill": "Outline your pitch into 3–5 bullet points and rehearse transitions.",
            "expected_gain": "More compelling and memorable story.",
        },
    ]

    voice_section = {
        "score": score,
        "highlights": ["Clear automated baseline score based on audio and pacing."],
        "improvements": ["Vary your pacing and emphasis to highlight key points."],
        "notes": "Voice analysis is heuristic and should be treated as guidance, not a final verdict.",
    }

    presence_section = {
        "highlights": ["Presence snapshots captured for quick visual review."],
        "improvements": ["Experiment with gestures and posture that feel natural on camera."],
        "notes": "Presence analysis is based on sampled frames and may miss some moments.",
    }

    content_section = {
        "highlights": ["Your pitch conveys a clear core idea."],
        "improvements": ["Tighten your message around the problem, solution, and next steps."],
        "notes": "Content feedback is generic and should be adapted to your specific domain.",
    }

    practice_plan = [
        {
            "session": 1,
            "minutes": 15,
            "focus": "Warm-up and vocal clarity",
            "steps": [
                "Do 3 minutes of breathing and articulation warm-ups.",
                "Read your pitch script out loud, focusing on clear diction.",
            ],
        },
        {
            "session": 2,
            "minutes": 20,
            "focus": "Presence and camera comfort",
            "steps": [
                "Record a short clip focusing on posture and eye contact.",
                "Watch it back and note one improvement for the next recording.",
            ],
        },
    ]

    limitations = [
        "Analysis is heuristic and does not replace feedback from a real coach.",
        "Metrics are based on the uploaded video only and may miss context.",
    ]

    report = {
        "schema_version": "1.0",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "overall": {
            "score": score,
            "summary": overall_summary,
        },
        "top_fixes": top_fixes,
        "voice": voice_section,
        "presence": presence_section,
        "content": content_section,
        "practice_plan": practice_plan,
        "limitations": limitations,
        "artifacts": {
            "raw": {
                "bucket": cfg.raw_bucket,
                "key": cfg.raw_key,
            },
            "report": {
                "bucket": cfg.derived_bucket,
                "key": f"derived/{cfg.job_id}/report.json",
            },
        },
    }

    return report


def validate_report(report: Dict, cfg: Config) -> None:
    required_top_keys = [
        "overall",
        "top_fixes",
        "voice",
        "presence",
        "content",
        "practice_plan",
        "limitations",
        "artifacts",
    ]
    for key in required_top_keys:
        if key not in report:
            raise ValueError(f"Missing required report key: {key}")

    top_fixes = report["top_fixes"]
    if not isinstance(top_fixes, list) or len(top_fixes) < 3:
        raise ValueError("top_fixes must be a list with at least 3 items")

    practice_plan = report["practice_plan"]
    if not isinstance(practice_plan, list) or len(practice_plan) < 1:
        raise ValueError("practice_plan must be a list with at least 1 item")

    limitations = report["limitations"]
    if not isinstance(limitations, list) or len(limitations) < 1:
        raise ValueError("limitations must be a list with at least 1 item")

    overall = report["overall"]
    if not isinstance(overall.get("score"), int):
        raise ValueError("overall.score must be an integer 0–100")
    if not (0 <= overall["score"] <= 100):
        raise ValueError("overall.score must be between 0 and 100")

    artifacts = report["artifacts"]
    raw = artifacts.get("raw") or {}
    rep = artifacts.get("report") or {}
    if raw.get("bucket") != cfg.raw_bucket or raw.get("key") != cfg.raw_key:
        raise ValueError("artifacts.raw does not match input RAW bucket/key")
    expected_report_key = f"derived/{cfg.job_id}/report.json"
    if rep.get("bucket") != cfg.derived_bucket or rep.get("key") != expected_report_key:
        raise ValueError("artifacts.report does not match expected output location")

    for section_name in ["voice", "presence", "content"]:
        section = report.get(section_name, {})
        if "score" in section:
            score = section["score"]
            if not isinstance(score, int) or not (0 <= score <= 100):
                raise ValueError(f"{section_name}.score must be an integer 0–100 when present")


def write_json(path: str, obj: Dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, indent=2)


def main() -> None:
    setup_logging()
    try:
        cfg = load_config()
        log_event(
            "startup",
            jobId=cfg.job_id,
            mode=cfg.mode,
            tier=cfg.tier,
            rawBucket=cfg.raw_bucket,
            rawKey=cfg.raw_key,
            derivedBucket=cfg.derived_bucket,
        )
        s3 = init_s3_client()
        head_input_object(s3, cfg)
        download_input(s3, cfg)
        ffprobe_data = run_ffprobe(INPUT_PATH)
        duration, fps, resolution, has_audio = parse_media_info(ffprobe_data)
        log_event(
            "media_info",
            jobId=cfg.job_id,
            mode=cfg.mode,
            tier=cfg.tier,
            duration=duration,
            fps=fps,
            resolution=resolution,
            hasAudio=has_audio,
        )
        enforce_duration_limit(cfg, duration)
        has_extracted_audio, audio_rms = extract_audio_if_needed(cfg, INPUT_PATH)
        if not has_extracted_audio:
            audio_rms = None
        frame_count, frame_timestamps = extract_frames_if_needed(cfg, INPUT_PATH, duration)
        metrics = compute_metrics(duration, fps, resolution, has_audio, audio_rms, frame_count, cfg)
        report = build_report(cfg, metrics, ffprobe_data, audio_rms)
        validate_report(report, cfg)
        write_json(REPORT_PATH, report)

        uploaded_keys: List[str] = []

        upload_file(s3, FFPROBE_JSON_PATH, cfg.derived_bucket, f"derived/{cfg.job_id}/ffprobe.json")
        uploaded_keys.append(f"derived/{cfg.job_id}/ffprobe.json")

        upload_file(s3, METRICS_PATH, cfg.derived_bucket, f"derived/{cfg.job_id}/metrics.json")
        uploaded_keys.append(f"derived/{cfg.job_id}/metrics.json")

        if cfg.mode in {"voice", "full"} and os.path.exists(AUDIO_PATH):
            upload_file(s3, AUDIO_PATH, cfg.derived_bucket, f"derived/{cfg.job_id}/audio.wav")
            uploaded_keys.append(f"derived/{cfg.job_id}/audio.wav")

        if cfg.mode in {"presence", "full"}:
            for idx in range(1, len(frame_timestamps) + 1):
                local_frame = f"/tmp/frame_{idx:03d}.jpg"
                if os.path.exists(local_frame):
                    key = f"derived/{cfg.job_id}/frames/frame_{idx:03d}.jpg"
                    upload_file(s3, local_frame, cfg.derived_bucket, key)
                    uploaded_keys.append(key)

        upload_file(s3, REPORT_PATH, cfg.derived_bucket, f"derived/{cfg.job_id}/report.json")
        uploaded_keys.append(f"derived/{cfg.job_id}/report.json")

        # Single end-of-run summary containing metrics and uploaded keys.
        log_event(
            "success",
            jobId=cfg.job_id,
            mode=cfg.mode,
            tier=cfg.tier,
            metrics=metrics,
            uploadedKeys=uploaded_keys,
        )
    except Exception as exc:
        log_event(
            "worker_error",
            error=str(exc),
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

