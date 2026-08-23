# dsh-relay-models

为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 提供中转站模型发现、官方元数据匹配和混合协议 Adapter。

## 保证

- 提供独立的“中转模型”设置页面。
- 注册 LLM Adapter，使已配置模型可以被 DSH 正常选择和调用。
- **不注册 Agent 工具。**
- **不写入 system prompt、会话上下文或其他模型可见内容。**
- API Key 交给 DSH credentials 服务保存，不写入插件设置，也不写入 pi-ai 自己的凭据存储。
- **不默认伪造 Claude Code / Codex 的 User-Agent 或其他客户端头。** 请求带 DSH attribution；如中转站需要额外头，在设置里按需填写（不能放密钥）。额外头对模型调用和模型发现同时生效，`User-Agent` 始终由 DSH attribution 覆盖。
- Codex Responses 是唯一例外：pi-ai 把 API Key 当 ChatGPT OAuth token 解码才拿得到 `chatgpt-account-id`，所以这条协议下 `Authorization` 里是按路由名合成的未签名 token，真 Key 走 `x-api-key`。见下面的 [Codex Responses](#codex-responses)。

## 功能

- 添加、删除和同步中转站。
- 从 `/models` 或 `/v1/models` 自动发现模型。
- 从 [`pi.dev/api/models`](https://pi.dev/api/models) 获取最新官方模型元数据，并在离线时回退到随宿主 `pi-ai` 安装的内置目录。
- 人工映射或取消映射官方元数据。
- 按模型覆盖或清除协议。
- 排除或恢复模型。
- 中英文界面，跟随 DSH 的语言设置。
- 不需要密钥的中转站（本机自建网关）留空 API Key 即可，请求不带 `Authorization`（Codex Responses 例外，见下）。
- 同一 Provider 混用：
  - OpenAI Chat Completions
  - OpenAI Responses
  - Codex Responses（WebSocket / SSE）
  - Anthropic Messages

官方目录由 Host 使用 ETag 缓存；离线快照就是宿主实际用于建模的那一份 `pi-ai` 内置目录，两者不会因为构建时间不同而错位。目录中的其他 API 协议会显示为需要人工覆盖，不会在未覆盖时注册为可调用模型。

匹配到官方元数据的模型会带上该模型的 `compat` 开关。这些开关按协议定型，所以**一旦用协议覆盖把模型改到另一种协议，`compat` 就不再继承**，交回 pi-ai 自己的 baseURL 探测——和 `dsh-llm-pi-ai` 对改指协议的官方路由采用同一条规则。远端 id 与官方 id 不同时，显示名会附上远端 id，避免两个别名映射到同一官方模型后在选择器里同名。

## 安装

### 从 npm 安装

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add dsh-relay-models@latest
```

### 从 GitHub 安装

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add github:Xichun123/dsh-relay-models
```

安装后重启当前 DSH Web 进程，并刷新页面。不要先停止仍在提供服务的实例；先完成安装和下面的隔离验证，再安排一次重启。

DSH 核心包（`dsh-host-webserver`、`dsh-llm` 等）和 `@earendil-works/pi-ai` 都是 **peerDependencies**，由正在运行的 DSH 通过 `$DSH_HOME/profiles/node_modules` 提供，不会装进 profile 的 `node_modules` 去遮蔽宿主版本。pi-ai 尤其不能自带副本：本插件构造的 Provider 会交给宿主的 `PiAiAdapter`，两边必须是同一个模块实例；副本还会把各家 provider SDK（`@google/genai`、`@aws-sdk` 等）拖进 profile，pnpm 会因为拒绝执行它们的构建脚本而让 `dsh plugin add` 失败。安装本插件只新增 4 个包。

### 从本地 tarball 安装

```bash
git clone https://github.com/Xichun123/dsh-relay-models.git
cd dsh-relay-models
pnpm install
pnpm run validate
pnpm pack --pack-destination /tmp
npx @deepseek-ai/dsh@latest plugin --profile web add /tmp/dsh-relay-models-*.tgz
```

使用 `.tgz`，不要用 `link:`：ESM 会从链接仓库的真实路径解析依赖，容易造成运行时缺包。

## 安全验证后再更新现有服务

先用独立 `DSH_HOME` 和端口冷启动：

```bash
rm -rf /tmp/dsh-relay-models-home
DSH_HOME=/tmp/dsh-relay-models-home \
  npx @deepseek-ai/dsh@latest plugin --profile web add dsh-relay-models@latest
DSH_HOME=/tmp/dsh-relay-models-home \
  npx @deepseek-ai/dsh@latest --profile web -- --port 3081
```

打开 `http://127.0.0.1:3081/`，确认设置中出现“中转模型”（在“模型”与“插件”之间）且能添加测试中转站。验证完成后再把同一版本安装到实际 profile，并重启原有 Web 进程。无需开启“创造模式”；它不影响依赖解析、插件加载或服务生命周期。

不想动真实中转站时，可以用一个只回 `/v1/models` 的本地端点走完整流程：

```bash
cat > /tmp/fake-relay.mjs <<'EOF'
import { createServer } from 'node:http'
const models = { data: [{ id: 'gpt-5.6-sol' }, { id: 'claude-sonnet-4-6' }, { id: 'house-brand-turbo' }] }
createServer((req, res) => {
  res.writeHead(new URL(req.url, 'http://x').pathname.endsWith('/models') ? 200 : 404,
    { 'content-type': 'application/json' })
  res.end(JSON.stringify(models))
}).listen(3098, '127.0.0.1')
EOF
node /tmp/fake-relay.mjs
```

Base URL 填 `http://127.0.0.1:3098/v1`，API Key 随便填或留空，应当发现 3 个模型：两个匹配官方元数据（协议随之变为 Responses / Anthropic Messages），一个未匹配走默认协议。

## 使用

1. 打开 DSH 设置。
2. 进入“中转模型”（在“模型”和“插件”之间）。
3. 点击“添加中转站”。
4. 填写 Provider ID、显示名称、Base URL、默认协议和 API Key（自建无鉴权网关可留空）。
5. 点击“发现模型并添加”。
6. 在“模型”里修改映射、协议或排除状态。

Base URL 可以带或不带 `/v1`。插件会为不同协议生成对应调用地址，并尝试 `/models` 与 `/v1/models` 进行发现。

### Codex Responses

匹配到官方 `openai-codex` 元数据的模型会自动使用 **Codex Responses**。pi-ai 会把请求打到 `{origin}/backend-api/codex/responses`（CLIProxyAPI 的 Codex 别名，和 `/v1/responses` 同一个 handler）。连接设置里的 **Codex 传输** 默认 `auto`：先 WebSocket，失败再 SSE。需要纯 SSE 时把该模型协议覆盖成 OpenAI Responses，或把传输设为 SSE。

CLIProxyAPI 上游还要在对应 Codex 凭证里打开 `"websockets": true`，否则下游即使是 WS，上游仍走 SSE。

这条协议的鉴权和另外三种不一样。pi-ai 先把 API Key 当 ChatGPT OAuth token 解码、取出 `chatgpt-account-id`，之后才选传输，所以中转站那种普通 Key 会在任何请求发出之前就报 `Failed to extract accountId from token`——WS 和 SSE 一样到不了。中转站并不需要这个头：它用自己的 Key 认下游，再注入自己的上游 Codex 凭证，收到一个不是它签发的 `chatgpt-account-id` 也照样放行。所以插件按路由名合成一个未签名 token 交给 pi-ai，本该当 bearer 的真 Key 改走 `x-api-key`（pi-ai 原样透传）。留空 Key 的自建网关同样会收到这个合成 token，因为 pi-ai 没有 token 就建不出请求头。

只认 `Authorization` 的中转站会拒掉这种请求——它本来也跑不通这条协议，只是报错更早、更难懂。Key 本身就是带 `chatgpt_account_id` 的 JWT（中转站转发真 ChatGPT token）时，插件原样放过，不改 `Authorization`。

#### Fast 模式（Codex 速度模式）

Fast 模式在协议层就是请求体里的 `service_tier`：Codex CLI 的 `/fast on`、`config.toml` 里的 `service_tier = "fast"` 都落到这一个字段。DSH 自己从不发它（`dsh-llm-pi-ai` 里没有任何 `service_tier`），所以连接设置里新增了 **Codex 速度模式**：

- **不设置**（默认）——请求体里没有 `service_tier`，与本插件之前的行为一致。
- **Fast 快速** —— 按 [OpenAI 文档](https://learn.chatgpt.com/docs/agent-configuration/speed)提速约 1.5 倍；GPT-5.6 / 5.5 按 2.5 倍、GPT-5.4 按 2 倍消耗 ChatGPT credits。用 API Key 计费的链路拿到的是 Priority 定价（GPT-5.6 为 2 倍单价），不是 credits 倍率。
- **Priority 优先** / **Flex 弹性** —— API 侧的两档；pi-ai 会按 2 倍 / 0.5 倍换算这两档的成本统计，`fast` 它还不认识，成本按标准价记。

只有 Codex Responses 协议的模型会带这个字段，其余三种协议忽略它。

上游认不认要自己确认：ChatGPT 的 Codex 后端对这个字段既不校验也不回显（响应里的 `service_tier` 一律是 `default`，pi-ai 对这个回显本身就有 workaround），连 `service_tier: "turbo"` 都返回 200。CLIProxyAPI 转发 codex 请求时只删 `parallel_tool_calls`，字段会原样带到上游；它的 Keeper 请求日志有一列“速度模式”，显示“请求值 / 实际值”（例如 `快速 / 标准`），以那一列为准。

## 配置和凭据

插件设置使用命名空间 `llm-relay-models`。每个中转站保存 Base URL、模型列表、元数据映射、协议覆盖、排除列表、可选额外请求头、Codex 传输、Codex 速度模式、流空闲超时、请求图片上限和重试策略。API Key 使用从 Provider ID 生成的 credentials 引用，例如 `relay-example` 对应 `RELAY_EXAMPLE_API_KEY`，由 DSH credentials provider 管理。

`maxRequestImageBytes`、`requestImagePixelBudget`、`requestImageMaxBytes` 默认镜像 `dsh-llm-pi-ai` 的取值（20 MiB / 2048² 像素 / 1 MiB）。中转站的请求体上限更小时，在 `settings.yaml` 的对应段里调低即可；这三项没有页面入口。

不要使用 `openai`、`anthropic`、`deepseek` 等官方路由名作为 Provider ID，应使用 `relay-*`。此插件只在 Web profile 加载（依赖 `webServer`）。

保存时会先完整解析一遍 Provider（含建模），解析不通过的配置在写入处就被拒绝，不会出现“保存成功但路由没生效”。

## 浏览器请求的信任边界

DSH 的 webserver 本身不提供 CSRF、Origin 或鉴权，所以 `/relay-models/api` 自带三道闸，顺序与 DSH `/api` 一致：

1. **Host** —— 必须是回环地址，或 `trustedHosts` 里声明的 `host[:port]`。这一道防的是 DNS rebinding：请求确实打到了本机，但被重绑定的页面在 Host 里写的是攻击者域名，而 Host 是重绑定伪造不了的那个头。反向代理（Caddy 等）部署时把对外权威写进 `trustedHosts`：
   ```yaml
   llm-relay-models:
     trustedHosts: ['dsh.example.com']
   ```
   带端口的条目只匹配该端口，不带端口的条目匹配该主机的任意端口。不是纯 `host[:port]` 的条目（含路径、含 userinfo）一律不授信。
2. **Fetch metadata** —— 显式 `Sec-Fetch-Site: cross-site` 直接拒绝。
3. **Origin** —— 浏览器带了 Origin 就必须与 Host 权威完全一致；读可以不带，写必须带，因为这个端点会保存 API Key，也会让宿主去访问请求里给出的地址。

已有中转站的模型发现只使用已保存的 Base URL，不会把托管密钥发到请求里另写的地址。中转站发现响应和 pi.dev 目录响应上限均为 4 MiB，请求体上限为 1 MiB。

模型发现失败时，错误信息原样带上中转站自己的 JSON 说明（`error.message`、`error`、`message` 或 `detail`；单行，最多 300 字符），只有中转站什么都没说时才提示检查 API Key。所以 `unauthorized client detected` 这类“只认特定客户端”的拦截会直接显示出来，不会被误读成 Key 失效。密钥里带了 HTTP 头装不下的字符（智能引号、换行）时也会当场指出，而不是报成“连不上中转站”。

配置被别处改动后，页面的写入会被 `SETTINGS_CONFLICT` 拒绝；页面会自动重新载入并提示重试，而不是拿着过期的 revision 一直失败。

官方 Models 页可以通过 `registerConfigurableProviders` / `registerModelDiscovery` 看到这些路由，并支持整条删除（含托管密钥）；但它对本插件的命名空间只显示“其余字段在 settings.yaml 中”并禁用应用按钮——混协议和元数据匹配以本插件的“中转模型”页为准。


## 开发

```bash
pnpm install
pnpm run validate
```

`validate` 会运行单元测试、类型检查并重建 Host/Web bundles。没有代码生成步骤：离线模型目录直接读取已安装的 `pi-ai` 内置目录。

Web 页面复用宿主已经注入模块表的 `@deepseek-ai/dsh-client-ui-primitives`（Button / Input / Pill）和 `ctx.locale`，因此这两个包必须保持 external，不能打进 `lib/client.js`。

DSH 包在 `peerDependencies` 里由宿主提供，本地只用 `devDependencies` 跑测试和 typecheck。这些 devDependencies 跟随 DSH 的 **`next`** dist-tag：库包（`dsh-llm` 等）的 `latest` 还停在 `0.0.1-rc.1`，正在发布的那条线在 `next`。同步一次：

```bash
pnpm run sync:dsh
```

不要写成 `^0.1.0-rc.6` 这类固定预发布范围：semver 只会在同一 `major.minor.patch` 上匹配预发布号，所以它永远升不到 `0.1.1-rc.2`，本地测到的行为会和宿主实际运行的版本脱节。CI 用 `pnpm install --frozen-lockfile`，可复现性由 `pnpm-lock.yaml` 保证。

源码热加载（把路径换成你的绝对路径）：

```bash
pnpm dsh web --patch ./cordis.dev.yml
```

## 发布

推送版本标签后，GitHub Actions 会跑完整校验并发布到 npm：

```bash
# 先改 package.json 里的 version，再：
git tag v0.1.7
git push origin v0.1.7
```

标签必须是 `v` + `package.json` 的 version，例如 `0.1.7` 对应 `v0.1.7`。

首次发布前，在 npm 上绑定一次 Trusted Publisher（不用仓库 Secret）：

1. 打开 [dsh-relay-models Access](https://www.npmjs.com/package/dsh-relay-models/access)
2. **Trusted Publisher** → **GitHub Actions**
3. Organization or user：`Xichun123`
4. Repository：`dsh-relay-models`
5. Workflow filename：`publish.yml`
6. Environment name：`npm`

## License

MIT
