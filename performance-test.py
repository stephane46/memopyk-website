#!/usr/bin/env python3
"""
Performance Comparison: Replit vs Coolify
Tests response times and sizes for critical endpoints
"""

import subprocess
import statistics
import json
import time
from typing import Dict, List, Tuple

REPLIT_BASE = "https://memopyk.com"
COOLIFY_BASE = "https://memopyk.memopyk.com"
RUNS = 5

ENDPOINTS = [
    ("/en-US", "Homepage EN"),
    ("/fr-FR", "Homepage FR"),
    ("/api/hero-videos", "Hero Videos API"),
    ("/api/gallery", "Gallery API"),
    ("/api/faq", "FAQ API"),
    ("/api/partners", "Partners API"),
    ("/api/blog/posts", "Blog Posts API"),
    ("/api/travel-agency-codes", "Travel Agencies API"),
]


def test_endpoint(base_url: str, endpoint: str) -> Tuple[bool, List[float], List[int], List[int]]:
    """Test an endpoint and return timing and size data."""
    times = []
    sizes = []
    status_codes = []

    for i in range(RUNS):
        url = f"{base_url}{endpoint}"

        try:
            # Use curl with timing
            result = subprocess.run(
                [
                    "curl",
                    "-w", "\\n%{http_code}\\n%{time_total}\\n%{size_download}",
                    "-o", "nul" if subprocess.os.name == 'nt' else "/dev/null",
                    "-s",
                    url
                ],
                capture_output=True,
                text=True,
                timeout=30
            )

            # Parse output
            lines = result.stdout.strip().split('\n')
            if len(lines) >= 3:
                status = int(lines[-3])
                time_total = float(lines[-2])
                size = int(lines[-1])

                status_codes.append(status)
                times.append(time_total * 1000)  # Convert to ms
                sizes.append(size)

        except Exception as e:
            print(f"    Error testing {url}: {e}")
            return False, [], [], []

        # Small delay between requests
        time.sleep(0.2)

    # Check if all succeeded
    success = all(code == 200 for code in status_codes)
    return success, times, sizes, status_codes


def format_size(bytes: float) -> str:
    """Format size in human-readable format."""
    if bytes > 1024:
        return f"{bytes / 1024:.1f}KB"
    return f"{int(bytes)}B"


def main():
    print("=" * 70)
    print("MEMOPYK Performance Comparison")
    print("=" * 70)
    print(f"Replit (OLD): {REPLIT_BASE}")
    print(f"Coolify (NEW): {COOLIFY_BASE}")
    print(f"Runs per endpoint: {RUNS}")
    print()

    results = {}

    print("Testing endpoints...")
    print()

    for endpoint, name in ENDPOINTS:
        print(f"Testing: {name} ({endpoint})")

        # Test Replit
        print(f"  Replit... ", end="", flush=True)
        r_success, r_times, r_sizes, r_codes = test_endpoint(REPLIT_BASE, endpoint)

        if r_success:
            r_avg = statistics.mean(r_times)
            r_size = statistics.mean(r_sizes)
            print(f"✓ {r_avg:.0f}ms ({format_size(r_size)})")
        else:
            r_avg = 0
            r_size = 0
            r_code = r_codes[0] if r_codes else 0
            print(f"✗ HTTP {r_code}")

        # Test Coolify
        print(f"  Coolify... ", end="", flush=True)
        c_success, c_times, c_sizes, c_codes = test_endpoint(COOLIFY_BASE, endpoint)

        if c_success:
            c_avg = statistics.mean(c_times)
            c_size = statistics.mean(c_sizes)
            print(f"✓ {c_avg:.0f}ms ({format_size(c_size)})")
        else:
            c_avg = 0
            c_size = 0
            c_code = c_codes[0] if c_codes else 0
            print(f"✗ HTTP {c_code}")

        results[endpoint] = {
            "name": name,
            "replit": {
                "success": r_success,
                "avg": r_avg,
                "min": min(r_times) if r_times else 0,
                "max": max(r_times) if r_times else 0,
                "size": r_size,
                "code": r_codes[0] if r_codes else 0
            },
            "coolify": {
                "success": c_success,
                "avg": c_avg,
                "min": min(c_times) if c_times else 0,
                "max": max(c_times) if c_times else 0,
                "size": c_size,
                "code": c_codes[0] if c_codes else 0
            }
        }

        print()

    # Generate comparison table
    print()
    print("=" * 100)
    print("PERFORMANCE COMPARISON RESULTS")
    print("=" * 100)
    print()
    print(f"{'Endpoint':<25} | {'Replit (ms)':<15} | {'Coolify (ms)':<15} | {'Difference':<20} | {'Winner':<15}")
    print("-" * 100)

    coolify_wins = 0
    replit_wins = 0
    ties = 0

    for endpoint, name in ENDPOINTS:
        data = results[endpoint]
        r_data = data["replit"]
        c_data = data["coolify"]

        if r_data["success"] and c_data["success"]:
            r_avg = r_data["avg"]
            c_avg = c_data["avg"]

            diff = r_avg - c_avg
            diff_pct = (diff / r_avg * 100) if r_avg > 0 else 0

            if c_avg < r_avg:
                winner = "Coolify ⚡"
                diff_display = f"-{diff:.0f}ms ({diff_pct:.1f}% faster)"
                coolify_wins += 1
            elif c_avg > r_avg:
                winner = "Replit"
                diff_display = f"+{-diff:.0f}ms ({-diff_pct:.1f}% slower)"
                replit_wins += 1
            else:
                winner = "Tie"
                diff_display = "0ms"
                ties += 1

            print(f"{name:<25} | {r_avg:>10.0f}ms    | {c_avg:>10.0f}ms    | {diff_display:<20} | {winner:<15}")

        elif r_data["success"]:
            print(f"{name:<25} | {r_data['avg']:>10.0f}ms    | {'FAIL':<15} | {'N/A':<20} | {'Replit':<15}")
            replit_wins += 1
        elif c_data["success"]:
            print(f"{name:<25} | {'FAIL':<15} | {c_data['avg']:>10.0f}ms    | {'N/A':<20} | {'Coolify':<15}")
            coolify_wins += 1
        else:
            print(f"{name:<25} | {'FAIL':<15} | {'FAIL':<15} | {'N/A':<20} | {'Both Failed':<15}")

    print()
    print("=" * 100)
    print("SUMMARY")
    print("=" * 100)
    print(f"Coolify Wins: {coolify_wins}")
    print(f"Replit Wins: {replit_wins}")
    print(f"Ties: {ties}")
    print()

    # Detailed statistics
    print("=" * 100)
    print("DETAILED STATISTICS")
    print("=" * 100)
    print()

    for endpoint, name in ENDPOINTS:
        data = results[endpoint]
        r_data = data["replit"]
        c_data = data["coolify"]

        print(f"{name} ({endpoint}):")

        if r_data["success"]:
            print(f"  Replit:  avg={r_data['avg']:.0f}ms, min={r_data['min']:.0f}ms, "
                  f"max={r_data['max']:.0f}ms, size={format_size(r_data['size'])}")
        else:
            print(f"  Replit:  FAILED (HTTP {r_data['code']})")

        if c_data["success"]:
            print(f"  Coolify: avg={c_data['avg']:.0f}ms, min={c_data['min']:.0f}ms, "
                  f"max={c_data['max']:.0f}ms, size={format_size(c_data['size'])}")
        else:
            print(f"  Coolify: FAILED (HTTP {c_data['code']})")

        print()

    print("=" * 100)
    print(f"Test completed: {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 100)


if __name__ == "__main__":
    main()
