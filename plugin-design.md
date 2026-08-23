# 中转模型 设计

## 形态决策

- 目标：给中转站做模型发现、官方元数据匹配，并在同一 Provider 内按模型混用 OpenAI Completions / Responses / Codex Responses（WS） / Anthropic Messages。
- 做插件：是
- 树外 / first-party：树外
- 形态：LLM 适配器 + Client Settings UI
- 挂载点：
  - Host：`ctx.llm.registerAdapter()`（`PiAiAdapter` + 混协议 `createProvider`）、`ctx.llm.registerConfigurableProviders()`、`ctx.llm.registerModelDiscovery('llm-relay-models')`、`installSettingsSection(llm-relay-models)`、`ctx.webServer.register(/relay-models/api)`
  - Client：`settings.section`（`id: relay-models`，`order: 12`，落在官方 Models(10) 与 Plugins(15) 之间）
- 不选其他形态的原因：不是工具/钩子/Conversation Node。官方 `dsh-llm-pi-ai` 已能配单一协议网关，但 `PiAiModelProfile` 没有 per-model `api` 字段，一条路由只能一种协议，也没有按远端 id 匹配官方元数据的设置页。
- 不走 Typert `@Remote`：生成器只枚举仓库内 `packages/` 的 project reference，Client 侧能力表也是编译期固定的，树外插件无法作为 producer 接入。所以配置面用 `ctx.webServer.register` 加自带信任闸。
- 拆 seam：否

## 契约

- 包名：`dsh-relay-models`
- 插件 `name`：`relay-models`
- Loader 行 id：`relay-models`
- inject：`llm` `settings` `credentials` `webServer`；Client `slots` `locale`
- 模型可见名称：无
- 密钥引用：`RELAY_<PROVIDER>_API_KEY`（`ctx.credentials`）；未配置即不带 `Authorization`

## 配置字段

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `providers` | dict | `{}` | 以路由为键的中转站 |
| `providers.*.displayName` | string | 必填 | 选择器显示名 |
| `providers.*.baseURL` | string | 必填 | 中转站地址 |
| `providers.*.apiKeyEnv` | credential-ref | 由路由生成 | 必须等于 `RELAY_<ID>_API_KEY` |
| `providers.*.fallbackProtocol` | enum | 必填 | 未匹配模型的默认协议 |
| `providers.*.modelIds` | string[] | `[]` | 发现到的远端模型 |
| `providers.*.modelMappings` | dict | `{}` | 人工映射到官方元数据 |
| `providers.*.protocolOverrides` | dict | `{}` | 按模型覆盖协议；覆盖后不再继承官方 `compat` |
| `providers.*.excludedModels` | string[] | `[]` | 不注册的模型 |
| `providers.*.headers` | dict | `{}` | 额外请求头，调用和模型发现同时生效；禁止 Authorization 等密钥头。User-Agent 由 DSH attribution 覆盖 |
| `providers.*.transport` | enum | 省略=`auto` | 仅 Codex Responses：`auto` / `websocket` / `websocket-cached` / `sse` |
| `providers.*.streamIdleTimeoutMs` | number | `300000` | 流空闲超时 |
| `providers.*.maxRequestImageBytes` | number | `20 MiB` | 单请求 base64 图片总量上限；镜像 `dsh-llm-pi-ai` 默认值 |
| `providers.*.requestImagePixelBudget` | number | `2048²` | 单张请求图片像素预算 |
| `providers.*.requestImageMaxBytes` | number | `1 MiB` | 单张请求图片编码字节上限 |
| `providers.*.retryPolicy` | RetryPolicy | 官方 normal 默认 | 交给 `dsh-llm-retry` |
| `providers.*.syncedAt` | number | 可选 | 上次发现时间 |
| `trustedHosts` | string[] | `[]` | 除回环外允许提供配置页的 `host[:port]` 权威（反向代理部署） |

`openai` / `anthropic` / `deepseek` 等官方路由名在加载时拒绝。设置写入前会完整解析一遍 Provider（含 `createProvider` 建模），解析失败即拒绝写入。

## 与宿主对齐的三条规则

- **离线目录不再单独快照。** 内置目录直接来自已安装的 `pi-ai`（`getBuiltinProviders`/`getBuiltinModels`），与建模用的是同一份数据，构建期快照的错位可能性随之消失。
- **`compat` 按协议定型。** 只有解析后的协议仍等于官方模型自己的 `api` 时才继承 `compat`；这与 `dsh-llm-pi-ai` 对改指协议的官方路由的处理一致。
- **数值默认值镜像而非引用。** `dsh-llm-pi-ai` 没有从包入口导出 `DEFAULT_*`（只有 `./src/*` 深路径，发布产物里不可用），所以本插件自持同名常量并在注释里标明镜像关系。

## 验证计划

- [x] `validate_dsh_plugin.py`
- [x] 单元测试：保留路由、安全头、Host/Origin/Fetch-metadata 三闸、DNS rebinding、trustedHosts、发现 URL 锁定、无默认伪装头、发现错误透传中转站说明、非法密钥当场拒绝、协议覆盖后丢弃 `compat`、别名模型显示名、IP 字面量命名、pi-ai auth 注入、peer 声明覆盖所有被 import 的宿主包
- [x] 独立 `DSH_HOME` 冷启动：`dsh plugin add` 退出码 0（此前在干净环境下会因 pnpm 拒绝 `@google/genai` 的构建脚本而失败，插件装上却没进 bundles）；profile 只新增 4 个包
- [x] 设置页添加中转站：导航项落在“模型”与“插件”之间；用本地假 `/v1/models` 端点走完发现 → 保存 → 注册；`settings.yaml` 只存配置，`RELAY_127_API_KEY` 落在 `0600` 的 `.credentials.yaml`
- [x] `llm.providers` / `llm.models` 确认路由 `active: true`、`declared: true`，匹配到的模型带官方 reasoning 档位，未匹配模型退回纯文本
- [x] 发现请求带 `deepseek-harness/0.1.1-rc.2` attribution，不伪装其他客户端
- [x] 切换 DSH 语言：导航项与整页文案在中英之间跟随
- [ ] 用真实中转站完成一次模型调用
