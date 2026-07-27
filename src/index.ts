import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Interaction,
  Events,
  ActivityType
} from 'discord.js';
import { config } from './config';
import { initDatabase } from './db/database';
import { handleVoiceStateUpdate } from './modules/tempvoice/voiceHandler';
import { handleButtonInteraction, handleModalSubmit } from './modules/tempvoice/controlPanel';
import { masterCommands } from './modules/tempvoice/commands';
import { leaderboardCommand } from './modules/tempvoice/stats';
import { handleMessageCreate } from './modules/telemetry/messageTracker';
import { thankCommand, repCheckCommand } from './modules/telemetry/reputation';
import { embedBuilderCommand } from './modules/announcements/embedBuilder';
import { buttonRoleCommand, handleRoleButtonInteraction } from './modules/announcements/reactionRoles';
import { purgeCommand } from './modules/moderation/purge';
import { moveAllCommand } from './modules/moderation/moveall';

// Initialize Database
initDatabase();

// Create Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences
  ]
});

// Command Collection
const commandsMap = new Map<string, any>([
  [masterCommands.data.name, masterCommands],
  [leaderboardCommand.data.name, leaderboardCommand],
  [thankCommand.data.name, thankCommand],
  [repCheckCommand.data.name, repCheckCommand],
  [embedBuilderCommand.data.name, embedBuilderCommand],
  [buttonRoleCommand.data.name, buttonRoleCommand],
  [purgeCommand.data.name, purgeCommand],
  [moveAllCommand.data.name, moveAllCommand]
]);

// Register Slash Commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);
  const commandBody = Array.from(commandsMap.values()).map((cmd) => cmd.data.toJSON());

  try {
    console.log('[Curator] Registering application (/) commands...');
    if (config.guildId) {
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandBody }
      );
      console.log(`[Curator] Successfully registered ${commandBody.length} commands to target Guild (${config.guildId}).`);
    } else {
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandBody }
      );
      console.log(`[Curator] Successfully registered ${commandBody.length} global commands.`);
    }
  } catch (error) {
    console.error('[Curator] Error registering slash commands:', error);
  }
}

// Client Ready Listener
client.once(Events.ClientReady, async (c) => {
  console.log(`[Curator] Logged in as ${c.user.tag}`);
  console.log(`[Curator] Curator Butler Engine is active and watching.`);

  c.user.setActivity('over Voice, Text & Developer Community', { type: ActivityType.Watching });

  if (config.clientId) {
    await registerCommands();
  }
});

// Message Listener for Telemetry & Code Block Tracking
client.on(Events.MessageCreate, async (message) => {
  try {
    await handleMessageCreate(message);
  } catch (err) {
    console.error('[Curator Event] Error in messageCreate:', err);
  }
});

// Voice State Update Listener
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    await handleVoiceStateUpdate(oldState, newState);
  } catch (err) {
    console.error('[Curator Event] Error in voiceStateUpdate:', err);
  }
});

// Interaction Listener (Commands, Buttons, Modals)
client.on(Events.InteractionCreate, async (interaction: Interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const command = commandsMap.get(interaction.commandName);
      if (command) {
        await command.execute(interaction);
      }
    } else if (interaction.isButton()) {
      const isRoleBtn = await handleRoleButtonInteraction(interaction);
      if (!isRoleBtn) {
        await handleButtonInteraction(interaction);
      }
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (err) {
    console.error('[Curator Interaction Error]:', err);
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: '❌ An error occurred while executing this action.', ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ An error occurred while executing this action.', ephemeral: true });
      }
    }
  }
});

// Start Client
if (config.token) {
  client.login(config.token);
} else {
  console.error('[Curator Startup Error] No DISCORD_TOKEN provided. Update .env or config before starting.');
}
