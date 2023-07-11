import { checkFluxUpdate } from "./services/fluxUpdater.js";
import { checkUpdateDaemon } from "./services/daemonUpdater.js";
import { checkUpdateBenchmark } from "./services/benchmarkUpdater.js";

console.log("watchdog-v2 starting ...");

async function updateJob() {
  await checkUpdateBenchmark();
  await checkUpdateDaemon();
  await checkFluxUpdate();
}

setInterval(updateJob, 60 * 60 * 1000);

checkUpdateBenchmark();
checkUpdateDaemon();
checkFluxUpdate();
