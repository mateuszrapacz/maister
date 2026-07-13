#!/usr/bin/env bash
set -euo pipefail

# Narrow transaction contract:
#   candidate CONFIG on|off CANDIDATE REMOVALS
#   backup CONFIG BACKUP
#   commit CONFIG CANDIDATE
#   restore CONFIG BACKUP
#   reconcile CONFIG on|off
# `candidate` validates before writing, emits one removal per line, and creates
# its output beside CONFIG. `backup` preserves exact bytes and mode. `commit`
# and `restore` use same-directory staging plus rename. MAISTER_ADVISOR_FAIL may
# be candidate, backup, commit, or restore for deterministic transaction tests.

die() {
  echo "advisor config: $*" >&2
  exit 1
}

fail_if_injected() {
  test "${MAISTER_ADVISOR_FAIL:-}" != "$1" || die "injected $1 failure"
}

same_directory() {
  test "$(cd "$(dirname "$1")" && pwd)" = "$(cd "$(dirname "$2")" && pwd)"
}

build_candidate() {
  config=$1 enabled=$2 destination=$3 removals=$4
  test "$enabled" = on || test "$enabled" = off || die "enabled must be on or off"
  test -f "$config" || die "config does not exist: $config"
  same_directory "$config" "$destination" || die "candidate must be beside config"
  same_directory "$config" "$removals" || die "removal report must be beside config"
  fail_if_injected candidate

  directory=$(dirname "$config")
  candidate_tmp=$(mktemp "$directory/.advisor-candidate.XXXXXX")
  removals_tmp=$(mktemp "$directory/.advisor-removals.XXXXXX")
  trap 'rm -f "${candidate_tmp:-}" "${removals_tmp:-}"' EXIT

  awk -v requested="$enabled" -v removals="$removals_tmp" '
    function fatal(message) {
      print "advisor config: " message > "/dev/stderr"
      failed=1
      exit 42
    }
    function trim(value) {
      sub(/^[[:space:]]+/, "", value)
      sub(/[[:space:]]+$/, "", value)
      return value
    }
    function simple_key(line, indent, result) {
      result=line
      sub("^" indent, "", result)
      if (result !~ /^[A-Za-z0-9_-]+:[[:space:]]*/) return ""
      sub(/:.*/, "", result)
      return result
    }
    function scalar(line, result) {
      result=line
      sub(/^[^:]+:[[:space:]]*/, "", result)
      return trim(result)
    }
    function duplicate(key, scope, identity) {
      identity=scope SUBSEP key
      if (seen[identity]++) fatal("duplicate advisor key: " key)
    }
    function reject_yaml_features(value) {
      if (value ~ /^![^ ]*/ || value ~ /^&[^ ]*/ || value ~ /^\*[^ ]*/)
        fatal("YAML tags, anchors, and aliases are not supported")
      if (value ~ /^\[[^]]*\]$/ || value ~ /^\{[^}]+\}$/)
        fatal("flow collections are not supported")
    }
    function validate_boolean(key, value) {
      if (value != "true" && value != "false") fatal(key " must be a YAML boolean")
      return value
    }
    function validate_agent(key, value) {
      if (value != "advisor") fatal(key " must equal advisor")
      return value
    }
    function validate_model(key, value, inner) {
      reject_yaml_features(value)
      if (value == "null") return "null"
      # A deliberately narrow portable identifier avoids implementing two
      # subtly different YAML and TOML string decoders in POSIX awk.
      if (value !~ /^[A-Za-z][A-Za-z0-9._\/-]*$/)
        fatal(key " must be null or a portable unquoted model identifier")
      return value
    }
    function validate_attempt(key, value, number) {
      if (value !~ /^[1-9]$/ && value != "10") fatal(key " must be an integer from 1 through 10")
      return value
    }
    function validate_policy(key, value) {
      reject_yaml_features(value)
      if (value != "manual" && value != "advisor" && value != "fully_automatic")
        fatal("invalid gate policy: " key)
      return value
    }
    function deprecated(key) {
      return key == "model" || key == "agent" || key == "policies" ||
             key == "retry_attempts" || key == "version" || key == "schema_version"
    }
    function removal(message) { print message >> removals }
    function emit_advisor(    default_policy) {
      default_policy = requested == "on" ? "advisor" : "manual"
      print "advisor:"
      print "  enabled: " (requested == "on" ? "true" : "false")
      print "  gate_policies:"
      print "    phase-exit: " ("phase-exit" in policy ? policy["phase-exit"] : default_policy)
      print "    optional-phase: " ("optional-phase" in policy ? policy["optional-phase"] : default_policy)
      print "    clarify: " ("clarify" in policy ? policy["clarify"] : default_policy)
      print "    convergence: " ("convergence" in policy ? policy["convergence"] : default_policy)
      print "    verify-matrix: " ("verify-matrix" in policy ? policy["verify-matrix"] : default_policy)
      print "  advisor_agent: " (advisor_agent == "" ? "advisor" : advisor_agent)
      print "  advisor_model: " (advisor_model == "" ? "null" : advisor_model)
      print "  arbiter_agent: " (arbiter_agent == "" ? "advisor" : arbiter_agent)
      print "  arbiter_model: " (arbiter_model == "" ? "null" : arbiter_model)
      print "  arbiter_enabled_on_disagreement: " (arbiter_disagreement == "" ? "true" : arbiter_disagreement)
      print "  retry:"
      print "    advisor_attempts: " (advisor_attempts == "" ? "3" : advisor_attempts)
      print "    arbiter_attempts: " (arbiter_attempts == "" ? "3" : arbiter_attempts)
      print "    backoff: " (backoff == "" ? "exponential" : backoff)
    }
    {
      lines[NR]=$0
      if ($0 !~ /^[[:space:]]/ && $0 !~ /^#/ && $0 != "" &&
          $0 !~ /^[A-Za-z0-9_-]+:[[:space:]]*/)
        fatal("non-canonical top-level YAML representation is not supported")
      if ($0 ~ /^(---|\.\.\.|%YAML([[:space:]]|$)|%TAG([[:space:]]|$))/)
        fatal("YAML directives and document markers are not supported")
      if ($0 ~ /^advisor[[:space:]]+:/ ||
          $0 ~ /^(["]advisor["]|[\047]advisor[\047]|!!str[[:space:]]+advisor)[[:space:]]*:/ ||
          $0 ~ /^[?][[:space:]]+(advisor|["]advisor["]|[\047]advisor[\047])[[:space:]]*$/)
        fatal("top-level advisor key must use the canonical plain representation")
      if ($0 ~ /^advisor:/ && $0 !~ /^advisor:[[:space:]]*(#.*)?$/)
        fatal("top-level advisor must be a mapping")
      if ($0 ~ /^advisor:[[:space:]]*(#.*)?$/) {
        if (advisor_start) fatal("duplicate top-level advisor key")
        advisor_start=NR
      }
    }
    END {
      if (failed) exit 42
      advisor_end=advisor_start
      if (advisor_start) {
        for (i=advisor_start+1; i<=NR; i++) {
          if (lines[i] != "" && lines[i] !~ /^[[:space:]]/ && lines[i] !~ /^#/) break
          if (lines[i] ~ /^#/) break
          advisor_end=i
        }
        section=""
        for (i=advisor_start+1; i<=advisor_end; i++) {
          line=lines[i]
          if (line == "" || line ~ /^[[:space:]]*#/) continue
          if (line ~ /\t/ || line ~ /[[:space:]]+$/) fatal("non-canonical whitespace in advisor subtree")
          if (line ~ /^  <<:/) fatal("YAML merge keys are not supported")
          if (line ~ /^  [A-Za-z0-9_-]+:[[:space:]]*/) {
            key=simple_key(line, "  ")
            duplicate(key, "root")
            value=scalar(line)
            section=""
            if (key == "gate_policies") {
              if (value != "" && value != "{}") fatal("gate_policies must be a mapping")
              section="policies"
            } else if (key == "retry") {
              if (value != "") fatal("retry must be a mapping")
              section="retry"
            } else if (key == "enabled") validate_boolean(key, value)
            else if (key == "advisor_agent") advisor_agent=validate_agent(key, value)
            else if (key == "advisor_model") advisor_model=validate_model(key, value)
            else if (key == "arbiter_agent") arbiter_agent=validate_agent(key, value)
            else if (key == "arbiter_model") arbiter_model=validate_model(key, value)
            else if (key == "arbiter_enabled_on_disagreement") arbiter_disagreement=validate_boolean(key, value)
            else if (deprecated(key)) fatal("deprecated advisor field: " key)
            else {
              reject_yaml_features(value)
              if (value == "" || value ~ /[\[\]{},]/) fatal("unsupported advisor field is not simple: " key)
              removal("removed unsupported advisor field: " key)
            }
          } else if (line ~ /^    [A-Za-z0-9_-]+:[[:space:]]*/) {
            key=simple_key(line, "    ")
            value=scalar(line)
            if (section == "policies") {
              duplicate(key, "policies")
              if (key == "phase-exit" || key == "optional-phase" || key == "clarify" ||
                  key == "convergence" || key == "verify-matrix") policy[key]=validate_policy(key, value)
              else {
                reject_yaml_features(value)
                if (value == "" || value ~ /[\[\]{},]/) fatal("unsupported gate policy is not simple: " key)
                validate_policy(key, value)
                removal("removed unsupported gate policy: " key)
              }
            } else if (section == "retry") {
              duplicate(key, "retry")
              if (key == "advisor_attempts") advisor_attempts=validate_attempt(key, value)
              else if (key == "arbiter_attempts") arbiter_attempts=validate_attempt(key, value)
              else if (key == "backoff") {
                if (value != "exponential") fatal("backoff must equal exponential")
                backoff=value
              } else {
                reject_yaml_features(value)
                if (value == "") fatal("unsupported retry field is not simple: " key)
                removal("removed unsupported retry field: " key)
              }
            } else fatal("unexpected nested advisor field: " key)
          } else fatal("invalid advisor subtree structure")
        }
      }
      if (!advisor_start) {
        for (i=1; i<=NR; i++) print lines[i]
        emit_advisor()
      } else {
        for (i=1; i<advisor_start; i++) print lines[i]
        emit_advisor()
        for (i=advisor_end+1; i<=NR; i++) print lines[i]
      }
    }
  ' "$config" >"$candidate_tmp" || die "validation failed; original was not changed"

  chmod --reference="$config" "$candidate_tmp" 2>/dev/null || chmod "$(stat -f '%Lp' "$config" 2>/dev/null || stat -c '%a' "$config")" "$candidate_tmp"
  mv "$candidate_tmp" "$destination"
  mv "$removals_tmp" "$removals"
  trap - EXIT
}

backup_file() {
  source=$1 backup=$2
  same_directory "$source" "$backup" || die "backup must be beside config"
  fail_if_injected backup
  temporary=$(mktemp "$(dirname "$source")/.advisor-backup.XXXXXX")
  cp -p "$source" "$temporary"
  mv "$temporary" "$backup"
}

commit_file() {
  target=$1 candidate=$2
  same_directory "$target" "$candidate" || die "commit candidate must be beside config"
  fail_if_injected commit
  if cmp -s "$target" "$candidate"; then
    rm -f "$candidate"
    echo noop
  else
    mv "$candidate" "$target"
    echo replaced
  fi
}

restore_file() {
  target=$1 backup=$2
  same_directory "$target" "$backup" || die "restore backup must be beside config"
  test -f "$backup" || die "backup does not exist: $backup"
  fail_if_injected restore
  temporary=$(mktemp "$(dirname "$target")/.advisor-restore.XXXXXX")
  cp -p "$backup" "$temporary"
  mv "$temporary" "$target"
}

resolve_flags() {
  local current can_ask selected argument value
  current=$1 can_ask=$2
  shift 2
  selected=
  for argument in "$@"; do
    case "$argument" in
      --advisor=on) value=on ;;
      --advisor=off) value=off ;;
      --advisor=*) die "--advisor accepts only on or off" ;;
      *) die "unexpected Advisor argument: $argument" ;;
    esac
    test -z "$selected" || test "$selected" = "$value" || die "contradictory --advisor values"
    selected=$value
  done
  if test -n "$selected"; then
    printf '%s\n' "$selected"
  elif test "$can_ask" = yes; then
    case "${MAISTER_ADVISOR_ANSWER:-}" in
      on|off) printf '%s\n' "$MAISTER_ADVISOR_ANSWER" ;;
      '') die "interactive Advisor choice required (recommended: ${current/absent/off})" ;;
      *) die "interactive Advisor answer must be on or off" ;;
    esac
  elif test "$can_ask" = no; then
    printf '%s\n' off
  else
    die "host question availability must be yes or no"
  fi
}

validate_toml() {
  local toml
  toml=$1
  test -f "$toml" || return 0
  awk '
    function fatal(message) { print "advisor config: " message > "/dev/stderr"; exit 42 }
    function remember(key) { if (seen[key]++) fatal("duplicate TOML key: " key) }
    BEGIN { multiline=0 }
    multiline {
      if ($0 == "\"\"\"") multiline=0
      next
    }
    /^[[:space:]]*$/ || /^[[:space:]]*#/ { next }
    /^\[/ { fatal("TOML tables and arrays are not supported") }
    {
      if ($0 !~ /^[a-z_]+[[:space:]]*=/) fatal("malformed Advisor TOML")
      key=$0; sub(/[[:space:]]*=.*/, "", key); remember(key)
      value=$0; sub(/^[^=]*=[[:space:]]*/, "", value)
      if (value ~ /^\[/ || value ~ /^\{/) fatal("TOML arrays and inline tables are not supported")
      if (key != "name" && key != "description" && key != "model" &&
          key != "sandbox_mode" && key != "developer_instructions") next
      if (key == "developer_instructions" && value == "\"\"\"") { multiline=1; next }
      if (value !~ /^"([^"\\]|\\.)*"$/) fatal(key " must be a TOML string")
      plain=value; sub(/^"/, "", plain); sub(/"$/, "", plain)
      if (key == "name" && plain != "advisor") fatal("name must equal advisor")
      if (key == "sandbox_mode" && plain != "read-only") fatal("sandbox_mode must equal read-only")
      if ((key == "description" || key == "model") && plain == "") fatal(key " must be non-empty")
    }
    END { if (multiline) fatal("unterminated TOML multiline string") }
  ' "$toml" || die "TOML validation failed; originals were not changed"
}

build_toml_candidate() {
  local original model template destination removals temporary
  original=$1 model=$2 template=$3 destination=$4 removals=$5
  test -f "$template" || die "Advisor TOML template not found: $template"
  same_directory "$destination" "$removals" || die "TOML candidate and report must share a directory"
  fail_if_injected staging
  validate_toml "$original"
  validate_toml "$template"
  temporary=$(mktemp "$(dirname "$destination")/.advisor-toml.XXXXXX")
  if test "$model" = inherit; then
    if ! cp "$template" "$temporary"; then rm -f "$temporary"; die "failed to stage Advisor TOML"; fi
  else
    if test -z "$model"; then rm -f "$temporary"; die "Advisor model must be inherit or non-empty"; fi
    if ! awk -v model="$model" '
      /^model = / { gsub(/\\/, "\\\\", model); gsub(/"/, "\\\"", model); print "model = \"" model "\""; next }
      { sub(/[[:space:]]+$/, ""); print }
    ' "$template" >"$temporary"; then rm -f "$temporary"; die "failed to stage Advisor TOML"; fi
  fi
  if test -f "$original"; then
    if ! { chmod --reference="$original" "$temporary" 2>/dev/null || chmod "$(stat -f '%Lp' "$original" 2>/dev/null || stat -c '%a' "$original")" "$temporary"; }; then
      rm -f "$temporary"; die "failed to preserve Advisor TOML mode"
    fi
  fi
  printf 'removed unsupported TOML field: %s\n' "$(awk -F= '/^[a-z_]+[[:space:]]*=/{key=$1; gsub(/[[:space:]]/,"",key); if (key!="name"&&key!="description"&&key!="model"&&key!="sandbox_mode"&&key!="developer_instructions") print key}' "$original" 2>/dev/null)" | sed '/: $/d' >"$removals"
  if ! mv "$temporary" "$destination"; then rm -f "$temporary"; die "failed to publish staged Advisor TOML"; fi
}

advisor_model_from_candidate() {
  local value
  value=$(awk '/^  advisor_model: / { sub(/^  advisor_model: /, ""); print; exit }' "$1")
  if test "$value" = null; then
    printf '%s\n' inherit
  else
    printf '%s\n' "$value"
  fi
}

remove_created_codex_directories() {
  local agents codex
  agents=$1 codex=$2
  test "$agents" != yes || rmdir "$3" 2>/dev/null || true
  test "$codex" != yes || rmdir "$(dirname "$3")" 2>/dev/null || true
}

cleanup_transaction_artifacts() {
  local preserve_recovery item
  preserve_recovery=$1
  shift
  for item in "$@"; do
    test -n "$item" || continue
    if test "$preserve_recovery" = yes &&
       { test "$item" = "${yaml_backup:-}" || test "$item" = "${toml_backup:-}" || test "$item" = "${toml_tombstone:-}"; }; then
      continue
    fi
    rm -f "$item" 2>/dev/null || true
  done
}

advisor_toml_mv() {
  "${MAISTER_ADVISOR_MV_COMMAND:-mv}" "$@"
}

effective_summary() {
  local config host action
  config=$1 host=$2 action=$3
  awk -v host="$host" -v action="$action" '
    /^  enabled:/ { enabled=$2 }
    /^    (phase-exit|optional-phase|clarify|convergence|verify-matrix):/ { policy[$1]=$2 }
    /^  advisor_agent:/ { advisor_agent=$2 }
    /^  advisor_model:/ { advisor_model=$2 }
    /^  arbiter_agent:/ { arbiter_agent=$2 }
    /^  arbiter_model:/ { arbiter_model=$2 }
    /^  arbiter_enabled_on_disagreement:/ { disagreement=$2 }
    /^    advisor_attempts:/ { advisor_attempts=$2 }
    /^    arbiter_attempts:/ { arbiter_attempts=$2 }
    /^    backoff:/ { backoff=$2 }
    END {
      if (advisor_model == "null") advisor_model="inherit"
      if (arbiter_model == "null") arbiter_model="inherit"
      printf "Advisor enabled: %s\n", (enabled == "true" ? "on" : "off")
      printf "policies: phase-exit=%s, optional-phase=%s, clarify=%s, convergence=%s, verify-matrix=%s\n", policy["phase-exit:"], policy["optional-phase:"], policy["clarify:"], policy["convergence:"], policy["verify-matrix:"]
      printf "roles: advisor=%s (model=%s), arbiter=%s (model=%s)\n", advisor_agent, advisor_model, arbiter_agent, arbiter_model
      printf "arbiter: disagreement=%s, advisor_attempts=%s, arbiter_attempts=%s, backoff=%s\n", disagreement, advisor_attempts, arbiter_attempts, backoff
      printf "Codex TOML action: %s\n", action
      printf "capability posture: host=%s, automatic-continuation=capability-matrix-controlled\n", host
    }
  ' "$config"
}

run_init_transaction() {
  local config host can_ask answer template current effective directory
  local yaml_candidate yaml_removals yaml_backup toml toml_candidate toml_backup toml_removals toml_existed second_status
  local toml_tombstone toml_action codex_created agents_created rollback_failed
  local critical_recovery
  config=$1 host=$2 can_ask=$3 answer=$4 template=$5
  shift 5
  case "$host" in codex|non-codex) ;; *) die "host signal must be codex or non-codex" ;; esac
  current=$(awk '/^  enabled: true$/ { print "on"; found=1; exit } /^  enabled: false$/ { print "off"; found=1; exit } END { if (!found) print "absent" }' "$config")
  if test "$answer" != -; then export MAISTER_ADVISOR_ANSWER=$answer; fi
  effective=$(resolve_flags "$current" "$can_ask" "$@")

  directory=$(dirname "$config")
  critical_recovery=no
  yaml_candidate=$(mktemp "$directory/.advisor-yaml-candidate.XXXXXX"); rm -f "$yaml_candidate"
  yaml_removals=$(mktemp "$directory/.advisor-yaml-removals.XXXXXX"); rm -f "$yaml_removals"
  yaml_backup=$(mktemp "$directory/.advisor-yaml-backup.XXXXXX"); rm -f "$yaml_backup"
  toml_candidate= toml_backup= toml_removals= toml_tombstone=
  build_candidate "$config" "$effective" "$yaml_candidate" "$yaml_removals"
  trap 'cleanup_transaction_artifacts "$critical_recovery" "$yaml_candidate" "$yaml_removals" "$yaml_backup" "$toml_candidate" "$toml_backup" "$toml_removals" "$toml_tombstone"' EXIT

  toml= toml_candidate= toml_backup= toml_removals= toml_tombstone= toml_existed=no
  toml_action=not-applicable codex_created=no agents_created=no
  if test "$host" = codex; then
    toml="$directory/../.codex/agents/advisor.toml"
    toml_candidate=$(mktemp "$directory/.advisor-toml-candidate.XXXXXX"); rm -f "$toml_candidate"
    toml_backup=$(mktemp "$directory/.advisor-toml-backup.XXXXXX"); rm -f "$toml_backup"
    toml_removals=$(mktemp "$directory/.advisor-toml-removals.XXXXXX"); rm -f "$toml_removals"
    if test -e "$toml"; then toml_existed=yes; validate_toml "$toml"; cp -p "$toml" "$toml_backup"; fi
    if test "$effective" = on; then build_toml_candidate "$toml" "$(advisor_model_from_candidate "$yaml_candidate")" "$template" "$toml_candidate" "$toml_removals"; fi
  fi
  fail_if_injected staging
  cp -p "$config" "$yaml_backup"

  if test "${MAISTER_ADVISOR_FAIL:-}" = first-replace; then die "injected first-replace failure"; fi
  commit_file "$config" "$yaml_candidate" >/dev/null
  if test "$host" = codex; then
    if test "${MAISTER_ADVISOR_FAIL:-}" = second-action; then second_status=1
    elif test "$effective" = on; then
      if test -e "$toml" && cmp -s "$toml" "$toml_candidate"; then
        rm -f "$toml_candidate"; second_status=0; toml_action=noop
      else
        if test ! -d "$(dirname "$(dirname "$toml")")"; then
          if mkdir "$(dirname "$(dirname "$toml")")"; then codex_created=yes; else second_status=1; fi
        fi
        if test "${second_status:-0}" -eq 0 && test ! -d "$(dirname "$toml")"; then
          if mkdir "$(dirname "$toml")"; then agents_created=yes; else second_status=1; fi
        fi
        if test "${second_status:-0}" -eq 0; then
          if test "${MAISTER_ADVISOR_FAIL:-}" = toml-action || ! advisor_toml_mv "$toml_candidate" "$toml"; then
            second_status=1
          else
            second_status=0
            if test "$toml_existed" = yes; then toml_action=replaced; else toml_action=created; fi
          fi
        fi
      fi
    elif test -e "$toml"; then
      toml_tombstone=$(mktemp "$(dirname "$toml")/.advisor-delete.XXXXXX"); rm -f "$toml_tombstone"
      if test "${MAISTER_ADVISOR_FAIL:-}" = toml-action || ! advisor_toml_mv "$toml" "$toml_tombstone"; then second_status=1
      else second_status=0; toml_action=deleted; fi
    else second_status=0; toml_action=noop
    fi
    if test "$second_status" -eq 0 && test "$toml_action" = deleted; then
      if test "${MAISTER_ADVISOR_FAIL:-}" = toml-cleanup || ! rm -f "$toml_tombstone"; then second_status=1
      else toml_tombstone=
      fi
    fi
    if test "$second_status" -ne 0; then
      rollback_failed=no
      if test "${MAISTER_ADVISOR_ROLLBACK_FAIL:-no}" = yes || ! restore_file "$config" "$yaml_backup"; then rollback_failed=yes; fi
      if test "$toml_existed" = yes; then
        if test -n "$toml_tombstone" && test -e "$toml_tombstone"; then
          if ! mv "$toml_tombstone" "$toml"; then rollback_failed=yes; fi
        elif ! cp -p "$toml_backup" "$toml"; then rollback_failed=yes
        fi
      elif test -e "$toml" && ! rm -f "$toml"; then rollback_failed=yes
      fi
      remove_created_codex_directories "$agents_created" "$codex_created" "$(dirname "$toml")"
      if test "$rollback_failed" = yes; then
        critical_recovery=yes
        die "CRITICAL: rollback failed; recover YAML from $yaml_backup and TOML from $toml_backup (delete tombstone: ${toml_tombstone:-none})"
      fi
      die "second Advisor artifact action failed; exact original state restored"
    fi
  fi
  cat "$yaml_removals" >&2
  test -z "$toml_removals" || test ! -f "$toml_removals" || cat "$toml_removals" >&2
  rm -f "$yaml_backup" "$yaml_removals" "$toml_backup" "$toml_removals" "$toml_tombstone"
  trap - EXIT
  effective_summary "$config" "$host" "$toml_action"
}

command=${1:-}
case "$command" in
  resolve-flags)
    test "$#" -ge 3 || die "usage: resolve-flags CURRENT yes|no [--advisor=on|off ...]"
    shift; resolve_flags "$@"
    ;;
  toml-candidate)
    test "$#" -eq 6 || die "usage: toml-candidate ORIGINAL MODEL TEMPLATE CANDIDATE REMOVALS"
    build_toml_candidate "$2" "$3" "$4" "$5" "$6"
    ;;
  init)
    test "$#" -ge 6 || die "usage: init CONFIG codex|non-codex yes|no ANSWER|- TEMPLATE [--advisor=on|off ...]"
    shift; run_init_transaction "$@"
    ;;
  candidate)
    test "$#" -eq 5 || die "usage: candidate CONFIG on|off CANDIDATE REMOVALS"
    build_candidate "$2" "$3" "$4" "$5"
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
    directory=$(dirname "$2")
    candidate=$(mktemp "$directory/.advisor-candidate-output.XXXXXX")
    removals=$(mktemp "$directory/.advisor-removals-output.XXXXXX")
    rm -f "$candidate" "$removals"
    build_candidate "$2" "$3" "$candidate" "$removals"
    cat "$removals" >&2
    rm -f "$removals"
    commit_file "$2" "$candidate"
    ;;
  *) die "expected resolve-flags, toml-candidate, init, candidate, backup, commit, restore, or reconcile" ;;
esac
