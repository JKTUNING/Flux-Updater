import axios from "axios";
import shell from "shelljs";
import { EmbedBuilder } from "discord.js";
import { discordSendEmbed } from "./discord.js";
import sleep from "sleep-promise";
import { checkApt, checkHostName } from "../Utils/utils.js";

/**
 * Check to see if daemon requires update
 * @returns {Promise}
 */
async function checkUpdateDaemon() {
  try {
    let remoteVersion = await checkRemoteDaemonVersion();
    if (remoteVersion.error) return console.log(`Error checking remote daemon version :: ${remoteVersion.msg}`);
    remoteVersion = remoteVersion.msg;

    let localVersion = await checkLocalDaemonVersion();
    if (localVersion.error) return console.log(`Error checking local daemon version :: ${localVersion.msg}`);
    localVersion = localVersion.msg;

    if (remoteVersion.localeCompare(localVersion)) {
      console.log(`### Daemon requires update ###`);
      console.log(`Remote daemon version: ${remoteVersion}`);
      console.log(`Local daemon version: ${localVersion}`);
      console.log(`##############################`);

      let processedUpdate = await processDaemonUpdate();
      if (processedUpdate.error) return console.log(`Error proccesing daemon update: ${processedUpdate.msg}`);

      localVersion = await checkLocalDaemonVersion();
      if (localVersion.error) return console.log(`Error checking local daemon version :: ${localVersion.msg}`);
      localVersion = localVersion.msg;

      if (localVersion.trim() === remoteVersion.trim()) {
        console.log(`### Daemon update success ###`);
        console.log(`Remote daemon version: ${remoteVersion}`);
        console.log(`Local daemon version: ${localVersion}`);
        console.log(`##############################`);

        const embed = new EmbedBuilder()
          .setTitle(`Flux Daemon Updated`)
          .setColor(0xff0000)
          .addFields({ name: `Host`, value: `${checkHostName()}` })
          .addFields({ name: `Version`, value: `${localVersion}` });

        await discordSendEmbed(embed);
      }
    }
  } catch (error) {
    console.log(error.message ?? error);
  }
}

/**
 * Checks the remote daemon version for FluxD
 * @returns {Promise<object>} Object
 * @param {Boolean} error
 * @param {String} msg
 * @example const remoteVersion = await checkRemoteDaemonVersion();
 * { error: false, msg: 6.2.0}
 */
async function checkRemoteDaemonVersion() {
  try {
    const pollDaemonVersion = await axios.get("https://apt.runonflux.io/pool/main/f/flux/", { timeout: 5000 });

    if (pollDaemonVersion.data) {
      let remoteDaemonVersion = pollDaemonVersion.data.match(/flux_(\d+\.\d+\.\d+)/);
      remoteDaemonVersion = remoteDaemonVersion ? remoteDaemonVersion[1] : null;
      if (remoteDaemonVersion) return { error: false, msg: `${remoteDaemonVersion}` };
    }

    console.log("error finding daemon verion");
    return { error: true, msg: "error finding daemon version" };
  } catch (error) {
    console.log("error finding daemon verion");
    return { error: true, msg: error.message ? error.message : error };
  }
}

/**
 * Checks the local version of FluxD
 * @returns {Promise<object>} Object
 * @param {Boolean} error
 * @param {String} msg
 * @example const remoteVersion = await checkRemoteDaemonVersion();
 * { error: false, msg: 6.2.0}
 */
async function checkLocalDaemonVersion() {
  try {
    // check dpkg for installed flux version
    const checkLocalVersion = shell.exec("dpkg -s flux | grep Version | awk '{print $2}'", { silent: true });

    if (checkLocalVersion.code || checkLocalVersion.stderr) {
      return { error: true, msg: checkLocalVersion.stderr };
      //return { error: false, msg: "6.1.9" };
    }

    return { error: false, msg: checkLocalVersion.stdout.trim() };
  } catch (error) {
    return { error: true, msg: error.message ?? error };
  }
}

/**
 * Attempts to update Flux Daemon package
 * @returns {Promise<object>} Object
 * @param {Boolean} error
 * @param {String} msg
 * @example const proccessUpdate = await ProcessDaemonUpdate();
 * console.log(processUpdate.errror);
 */
async function processDaemonUpdate() {
  // check if updates are processing
  await checkApt();

  // stop the fluxD process and any services tied to it
  shell.exec("sudo systemctl stop zelcash", { silent: true });
  shell.exec("sudo fuser -k 16125/tcp", { silent: true });

  // update apt cache
  shell.exec("sudo apt-get update", { silent: true });
  // update flux
  const updateFlux = shell.exec("sudo apt-get install flux -y", { silent: true });

  if (updateFlux.code || updateFlux.stderr) {
    return { error: true, msg: updateFlux.stderr.trim() };
  }

  await sleep(2);
  const startDaemon = shell.exec("sudo systemctl start zelcash", { silent: true });
  if (startDaemon.code || startDaemon.stderr) {
    console.log("Daemon failed to start");
    return { error: true, msg: startDaemon.stderr };
  }

  return { error: false, msg: "Flux daemon updated!" };
}

export { checkUpdateDaemon };
