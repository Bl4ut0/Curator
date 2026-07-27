import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
  ColorResolvable
} from 'discord.js';

export const embedBuilderCommand = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Create and send custom rich embeds')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((sub) =>
      sub
        .setName('send')
        .setDescription('Send a custom embed to a designated channel')
        .addChannelOption((opt) =>
          opt
            .setName('channel')
            .setDescription('Target text channel')
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
            .setDescription('Embed body text (supports markdown)')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('color')
            .setDescription('Hex color code (e.g. #5865F2, #FF0000)')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('image_url')
            .setDescription('URL for main body image')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('thumbnail_url')
            .setDescription('URL for top-right thumbnail')
            .setRequired(false)
        )
        .addStringOption((opt) =>
          opt
            .setName('footer')
            .setDescription('Footer text')
            .setRequired(false)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const channel = interaction.options.getChannel('channel') as TextChannel;
    const title = interaction.options.getString('title')!;
    const description = interaction.options.getString('description')!;
    const colorRaw = interaction.options.getString('color') || '#5865F2';
    const imageUrl = interaction.options.getString('image_url');
    const thumbnailUrl = interaction.options.getString('thumbnail_url');
    const footer = interaction.options.getString('footer');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description.replace(/\\n/g, '\n'))
      .setColor((colorRaw.startsWith('#') ? colorRaw : `#${colorRaw}`) as ColorResolvable)
      .setTimestamp();

    if (imageUrl) embed.setImage(imageUrl);
    if (thumbnailUrl) embed.setThumbnail(thumbnailUrl);
    if (footer) embed.setFooter({ text: footer });

    await channel.send({ embeds: [embed] });

    return interaction.reply({
      content: `✅ Embed successfully sent to <#${channel.id}>!`,
      ephemeral: true
    });
  }
};
