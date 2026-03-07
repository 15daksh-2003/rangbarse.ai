# Quality test report generation.
# Produces a Markdown report with automated check results and manual inspection checklist.

import os
from datetime import datetime

from quality.checklist import QualityReport


def generate_report(report: QualityReport, out_dir: str, timings: dict[str, float] | None = None) -> str:
    """Generate a Markdown quality report.

    Args:
        report: QualityReport with all check results
        out_dir: directory where images are saved (for relative links)
        timings: optional dict of style → inference time in seconds

    Returns:
        Markdown string
    """
    timings = timings or {}
    lines = [
        f"# Quality Test Report",
        f"",
        f"**Generated:** {datetime.now():%Y-%m-%d %H:%M:%S}",
        f"**Output dir:** `{out_dir}`",
        f"",
        f"---",
        f"",
        f"## Input Artifacts",
        f"",
        f"| Artifact | File |",
        f"|----------|------|",
        f"| Webcam frame | webcam.png |",
        f"| Splatter canvas | splatters.png |",
        f"| Scene canvas (ambient + splatters) | scene_canvas.png |",
        f"",
    ]

    # Automated checks
    lines.extend([
        f"## Automated Sanity Checks",
        f"",
    ])

    all_pass = True
    for img_report in report.image_reports:
        status = "PASS" if img_report.all_passed else "FAIL"
        if not img_report.all_passed:
            all_pass = False
        lines.append(f"### {img_report.style.title()}")
        lines.append(f"")
        lines.append(f"| Check | Status | Detail |")
        lines.append(f"|-------|--------|--------|")
        for check in img_report.checks:
            mark = "PASS" if check.passed else "**FAIL**"
            lines.append(f"| {check.name} | {mark} | {check.detail} |")
        lines.append(f"")

    if report.cross_checks:
        lines.append(f"### Cross-Style Differentiation")
        lines.append(f"")
        lines.append(f"| Check | Status | Detail |")
        lines.append(f"|-------|--------|--------|")
        for check in report.cross_checks:
            mark = "PASS" if check.passed else "**FAIL**"
            if not check.passed:
                all_pass = False
            lines.append(f"| {check.name} | {mark} | {check.detail} |")
        lines.append(f"")

    overall = "ALL PASSED" if all_pass else "SOME FAILED"
    lines.append(f"**Overall: {overall}**")
    lines.append(f"")

    # Timing
    if timings:
        lines.extend([
            f"## Timing",
            f"",
            f"| Style | Time |",
            f"|-------|------|",
        ])
        for style, t in timings.items():
            budget_mark = "within budget" if t <= 15 else "**OVER BUDGET**"
            lines.append(f"| {style} | {t:.1f}s ({budget_mark}) |")
        lines.append(f"")

    # Manual inspection checklist
    lines.extend([
        f"## Manual Visual Inspection",
        f"",
        f"Review the output images and check each item:",
        f"",
        f"| # | Check | Status |",
        f"|---|-------|--------|",
        f"| 1 | Scene canvas: person unrecognizable (blurry ambient) | [ ] |",
        f"| 2 | Raw AI output: splatters artistically transformed | [ ] |",
        f"| 3 | Final composite: person clearly visible through overlay | [ ] |",
        f"| 4 | Final composite: artistic transformation visible on splatters | [ ] |",
        f"| 5 | Final composite: style-specific lighting applied | [ ] |",
        f"| 6 | Each style visually distinct from the others | [ ] |",
        f"| 7 | No artifacts, glitches, or degenerate outputs | [ ] |",
        f"",
        f"## Output Images",
        f"",
        f"| Style | Raw AI | Final Composite |",
        f"|-------|--------|-----------------|",
    ])
    for img_report in report.image_reports:
        s = img_report.style
        lines.append(f"| {s.title()} | raw_{s}.png | output_{s}.png |")

    lines.append(f"")
    return "\n".join(lines)
