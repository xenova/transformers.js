#!/usr/bin/env bash
set -euo pipefail
# Run inside the disposable Linux GPU host. No credentials are required.
TASK_ROOT=${TASK_ROOT:-/workspace/beam-gpu}
mkdir -p "$TASK_ROOT"
cd "$TASK_ROOT"
apt-get update -qq
apt-get install -y -qq libegl1 libgl1 libglvnd0 vulkan-tools
if ! command -v node >/dev/null; then
  curl -fsSL https://nodejs.org/dist/v24.14.1/node-v24.14.1-linux-x64.tar.xz -o node.tar.xz
  tar -xf node.tar.xz
fi
export PATH="$TASK_ROOT/node-v24.14.1-linux-x64/bin:$PATH"
corepack enable
if [[ ! -d transformers.js/.git ]]; then
  git clone --depth 1 --branch dan/add-beam-support https://github.com/justsml/transformers.js.git
fi
cd transformers.js
git checkout 7c43a27d44f2ae4fa764362ce31f389a2bb489bf
pnpm install --frozen-lockfile
pnpm build
mkdir -p "$TASK_ROOT/runner"
cd "$TASK_ROOT/runner"
if [[ ! -f package.json ]]; then
  printf '{"private":true,"type":"module","packageManager":"pnpm@10.28.1"}\n' > package.json
fi
pnpm add --save-exact playwright@1.56.1
pnpm exec playwright install --with-deps chromium
node --version
pnpm exec playwright --version
nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv
