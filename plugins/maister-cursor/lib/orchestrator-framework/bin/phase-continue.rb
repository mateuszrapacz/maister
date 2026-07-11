#!/usr/bin/env ruby
# frozen_string_literal: true

require "cgi"
require "digest"
require "fileutils"
require "json"
require "optparse"
require "tempfile"
require "yaml"

DENYLIST = %w[
  rollback data-integrity-halt scope-expansion unresolved-critical-verification
  failure-recovery-skip final-handoff-approval implementation-approval
  production-go-no-go
].freeze

options = {}
OptionParser.new do |parser|
  parser.on("--state PATH") { |value| options[:state] = value }
  parser.on("--phase-id ID") { |value| options[:phase_id] = value }
  parser.on("--gate-type TYPE") { |value| options[:gate_type] = value }
  parser.on("--question QUESTION") { |value| options[:question] = value }
  parser.on("--options-json JSON") { |value| options[:gate_options] = JSON.parse(value) }
  parser.on("--selected-option OPTION") { |value| options[:selected_option] = value }
  parser.on("--actor ACTOR") { |value| options[:actor] = value }
  parser.on("--confidence LEVEL") { |value| options[:confidence] = value }
  parser.on("--next-phase ID") { |value| options[:next_phase] = value }
  parser.on("--report-md PATH") { |value| options[:report_md] = value }
  parser.on("--report-html PATH") { |value| options[:report_html] = value }
end.parse!

required = %i[state phase_id gate_type question gate_options selected_option actor confidence]
missing = required.reject { |key| options.key?(key) }
abort("missing required options: #{missing.join(", ")}") unless missing.empty?

def fail_with(message)
  warn("phase_continue: #{message}")
  exit(2)
end

fail_with("options must be a non-empty array of unique strings") unless
  options[:gate_options].is_a?(Array) && !options[:gate_options].empty? &&
  options[:gate_options].all? { |value| value.is_a?(String) && !value.empty? } &&
  options[:gate_options].uniq.length == options[:gate_options].length
fail_with("selected option is not in the supplied option set") unless options[:gate_options].include?(options[:selected_option])
fail_with("confidence must be high or medium") unless %w[high medium].include?(options[:confidence])
fail_with("actor must be advisor or arbiter") unless %w[advisor arbiter].include?(options[:actor])

def atomic_write(path, content)
  FileUtils.mkdir_p(File.dirname(path))
  temporary = Tempfile.new([File.basename(path), ".tmp"], File.dirname(path))
  begin
    temporary.write(content)
    temporary.flush
    temporary.fsync
    temporary.close
    File.rename(temporary.path, path)
  ensure
    temporary.close! unless temporary.closed?
  end
end

state = YAML.safe_load(File.read(options[:state]), aliases: false) || {}
orchestrator = state["orchestrator"] ||= {}
history = orchestrator["gate_history"] ||= []
canonical = JSON.generate([options[:phase_id], options[:gate_type], options[:question], options[:gate_options]])
idempotency_key = "sha256:#{Digest::SHA256.hexdigest(canonical)}"

terminal = history.find do |entry|
  entry["idempotency_key"] == idempotency_key && %w[decided blocked failed].include?(entry["status"])
end
if terminal
  puts JSON.generate(status: "reused", idempotency_key: idempotency_key, selected_option: terminal["selected_option"], continuation: terminal["continuation"])
  exit(0)
end

record = {
  "schema_version" => 1,
  "idempotency_key" => idempotency_key,
  "phase_id" => options[:phase_id],
  "gate_type" => options[:gate_type],
  "question" => options[:question],
  "options" => options[:gate_options],
  "status" => "decided",
  "selected_option" => options[:selected_option],
  "final_actor" => options[:actor],
  "original_recommendation" => options[:selected_option],
  "rationale" => "Validated fully automatic continuation.",
  "confidence" => options[:confidence],
  "escalate_to_user" => false,
  "user_override" => false,
  "continuation" => "phase_continue",
  "error" => nil
}

if DENYLIST.include?(options[:gate_type])
  record["status"] = "blocked"
  record["final_actor"] = "system"
  record["selected_option"] = nil
  record["continuation"] = nil
  record["error"] = "denylisted gate requires an explicit user gate"
end

history << record
atomic_write(options[:state], YAML.dump(state))

def render_reports(state, markdown_path, html_path)
  return if markdown_path.nil? && html_path.nil?

  history = state.fetch("orchestrator", {}).fetch("gate_history", [])
  markdown = <<~MARKDOWN.dup
    # Decision Summary

    ## TL;DR

    #{history.length} persisted gate decision(s). The report is generated from `orchestrator-state.yml`.

    ## Gate History

    | Gate | Status | Selected option | Actor | Continuation |
    |---|---|---|---|---|
  MARKDOWN
  history.each do |entry|
    markdown << "| #{entry['gate_type']} | #{entry['status']} | #{entry['selected_option'] || '—'} | #{entry['final_actor']} | #{entry['continuation'] || '—'} |\n"
  end
  atomic_write(markdown_path, markdown) if markdown_path

  return unless html_path

  rows = history.map do |entry|
    cells = %w[gate_type status selected_option final_actor continuation].map do |key|
      "<td>#{CGI.escapeHTML((entry[key] || "—").to_s)}</td>"
    end.join
    "<tr>#{cells}</tr>"
  end.join
  html = "<!doctype html><meta charset=\"utf-8\"><title>Decision Summary</title><h1>Decision Summary</h1><table><thead><tr><th>Gate</th><th>Status</th><th>Selected option</th><th>Actor</th><th>Continuation</th></tr></thead><tbody>#{rows}</tbody></table>"
  atomic_write(html_path, html)
end

render_reports(state, options[:report_md], options[:report_html])

if record["status"] == "decided" && options[:next_phase]
  phases = state["phases"] || []
  current = phases.find { |phase| phase["id"] == options[:phase_id] }
  next_phase = phases.find { |phase| phase["id"] == options[:next_phase] }
  current["status"] = "completed" if current
  next_phase["status"] = "in_progress" if next_phase
  completed = orchestrator["completed_phases"] ||= []
  completed << options[:phase_id] unless completed.include?(options[:phase_id])
  orchestrator["current_phase"] = options[:next_phase]
  atomic_write(options[:state], YAML.dump(state))
end

if record["status"] == "blocked"
  warn("phase_continue: #{record['error']}")
  exit(3)
end

puts JSON.generate(status: "decided", idempotency_key: idempotency_key, selected_option: options[:selected_option], continuation: "phase_continue")
