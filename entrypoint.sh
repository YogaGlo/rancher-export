#!/bin/sh

echo "####"
echo "# Rancher-Export v$(jq '.version' package.json --raw-output)"
echo "####"

echo "* Testing API credentials..."

if curl -sSf -u "${RANCHER_API_ACCESS_KEY}:${RANCHER_API_SECRET_KEY}" $RANCHER_API_BASE_URL -o /dev/null; then
	echo "  - API connected!"
else
	echo "  - ERROR: API failure."
	exit 1
fi

echo "* Installing cron jobs. Period: $CRON_PERIOD"
rm -rf /etc/periodic/*/backup
cp /backup "/etc/periodic/$CRON_PERIOD/backup"
chmod a+x "/etc/periodic/$CRON_PERIOD/backup"

echo "* First-run export: "
run-parts "/etc/periodic/$CRON_PERIOD"

echo "* Starting cron..."
crond -l 2 -f
