# rancher-export

A script to export `docker-compose` and `rancher-compose` configurations via the Rancher API v1. **NOTE** that only `v1` is supported at the moment, and **export** is the primary goal; import may be added later.

## configuration

create an `.env` file in this directory, following this format:

```
RANCHER_API_BASE_URL=https://the.rancher.url/v1
RANCHER_API_ACCESS_KEY=<your_key>
RANCHER_API_SECRET_KEY=<your_secret>
```

The keys are generated via Rancher UI -> API menu.

An "environment" key limits access to the Rancher environment you're currently signed in to. An "account" key gives access to all the environments you have access to.

## running

`node export.js`. The configs will be saved into an `export` directory in the current working dir.

the `export` directory must be manually removed before running this script again.



