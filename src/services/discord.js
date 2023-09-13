import { WebhookClient } from "discord.js";
import config from "../config/config.js";

const { discord_url } = config;

let discordClient;

if (discord_url) {
  try {
    discordClient = new WebhookClient({ url: discord_url });
    console.log(`Valid discord webhook found: ${discord_url}`);
  } catch (error) {
    console.log(`Error creating webhook ${error.message ?? error}`);
  }
}

/**
 * Sends an embed message to Discord using the configured Discord client.
 * The message is delayed by 500 milliseconds using setTimeout.
 * @param {object} embed - The embed object to send. It should follow the Discord Embed structure.
 * @throws {Error} If there is an error while sending the message.
 * @returns {Promise<void>} A promise that resolves after the message is sent.
 */
async function discordSendEmbed(embed) {
  setTimeout(() => {
    try {
      if (discordClient) {
        discordClient.send({
          username: `FluxNode`,
          avatarURL: `https://raw.githubusercontent.com/JKTUNING/Flux-Updater/main/helpers/icon.jpg`,
          embeds: [embed],
        });
      }
    } catch (error) {
      console.log(error);
    }
  }, 500);
}

export { discordClient, discordSendEmbed };
