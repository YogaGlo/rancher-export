import os, sys, json, requests, cattle

rancher_api_base_url = os.environ['RANCHER_API_BASE_URL']
rancher_api_access_key = os.environ['RANCHER_API_ACCESS_KEY']
rancher_api_secret_key = os.environ['RANCHER_API_SECRET_KEY']


if __name__ == '__main__':
    # main()

    rancher = cattle.Client(access_key=rancher_api_access_key,
                            secret_key=rancher_api_secret_key,
                            url=rancher_api_base_url)

    environments = rancher.list('project').data

    stacks = rancher.list('environment').data

    for env in environments:
        pass




        # for project in env_data:
        #   print ('{:10} {:5} {:5}'.format(project.id, project.name, project.links.composeConfig))
