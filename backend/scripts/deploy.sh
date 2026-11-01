#!/usr/bin/env bash
# Deploy every service in serverless-compose.yml.
# Usage: ./scripts/deploy.sh [stage]
# Stage defaults to dev. Services are deployed in dependency order.

set -euo pipefail

stage="${1:-dev}"
backend_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
compose_file="${backend_dir}/serverless-compose.yml"

if [[ ! -f "$compose_file" ]]; then
    echo "Missing $compose_file" >&2
    exit 1
fi

cd "$backend_dir"

services="$(
    awk '
        function is_service(name,    i) {
            for (i = 1; i <= n; i++) if (services[i] == name) return 1
            return 0
        }

        function enqueue_ready(    i, s) {
            for (i = 1; i <= n; i++) {
                s = services[i]
                if (!emitted[s] && !queued[s] && indegree[s] == 0) {
                    queue[++qtail] = s
                    queued[s] = 1
                }
            }
        }

        /^services:/ { in_services = 1; next }
        in_services && /^[^ #]/ { in_services = 0 }
        in_services && /^  [A-Za-z0-9_-]+:[ \t]*$/ {
            current = $1
            sub(/:$/, "", current)
            services[++n] = current
            next
        }
        in_services && current != "" {
            line = $0
            while (match(line, /\$\{[A-Za-z0-9_-]+\./)) {
                dep = substr(line, RSTART + 2, RLENGTH - 3)
                if (dep != current) {
                    key = current SUBSEP dep
                    if (!(key in seen)) {
                        seen[key] = 1
                        deps[current] = deps[current] " " dep
                    }
                }
                line = substr(line, RSTART + RLENGTH)
            }
        }

        END {
            qhead = 1
            qtail = 0
            for (i = 1; i <= n; i++) indegree[services[i]] = 0
            for (i = 1; i <= n; i++) {
                s = services[i]
                count = split(deps[s], parts, " ")
                deps[s] = ""
                for (j = 1; j <= count; j++) {
                    if (parts[j] != "" && is_service(parts[j])) {
                        indegree[s]++
                        deps[s] = deps[s] " " parts[j]
                    }
                }
            }

            enqueue_ready()
            while (qhead <= qtail) {
                s = queue[qhead++]
                emitted[s] = 1
                print s
                for (i = 1; i <= n; i++) {
                    t = services[i]
                    if (emitted[t]) continue
                    count = split(deps[t], parts, " ")
                    for (j = 1; j <= count; j++) {
                        if (parts[j] == s) indegree[t]--
                    }
                }
                enqueue_ready()
            }

            deployed = 0
            for (i = 1; i <= n; i++) if (emitted[services[i]]) deployed++
            if (deployed != n) {
                print "Cycle or unknown dependency in serverless-compose.yml" > "/dev/stderr"
                exit 1
            }
        }
    ' "$compose_file"
)"

if [[ -z "$services" ]]; then
    echo "No services found in $compose_file" >&2
    exit 1
fi

for service in $services; do
    printf '==> serverless %s:deploy --stage %s\n' "$service" "$stage"
    serverless "${service}:deploy" --stage "$stage"
done
