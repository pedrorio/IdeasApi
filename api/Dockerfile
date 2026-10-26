FROM node:22-alpine

WORKDIR '/app'

ADD https://github.com/ufoscout/docker-compose-wait/releases/download/2.4.0/wait /wait
RUN chmod +x /wait

COPY package.json yarn.lock ./
RUN yarn
COPY ./ ./

CMD /wait && yarn start:dev
