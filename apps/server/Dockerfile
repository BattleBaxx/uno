FROM docker.io/library/node:22-slim AS esbuild
WORKDIR /tmp
RUN npm pack @esbuild/linux-x64@0.28.2 && tar -xzf esbuild-linux-x64-0.28.2.tgz

FROM ghcr.io/denoland/celld:0.6.2
COPY --from=esbuild /tmp/package/bin/esbuild /usr/local/bin/esbuild
