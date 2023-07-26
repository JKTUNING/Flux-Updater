import { checkFluxUpdate } from "./services/fluxUpdater.js";
import { checkUpdateDaemon } from "./services/daemonUpdater.js";
import { checkUpdateBenchmark } from "./services/benchmarkUpdater.js";
import { checkSelfUpdate } from "./services/selfUpgrade.js";

console.log("flux node updater starting ...");

async function updateJob() {
  await checkUpdateBenchmark();
  await checkUpdateDaemon();
  await checkFluxUpdate();
  await checkSelfUpdate();
}

setInterval(updateJob, 60 * 60 * 1000);

checkUpdateBenchmark();
checkUpdateDaemon();
checkFluxUpdate();
checkSelfUpdate();
