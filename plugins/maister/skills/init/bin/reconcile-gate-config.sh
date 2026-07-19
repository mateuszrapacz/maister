#!/usr/bin/env bash
set -euo pipefail

die() {
  printf 'gate config: %s\n' "$*" >&2
  exit 1
}

fail_if_injected() {
  test "${MAISTER_GATE_FAIL:-}" != "$1" || die "injected $1 failure"
}

same_directory() {
  test "$(CDPATH= cd -- "$(dirname -- "$1")" && pwd)" = "$(CDPATH= cd -- "$(dirname -- "$2")" && pwd)"
}

build_candidate() {
  config=$1
  enabled=$2
  destination=$3
  test "$enabled" = on || test "$enabled" = off || die "enabled must be on or off"
  test -f "$config" || die "config does not exist: $config"
  same_directory "$config" "$destination" || die "candidate must be beside config"
  fail_if_injected candidate

  directory=$(dirname -- "$config")
  temporary=$(mktemp "$directory/.gate-candidate.XXXXXX")
  trap 'rm -f "${temporary:-}"' EXIT

  awk -v requested="$enabled" '
    function fatal(message) {
      print "gate config: " message > "/dev/stderr"
      failed=1
      exit 42
    }
    function trim(value) {
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      return value
    }
    function key_from(line, indentation, value) {
      value=line
      sub("^" indentation, "", value)
      sub(/:.*/, "", value)
      return value
    }
    function scalar(line, value) {
      value=line
      sub(/^[^:]+:[[:space:]]*/, "", value)
      return trim(value)
    }
    function remember(scope, key, identity) {
      identity=scope SUBSEP key
      if (seen[identity]++) fatal("duplicate gate field: " key)
    }
    function validate_boolean(key, value) {
      if (value != "true" && value != "false") fatal(key " must be a YAML boolean")
      return value
    }
    function validate_policy(key, value) {
      if (value != "manual" && value != "advisor" && value != "fully_automatic")
        fatal(key " must be manual, advisor, or fully_automatic")
      return value
    }
    function validate_attempt(key, value) {
      if (value !~ /^[1-9]$/ && value != "10") fatal(key " must be an integer from 1 through 10")
      return value
    }
    function require_field(scope, key) {
      if (!seen[scope SUBSEP key]) fatal("gate configuration is incomplete; missing " key)
    }
    function emit_gate(default_policy) {
      default_policy=requested == "on" ? "advisor" : "manual"
      print "advisor:"
      print "  enabled: " (requested == "on" ? "true" : "false")
      print "  gate_policies:"
      print "    phase-exit: " (gate_start ? policy["phase-exit"] : default_policy)
      print "    optional-phase: " (gate_start ? policy["optional-phase"] : default_policy)
      print "    clarify: " (gate_start ? policy["clarify"] : default_policy)
      print "    convergence: " (gate_start ? policy["convergence"] : default_policy)
      print "    verify-matrix: " (gate_start ? policy["verify-matrix"] : default_policy)
      print "  advisor_agent: maister:advisor"
      print "  arbiter_agent: maister:advisor"
      print "  arbiter_enabled_on_disagreement: " (gate_start ? disagreement : "true")
      print "  retry:"
      print "    advisor_attempts: " (gate_start ? advisor_attempts : "3")
      print "    arbiter_attempts: " (gate_start ? arbiter_attempts : "3")
      print "    backoff: exponential"
    }
    {
      lines[NR]=$0
      if ($0 ~ /(^|[[:space:]])([&*!]|\[[^]]*\]|\{[^}]*\})/ ||
          $0 ~ /^(---|\.\.\.|%YAML([[:space:]]|$)|%TAG([[:space:]]|$))/)
        fatal("YAML anchors, aliases, tags, directives, and flow collections are not supported")
      if ($0 !~ /^[[:space:]]/ && $0 !~ /^#/ && $0 != "" &&
          $0 !~ /^[A-Za-z0-9_-]+:[[:space:]]*/)
        fatal("non-canonical top-level YAML representation is not supported")
      if ($0 ~ /^advisor[[:space:]]+:/ || $0 ~ /^(\"advisor\"|\047advisor\047)[[:space:]]*:/ ||
          $0 ~ /^\?[[:space:]]+advisor([[:space:]]|$)/)
        fatal("top-level advisor key must use the canonical plain representation")
      if ($0 ~ /^advisor:/ && $0 !~ /^advisor:[[:space:]]*(#.*)?$/)
        fatal("top-level advisor must be a mapping")
      if ($0 ~ /^advisor:[[:space:]]*(#.*)?$/) {
        if (gate_start) fatal("duplicate top-level advisor key")
        gate_start=NR
      }
    }
    END {
      if (failed) exit 42
      gate_end=gate_start
      if (gate_start) {
        for (line_number=gate_start+1; line_number<=NR; line_number++) {
          if (lines[line_number] != "" && lines[line_number] !~ /^[[:space:]]/) break
          gate_end=line_number
        }
        section=""
        for (line_number=gate_start+1; line_number<=gate_end; line_number++) {
          line=lines[line_number]
          if (line == "" || line ~ /^[[:space:]]*#/) continue
          if (line ~ /\t/ || line ~ /[[:space:]]+$/) fatal("non-canonical whitespace in gate configuration")
          if (line ~ /^  [A-Za-z0-9_-]+:[[:space:]]*/) {
            key=key_from(line, "  ")
            value=scalar(line)
            remember("root", key)
            section=""
            if (key == "enabled") validate_boolean(key, value)
            else if (key == "gate_policies") {
              if (value != "") fatal("gate_policies must be a mapping")
              section="policy"
            } else if (key == "advisor_agent" || key == "arbiter_agent") {
              if (value != "maister:advisor") fatal(key " must equal exact logical role maister:advisor")
            } else if (key == "arbiter_enabled_on_disagreement") disagreement=validate_boolean(key, value)
            else if (key == "retry") {
              if (value != "") fatal("retry must be a mapping")
              section="retry"
            } else if (key == "advisor_model" || key == "arbiter_model")
              fatal("legacy gate field is not supported: " key)
            else fatal("unsupported gate field: " key)
          } else if (line ~ /^    [A-Za-z0-9_-]+:[[:space:]]*/) {
            key=key_from(line, "    ")
            value=scalar(line)
            if (section == "policy") {
              if (key != "phase-exit" && key != "optional-phase" && key != "clarify" &&
                  key != "convergence" && key != "verify-matrix") fatal("unsupported gate policy: " key)
              remember("policy", key)
              policy[key]=validate_policy(key, value)
            } else if (section == "retry") {
              if (key != "advisor_attempts" && key != "arbiter_attempts" && key != "backoff")
                fatal("unsupported retry field: " key)
              remember("retry", key)
              if (key == "advisor_attempts") advisor_attempts=validate_attempt(key, value)
              else if (key == "arbiter_attempts") arbiter_attempts=validate_attempt(key, value)
              else if (value != "exponential") fatal("backoff must equal exponential")
            } else fatal("unexpected nested gate field: " key)
          } else fatal("invalid gate configuration structure")
        }
        require_field("root", "enabled")
        require_field("root", "gate_policies")
        require_field("root", "advisor_agent")
        require_field("root", "arbiter_agent")
        require_field("root", "arbiter_enabled_on_disagreement")
        require_field("root", "retry")
        require_field("policy", "phase-exit")
        require_field("policy", "optional-phase")
        require_field("policy", "clarify")
        require_field("policy", "convergence")
        require_field("policy", "verify-matrix")
        require_field("retry", "advisor_attempts")
        require_field("retry", "arbiter_attempts")
        require_field("retry", "backoff")
      }
      if (!gate_start) {
        for (line_number=1; line_number<=NR; line_number++) print lines[line_number]
        emit_gate()
      } else {
        for (line_number=1; line_number<gate_start; line_number++) print lines[line_number]
        emit_gate()
        for (line_number=gate_end+1; line_number<=NR; line_number++) print lines[line_number]
      }
    }
  ' "$config" >"$temporary" || die "validation failed; original was not changed"

  chmod --reference="$config" "$temporary" 2>/dev/null || chmod "$(stat -f '%Lp' "$config" 2>/dev/null || stat -c '%a' "$config")" "$temporary"
  mv "$temporary" "$destination"
  trap - EXIT
}

backup_file() {
  source=$1
  backup=$2
  same_directory "$source" "$backup" || die "backup must be beside config"
  fail_if_injected backup
  temporary=$(mktemp "$(dirname -- "$source")/.gate-backup.XXXXXX")
  cp -p "$source" "$temporary"
  mv "$temporary" "$backup"
}

commit_file() {
  target=$1
  candidate=$2
  same_directory "$target" "$candidate" || die "commit candidate must be beside config"
  fail_if_injected commit
  if cmp -s "$target" "$candidate"; then
    rm -f "$candidate"
    printf 'noop\n'
  else
    mv "$candidate" "$target"
    printf 'replaced\n'
  fi
}

restore_file() {
  target=$1
  backup=$2
  same_directory "$target" "$backup" || die "restore backup must be beside config"
  test -f "$backup" || die "backup does not exist: $backup"
  fail_if_injected restore
  temporary=$(mktemp "$(dirname -- "$target")/.gate-restore.XXXXXX")
  cp -p "$backup" "$temporary"
  mv "$temporary" "$target"
}

command=${1:-}
case "$command" in
  candidate)
    test "$#" -eq 4 || die "usage: candidate CONFIG on|off CANDIDATE"
    build_candidate "$2" "$3" "$4"
    ;;
  backup)
    test "$#" -eq 3 || die "usage: backup CONFIG BACKUP"
    backup_file "$2" "$3"
    ;;
  commit)
    test "$#" -eq 3 || die "usage: commit CONFIG CANDIDATE"
    commit_file "$2" "$3"
    ;;
  restore)
    test "$#" -eq 3 || die "usage: restore CONFIG BACKUP"
    restore_file "$2" "$3"
    ;;
  reconcile)
    test "$#" -eq 3 || die "usage: reconcile CONFIG on|off"
    directory=$(dirname -- "$2")
    candidate=$(mktemp "$directory/.gate-candidate-output.XXXXXX")
    rm -f "$candidate"
    build_candidate "$2" "$3" "$candidate"
    commit_file "$2" "$candidate"
    ;;
  *) die "expected candidate, backup, commit, restore, or reconcile" ;;
esac
