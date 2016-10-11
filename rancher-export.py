import os, sys, json, requests, gdapi

rancher_api_base_url = os.environ['RANCHER_API_BASE_URL']
rancher_api_access_key = os.environ['RANCHER_API_ACCESS_KEY']
rancher_api_secret_key = os.environ['RANCHER_API_SECRET_KEY']

# gather an environment

# class Rancher(object):
#   """The entire Rancher setup """
#   def __init__(self, access_key, secret_key, url):
#     super(Rancher, self).__init__()
#     self.client = gdapi.Client(access_key, secret_key, url)
  
#   def environments(self):

    

# class Environment(object):
#   """Rancher Environment"""
#   def __init__(self, client, env_id):
#     # super(Environment, self).__init__()
    


#     self.name = client.

#     self.arg = arg
    

# def main():



if __name__ == '__main__':
  # main()

  rancher = gdapi.Client(access_key=rancher_api_access_key, secret_key=rancher_api_secret_key, url=rancher_api_base_url)

  environments = rancher.list('project').data



  # for project in env_data:
  #   print ('{:10} {:5} {:5}'.format(project.id, project.name, project.links.composeConfig))