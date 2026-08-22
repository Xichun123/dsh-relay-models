# 中转模型 设计

## 形态决策

- 目标：给中转站做模型发现、官方元数据匹配，并在同一 Provider 内按模型混用 OpenAI Completions / Responses / Codex Responses（WS） / Anthropic Messages。
- 做插件：是
- 树外 / first-party：树外
- 形态：LLM 适配器 + Client Settings UI
- 挂载点：
  - Host：`ctx.llm.registerAdapter()`（`PiAiAdapter` + 混协议 `createProvider`）、`ctx.llm.registerConfigurableProviders()`、`ctx.llm.registerModelDiscovery('llm-relay-models')`、`installSettingsSection(llm-relay-models)`、`ctx.webServer.register(/relay-models/api)`
  - Client：`settings.section`（`id: relay-models`）
- 不选其他形态的原因：不是工具/钩子/Conversation Node。官方 `dsh-llm-pi-ai` 已能配单一协议网关，但一条路由只能一种协议，也没有按远端 id 匹配官方元数据的设置页。
- 拆 seam：否

## 契约

- 包名：`dsh-relay-models`
- 插件 `name`：`relay-models`
- Loader 行 id：`relay-models`
- inject：`llm` `settings` `credentials` `webServer`；Client `slots`
- 模型可见名称：无
- 密钥引用：`RELAY_<PROVIDER>_API_KEY`（`ctx.credentials`）

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
| `providers.*.protocolOverrides` | dict | `{}` | 按模型覆盖协议 |
| `providers.*.excludedModels` | string[] | `[]` | 不注册的模型 |
| `providers.*.headers` | dict | `{}` | 额外请求头，调用和模型发现同时生效；禁止 Authorization 等密钥头。User-Agent 由 DSH attribution 覆盖 |
| `providers.*.transport` | enum | 省略=`auto` | 仅 Codex Responses：`auto` / `websocket` / `websocket-cached` / `sse` |
| `providers.*.streamIdleTimeoutMs` | number | `300000` | 流空闲超时 |
| `providers.*.retryPolicy` | RetryPolicy | 官方 normal 默认 | 交给 `dsh-llm-retry` |
| `providers.*.syncedAt` | number | 可选 | 上次发现时间 |

`openai` / `anthropic` / `deepseek` 等官方路由名在加载时拒绝。

## 验证计划

- [x] `validate_dsh_plugin.py`
- [x] 单元测试：保留路由、安全头、Origin、发现 URL 锁定、无默认伪装头、发现错误透传中转站说明、pi-ai auth 注入
- [ ] `--patch` 冷启动
- [ ] 设置页添加中转站并成功调用一次模型
