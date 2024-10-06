FROM golang:1.22.5-bookworm AS go

ARG goproxy="https://proxy.golang.org,direct"

COPY . /automate
WORKDIR /automate
RUN go env -w GOPROXY=$goproxy
RUN go build -o test-automate ./ 
RUN go run ./utils/get-browser

FROM ubuntu:noble

# A conserver ?
COPY --from=go /root/.cache/rod /root/.cache/rod
RUN ln -s /root/.cache/rod/browser/$(ls /root/.cache/rod/browser)/chrome /usr/bin/chrome

RUN touch /.dockerenv

COPY --from=go /automate/test-automate /usr/bin/

ARG apt_sources="http://archive.ubuntu.com"

RUN sed -i "s|http://archive.ubuntu.com|$apt_sources|g" /etc/apt/sources.list && \
    apt-get update > /dev/null && \
    apt-get install --no-install-recommends -y \
    # chromium dependencies
    libnss3 \
    libxss1 \
    libasound2t64 \
    libxtst6 \
    libgtk-3-0 \
    libgbm1 \
    ca-certificates \
    # fonts
    fonts-liberation fonts-noto-color-emoji fonts-noto-cjk \
    # timezone
    tzdata \
    # process reaper
    dumb-init \
    # headful mode support, for example: $ xvfb-run chromium-browser --remote-debugging-port=9222
    xvfb \
    > /dev/null && \
    # cleanup
    rm -rf /var/lib/apt/lists/*

# process reaper
ENTRYPOINT ["dumb-init", "--"]

CMD ["xvfb-run", "-e", "/dev/stdout","-a", "test-automate"] 

LABEL org.opencontainers.image.source="https://github.com/rdartus/automate-wx"
LABEL org.opencontainers.image.authors="rdartus <richard.dartus@gmail.com>" 
LABEL org.opencontainers.image.descriptio="Wx chapter opener"
LABEL org.opencontainers.image.licenses="MIT"