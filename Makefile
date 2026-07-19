SHELL := /bin/bash

TARGET ?= codex
ifneq ($(origin SUPPORTED_TARGETS),undefined)
$(error SUPPORTED_TARGETS is not configurable; targets are owned by plugins/maister/lib/distribution/targets.mjs)
endif
DIST_DIR ?= dist
SOURCE_DATE_EPOCH ?= $(shell git log -1 --format=%ct 2>/dev/null || date +%s)
SOURCE_COMMIT ?= $(shell git rev-parse HEAD 2>/dev/null || true)
SOURCE_VERSION ?= $(shell if test -f VERSION; then cat VERSION; else echo unknown; fi)
E3_ATTESTATION ?=
E3_OUTPUT ?=
E3_RESULT ?=
E3_TEST_COMMAND ?= make test-core test-runtime
E3_SCENARIO_VERSION ?= 1.0.0
E3_EXPIRES_AT ?=
PARITY_ORACLE ?= tests/fixtures/platform-independent/parity-oracle/manifest.json
PARITY_ALLOW_DIRTY_LOCAL ?= 0
PARITY_REPORT ?=

export TARGET DIST_DIR SOURCE_DATE_EPOCH SOURCE_COMMIT SOURCE_VERSION
export E3_ATTESTATION E3_OUTPUT E3_RESULT E3_TEST_COMMAND E3_SCENARIO E3_SCENARIO_VERSION E3_EXPIRES_AT
export MAISTER_E3_ATTESTATION
export PARITY_ORACLE PARITY_ALLOW_DIRTY_LOCAL PARITY_REPORT
export HOME MAISTER_ALLOW_DIRTY_LOCAL

.PHONY: check-cursor-projection test-platform-independent test-core test-runtime test-targets generate-e3-attestation test-overlay test-materializer test-install test-evidence test-parity test-parity-release test-topology test validate package install

check-cursor-projection:
	node plugins/maister/bin/generate-cursor-skills.mjs --check

test-platform-independent:
	node --test tests/platform-independent/*.test.mjs

test-core:
	node --test tests/platform-independent/overlay-contract.test.mjs tests/platform-independent/source-materializer.test.mjs tests/platform-independent/installer-transaction.test.mjs

test-runtime:
	node --test tests/platform-independent/agent-execution-events.test.mjs tests/platform-independent/agent-resolver.test.mjs tests/platform-independent/agent-adapters.test.mjs tests/platform-independent/agent-runtime-composition.test.mjs
	bash tests/gate-evaluator.test.sh

generate-e3-attestation:
	node plugins/maister/bin/release-interface.mjs generate-e3

test-overlay:
	node plugins/maister/bin/release-interface.mjs validate-overlay

test-materializer:
	node --test tests/platform-independent/source-materializer.test.mjs

test-install:
	node --test tests/platform-independent/installer-transaction.test.mjs

test-targets:
	$(MAKE) --no-print-directory test-overlay TARGET=codex
	$(MAKE) --no-print-directory test-overlay TARGET=cursor
	$(MAKE) --no-print-directory test-overlay TARGET=kiro-cli
	$(MAKE) --no-print-directory test-materializer
	$(MAKE) --no-print-directory test-install

test-evidence:
	node --test tests/platform-independent/evidence-parity-topology.test.mjs

test-parity: test-parity-release

test-parity-release:
	node plugins/maister/bin/release-interface.mjs parity-release

test-topology:
	node plugins/maister/bin/release-interface.mjs topology

test: test-core test-runtime test-evidence test-topology

validate: check-cursor-projection
	node plugins/maister/bin/release-interface.mjs validate-overlays
	$(MAKE) --no-print-directory test

package: check-cursor-projection
	node plugins/maister/bin/release-interface.mjs package

install:
	node plugins/maister/bin/release-interface.mjs install
