#!/usr/bin/env python3
"""Verify retained checkpoint bytes and native measurement relationships."""

import hashlib
import json
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]


def read_json(path):
    return json.loads(path.read_text())


def verify_files(directory, rows):
    for row in rows:
        path = directory / row["path"]
        blob = path.read_bytes()
        assert len(blob) == row["bytes"], path
        assert hashlib.sha256(blob).hexdigest() == row["sha256"], path
    return len(rows)


def verify_fix1():
    directory = ROOT / "fix-1"
    checked = 0
    for name in ["parent-source-artifact-verification.json", "parent-native-verification.json"]:
        receipt = read_json(directory / name)
        checked += verify_files(directory, receipt["retained_files"])
    source = read_json(directory / "fix1-source-manifest.json")
    for row in source["files"]:
        blob = subprocess.check_output(
            ["git", "show", source["source_commit"] + ":" + row["path"]], cwd=REPO
        )
        assert hashlib.sha256(blob).hexdigest() == row["committed_sha256"], row["path"]
    final = read_json(directory / "fix1-native-accepted/observability-final.json")
    assert final["complete"] and final["native_quiescent"] and not final["coverage_gap"]
    assert final["active"] is None and final["retiring_epoch_id"] is None
    assert [int(row["epoch_id"]) for row in final["completed"]] == list(range(1, 7))
    assert final["lifetime"]["callbacks_entered"] == receipt["callbacks"] == "3826"
    assert final["lifetime"]["output_frames"] == receipt["output_frames"] == "1958912"
    documents = read_json(directory / "fix1-ultra-documents/documents-result.json")
    assert documents["status"] == "passed"
    return checked, len(source["files"])


def verify_fix2():
    directory = ROOT / "fix-2"
    checked = 0
    for base, name in [
        (directory, "parent-source-artifact-verification.json"),
        (directory, "parent-controls-verification.json"),
        (directory / "final-qualification", "parent-native-verification.json"),
    ]:
        receipt = read_json(base / name)
        checked += verify_files(base, receipt["retained_files"])
    final_directory = directory / "final-qualification"
    source = read_json(final_directory / "fix2-source-manifest.json")
    for row in source["files"]:
        blob = subprocess.check_output(
            ["git", "show", source["source_commit"] + ":" + row["path"]], cwd=REPO
        )
        assert hashlib.sha256(blob).hexdigest() == row["committed_sha256"], row["path"]
    for path, epochs, callbacks in [
        ("fix2-native-accepted/observability-final.json", 6, "3787"),
        ("fix2-overhead-controls/final-epochs.json", 2, "8824"),
    ]:
        final = read_json(final_directory / path)
        assert final["complete"] and final["native_quiescent"] and not final["coverage_gap"]
        assert final["active"] is None and final["retiring_epoch_id"] is None
        assert [int(row["epoch_id"]) for row in final["completed"]] == list(range(1, epochs + 1))
        assert final["lifetime"]["callbacks_entered"] == callbacks
        assert all(row["final"] and not row["stale"] for row in final["completed"])
    controls = read_json(final_directory / "fix2-overhead-controls/overhead-controls.json")
    assert controls["complete"] and len(controls["stages"]) == 8
    numeric = read_json(final_directory / "fix2-ultra-numeric-accepted/numeric-result.json")
    assert numeric["complete"] and numeric["saved_values"] == [7, 11]
    return checked, len(source["files"])


def main():
    native = read_json(ROOT / "parent-native-verification.json")
    checked = verify_files(ROOT, native["files"])
    checkpoint = ROOT / "checkpoint-68846ce"
    for filename in [
        "parent-checkpoint-verification.json",
        "parent-tests-artifacts-verification.json",
    ]:
        receipt = read_json(checkpoint / filename)
        checked += verify_files(checkpoint, receipt["retained_files"])

    source = read_json(checkpoint / "source-checkpoint-manifest.json")
    for row in source["files"]:
        blob = subprocess.check_output(
            ["git", "show", source["source_commit"] + ":" + row["path"]],
            cwd=REPO,
        )
        committed = hashlib.sha256(blob).hexdigest()
        assert committed == row["current_sha256"], row["path"]
        if "committed_sha256" in row:
            assert committed == row["committed_sha256"], row["path"]
        else:
            assert row["unchanged_baseline_dependency"], row["path"]
            baseline = subprocess.check_output(
                ["git", "show", source["base"] + ":" + row["path"]],
                cwd=REPO,
            )
            assert hashlib.sha256(baseline).hexdigest() == committed, row["path"]

    directory = ROOT / "native-accepted"
    final = read_json(directory / "observability-final.json")
    report = read_json(directory / "observability-report.json")
    clip = read_json(directory / "native-clips-report.json")
    assert final["complete"] and final["native_quiescent"]
    assert not final["coverage_gap"]
    assert final["active"] is None and final["retiring_epoch_id"] is None
    assert final["evicted_epoch_count"] == "0"
    epochs = final["completed"]
    assert [int(row["epoch_id"]) for row in epochs] == list(range(1, 7))
    assert all(row["final"] and not row["stale"] and not row["failed"] for row in epochs)
    additive = [
        "callbacks_entered", "valid_callbacks", "output_frames", "render_calls",
        "native_render_failures", "silenced_callbacks", "invalid_callback_shape",
        "zero_frame_callbacks", "callbacks_after_failure", "cpal_error_total",
        "cpal_xrun_reports", "cpal_non_xrun_reports", "duration_samples",
        "duration_sum_ns", "budget_samples", "over_buffer_budget_count",
        "clock_anomaly_count",
    ]
    for field in additive:
        observed = sum(int(row["metrics"][field]) for row in epochs)
        assert observed == int(final["lifetime"][field]), field
    for field, length, samples in [
        ("duration_hist", 256, "duration_samples"),
        ("util_hist", 202, "budget_samples"),
    ]:
        assert len(final["lifetime"][field]) == length
        merged = [sum(int(row["metrics"][field][i]) for row in epochs) for i in range(length)]
        assert merged == list(map(int, final["lifetime"][field])), field
        for row in epochs:
            assert sum(map(int, row["metrics"][field])) == int(row["metrics"][samples])
    assert all(
        row["metrics"]["buffer_frames_min"] == row["metrics"]["buffer_frames_max"] == "512"
        for row in epochs
    )
    assert final["numeric_record_bytes"] <= 8192
    assert final["completed_ring_numeric_limit_bytes"] < 1024 * 1024
    for field in ["resources", "epochs", "actions"]:
        row = report[field]
        verify_files(directory, [{**row, "path": Path(row["path"]).name}])
    assert not report["sampling_errors"]
    for field in [
        "draft_editor_continuity", "apply_editor_boundary", "reopen_stopped_default",
        "sequential_shared_source_recovery", "failed_shared_replace_editor_continuity",
    ]:
        assert clip[field], field
    pcm = next(row for row in native["streamed_pcm"] if row["path"] == "native-accepted/clips-rendered.f32")
    assert pcm["finite"] and not pcm["raw_pcm_retained"]
    for field in ["frames", "peak", "sha256"]:
        assert pcm[field] == clip["audio"][field], field
    fix_files, fix_source_files = verify_fix1()
    final_files, final_source_files = verify_fix2()
    print(json.dumps({
        "retained_file_checks": checked + fix_files + final_files,
        "committed_source_checks": len(source["files"]) + fix_source_files + final_source_files,
        "original_checkpoint_epochs": len(epochs),
        "original_checkpoint_callbacks": final["lifetime"]["callbacks_entered"],
        "original_checkpoint_capture_frames": pcm["frames"],
        "corrected_checkpoint_callbacks": "3787",
        "corrected_controls_callbacks": "8824",
        "raw_pcm": "temporary; retained streamed verification receipt only",
        "scope": "historical68846ce/ccba93b plus corrected3024057; Task13a locally accepted",
    }, indent=2))


if __name__ == "__main__":
    main()
