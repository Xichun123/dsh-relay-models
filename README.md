# dsh-relay-models

为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 提供中转站模型发现、官方元数据匹配和混合协议 Adapter。

## 保证

- 提供独立的“中转模型”设置页面。
- 注册 LLM Adapter，使已配置模型可以被 DSH 正常选择和调用。
- **不注册 Agent 工具。**
- **不写入 system prompt、会话上下文或其他模型可见内容。**
- API Key 交给 DSH credentials 服务保存，不写入插件设置。
- **不默认伪造 Claude Code / Codex 的 User-Agent 或其他客户端头。** 请求带 DSH attribution；如中转站需要额外头，在设置里按需填写（不能放密钥）。

## 功能

- 添加、删除和同步中转站。
- 从 `/models` 或 `/v1/models` 自动发现模型。
- 从 [`pi.dev/api/models`](https://pi.dev/api/models) 获取最新官方模型元数据，并在离线时回退到随包快照。
- 人工映射或取消映射官方元数据。
- 按模型覆盖或清除协议。
- 排除或恢复模型。
- 同一 Provider 混用：
  - OpenAI Chat Completions
  - OpenAI Responses
  - Anthropic Messages

官方目录由 Host 使用 ETag 缓存；Adapter 继续使用 DSH 对齐的 `pi-ai` 运行时。目录中的其他 API 协议会显示为需要人工覆盖，不会在未覆盖时注册为可调用模型。

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

打开 `http://127.0.0.1:3081/`，确认设置中出现“中转模型”且能添加测试中转站。验证完成后再把同一版本安装到实际 profile，并重启原有 Web 进程。无需开启“创造模式”；它不影响依赖解析、插件加载或服务生命周期。

## 使用

1. 打开 DSH 设置。
2. 进入“中转模型”。
3. 点击“添加中转站”。
4. 填写 Provider ID、显示名称、Base URL、默认协议和 API Key。
5. 点击“发现模型并添加”。
6. 在“管理”中修改映射、协议或排除状态。

Base URL 可以带或不带 `/v1`。插件会为不同协议生成对应调用地址，并尝试 `/models` 与 `/v1/models` 进行发现。

## 配置和凭据

插件设置使用命名空间 `llm-relay-models`。每个中转站保存 Base URL、模型列表、元数据映射、协议覆盖、排除列表、可选额外请求头、流空闲超时和重试策略。API Key 使用从 Provider ID 生成的 credentials 引用，例如 `relay-example` 对应 `RELAY_EXAMPLE_API_KEY`，由 DSH credentials provider 管理。

不要使用 `openai`、`anthropic`、`deepseek` 等官方路由名作为 Provider ID，应使用 `relay-*`。此插件只在 Web profile 加载（依赖 `webServer`）。

浏览器配置请求只发送到当前 DSH 服务的同源 `/relay-models/api`。POST 必须带匹配的 `Origin`；已有中转站的模型发现只使用已保存的 Base URL，不会把托管密钥发到请求里另写的地址。中转站发现响应和 pi.dev 目录响应上限均为 4 MiB，请求体上限为 1 MiB。

官方 Models 页可以通过 `registerConfigurableProviders` / `registerModelDiscovery` 看到这些路由；混协议和元数据匹配仍以本插件的“中转模型”页为准。

## 开发

```bash
pnpm install
pnpm run validate
```

`validate` 会运行单元测试并重新生成官方模型目录和 Host/Web bundles。

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
