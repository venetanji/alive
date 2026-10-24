### Task 13: Measure And Admit Eight Tracks

Add bounded callback timing/error observability and retain per-stream epochs
through reconfiguration. Record CPU ticks, PSS, process/worker counts, callback
duration/actual buffer budgets and available audio errors. Distinguish callback
processing cost from scheduling lateness, software loopback and physical xruns.

Measure initial 2/6, then internal 4/8 and 8/16 actual-kernel fixtures before
enabling the eight-track profile in the same v3 ABI. Include uneven two-effect
chains, full admitted voices/events/parameters, short loops, aligned switches,
seek/reset/chase and publication. Preserve sixteen roots; eight instruments
plus nine effects rejects before dependency access. Keep event limits explicit:
eight simultaneous triads plus two automation points each is 40 events and must
reject the 32/frame cap. Never shift authored timing or raise limits to pass.
Report distributions/maxima and practical negotiated desktop buffers; proposed
50% p99.9 headroom is advisory, not an invented user gate. Test an actual native
eight-track clip/chain workflow. The final 30-minute soak belongs to Task 15.
