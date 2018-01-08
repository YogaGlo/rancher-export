FROM node:alpine

ENV CRON_PERIOD daily
ENV NUM_BACKUPS 3
ENV COMPRESS_ARCHIVE true

RUN apk --no-cache add jq curl

ADD ./app /app
ADD ./package.json ./cron/backup ./entrypoint.sh /

RUN npm install

# Todo: import capability
#ADD https://github.com/rancher/rancher-compose/releases/download/v0.12.5/rancher-compose-linux-amd64-v0.12.5.tar.gz /

CMD /entrypoint.sh
