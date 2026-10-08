# 021 — Tasks

- [x] T1 View models (`src/ui/viewModels.ts`): snapshot → message/detail/
      browser VMs, pure + tested (FR-UI-4)
- [x] T2 Browser state (`src/ui/browser.ts`): pagination/nav/parse helpers,
      pure + tested (FR-UI-2, FR-UI-6, FR-UI-7)
- [x] T3 V2 renderer (`src/ui/renderers/snipeBrowserV2.ts`): results,
      detail, empty/denied/expired/error states with `IsComponentsV2`
      (FR-UI-1, FR-UI-5, FR-UI-10)
- [x] T4 POC wiring (`src/commands/snipeBrowser.ts` + `snb` button route):
      `/snipebrowse` command, auth boundary, stale-update fallback
      (FR-UI-3, FR-UI-8, FR-UI-9)
- [x] T5 Docs + spec artifacts (this phase; D26, components-v2.md,
      012-ui supersede note)
- [ ] T6 Live acceptance (checklists/acceptance.md) — needs token

Notes: additive migration — existing `/snipe`, `/edits`, `/search`
embed paths untouched. V2 command name is `snipebrowse` so deploy body
grows by one entry; rename/migrate `/snipe` itself in a follow-up.
