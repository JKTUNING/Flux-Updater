import axios from "axios";
import shell from "shelljs";
import { EmbedBuilder } from "discord.js";
import { discordSendEmbed } from "./discord.js";
import { checkHostName, compareVersion, getNodeCollateral } from "../Utils/utils.js";

/**
 * Checks to see if Flux node requires an update
 * @returns {Promise} Promise
 */
async function checkFluxUpdate() {
  try {
    const remoteFluxVersion = await checkRemoteFluxVersion();
    let localFluxVersion = await checkLocalFluxVersion();

    if (localFluxVersion.error) {
      return console.log("Error checking flux version");
    }

    localFluxVersion = JSON.parse(localFluxVersion.msg)?.version ?? 0;

    // check if node needs updated, if not then return
    if (!compareVersion(remoteFluxVersion, localFluxVersion)) {
      return;
    }

    console.log(`### Flux OS requires an update ###`);
    console.log(`Remote Flux version: ${remoteFluxVersion}`);
    console.log(`Local Flux version: ${localFluxVersion}`);
    console.log(`##################################`);
    console.log("Checking Flux node rank");

    // check node rank from daemon deterministic list
    const collat = await getNodeCollateral();
    const getRank = await checkNodeRank(collat);

    if (getRank.nodeRank === 0) return console.log("Error checking node rank from API");
    const { nodeRank, nodeTier } = getRank;

    // get current node count for that tier
    const nodeCounts = await getNodeCounts();
    if (!nodeCounts) return console.log("Error getting node count from api");

    const totalTier = nodeCounts[nodeTier] ?? 0;
    console.log(`Node Rank: ${nodeRank} of ${totalTier}`);

    if (await checkValidUpdate(nodeRank, totalTier)) {
      console.log("Proceeding with Flux OS update");

      const updateResult = await updateFlux();

      if (updateResult.error === false) {
        const embed = new EmbedBuilder()
          .setTitle(`Flux OS Updated`)
          .setColor(0xff0000)
          .addFields({ name: `Host`, value: `${await checkHostName()}` })
          .addFields({ name: `Version`, value: `${remoteFluxVersion}` });

        await discordSendEmbed(embed);

        return console.log(`Flux OS Updated: ${remoteFluxVersion}`);
      } else {
        // prettier-ignore
        const embed = new EmbedBuilder()
        .setTitle(`Flux OS Update Failed`)
        .setColor(0xff0000)
        .addFields({ name: `Host`, value: `${await checkHostName()}`})
        .addFields({ name: `Status`, value: `FluxOS Update failed` })
        .addFields({ name: `Error`, value: `${updateResult.msg ?? "N/A"}` });

        await discordSendEmbed(embed);

        return console.log(`${updateResult.msg ?? "Flux OS Update failed"}`);
      }
    }

    console.log("Flux OS not ready for update");
  } catch (error) {
    console.log(error);
  }
}

/**
 * Returns the current production version of FluxOS
 * @returns {Promise<string>} Promise resolves to FluxOS version
 * @example const remoteFluxVersion = await checkRemoteFluxVersion();
 */
async function checkRemoteFluxVersion() {
  try {
    const getFluxData = await axios.get("https://raw.githubusercontent.com/RunOnFlux/flux/master/package.json", { timeout: 3000 });
    if (getFluxData?.data?.version) {
      return getFluxData.data.version;
    } else {
      return 0;
    }
  } catch (error) {
    console.log("error checking remove flux version");
    return 0;
  }
}

/**
 * Checks current node version
 * @returns {Promise<object>} Promise Object
 * @example const localFluxVersion = await checkLocalFluxVersion();
 * { error: false, msg: 4.2.1}
 */
async function checkLocalFluxVersion() {
  try {
    const version = shell.exec("cd && cat zelflux/package.json", { silent: true });
    if (version.code != 0) {
      return { error: true, msg: "exit code not 0" };
    } else {
      return { error: false, msg: version.stdout };
    }
  } catch (error) {
    console.log("error checking local flux version");
    return { error: true, msg: "error checking local flux version" };
  }
}

/**
 * Checks node rank on Flux Network
 * @param {string} collat
 * @returns {Promise<object>} Promise that resolves to an object with rank and tier
 * @example const getRank = await checkNodeRank("<yourCollatHere");
 * if (getRank.nodeRank != 0){
 *   console.log(getRank.nodeTier);
 * }
 */
async function checkNodeRank(collat) {
  try {
    const checkRank = await axios.get(`https://api.runonflux.io/daemon/viewdeterministiczelnodelist?filter=${collat}`, { timeout: 5000 });

    if (checkRank.data.status === "success") {
      if (checkRank.data.data.length === 1) {
        return { nodeRank: checkRank.data.data[0].rank ?? 0, nodeTier: checkRank.data.data[0].tier };
      }
    }
    return { nodeRank: 0, nodeTier: "N/A" };
  } catch (error) {
    console.log("error obtaining node rank");
    console.log(`${error}`);
    return { nodeRank: 0, nodeTier: "N/A" };
  }
}

/**
 * Retrieves the total number of each node tier on the network
 * @returns {promise<object>} Node Tier Object
 */
async function getNodeCounts() {
  try {
    const nodeCounts = await axios.get("https://api.runonflux.io/daemon/getzelnodecount", { timeout: 5000 });

    if (nodeCounts.data.status === "success") {
      return {
        CUMULUS: nodeCounts.data.data["cumulus-enabled"],
        NIMBUS: nodeCounts.data.data["nimbus-enabled"],
        STRATUS: nodeCounts.data.data["stratus-enabled"],
      };
    }
    return {};
  } catch (error) {
    console.log(error);
    return {};
  }
}

/**
 * Checks to see if node should proceed with update
 * @param {number} rank rank of the node
 * @param {number} total number of nodes in tier
 * @returns {Promise<boolean>} true if node should update
 */
async function checkValidUpdate(rank, total) {
  try {
    const rankPercentile = ((rank / total) * 100).toFixed(0);

    // check to sure rank isn't close to next reward
    if (rankPercentile > 20 && rankPercentile % 3 === 0) {
      return true;
    }

    return false;
  } catch (error) {
    console.log(error);
    return false;
  }
}

/**
 * Pulls flux updates from github
 * @returns {Promise<object>} Object containig error and msg status
 * @example const processUpdate = await updateFlux();
 * if (processUpdate.error === false){
 *   // do things here
 *   console.log(processUpdate.msg);
 * }
 */
async function updateFlux() {
  try {
    // stop flux via pm2
    const pm2Stop = shell.exec("pm2 stop flux", { silent: true });
    if (pm2Stop.code != 0) return { error: true, msg: `pm2 failed to stop flux` };

    // proceed with updating flux by pulling from github repo
    const update = shell.exec("cd && cd zelflux && git fetch && git pull -p", { silent: true });

    // check to make sure command did not return an error
    if (update.code != 0) {
      shell.exec("pm2 start flux", { silent: true }); // start flux just incase it didn't update
      return { error: true, msg: `${update.stderr}` };
    } else {
      // restart flux after successful update
      const pm2Start = shell.exec("pm2 start flux", { silent: true });
      if (pm2Start.code != 0) return { error: true, msg: `pm2 failed to start flux` };

      return { error: false, msg: "Flux OS update success" };
    }
  } catch (error) {
    return { error: true, msg: error };
  }
}

export { checkFluxUpdate };
