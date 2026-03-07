#!/usr/bin/env python3
"""
AI Art Quality Testing Framework — CLI Entry Point

Runs the full quality test pipeline: synthetic test data → server inference →
client-side compositing simulation → automated sanity checks → report.

Usage:
    cd server && source venv/bin/activate
    python scripts/run_quality_tests.py                      # All 3 styles
    python scripts/run_quality_tests.py --style watercolor   # Single style
    python scripts/run_quality_tests.py --image path.png     # Custom input
    python scripts/run_quality_tests.py --skip-inference      # Re-check existing outputs

See README.md 'AI Art Quality Testing' section for the full developer guide.
"""

import os
import sys
import glob
import argparse
import logging
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.server_config import MAX_QUALITY_ARTIFACTS
from quality.runner import QualityTestRunner
from quality.report import generate_report


def _cleanup_old_artifacts(base_dir: str, max_keep: int):
    """Remove old quality test artifact directories, keeping only the latest N."""
    if not os.path.isdir(base_dir):
        return
    dirs = sorted(
        [d for d in glob.glob(os.path.join(base_dir, "run_*")) if os.path.isdir(d)]
    )
    for old_dir in dirs[:-max_keep]:
        import shutil
        shutil.rmtree(old_dir, ignore_errors=True)
        logging.getLogger("quality").info(f"Removed old artifacts: {old_dir}")


def main():
    parser = argparse.ArgumentParser(
        description="AI Art Quality Testing Framework",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/run_quality_tests.py                    # Test all styles
  python scripts/run_quality_tests.py --style watercolor # Single style
  python scripts/run_quality_tests.py --image scene.png  # Custom input
  python scripts/run_quality_tests.py --skip-inference   # Re-check existing
        """,
    )
    parser.add_argument("--style", type=str, help="Test a single style (watercolor|bollywood|rangoli)")
    parser.add_argument("--image", type=str, help="Path to custom scene canvas image")
    parser.add_argument("--skip-inference", action="store_true", help="Skip inference, re-run checks on existing outputs")
    parser.add_argument("--max-keep", type=int, default=MAX_QUALITY_ARTIFACTS,
                        help=f"Max artifact directories to keep (default: {MAX_QUALITY_ARTIFACTS})")
    args = parser.parse_args()

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(levelname)s | %(message)s',
    )
    log = logging.getLogger("quality")

    # Output directory with timestamp
    base_results = os.path.join(os.path.dirname(__file__), '..', 'test-results', 'quality')
    os.makedirs(base_results, exist_ok=True)

    # Cleanup old artifacts
    _cleanup_old_artifacts(base_results, args.max_keep)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_dir = os.path.join(base_results, f"run_{timestamp}")
    os.makedirs(out_dir, exist_ok=True)

    # Determine styles
    styles = [args.style] if args.style else None

    if args.skip_inference:
        # For skip-inference, use latest existing run dir
        existing_runs = sorted(glob.glob(os.path.join(base_results, "run_*")))
        if len(existing_runs) < 2:  # current empty dir + at least one previous
            log.error("No existing quality test outputs found. Run without --skip-inference first.")
            sys.exit(1)
        out_dir = existing_runs[-2]  # second-to-last (last is the new empty one we just created)
        log.info(f"Re-checking existing outputs in: {out_dir}")
    else:
        log.info(f"Output directory: {out_dir}")

    # Load model (unless skipping inference)
    model = None
    if not args.skip_inference:
        from app.model_manager import ModelManager
        model = ModelManager()
        log.info("Loading model...")
        model.load()

    runner = QualityTestRunner(model_manager=model, out_dir=out_dir)

    # Run
    print()
    print("=" * 60)
    print("AI ART QUALITY TEST")
    print("=" * 60)
    print()

    report = runner.run(
        styles=styles,
        custom_image_path=args.image,
        skip_inference=args.skip_inference,
    )

    # Generate report
    report_md = generate_report(report, out_dir)
    report_path = os.path.join(out_dir, "REPORT.md")
    with open(report_path, "w") as f:
        f.write(report_md)

    # Print summary
    print()
    print("=" * 60)
    print("RESULTS")
    print("=" * 60)
    print()

    for img_report in report.image_reports:
        status = "PASS" if img_report.all_passed else "FAIL"
        print(f"  {img_report.style:12s}  [{status}]")
        for check in img_report.checks:
            mark = "ok" if check.passed else "FAIL"
            print(f"    {check.name:25s} {mark:>6s}  {check.detail}")

    if report.cross_checks:
        print()
        print("  Cross-style differentiation:")
        for check in report.cross_checks:
            mark = "ok" if check.passed else "FAIL"
            print(f"    {check.name:35s} {mark:>6s}  {check.detail}")

    print()
    overall = "ALL PASSED" if report.all_passed else "SOME CHECKS FAILED"
    print(f"  Overall: {overall}")
    print(f"  Report:  {report_path}")
    print()

    if not report.all_passed:
        print("  Review the report and output images for details.")
        print()

    sys.exit(0 if report.all_passed else 1)


if __name__ == "__main__":
    main()
