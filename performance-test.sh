#!/bin/bash

# Performance Comparison: Replit vs Coolify
# Tests response times and sizes for critical endpoints

REPLIT_BASE="https://memopyk.com"
COOLIFY_BASE="https://memopyk.memopyk.com"
RUNS=5

echo "=================================="
echo "MEMOPYK Performance Comparison"
echo "=================================="
echo "Replit (OLD): $REPLIT_BASE"
echo "Coolify (NEW): $COOLIFY_BASE"
echo "Runs per endpoint: $RUNS"
echo ""

# Function to test endpoint and calculate stats
test_endpoint() {
    local base_url=$1
    local endpoint=$2
    local site_name=$3

    local times=()
    local sizes=()
    local status_codes=()

    for i in $(seq 1 $RUNS); do
        # Get timing and size info
        response=$(curl -w "\n%{http_code}\n%{time_total}\n%{size_download}" -o /dev/null -s "${base_url}${endpoint}")

        # Parse response
        status=$(echo "$response" | sed -n '1p')
        time=$(echo "$response" | sed -n '2p')
        size=$(echo "$response" | sed -n '3p')

        status_codes+=($status)
        times+=($time)
        sizes+=($size)

        # Small delay between requests
        sleep 0.2
    done

    # Calculate average time
    local total_time=0
    local min_time=${times[0]}
    local max_time=${times[0]}

    for time in "${times[@]}"; do
        total_time=$(echo "$total_time + $time" | bc)
        if (( $(echo "$time < $min_time" | bc -l) )); then
            min_time=$time
        fi
        if (( $(echo "$time > $max_time" | bc -l) )); then
            max_time=$time
        fi
    done

    local avg_time=$(echo "scale=3; $total_time / $RUNS" | bc)
    local avg_time_ms=$(echo "scale=0; $avg_time * 1000" | bc)

    # Calculate average size
    local total_size=0
    for size in "${sizes[@]}"; do
        total_size=$(echo "$total_size + $size" | bc)
    done
    local avg_size=$(echo "scale=0; $total_size / $RUNS" | bc)

    # Convert to KB if large
    local size_display
    if (( $(echo "$avg_size > 1024" | bc -l) )); then
        size_display=$(echo "scale=1; $avg_size / 1024" | bc)"KB"
    else
        size_display="${avg_size}B"
    fi

    # Check for failures
    local failed=0
    for status in "${status_codes[@]}"; do
        if [ "$status" != "200" ]; then
            failed=1
            break
        fi
    done

    if [ $failed -eq 1 ]; then
        echo "FAIL|${status_codes[0]}|0|0|0|0"
    else
        echo "OK|${avg_time_ms}|$(echo "scale=0; $min_time * 1000" | bc)|$(echo "scale=0; $max_time * 1000" | bc)|${size_display}"
    fi
}

# Test endpoints
declare -a endpoints=(
    "/en-US|Homepage EN"
    "/fr-FR|Homepage FR"
    "/api/hero-videos|Hero Videos API"
    "/api/gallery|Gallery API"
    "/api/faq|FAQ API"
    "/api/partners|Partners API"
    "/api/blog/posts|Blog Posts API"
    "/api/travel-agency-codes|Travel Agencies API"
)

# Store results
declare -A replit_results
declare -A coolify_results

echo "Testing endpoints..."
echo ""

for endpoint_data in "${endpoints[@]}"; do
    IFS='|' read -r endpoint name <<< "$endpoint_data"

    echo "Testing: $name ($endpoint)"

    # Test Replit
    echo -n "  Replit... "
    replit_result=$(test_endpoint "$REPLIT_BASE" "$endpoint" "Replit")
    replit_results["$endpoint"]="$replit_result"

    IFS='|' read -r status avg min max size <<< "$replit_result"
    if [ "$status" = "OK" ]; then
        echo "✓ ${avg}ms (${size})"
    else
        echo "✗ HTTP $avg"
    fi

    # Test Coolify
    echo -n "  Coolify... "
    coolify_result=$(test_endpoint "$COOLIFY_BASE" "$endpoint" "Coolify")
    coolify_results["$endpoint"]="$coolify_result"

    IFS='|' read -r status avg min max size <<< "$coolify_result"
    if [ "$status" = "OK" ]; then
        echo "✓ ${avg}ms (${size})"
    else
        echo "✗ HTTP $avg"
    fi

    echo ""
done

# Generate comparison table
echo ""
echo "=================================="
echo "PERFORMANCE COMPARISON RESULTS"
echo "=================================="
echo ""
printf "%-25s | %-15s | %-15s | %-12s | %-10s\n" "Endpoint" "Replit (ms)" "Coolify (ms)" "Difference" "Winner"
echo "-----------------------------------------------------------------------------------------"

for endpoint_data in "${endpoints[@]}"; do
    IFS='|' read -r endpoint name <<< "$endpoint_data"

    replit_data="${replit_results[$endpoint]}"
    coolify_data="${coolify_results[$endpoint]}"

    IFS='|' read -r r_status r_avg r_min r_max r_size <<< "$replit_data"
    IFS='|' read -r c_status c_avg c_min c_max c_size <<< "$coolify_data"

    if [ "$r_status" = "OK" ] && [ "$c_status" = "OK" ]; then
        # Calculate difference
        diff=$(echo "$r_avg - $c_avg" | bc)
        diff_pct=$(echo "scale=1; ($diff / $r_avg) * 100" | bc)

        # Determine winner
        if (( $(echo "$c_avg < $r_avg" | bc -l) )); then
            winner="Coolify ⚡"
            diff_display="-${diff}ms (${diff_pct}% faster)"
        elif (( $(echo "$c_avg > $r_avg" | bc -l) )); then
            winner="Replit"
            diff_abs=$(echo "$diff * -1" | bc)
            diff_pct_abs=$(echo "$diff_pct * -1" | bc)
            diff_display="+${diff_abs}ms (${diff_pct_abs}% slower)"
        else
            winner="Tie"
            diff_display="0ms"
        fi

        printf "%-25s | %-15s | %-15s | %-12s | %-10s\n" "$name" "${r_avg}ms" "${c_avg}ms" "$diff_display" "$winner"
    elif [ "$r_status" = "OK" ]; then
        printf "%-25s | %-15s | %-15s | %-12s | %-10s\n" "$name" "${r_avg}ms" "FAIL ($c_avg)" "N/A" "Replit"
    elif [ "$c_status" = "OK" ]; then
        printf "%-25s | %-15s | %-15s | %-12s | %-10s\n" "$name" "FAIL ($r_avg)" "${c_avg}ms" "N/A" "Coolify"
    else
        printf "%-25s | %-15s | %-15s | %-12s | %-10s\n" "$name" "FAIL ($r_avg)" "FAIL ($c_avg)" "N/A" "Both Failed"
    fi
done

echo ""
echo "=================================="
echo "DETAILED STATISTICS"
echo "=================================="
echo ""

for endpoint_data in "${endpoints[@]}"; do
    IFS='|' read -r endpoint name <<< "$endpoint_data"

    replit_data="${replit_results[$endpoint]}"
    coolify_data="${coolify_results[$endpoint]}"

    IFS='|' read -r r_status r_avg r_min r_max r_size <<< "$replit_data"
    IFS='|' read -r c_status c_avg c_min c_max c_size <<< "$coolify_data"

    echo "$name ($endpoint):"

    if [ "$r_status" = "OK" ]; then
        echo "  Replit:  avg=${r_avg}ms, min=${r_min}ms, max=${r_max}ms, size=${r_size}"
    else
        echo "  Replit:  FAILED (HTTP $r_avg)"
    fi

    if [ "$c_status" = "OK" ]; then
        echo "  Coolify: avg=${c_avg}ms, min=${c_min}ms, max=${c_max}ms, size=${c_size}"
    else
        echo "  Coolify: FAILED (HTTP $c_avg)"
    fi

    echo ""
done

echo "=================================="
echo "Test completed: $(date)"
echo "=================================="
