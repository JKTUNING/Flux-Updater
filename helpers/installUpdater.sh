#!/bin/bash

if ! [[ -f src/config/config.js ]]; then
    touch src/config/config.js
    userWebHook=$(whiptail --inputbox "Enter your Discord Webhook URL" 8 60 3>&1 1>&2 2>&3)
    cat > src/config/config.js <<EOF
const config={
  discord_url: "$userWebHook",
};

export default config;
EOF
else
    echo -e "config file found - not entry needed"
fi

if [ ! -d "node_modules" ]; then
    echo -e "installing node modules ..."
    npm i --omit=dev
else
    echo -e "packages aleady exist .. npm install skipped"
fi

#check to see if flux_updater is already running and stop/delete it from pm2
if [[ $(pm2 info flux_updater 2>&1 | grep status) != "" ]]; then 
    echo -e "flux_updater already running ... stopping and deleting flux_updater from pm2"
    pm2 reload flux_updater --watch
else
    echo -e "flux_updater not already running ... starting flux_updater service"
    pm2 start src/flux_updater.js --watch
    sleep 2
    pm2 save
fi