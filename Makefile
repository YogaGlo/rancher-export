# Builds emcniece/rancher-export

NAMESPACE := emcniece
PROJECT := rancher-export
PLATFORM := linux
ARCH := amd64
DOCKER_IMAGE := $(NAMESPACE)/$(PROJECT)

VERSION := $(shell jq '.version' package.json --raw-output)
GITSHA := $(shell git rev-parse --short HEAD)

all: help

help:
	@echo "---"
	@echo "IMAGE: $(DOCKER_IMAGE)"
	@echo "VERSION: $(VERSION)"
	@echo "---"
	@echo "Execute `source .env` before building to include environment variables."
	@echo "---"
	@echo "make image - compile Docker image"
	@echo "make run - start Docker contaner"
	@echo "make run-test - run 'npm test' on container"
	@echo "make run-debug - run container with tail"
	@echo "make docker - push to Docker repository"
	@echo "make release - push to latest tag Docker repository"

image:
	docker build -t $(DOCKER_IMAGE):$(VERSION) \
		-f Dockerfile .

run:
	docker run -d \
		-e RANCHER_API_BASE_URL=${RANCHER_API_BASE_URL} \
		-e RANCHER_API_ACCESS_KEY=${RANCHER_API_ACCESS_KEY} \
		-e RANCHER_API_SECRET_KEY=${RANCHER_API_SECRET_KEY} \
	  $(DOCKER_IMAGE):$(VERSION)

run-debug:
	docker run -d \
		-e RANCHER_API_BASE_URL=${RANCHER_API_BASE_URL} \
		-e RANCHER_API_ACCESS_KEY=${RANCHER_API_ACCESS_KEY} \
		-e RANCHER_API_SECRET_KEY=${RANCHER_API_SECRET_KEY} \
		$(DOCKER_IMAGE):$(VERSION) tail -f /dev/null

docker:
	@echo "Pushing $(DOCKER_IMAGE):$(VERSION)"
	docker push $(DOCKER_IMAGE):$(VERSION)

release: docker
	@echo "Pushing $(DOCKER_IMAGE):latest"
	docker tag $(DOCKER_IMAGE):$(VERSION) $(DOCKER_IMAGE):latest
	docker push $(DOCKER_IMAGE):latest
