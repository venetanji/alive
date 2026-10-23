# Preparation008 Python Fixture Fix2 Independent Rereview

Date: 2026-10-23 (Asia/Hong_Kong).

## Findings And Verdicts

No remaining finding in this scoped test-only diff. The private-payload temporary-storage P2 is **ADDRESSED** for the exact two extraction tests. Specification verdict: **PASS**. Code-quality verdict: **PASS**, scoped to the storage correction and regressions introduced by its helpers/decorators. The two original production P2 findings remain addressed, with `arithmetic.py` unchanged at its reviewed fix1 hash.

The tests at `test_preparation.py:618` and `test_preparation.py:642` no longer create temporary fixture directories or initialize/read raw fixture files on disk. Genuine failed007 bytes are read-only at their original private path; success-shaped and mutated payloads also remain in memory. `extraction_memory_storage` at `test_preparation.py:427` supplies input bytes from a dictionary and captures retained bytes in `BytesIO`. Its virtual paths are dictionary keys only; no directory or file is created for them.

The real production `extract_checkpoint` and `retain_raw` execute. Only private-work/path/read and low-level retained-file descriptor operations are substituted. The virtual open accepts the exact expected retained path, exclusive/no-follow write flags and0600 mode, rejects unexpected paths/flags, and never delegates a write to the OS. Real `retain_raw` writes the buffer, flushes through the checked virtual descriptor boundary and calculates its normal SHA256/size binding. Raw parsing, trusted-context checks, raw/witness/checkpoint validation, refusal and request-record updates remain real.

The guard at `test_preparation.py:404` wraps both named tests before their fixtures run. It refuses temporary-directory allocation, ordinary write-mode file opens, write/create/truncate/append `os.open`, and directory/path mutations. During virtual retention, the narrower open boundary permits only the virtual retained path and still performs no OS write. `ExitStack` restores all patches after success or failure. These guards cover the actual storage paths used by the scoped tests; they are not presented as an operating-system sandbox.

## Regression Strength

The successful trusted-record control still reaches full production checkpoint validation. It now asserts the exact hash/size result, that only those two fields are added to the record, one retained write containing identical bytes, and unchanged input bytes. Every invalid/missing trusted-context control requires no retained write and no record change.

The refusal test preserves the genuine failed envelope, later-invalid success and forged-operation success cases. Each valid context requires one exact-byte retained write and exact session accounting before refusal; each invalid/missing context requires unchanged source bytes/record and no retained output. The original private failed file is reread after the virtual contexts and compared with its initial bytes. No admission, semantic validator or hashing function is mocked to make these assertions pass. All preceding008 controls remain unchanged.

Worker-reported safe RED added the write guard before converting fixtures: the focused pair ran2 tests and produced25 expected allocation-guard assertion failures, preventing the former temporary-directory creation before any private-byte write. After correction the same focused pair passes2/2 with zero failures/errors/skips. All8 `Preparation008Tests` also pass, and AST parsing succeeds. These results support a meaningful regression rather than a skipped or weakened check.

No suite or focused test was rerun here. The frozen diff and recorded focused results resolve the storage-specific doubt, and no additional concrete failure requiring a probe was found. Parent owns the later full integrated regression; this scoped review does not claim that a new full suite was run.

## Frozen Inputs And Scope

| Artifact | SHA256 |
| --- | --- |
| Python fix1 rereview | `37f214ac5e3426b7a3ee4fc5041cfebd84529a8303eede116a0e0505196d2cb0` |
| Python fix2 brief | `a436e31109930b5197ae00e27b2ac1b3882edfb30c00f690b4901c262b01266e` |
| Python fix2 report | `8459bde3d2e21c507362130f2b1a8fdf2abfc2678ad4a8c3e019fd4a00e6ad47` |
| Python fix2 diff | `c19d0b5249a6143306090569d5f9a90a45779b03a7aac1b0f331bc58a79c3d30` |
| Python fix2 map | `cdf31d55473b1ad139e6c4083d91b1b7e5b9c1650496e476fe2a7335da2a008e` |
| Frozen `test_preparation.py` | `2ce3bff6b5d47851398e3c7d62cfbf5ef4df05642c2f56291a515c056c94c762` |
| Preserved `arithmetic.py` | `f52c868b613ba66724711e83d81d89c25d09ea2978b1484eb0c7698440725812` |
| Immutable Python fix1 snapshot binding | `dcb8aaf81947a41fe92534e03c15b363849e9a3db4fb82eca2479e09b406573b` |

Read the frozen diff once, matching brief/report/map and prior privacy finding, retaining the accepted common/design/task-review boundaries. Only the two named tests, their directly required helpers and imports change. No outside-diff implementation body read or broad fixture review was needed; a narrow name search supplied current line references. Concurrent lifecycle implementation in its separately authorized pair is outside this freeze.

## Preservation And Remaining Gates

All26 private arithmetic inventories remain unchanged, including names, modes, sizes, mtimes, inodes, file hashes and link targets. Frozen test/production hashes, listed fix2 inputs, prior rereview and snapshot binding remain intact. The accepted007 audit and native exact-five inventory also remain unchanged. This review wrote only this report and created no raw fixture copy, temporary directory or private evidence root.

No code/private/history write, suite rerun, preparation, archive, launch, capture, commit or delegation occurs. Parent retains integrated verification, remaining task reviews and later preparation/capture gates. This pass is limited to the two extraction tests and does not establish broader fixture-storage coverage, live Max parity or qualification. Denominators and qualification0/2103 remain unchanged.
