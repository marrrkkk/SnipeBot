# Components V2 — SnipeBot UI architecture (verified 2026-10-08)

SnipeBot uses **Discord Components V2 as its primary interactive UI
architecture**. Classic embeds are not the default; they survive only
where a documented limitation or a trivial non-interactive reply
justifies them.

## What Components V2 is

A per-message component system enabled by the `IS_COMPONENTS_V2`
message flag (`1 << 15`). The message is a tree of layout, content,
and interactive components instead of `content` + `embeds`.

## Why SnipeBot uses it

SnipeBot is a browsable archive (results → detail → context →
revisions → attachments), not a set of static command replies.
V2 gives structured layouts, native pagination/navigation rows, and
reusable browser surfaces that classic embeds cannot express cleanly.

## How `IsComponentsV2` works

- Set `flags: MessageFlags.IsComponentsV2` (`32768`) on the initial
  reply (`interaction.reply`) or follow-up/edit. Verified in the
  installed discord.js 14.27.0: `MessageFlags.IsComponentsV2 === 32768`.
- The flag is **irreversible**: once set on a message it cannot be
  removed by editing that message.
- discord.js: `new ContainerBuilder().addTextDisplayComponents(
new TextDisplayBuilder().setContent('…'))`, then
  `interaction.reply({ flags: MessageFlags.IsComponentsV2,
components: [container] })`. `interaction.update()` / `editReply()`
  keep the flag on the same message.

## Incompatibilities on V2 messages

On a flagged message the following top-level fields stop working:

- `content` — use `TextDisplayBuilder` instead.
- `embeds` — do not stuff `EmbedBuilder` output into a V2 tree
  ("fake V2"); redesign with text displays/sections/media.
- `poll` (creation field) — polls cannot be created on V2 messages;
  archived poll _data_ is rendered as text.
- `stickers` — cannot be sent; archived sticker ids render as counts.
- Attachments are hidden by default — expose via `MediaGalleryBuilder`
  / `FileBuilder` (unfurled media), otherwise the user sees nothing.

Verified against the official reference (see links below); the same
page states messages allow **up to 40 total components**.

## Content model for SnipeBot

| Archive datum                  | V2 representation                                                    |
| ------------------------------ | -------------------------------------------------------------------- |
| Message text                   | `TextDisplay` (markdown, ≤4000 chars per block; truncate)            |
| Author/channel/timestamps      | `TextDisplay` header lines; `Section` with button accessory for rows |
| Attachment list                | `TextDisplay` listing + `MediaGallery`/`File` when bytes are local   |
| Reactions/poll/stickers/embeds | Summarized `TextDisplay` lines/counts, never raw dumps               |
| Navigation                     | `ActionRow` of `Button`s (`custom_id` 1–100 chars)                   |
| Grouping                       | `Container` + `Separator` (divider/padding)                          |

## Buttons / selects / actions

- Buttons live in `ActionRow` (≤5) or a `Section` accessory; non-link
  buttons require `custom_id`, link buttons require `url` (no
  interaction is sent for link/premium buttons).
- Select menus (string/user/role/mentionable/channel) are supported
  but SnipeBot v1 uses buttons only; selects are a future filter/sort
  surface and need no new dependency.
- `customId` budget is 100 chars: keep the scheme short
  (`<prefix>:<action>:<args…>`, e.g. `snb:pg:<page>`,
  `snb:dt:<messageId>:<page>`). Snowflakes contain no colons, so naive
  split stays safe. Full search queries do not fit — reconstruct from
  server state (see browser state below).
- Interaction lifecycle: 3s to ACK (`reply`/`update`/`defer`), token
  valid 15 min. Stale `update()` must fall back to ephemeral
  `followUp()` then drop — never leave "interaction failed" unexplained.

## Selects, sections, galleries (023 findings)

- `StringSelect` in messages lives in an `ActionRow` (≤25 options,
  option label/value ≤100 chars). SnipeBot lists use one jump select
  per page instead of per-row buttons; the picked id arrives in
  `interaction.values`, routed by the same prefix table as buttons
  (`src/interactions/selects.ts`).
- `Section` = 1–3 text displays + one accessory (button or thumbnail).
  Detail cards pair two text lines (title + meta) with the author
  avatar thumbnail; without an avatar the same content renders as plain
  text (no section).
- `Thumbnail`/`MediaGallery` accept externally hosted image URLs, so
  avatars and attachment CDN links render without uploads. Galleries
  cap at 10 items (SnipeBot shows ≤4); `File` is upload-only
  (`attachment://`) and intentionally unused.
- `Container.setAccentColor` brands cards per surface (red: deleted/
  search detail, amber: edits walker).

## discord.js specifics (14.27.0, installed)

- Builders: `ContainerBuilder`, `SectionBuilder`,
  `TextDisplayBuilder`, `SeparatorBuilder`, `MediaGalleryBuilder`,
  `FileBuilder`, plus existing `ActionRowBuilder`/`ButtonBuilder`.
- `ContainerBuilder` accepts text/separator/section/media/file/action-row
  children (`addTextDisplayComponents`, `addSeparatorComponents`,
  `addSectionComponents`, `addMediaGalleryComponents`,
  `addFileComponents`, `addActionRowComponents`).
- `SeparatorBuilder.setDivider(true)` vs spacing-only padding.
- No new dependency: everything ships with the installed discord.js.

## Limitations relevant to SnipeBot

- No mixed `content`/`embeds` on V2 messages — every read surface must
  be designed V2-native from the start.
- 40-component cap bounds page size (default 5 rows/page keeps trees small).
- Mobile clients render containers/sections/media natively, but long
  text walls still truncate — progressive disclosure (results →
  detail → revisions/attachments/context) is mandatory, not optional.
- Ephemeral V2 replies work; `DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE`
  cannot set `IS_COMPONENTS_V2` on the deferred ACK — set the flag on
  the subsequent edit/follow-up instead.

## Mobile / client considerations

Per the official docs, V2 components render on current clients;
legacy clients fall back poorly. SnipeBot targets current Discord
clients; classic embeds remain only as a documented fallback for a
specific compatibility case, never as the default design.

## Authorization / state rules (binding)

- Every V2 interaction re-checks `mayReadChannel` + policy role gate
  in the service/application layer — hidden buttons are not a security
  boundary.
- Browser state is reconstructable server-side (guild/channel/query/
  page/filters/selection); the `customId` carries a cursor, not the
  authority. Snipe/edits browsers re-query per press (stateless,
  channel-scoped). Search queries don't fit the 100-char `customId`
  budget, so search pagination uses the bounded session store
  (`src/ui/sessions.ts`: 8-hex-char ids, 15-min TTL matching the
  interaction token lifetime, 500-entry cap, lazy prune, channel-bound
  lookup). Expired tokens/sessions render a clean "browser expired →
  run the command again" state.

## Official links used (2026-10-08)

- Discord Components reference (flag behavior, all component types,
  40-component limit, button/select rules):
  https://docs.discord.com/developers/components/reference
- Using message components (V2 flag, irreversibility, content-as-
  components, nesting):
  https://docs.discord.com/developers/components/using-message-components
- Receiving/responding to interactions (callback types 4–7, 3s ACK,
  15-min token, flags allowed on callbacks, follow-ups):
  https://docs.discord.com/developers/interactions/receiving-and-responding
- Message flags (`IS_COMPONENTS_V2 1<<15`):
  https://docs.discord.com/developers/resources/message
- discord.js docs (builders, `MessageFlags`, interaction reply/edit APIs):
  https://discord.js.org/docs/packages/discord.js/main
  https://discord.js.org/docs/packages/discord.js/stable
- Guide: https://discordjs.guide/
