FROM alpine:latest

RUN apk add git nodejs npm
RUN cd /opt && git clone --depth=1 https://github.com/zefie/zefie_wtvp_minisrv.git minisrv
RUN cd /opt/minisrv/zefie_wtvp_minisrv && npm install

COPY ./run.sh /opt/minisrv/zefie_wtvp_minisrv/run.sh
RUN chmod +x /opt/minisrv/zefie_wtvp_minisrv/run.sh

WORKDIR /opt/minisrv/zefie_wtvp_minisrv
CMD ./run.sh
