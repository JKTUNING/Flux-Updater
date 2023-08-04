import axios from "axios";
import shell from "shelljs";
import { EmbedBuilder } from "discord.js";
import { discordSendEmbed } from "./discord.js";
import { checkHostName } from "../Utils/utils.js";

/**
 * Checks to see if Flux Updater requires an update
 * @returns {Promise} Promise
 */
async function checkSelfUpdate() {
  try {
    const currentVersion = await checkCurrentVersion();
    let localVersion = await checkLocalVersion();

    if (localVersion.error) {
      return console.log("Error checking local version");
    }

    localVersion = JSON.parse(localVersion.msg)?.version ?? 0;

    console.log(`Local Version - ${localVersion}`);
    console.log(`Current Version - ${currentVersion}`);
    // check if needs updated, if not then return
    if (localVersion >= currentVersion) {
      return;
    }

    console.log(`Local Flux Updater version ${localVersion} ... Current Version ${currentVersion}`);
    console.log(`Flux-Updater requires an update`);

    const updateResult = await processUpdate();

    if (updateResult.error === false) {
      const embed = new EmbedBuilder()
        .setTitle(`Self Upgrade Success`)
        .setColor(0xff0000)
        .addFields({ name: `Host`, value: `${await checkHostName()}` })
        .addFields({ name: `Version`, value: `${currentVersion}` });

      await discordSendEmbed(embed);

      return console.log(`Self Upgrade Success: ${currentVersion}`);
    } else {
      // prettier-ignore
      const embed = new EmbedBuilder()
        .setTitle(`Flux Updater Self Upgrade Failed`)
        .setColor(0xff0000)
        .addFields({ name: `Host`, value: `${await checkHostName()}`})
        .addFields({ name: `Status`, value: `Self Upgrade failed` })
        .addFields({ name: `Error`, value: `${updateResult.msg ?? "N/A"}` });

      await discordSendEmbed(embed);

      return console.log(`${updateResult.msg ?? "Self Upgrade Failed"}`);
    }
  } catch (error) {
    console.log(error);
  }
}

async function checkCurrentVersion() {
  const getVersion = await axios.get("https://raw.githubusercontent.com/JKTUNING/Flux-Updater/main/package.json", { timeout: 3000 });
  if (getVersion?.data?.version) {
    return getVersion.data.version;
  } else {
    return 0;
  }
}

/**
 * Checks current node version
 * @returns {Promise<object>} Promise Object
 * @example const localVersion = await checkNodeFluxVersion();
 * { error: false, msg: 1.0.1}
 */
async function checkLocalVersion() {
  const version = shell.exec("cd && cat Flux-Updater/package.json", { silent: true });
  if (version.code != 0) {
    return { error: true, msg: "exit code not 0" };
  } else {
    return { error: false, msg: version.stdout };
  }
}

async function processUpdate() {
  try {
    // proceed with updating by pulling from github repo
    const update = shell.exec("cd && cd Flux-Updater && git fetch && git pull -p", { silent: true });
    // check to make sure command did not return an error
    if (update.code != 0) {
      return { error: true, msg: `${update.stderr}` };
    } else {
      return { error: false, msg: "Self Update success" };
    }
  } catch (error) {
    return { error: true, msg: error };
  }
}

export { checkSelfUpdate };
