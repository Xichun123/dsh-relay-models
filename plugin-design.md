# 中转模型 设计

## 形态决策

- 目标：给中转站做模型发现、官方元数据匹配，并在同一 Provider 内按模型混用 OpenAI Completions / Responses / Codex Responses（WS） / Anthropic Messages。
- 做插件：是
- 树外 / first-party：树外
- 形态：LLM 适配器 + Client Settings UI
- 挂载点：
  - Host：`ctx.llm.registerAdapter()`（`PiAiAdapter` + 混协议 `createProvider`）、`ctx.llm.registerConfigurableProviders()`、`ctx.llm.registerModelDiscovery('llm-relay-models')`、`installSettingsSection(llm-relay-models)`、`ctx.connection.rpc.handle(/relay-models)`
  - Client：`settings.section`（`id: relay-models`，`order: 12`，落在官方 Models(10) 与 Plugins(15) 之间）
- 不选其他形态的原因：不是工具/钩子/Conversation Node。官方 `dsh-llm-pi-ai` 已能配单一协议网关，但 `PiAiModelProfile` 没有 per-model `api` 字段，一条路由只能一种协议，也没有按远端 id 匹配官方元数据的设置页。
- 不走 Typert `@Remote`：生成器只枚举仓库内 `packages/` 的 project reference，Client 侧能力表也是编译期固定的，树外插件无法作为 producer 接入。配置面因此走 Connection 的通用 RPC 通道（`ctx.connection.rpc.handle` / 页面侧 `rpc.call`），Host/Origin 三闸与浏览器鉴权由 Connection 施加，不再自建 webServer 路由和信任闸。
- 拆 seam：否

## 契约

- 包名：`dsh-relay-models`
- 插件 `name`：`relay-models`
- Loader 行 id：`relay-models`
- inject：`llm` `settings` `credentials` `connection`；Client `slots` `locale` `connection`
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

`openai` / `anthropic` / `deepseek` 等官方路由名在加载时拒绝。设置写入前会完整解析一遍 Provider（含 `createProvider` 建模），解析失败即拒绝写入。

## 与宿主对齐的三条规则

- **离线目录不再单独快照。** 内置目录直接来自已安装的 `pi-ai`（`getBuiltinProviders`/`getBuiltinModels`），与建模用的是同一份数据，构建期快照的错位可能性随之消失。
- **`compat` 按协议定型。** 只有解析后的协议仍等于官方模型自己的 `api` 时才继承 `compat`；这与 `dsh-llm-pi-ai` 对改指协议的官方路由的处理一致。
- **数值默认值镜像而非引用。** `dsh-llm-pi-ai` 没有从包入口导出 `DEFAULT_*`（只有 `./src/*` 深路径，发布产物里不可用），所以本插件自持同名常量并在注释里标明镜像关系。

## Codex Responses 的鉴权拆分

- pi-ai 的 `openai-codex-responses` 在选传输之前先 `extractAccountId(apiKey)`：把 Key 当 ChatGPT OAuth token 解码，取 `https://api.openai.com/auth` → `chatgpt_account_id`，失败就抛 `Failed to extract accountId from token`。中转站的普通 Key 过不了这一步，WS 和 SSE 都到不了；pi-ai 0.82–0.84 没有传入 account id 的选项，`Authorization` 也总是被 `Bearer <apiKey>` 覆盖，额外头改不动。
- 中转站不需要这个头：CLIProxyAPI 认自己的 Key、注入自己的上游 Codex 凭证，`chatgpt-account-id` 不是它签发的也放行。
- 所以 `src/codex-relay.ts` 只包一层 `ProviderStreams`：Key 解不出 account id 时，交给 pi-ai 的是按路由名合成的未签名 token，真 Key 进 `x-api-key`；解得出（中转站转发真 ChatGPT token）就原样放过。留空 Key 的路由也发合成 token——pi-ai 没 token 建不出头，而这本来就是"No API key for provider"直接失败的情形。
- 只认 `Authorization` 的中转站会 401，但那条路径此前 100% 失败，所以没有回归；这条例外写进 README 的"保证"一节。
- 同一层还带 `service_tier`（Fast 模式）：这是 Codex 独有的 body 字段，`dsh-llm-pi-ai` 里根本没有它。取值只有 `priority` 一个——OpenAI 把 Priority processing 改名 Fast mode 后 `fast` 只是别名，Codex CLI 归一化后线上发的也是 `priority`，而 pi-ai 的成本倍率与 `default` 回显纠正都只认 `priority` / `flex`，发 `fast` 会让本轮按标准价记账。调用方自己给了 tier 就让它优先。DSH 实际走 pi-ai 的 `streamSimple()`；pi-ai 0.82 的 base-options 重建会丢掉 API 专属的 `serviceTier`，因此包装层利用它仍会保留的 `onPayload`，在序列化前补回 `service_tier`。

## 验证计划

- [x] `validate_dsh_plugin.py`
- [x] 单元测试：保留路由、安全头、发现 URL 锁定、无默认伪装头、发现错误透传中转站说明、非法密钥当场拒绝、协议覆盖后丢弃 `compat`、别名模型显示名、IP 字面量命名、pi-ai auth 注入、Codex account id 解析与 Key 侧带、`service_tier` 仅在配置后发送且不覆盖调用方选择、peer 声明覆盖所有被 import 的宿主包
- [x] 独立 `DSH_HOME` 冷启动：`dsh plugin add` 退出码 0（此前在干净环境下会因 pnpm 拒绝 `@google/genai` 的构建脚本而失败，插件装上却没进 bundles）；profile 只新增 4 个包
- [x] 设置页添加中转站：导航项落在“模型”与“插件”之间；用本地假 `/v1/models` 端点走完发现 → 保存 → 注册；`settings.yaml` 只存配置，`RELAY_127_API_KEY` 落在 `0600` 的 `.credentials.yaml`
- [x] `llm.providers` / `llm.models` 确认路由 `active: true`、`declared: true`，匹配到的模型带官方 reasoning 档位，未匹配模型退回纯文本
- [x] 发现请求带 `deepseek-harness/0.1.1-rc.2` attribution，不伪装其他客户端
- [x] 切换 DSH 语言：导航项与整页文案在中英之间跟随
- [x] 用真实中转站完成一次模型调用：`buildRelayProvider` 直连 CLIProxyAPI 的 codex 别名，WS 与 SSE 都拿到回复；选中 Fast 后 `onPayload` 里确认请求体带 `service_tier: "priority"`，中转站的 Keeper 日志显示“快速 / 标准”
- [ ] 在真实 Codex 凭证上确认 Fast 模式确实生效（响应不回显，只能看中转站日志或 credits 消耗）


## 官方 llm-pi-ai 元数据补齐（0.1.2-alpha.3）

官方自定义供应商不会模糊匹配 pi-ai 目录，也不会为未知网关填 `compat`。本插件在 `llm-pi-ai` 命名空间上只填空：

- 触发：插件加载、pi.dev 目录刷新、`settings/updated`（`llm-pi-ai`）、RPC `enrich-official`。
- 范围：带 `baseURL` 且 `models` 非空的手写路由。
- 不覆盖用户已写的 `contextWindow` / `reasoningEfforts` / `compat` 字段。
- 不注册这些路由的 Adapter（仍由官方 `dsh-llm-pi-ai` 持有），避免官方 Models 页只读。
