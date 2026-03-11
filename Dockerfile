# Stage 1: Build
FROM elixir:1.16-slim AS builder

ARG MIX_ENV=prod
ENV MIX_ENV=${MIX_ENV}

RUN apt-get update && apt-get install -y \
  build-essential git nodejs npm \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mix local.hex --force && mix local.rebar --force

COPY mix.exs mix.lock ./
RUN mix deps.get --only ${MIX_ENV}
RUN mix deps.compile

COPY assets assets
COPY priv priv
COPY lib lib
COPY config config

RUN mix assets.deploy
RUN mix compile
RUN mix release

# Stage 2: Runtime
FROM debian:bookworm-slim AS runner

ENV MIX_ENV=prod
ENV PHX_SERVER=true

RUN apt-get update && apt-get install -y \
  libssl3 libncurses6 locales \
  && rm -rf /var/lib/apt/lists/*

RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LANGUAGE=en_US:en LC_ALL=en_US.UTF-8

WORKDIR /app

RUN useradd --create-home app
COPY --from=builder --chown=app:app /app/_build/prod/rel/scheckerge ./

USER app

EXPOSE 4000

CMD ["bin/scheckerge", "start"]
