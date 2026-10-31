# Initial Archive Extraction Recovery

The first command was:

```bash
python /tmp/alive-presentation-publish-dya4lhw0/build_install.py 1b6cb68b2e379eaaa3fa87f5bca2741a180283db
```

It failed before compilation while extracting the complete208MB archive in
`/tmp`; `tar` reported `Cannot write: Disk quota exceeded` and exited2. The
original tool output includes:

```text
tar: experiments/max-reference/int-float-runtime-20261022/test_numeric.py: Wrote only 5632 of 10240 bytes
tar: experiments/max-reference/int-float-runtime-20261022/test_prepare.py: Cannot write: Disk quota exceeded
tar: Exiting with failure status due to previous errors
subprocess.CalledProcessError: Command '['tar', '-xf', '/tmp/alive-presentation-publish-dya4lhw0/source.tar', '-C', '/tmp/alive-presentation-publish-dya4lhw0/source']' returned non-zero exit status 2.
```

Only this owned partial `source/` and `source.tar` were removed. The prepared
run directory was moved to
`/home/venetanji/.cache/alive-verification/presentation-publish-dya4lhw0`, with
the original `/tmp` name retained as a symlink. The unchanged runner resolves
its own path, so a new complete archive was extracted on the disk-backed
filesystem. Every8759 tracked blob verified before and after both builds;
the installed artifacts/resources verified too. See `initial-1b6cb68/`.
No selective archive or reduced verification was necessary.

The final config-fixed build uses another fresh disk-backed run,
`/home/venetanji/.cache/alive-verification/presentation-publish-compact-fwkhm2op`,
with the identical runner. Both previous installations, old archives, previous
evidence, the frozen native library, and the other source tree remain intact.
