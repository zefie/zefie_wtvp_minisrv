FROM node:current-alpine

RUN apk add git bash
RUN npm install -g npm@latest 2>/dev/null > /dev/null
RUN cd /opt && git clone --depth=1 https://github.com/zefie/zefie_wtvp_minisrv.git minisrv
RUN cd /opt/minisrv && git config pull.ff only 
RUN cd /opt/minisrv/zefie_wtvp_minisrv && npm install

COPY ./run.sh /opt/minisrv/zefie_wtvp_minisrv/run.sh
RUN chmod 755 /opt/minisrv/zefie_wtvp_minisrv/run.sh

WORKDIR /opt/minisrv/zefie_wtvp_minisrv
CMD ./run.sh

