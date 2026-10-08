import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MessageFlags,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';

/**
 * Shared Components V2 page builders for all archive browsers.
 * The only module family (with per-surface renderers) that owns
 * discord.js builders. Surface files own row strings + customIds.
 */

export type V2Reply = {
  flags: number;
  components: [ContainerBuilder];
  allowedMentions: { parse: [] };
};

export type V2EphemeralReply = {
  flags: number;
  components: [ContainerBuilder];
  ephemeral: true;
  allowedMentions: { parse: [] };
};

export const V2_FLAGS = MessageFlags.IsComponentsV2;

export type NavButton = {
  id: string;
  label: string;
  style: ButtonStyle;
  disabled?: boolean;
};

function shell(body: ContainerBuilder): V2Reply {
  return { flags: V2_FLAGS, components: [body], allowedMentions: { parse: [] } };
}

function text(content: string): TextDisplayBuilder {
  return new TextDisplayBuilder().setContent(content);
}

/** Compact machine timestamp (renderers, not Discord markdown). */
export function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 16).replace('T', ' ');
}

export type JumpOption = {
  label: string;
  value: string;
  description?: string;
};

export type JumpSelect = {
  customId: string;
  placeholder: string;
  options: JumpOption[];
};

/** Single "Jump to…" select row; null when there is nothing to pick. */
export function jumpSelectRow(
  select: JumpSelect,
): ActionRowBuilder<StringSelectMenuBuilder> | null {
  if (select.options.length === 0) return null;
  const menu = new StringSelectMenuBuilder()
    .setCustomId(select.customId)
    .setPlaceholder(select.placeholder.slice(0, 150));
  for (const option of select.options.slice(0, 25)) {
    menu.addOptions({
      label: option.label.slice(0, 100),
      value: option.value,
      ...(option.description === undefined
        ? {}
        : { description: option.description.slice(0, 100) }),
    });
  }
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

/** Paged list: header + divider-separated rows + nav + one jump select. */
export function renderListPage(opts: {
  title: string;
  range: string;
  rows: string[];
  page: number;
  totalPages: number;
  prevId: string;
  nextId: string;
  jump?: JumpSelect;
  closeId: string;
}): V2Reply {
  const container = new ContainerBuilder().addTextDisplayComponents(
    text(`# ${opts.title}\n${opts.range}`),
  );
  for (const row of opts.rows) {
    container
      .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
      .addTextDisplayComponents(text(row));
  }
  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(opts.prevId)
      .setLabel('◀ Previous')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(opts.page <= 1),
    new ButtonBuilder()
      .setCustomId(opts.nextId)
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(opts.page >= opts.totalPages),
    new ButtonBuilder().setCustomId(opts.closeId).setLabel('Close').setStyle(ButtonStyle.Danger),
  );
  container.addActionRowComponents(nav);
  if (opts.jump !== undefined) {
    const select = jumpSelectRow(opts.jump);
    if (select !== null) container.addActionRowComponents(select);
  }
  return shell(container);
}

/** Single-item view: heading/meta + body + facts + one button row. */
export function renderDetailPage(opts: {
  heading: string;
  meta: string;
  body: string;
  facts: string;
  extras?: string[];
  buttons: NavButton[];
}): V2Reply {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(text(`# ${opts.heading}\n${opts.meta}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(text(opts.body))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(text(opts.facts));
  for (const extra of opts.extras ?? []) {
    container.addTextDisplayComponents(text(extra));
  }
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const button of opts.buttons) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(button.id)
        .setLabel(button.label)
        .setStyle(button.style)
        .setDisabled(button.disabled ?? false),
    );
  }
  container.addActionRowComponents(row);
  return shell(container);
}

export function renderStatePage(title: string, body: string): V2Reply {
  return shell(new ContainerBuilder().addTextDisplayComponents(text(`# ${title}\n${body}`)));
}

/**
 * Rich item card: Section header (avatar thumbnail when available),
 * divider, body, optional image gallery, facts, extras, one button row.
 */
export function renderSectionPage(opts: {
  accent?: number;
  title: string;
  meta: string;
  avatarUrl?: string | null;
  avatarAlt?: string;
  body: string;
  galleryUrls?: string[];
  facts: string;
  extras?: string[];
  buttons: NavButton[];
}): V2Reply {
  const container = new ContainerBuilder();
  if (opts.accent !== undefined) container.setAccentColor(opts.accent);
  if (opts.avatarUrl !== null && opts.avatarUrl !== undefined) {
    const section = new SectionBuilder();
    section.addTextDisplayComponents(text(opts.title));
    section.addTextDisplayComponents(text(opts.meta));
    section.setThumbnailAccessory(
      new ThumbnailBuilder().setURL(opts.avatarUrl).setDescription(opts.avatarAlt ?? 'Avatar'),
    );
    container.addSectionComponents(section);
  } else {
    container.addTextDisplayComponents(text(`${opts.title}\n${opts.meta}`));
  }
  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
    .addTextDisplayComponents(text(opts.body));
  const gallery = (opts.galleryUrls ?? []).slice(0, 4);
  if (gallery.length > 0) {
    const media = new MediaGalleryBuilder();
    for (const url of gallery) media.addItems(new MediaGalleryItemBuilder().setURL(url));
    container.addMediaGalleryComponents(media);
  }
  container
    .addSeparatorComponents(new SeparatorBuilder().setDivider(false))
    .addTextDisplayComponents(text(opts.facts));
  for (const extra of opts.extras ?? []) {
    container.addTextDisplayComponents(text(extra));
  }
  const row = new ActionRowBuilder<ButtonBuilder>();
  for (const button of opts.buttons) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(button.id)
        .setLabel(button.label)
        .setStyle(button.style)
        .setDisabled(button.disabled ?? false),
    );
  }
  container.addActionRowComponents(row);
  return shell(container);
}

/** Ephemeral states stay V2 (flag-combined) so clients render them. */
export function renderEphemeralState(title: string, body: string): V2EphemeralReply {
  return {
    // ponytail: bitwise flag union is the documented ephemeral+V2 pattern.
    flags: V2_FLAGS | MessageFlags.Ephemeral,
    components: [new ContainerBuilder().addTextDisplayComponents(text(`# ${title}\n${body}`))],
    ephemeral: true,
    allowedMentions: { parse: [] },
  };
}
