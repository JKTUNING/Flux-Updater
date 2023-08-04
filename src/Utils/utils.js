import shell from "shelljs";
import fs from "fs/promises";
import { homedir } from "os";

async function checkApt() {
  // kill any ongoing software updates
  const update_info = shell.exec("ps -C apt,apt-get,dpkg >/dev/null && echo 'installing software' || echo 'all clear'", { silent: true });
  if (update_info == "installing software") {
    shell.exec("sudo killall apt", { silent: true });
    shell.exec("sudo killall apt-get", { silent: true });
    shell.exec("sudo dpkg --configure -a", { silent: true });
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
export { checkApt, getNodeCollateral, checkHostName };
