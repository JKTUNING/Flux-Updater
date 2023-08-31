import shell from "shelljs";
import fs from "fs/promises";
import { homedir } from "os";

async function checkApt() {
  try {
    // kill any ongoing software updates
    const update_info = shell.exec("ps -C apt,apt-get,dpkg >/dev/null && echo 'installing software' || echo 'all clear'", { silent: true }).stdout;
    if (update_info == "installing software") {
      shell.exec("sudo killall apt", { silent: true });
      shell.exec("sudo killall apt-get", { silent: true });
      shell.exec("sudo dpkg --configure -a", { silent: true });
    }
  } catch (error) {
    console.log("error checking running apt updates");
  }
}

/**
 * Search flux cont for collateral ID and returns string
 * @returns {Promise<String>} collateral
 */
async function getNodeCollateral() {
  try {
    const userHomeDir = homedir();
    const openFile = await fs.readFile(`${userHomeDir}/.flux/flux.conf`, { encoding: "utf8" });

    const regex = /^zelnodeoutpoint=(.*)$/m;
    const match = openFile.match(regex);

    if (match) return match[1] ?? "";

    return "";
  } catch (error) {
    console.log(`Error fetching collateral from flux.con ${error.message ?? error}`);
  }
}

async function checkHostName() {
  try {
    const Hostname = shell.exec(`hostname`, { silent: true }).stdout.trim();
    return Hostname;
  } catch (error) {
    console.log(error);
    return "Flux Node";
  }
}

/**
 * @description Compares package versions to determine if we should update
 * @param {string} remoteVersion
 * @param {string} localVersion
 * @returns {boolean}
 */
function compareVersion(remoteVersion, localVersion) {
  try {
    const remoteVersionSplit = remoteVersion.split(".");
    const remoteVersionMajor = parseInt(remoteVersionSplit[0]);
    const remoteVersionMinor = parseInt(remoteVersionSplit[1]);
    const remoteVersionPatch = parseInt(remoteVersionSplit[2]);

    const localVersionSplit = localVersion.split(".");
    const localVersionMajor = parseInt(localVersionSplit[0]);
    const localVersionMinor = parseInt(localVersionSplit[1]);
    const localVersionPatch = parseInt(localVersionSplit[2]);

    if (remoteVersionMajor > localVersionMajor) return true;
    if (remoteVersionMajor < localVersionMajor) return false;

    if (remoteVersionMinor > localVersionMinor) return true;
    if (remoteVersionMinor < localVersionMinor) return false;

    return remoteVersionPatch > localVersionPatch;
  } catch (error) {
    console.log("Error comparing versions");
    return false;
  }
}

export { checkApt, getNodeCollateral, checkHostName, compareVersion };
