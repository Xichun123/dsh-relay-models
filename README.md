# dsh-relay-models

为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 自定义提供方补全模型能力。添加自定义提供方并拉取模型 id 后，用 [pi.dev/api/models](https://pi.dev/api/models) 填窗口、输出上限、`input`、推理和 `compat`。不依赖 `@earendil-works/pi-ai`。

已手填的字段不会被覆盖；catalog 里没有的 id 保持原样。未自动匹配的模型可在设置页从 pi.dev 目录里手动选一条来补全。

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

```bash
npx @deepseek-ai/dsh@latest plugin --profile web add /path/to/dsh-relay-models
```

安装后重启对应 profile。

## 使用

1. 打开 DSH 设置 → 模型。
2. 添加自定义提供方，发现模型。
3. 能在 pi.dev 目录里对上的 id 会自动补全能力。
4. 对不上的会显示下拉框，可手动选一条 catalog 模型。

## 开发

```bash
pnpm install
pnpm run validate
```

`validate` 会跑测试、类型检查并重建 Host/Web bundles。

## 发布

推送版本标签后，GitHub Actions 会跑完整校验并发布到 npm：

```bash
# 先改 package.json 里的 version，再：
git tag v0.7.0
git push origin v0.7.0
```

标签必须是 `v` + `package.json` 的 version，例如 `0.7.0` 对应 `v0.7.0`。

首次发布前，在 npm 上绑定一次 Trusted Publisher（不用仓库 Secret）：

1. 打开 [dsh-relay-models Access](https://www.npmjs.com/package/dsh-relay-models/access)
2. **Trusted Publisher** → **GitHub Actions**
3. Organization or user：`Xichun123`
4. Repository：`dsh-relay-models`
5. Workflow filename：`publish.yml`
6. Environment name：`npm`

## License

MIT
