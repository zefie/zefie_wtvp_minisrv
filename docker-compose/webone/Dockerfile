FROM debian:latest

RUN apt-get update && apt-get install --yes curl && \
curl -L https://packages.microsoft.com/config/debian/10/packages-microsoft-prod.deb -o /tmp/packages-microsoft-prod.deb && \
apt-get install --yes /tmp/packages-microsoft-prod.deb && \
rm /tmp/packages-microsoft-prod.deb && \
apt-get update && \
apt-get install --yes curl imagemagick ffmpeg jpegoptim

COPY ./setup.sh /tmp/setup.sh
RUN bash /tmp/setup.sh

CMD /usr/local/bin/webone
