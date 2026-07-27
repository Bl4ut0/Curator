import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ButtonInteraction,
  GuildMember,
  Role
} from 'discord.js';
import { db } from '../../db/database';

export const buttonRoleCommand = {
  data: new SlashCommandBuilder()
    .setName('buttonrole')
    .setDescription('Create interactive button role assignment panels')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Send a role assignment button panel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Target text channel')
            .setRequired(true)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('The role to assign/remove on button click')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('title')
            .setDescription('Embed title')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('description')
            .setDescription('Embed instructions')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('button_label')
            .setDescription('Text to display on the button')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('button_emoji')
            .setDescription('Emoji to display on the button')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('button_style')
            .setDescription('Button color style')
            .addChoices(
              { name: 'Blue (Primary)', value: 'Primary' },
              { name: 'Green (Success)', value: 'Success' },
              { name: 'Gray (Secondary)', value: 'Secondary' },
              { name: 'Red (Danger)', value: 'Danger' }
            )
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel') as TextChannel;
    const role = interaction.options.getRole('role') as Role;
    const title = interaction.options.getString('title')!;
    const description = interaction.options.getString('description')!;
    const label = interaction.options.getString('button_label')!;
    const emoji = interaction.options.getString('button_emoji');
    const styleRaw = interaction.options.getString('button_style') || 'Primary';

    let style = ButtonStyle.Primary;
    if (styleRaw === 'Success') style = ButtonStyle.Success;
    if (styleRaw === 'Secondary') style = ButtonStyle.Secondary;
    if (styleRaw === 'Danger') style = ButtonStyle.Danger;

    const customId = `curator_role_${role.id}_${Date.now()}`;

    const button = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(style);

    if (emoji) button.setEmoji(emoji);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(role.color || 0x5865f2)
      .setFooter({ text: 'Curator Self-Hosted Role Service' });

    const msg = await channel.send({ embeds: [embed], components: [row] });

    db.prepare(`
      INSERT INTO reaction_roles (guild_id, message_id, channel_id, custom_id, role_id, emoji, label)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(interaction.guildId, msg.id, channel.id, customId, role.id, emoji || null, label);

    return interaction.reply({
      content: `✅ Button role panel successfully posted in <#${channel.id}> for role **${role.name}**!`,
      ephemeral: true
    });
  }
};

export async function handleRoleButtonInteraction(interaction: ButtonInteraction) {
  if (!interaction.customId.startsWith('curator_role_')) return false;

  const member = interaction.member as GuildMember;
  if (!member || !interaction.guild) return true;

  // Extract role ID from custom ID (format: curator_role_<roleId>_<timestamp>)
  const parts = interaction.customId.split('_');
  const roleId = parts[2];

  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    await interaction.reply({ content: '❌ The role associated with this button no longer exists.', ephemeral: true });
    return true;
  }

  const hasRole = member.roles.cache.has(role.id);

  try {
    if (hasRole) {
      await member.roles.remove(role);
      await interaction.reply({ content: `➖ Removed role **${role.name}** from your profile.`, ephemeral: true });
    } else {
      await member.roles.add(role);
      await interaction.reply({ content: `➕ Added role **${role.name}** to your profile!`, ephemeral: true });
    }
  } catch (err) {
    console.error('[Curator RoleButton] Error modifying role:', err);
    await interaction.reply({ content: '❌ Failed to modify role. Check bot hierarchy permissions.', ephemeral: true });
  }

  return true;
}
