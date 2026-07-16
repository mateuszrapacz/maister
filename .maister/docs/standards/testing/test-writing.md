# Test writing

Tests describe behavior at the common core and real host seams. Parameterize only overlay, materializer, installer, and native probe boundaries; do not duplicate the portable runtime suite for every host.

Choose test count from behavioral risk and distinct failure boundaries, not a fixed feature-test ceiling. Add strategic assertions when a critical contract is otherwise unproved and remove redundant parameterizations or count-based maintenance assumptions.

Evidence tests must distinguish `passed`, `failed`, and `unavailable`, exercise expiry and renewal, and prove semantic fail-closed behavior. Topology tests must classify expected packaging differences and fail on unresolved semantic, inventory, reference, hook, permission, symlink, or topology changes.

Transactional tests snapshot every affected file before invalid-input and injected-failure cases, then compare bytes, modes, symlinks, existence, and directory topology after rollback. Exit codes alone are insufficient evidence of recovery.

Concurrency tests distinguish cooperating installer processes from external writers. Locks must serialize the former; identity/drift checks must reject observed external races. Tests and documentation must not imply atomicity against arbitrary malicious same-user or privileged mutation.

Release tests exercise the artifact boundary: build each target twice with a fixed source timestamp, compare archive hashes, assert runtime/source closure and target isolation, extract each archive in a clean directory, and run packaged install, verify, and uninstall for Codex, Cursor, and Kiro CLI. The release workflow also generates `SHA256SUMS`; fixture-based checkout tests cannot substitute for this smoke.

CI evidence tests must distinguish a preinstalled native runtime from an unavailable runtime. A missing executable, authentication context, safe adapter, or configured versioned scenario must produce an explicit `unavailable`/provisional record; tests must not install code from an unpinned remote script or turn a swallowed failure into a pass. Unavailable E5/E6 never certifies host-native discovery or semantics.
