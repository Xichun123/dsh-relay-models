# dsh-relay-models

为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 的 `llm-pi-ai` 自定义提供方补全模型能力、编辑 Headers、覆写请求的 User-Agent，并支持供应商列表拖拽排序。

当前代码按 **dsh-v0.1.3-alpha.2** 源码适配（验证 checkout：`82a5fd61a7`），peer 依赖最低要求同步为 `0.1.3-alpha.2`；不再兼容仅依赖插件实现 Anthropic 模型发现的旧版本。

alpha.2 的目录补全支持新增 `thinkingTokenBudgetField`、`vllmPriority`、`supportsMaxOutputTokens` 和模板变量 `thinking.budget`，按协议过滤并保留显式配置；宿主未开放的 `supportsMidConvoEffort` / `allowedFallbackModels` 不从目录写入。

- **模型发现交给 DSH**：宿主已原生支持 `openai-completions`、`openai-responses` 和 `anthropic-messages`，负责请求、凭据、部署头、响应解析与错误码。插件不再接管失败并重试另一条请求。
- **能力补全**：从 [pi.dev/api/models](https://pi.dev/api/models) 获取目录，在发现结果中补全缺失的名称、上下文窗口和输出上限；设置页保存模型列表时，再补全 `input`、`reasoningEfforts` 和协议允许的 `compat`。已有显式字段优先；名称为空白或与模型 `id` 完全相同时视为默认名称，发现和保存时使用目录名称（保留其大小写），不修改请求用的 `id`，其他自定义名称保留。
- **未匹配模型**：pi-ai 模型编辑行提供手动目录选择；选择成功后更新名称，点击宿主的保存按钮才会持久化补全字段。临时别名表只存在于当前 Host 进程，保存的模型条目保留 `catalogId` 和补全结果。

## 安装

### 从 npm 安装

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add dsh-relay-models@latest
```

### 从 GitHub 安装

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add github:Xichun123/dsh-relay-models
```

### 从本地目录安装

先在本目录运行 `pnpm install && pnpm run build`，再安装构建好的插件：

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add /path/to/dsh-relay-models
```

安装后重启对应 profile 并刷新 Web 页面。本地重构不会自动更新 npm 或 GitHub 上已发布的版本。

## 使用

1. 打开 DSH 设置 → 模型。
2. 添加自定义提供方，填写协议、API 地址和凭据，获取可用模型。
3. 对得上 pi.dev 目录的模型自动补全；对不上的可以手动选择目录模型。
4. 保存提供方或模型列表。目录不可用时保留原数据并在 Host 记录警告；宿主发现失败则原样报错，不会伪装成目录故障。

### 供应商排序

在 **设置 → 模型** 中，拖动供应商名称左侧的 **⠿** 手柄调整位置，松开后自动保存；也可用 Tab 聚焦手柄后按 **↑ / ↓** 调整。支持内置和自定义供应商；按提供方 ID 记忆顺序，重名或改名不影响定位，新提供方排在已排序条目之后。

排序同时应用到**对话输入框的模型选择器**：供应商分组与设置页一致，组内模型顺序、当前模型和推理等级不变；选择器内的 ↑ / ↓ 按显示顺序移动焦点。已有排序无需重新设置，重新打开选择器即可使用。

顺序仅保存在当前浏览器、当前站点的 `localStorage`，刷新或重新打开设置后保留，同站点的其他标签页同步，不跨浏览器同步；不会写入供应商配置或影响调用优先级。`/model` 指令弹窗不在此 DOM 排序范围内。浏览器拒绝保存时提示错误并保留原顺序。实现针对 alpha.2 的设置列表和模型选择器结构，在同一列表内移动原有卡片或分组，保留编辑草稿和模型按钮；结构不匹配（例如首次配置卡片）时不接管。停用插件移除手柄并恢复本次挂载记录的原顺序，不删除已保存的排序偏好。

### Headers 与 User-Agent 覆写

先保存自定义提供方，再打开 **编辑 → 自定义设置 → API 协议下方的 Headers (JSON)**，填写字符串值的 JSON 对象，例如：

```json
{
  "User-Agent": "claude-cli/2.1.263 (external, cli)",
  "X-Tenant": "example"
}
```

点击 **保存 Headers**；此字段单独提交，不由下方宿主的“保存”按钮提交。若其他字段也有修改，请先保存其他字段并重新打开编辑器。Headers 保存后也需重新打开编辑器，刷新宿主的配置修订号。校验失败、网络失败或修订冲突保留草稿；不会自动关闭编辑器或覆盖其他字段。未保存的 Headers 会阻止宿主“保存”静默丢弃草稿；需要先复制草稿再使用“放弃 Headers 修改”。

Headers 存入 DSH 原生 `llm-pi-ai.providers.<提供方 ID>.headers`，不增加插件配置副本。留空删除用户层 Headers、恢复继承；`{}` 是空用户层字典，不能屏蔽部署层继承的 Headers。名称不区分大小写且不能重复，名称和值必须符合 HTTP Header 规则。Headers 按普通设置保存，不是密钥保险箱；API 密钥仍建议使用上方的专用输入框。

UA 覆写借鉴 [dsh-fetch-header-rewrite](https://github.com/MwumLi/dsh-fetch-header-rewrite) 的发送前 `globalThis.fetch` 包装思路；该仓库还支持全局 Headers、首条匹配的 URL 前缀/正则规则及调试日志，本插件不复制这些额外配置。普通 Headers 仍由 DSH 发送，只有 `User-Agent` 在 DSH/SDK 合并后再次设置。未配置 UA 时保持原样；通过提供方请求上下文隔离，即使多个提供方使用同一个 API 地址也不会按 URL 猜选 UA。

覆写覆盖显式设置 HTTP(S) API 地址、通过 `fetch` 发送的模型发现及对话请求（已验证三种上述协议）。只匹配该次请求地址的同源路径范围；发现使用编辑中的 API 地址，对话使用流开始时的设置。WebSocket/其他非 fetch 传输不覆盖；HTTP 自动重定向沿用 Fetch 行为，不保证逐跳隔离。若在 `prepareCall` 与开始流之间改配置，UA 可能来自新设置而适配器仍持有旧快照，请让当前请求完成后再改。其他 fetch 覆写插件若命中同一请求，最终结果受装载顺序影响。

### anthropic-messages 的 API 地址

建议仍填写不带 `/v1` 的服务根地址：

| 协议 | API 地址 |
| --- | --- |
| `anthropic-messages` | `https://api.example.com` |
| `openai-completions` / `openai-responses` | `https://api.example.com/v1` |

DSH `0.1.3-alpha.2` 的 Anthropic **模型发现**会移除末尾一个 `/v1` 后请求 `/v1/models?limit=1000`；**对话请求**仍使用原始 `baseURL`。因此发现成功不代表带 `/v1` 的对话地址一定正确，插件不再自行修改 URL 或发起备用请求。

### 运行边界

目录加载使用 [Effect](https://github.com/Effect-TS/effect) `3.22.1` 的 `Effect.gen`、`tryPromise`、`timeoutFail` 和带类型的错误处理。每个插件实例共享一次成功的目录下载，失败后下次重试；请求最长 30 秒，读取过程中限制为 8 MiB。取消一个读者不影响其他读者，卸载会中止共享下载并清理 Host/Web 注册与监听器。

补全范围是设置页使用的 `settings.mutate` 提供方对象或模型数组写入，不会自动改写已有配置文件，也不拦截 `settings.update` / `replace`。新版 DSH 尚无第三方异步写前补全钩子或模型草稿行插槽，因此仍使用可卸载的方法包装与行内 DOM 插入；客户端选择器针对本次验证的设置页结构。其他插件若替换同一方法，需额外验证装载顺序。

注意：新版 DSH 将显式保存的 `maxTokens` 同时作为模型输出能力和请求默认输出上限；从目录补全并保存该字段也具有这一含义。

## 开发

```bash
pnpm install
pnpm run validate
```

`validate` 运行离线 Node 测试、Host/Web 类型检查并重建 `lib/`。

可另外使用已安装依赖的 Harness 源码运行兼容性检查，不修改该源码、不启动或重启 GUI、不使用真实 API 凭据：

```bash
DSH_SOURCE=/Users/xichun/Downloads/agent/deepseek-harness pnpm run test:harness
```

该检查运行构建后的 Host/Web 产物，覆盖真实 Cordis 装载与卸载、原生 Anthropic 发现、凭据优先级、错误透传、设置 schema/修订冲突、alpha.2 新字段的保存及适配器解析，以及 jsdom 中的行定位、手动映射、Headers 编辑/校验/草稿保护和供应商排序。排序检查覆盖拖拽/键盘、持久化/存储失败、真实 React 列表增删改名后的草稿与焦点保留、卸载恢复。三种协议的真实 pi-ai SDK 向临时本地 HTTP 服务发包，验证普通/预备调用、同地址多提供方并发、Headers 热更新、发现草稿地址和卸载恢复；允许 SDK 自带查询参数（例如 Anthropic 的 `?beta=true`），不修改其请求。不调用真实模型服务。先运行 `validate`，并确保源码 checkout 有 `tsx` 与 `jsdom` 依赖。

模型选择器检查直接编译并渲染 checkout 中的 `ModelSelect`，覆盖保存顺序、跨组键盘导航、焦点保留、原生增删、选择提交、重开和卸载；仅图标/Toast 等装饰组件被替换，不调用真实模型服务。

验证边界：设置页检查使用复制的 DOM 与测试用 React 组件，不是完整 GUI 端到端测试；alpha.2 的实际设置页结构与 alpha.1 相同，已对照源码核查。该命令不验证当前运行的 Web profile 是否安装了本次构建，也不替代真实页面中“手动映射 → 保存”与“保存 Headers → 重新打开”的操作验收。

## License

MIT
