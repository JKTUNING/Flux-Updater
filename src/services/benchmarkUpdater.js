import axios from "axios";
import shell from "shelljs";
import { EmbedBuilder } from "discord.js";
import { discordSendEmbed } from "./discord.js";
import { checkApt, checkHostName } from "../Utils/utils.js";
import sleep from "sleep-promise";

/**
 * Check to see if bench requires update
 * @returns {Promise}
 */
async function checkUpdateBenchmark() {
  let remoteVersion = await checkRemoteBenchVersion();
  if (remoteVersion.error) return console.log(`Error checking remote fluxbench version :: ${remoteVersion.msg}`);
  remoteVersion = remoteVersion.msg;

  let localVersion = await checkLocalBenchVersion();
  if (localVersion.error) return console.log(`Error checking local fluxbench version :: ${localVersion.msg}`);
  localVersion = localVersion.msg;

  if (remoteVersion.localeCompare(localVersion)) {
    console.log(`### Bench requires update ###`);
    console.log(`Remote Bench version: ${remoteVersion}`);
    console.log(`Local Bench version: ${localVersion}`);
    console.log(`##############################`);

    let processedUpdate = await processBenchUpdate();
    if (processedUpdate.error) return console.log(`Error proccesing Bench update: ${processedUpdate.msg}`);

    localVersion = await checkLocalBenchVersion();
    if (localVersion.error) return console.log(`Error checking local Bench version :: ${localVersion.msg}`);
    localVersion = localVersion.msg;

    if (localVersion.trim() === remoteVersion.trim()) {
      console.log(`### Bench update success ###`);
      console.log(`Remote Bench version: ${remoteVersion}`);
      console.log(`Local Bench version: ${localVersion}`);
      console.log(`##############################`);

      const embed = new EmbedBuilder()
        .setTitle(`Flux Bench Updated`)
        .setColor(0xff0000)
        .addFields({ name: `Host`, value: `${checkHostName()}` })
        .addFields({ name: `Version`, value: `${localVersion}` });

      await discordSendEmbed(embed);
    }
  }
}

/**
 * Checks the remote Bench version for Fluxbench
 * @returns {Promise<object>} Object
 * @param {Boolean} error
 * @param {String} msg
 * @example const remoteVersion = await checkRemoteBenchVersion();
 * { error: false, msg: 3.8.0}
 */
async function checkRemoteBenchVersion() {
  try {
    const pollBenchVersion = await axios.get("https://apt.runonflux.io/pool/main/f/fluxbench/", { timeout: 5000 });
    if (pollBenchVersion.data) {
      let remoteBenchVersion = pollBenchVersion.data.match(/fluxbench_(\d+\.\d+\.\d+)/);
      remoteBenchVersion = remoteBenchVersion ? remoteBenchVersion[1] : null;
      if (remoteBenchVersion) return { error: false, msg: `${remoteBenchVersion}` };
    }

    console.log("error finding Bench verion");
    return { error: true, msg: "error finding Bench version" };
  } catch (error) {
    console.log("error finding Bench verion");
    return { error: true, msg: error.message ? error.message : error };
  }
}

/**
 * Checks the local version of Fluxbench
 * @returns {Promise<object>} Object
 * @param {Boolean} error
 * @param {String} msg
 * @example const remoteVersion = await checkRemoteBenchVersion();
 * { error: false, msg: 3.8.0}
 */
async function checkLocalBenchVersion() {
  try {
    // check dpkg for installed flux version
    const checkLocalVersion = shell.exec("dpkg -s fluxbench | grep Version | awk '{print $2}'", { silent: true });

    if (checkLocalVersion.code || checkLocalVersion.stderr) {
      return { error: true, msg: checkLocalVersion.stderr };
      //return { error: false, msg: "3.7.9" };
    }

    return { error: false, msg: checkLocalVersion.stdout.trim() };
  } catch (error) {
    return { error: true, msg: error.message ?? error };
  }
}

/**
 * Attempts to update Flux Bench package
 * @returns {Promise<object>} Object
 * @param {Boolean} error
 * @param {String} msg
 * @example const proccessUpdate = await processBenchUpdate();
 * console.log(processUpdate.errror);
 */
async function processBenchUpdate() {
  // check if updates are processing
  await checkApt();

  // stop the fluxD process and any services tied to it
  shell.exec("sudo systemctl stop zelcash", { silent: true });
  shell.exec("sudo fuser -k 16125/tcp", { silent: true });

  // update apt cache
  shell.exec("sudo apt-get update", { silent: true });
  // update fluxbench
  const updateFluxbench = shell.exec("sudo apt-get install fluxbench -y", { silent: true });

  if (updateFluxbench.code || updateFluxbench.stderr) {
    return { error: true, msg: updateFluxbench.stderr.trim() };
  }

  await sleep(2);
  const startDaemon = shell.exec("sudo systemctl start zelcash", { silent: true });
  if (startDaemon.code || startDaemon.stderr) {
    console.log("Daemon failed to start");
    return { error: true, msg: startDaemon.stderr };
  }

  return { error: false, msg: "Flux bench updated!" };
}

export { checkUpdateBenchmark };
