# 001 — Tasks

- [x] T1 Router: unknown `/nope` → ephemeral "Unknown command" (unit, mock interaction)
- [x] T2 Router: command `execute` throws → error logged, no unhandled rejection
- [x] T3 Deploy script: guild deploy when `DISCORD_GUILD_ID` set, else global (pure `resolveDeployTarget`, unit-tested)
- [x] T4 Live acceptance (checklists/acceptance.md): login verified
      (`Snipe-chan#5390`), guild deploy verified (7 commands), migrate verified
      on the real DB; `/ping` invocation + restart watch need a human in Discord
