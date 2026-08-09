# Rule: Verification commands

TBD - this repo is greenfield and has no toolchain yet, so there are no verification commands to run. Fill this file in with the real commands (one per line, each with a one-phrase purpose) as part of the same change that introduces the stack, for example:

```
<typecheck command>   # types are sound
<lint command>        # style and lint clean
<test command>        # tests pass
```

Until then, do not invent commands: if a task changes code and this file still says TBD, say so rather than running a guessed command.

The implementer runs these after every code-changing task; the reviewer runs them before approving. If a command here stops matching reality, fix this file in the same change.
