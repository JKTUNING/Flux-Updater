[![NodeJS Lint](https://github.com/JKTUNING/Flux-Updater/actions/workflows/main.yml/badge.svg)](https://github.com/JKTUNING/Flux-Updater/actions/workflows/main.yml)
![Dynamic JSON Badge](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2FJKTUNING%2FFlux-Updater%2Fmain%2Fpackage.json&query=%24.version&label=Version)

# Flux-Updater

This application will automatically update your Flux Nodes when a new version is released. It does a few checks before allowing the update to proceed.

- Node rank percentage is > 20% 
- Node rank percentage % 3 = 0 (so not all nodes update at once)

It also gracefully shuts down FluxOS before pulling the changes from GitHub, avoiding multiple FluxOS restarts on version update.

```Requires ./src/config/config.js file with discord_url```
```
const config = {
  discord_url: "<yourWebhook>",
};

export default config;
```
## Auto generate config and start the service
```./helpers/installUpdater.sh```
