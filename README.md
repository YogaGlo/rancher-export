# rancher-export

A script to export `docker-compose` and `rancher-compose` configurations via the Rancher API v1. **NOTE** that only `v1` is supported at the moment, and **export** is the primary goal; import functionality is very basic.

## configuration

create an `.env` file in this directory, following this format:

```
RANCHER_API_BASE_URL=https://the.rancher.url/v1
RANCHER_API_ACCESS_KEY=<your_key>
RANCHER_API_SECRET_KEY=<your_secret>
```

The keys are generated via Rancher UI -> API menu.

An "environment" key limits access to the Rancher environment you're currently signed in to. An "account" key gives access to all the environments you have access to. The script will only export environments visible to it.

## running

`npm start`. The configs will be saved into an `export` directory in the current working dir.

the `export` directory must be manually removed before running this script again.

> NOTE any 'standalone' docker-compose projects created outside of Rancher (i.e. by running `docker-compose` directly on a host) will be exported with empty docker-compose and rancher-compose files. Remove those directories.

You can compress this directory for archival by running `tar -czvf export-$(date +%Y-%m-%d).tar.gz export`

## utilities

Prerequisite: `rancher-compose`. Download it from your Rancher instance.

WARNING: these tools are DANGEROUS and barely tested. Use at your own risk.

Create an `.env.import` file with the following format:

```
RANCHER_IMPORT_ENV_KEY=
RANCHER_IMPORT_ENV_SECRET=
RANCHER_IMPORT_URL=
```

These keys must be Rancher **"Environment"** keys (as opposed to "Account"). This file is kept separate from the `.env` file on purpose, for safety.

`./remove-affinity.sh <environment_name>` will remove the `io.rancher.scheduler.affinity:host_label:` keys from all `.yml` files in the target environment (directory). This is useful if the target hosts will not have the same labels as the source hosts.

`./import.sh <environment_name>` will import all stacks from a previously exported environment (under `export` in this directory) into the environment accessed by the above keys. It will name the stacks as per their directory names.

