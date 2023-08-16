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
