# dsh-relay-models

为 [DeepSeek Harness](https://github.com/deepseek-ai/DeepSeek-Harness) 自定义提供方补全模型能力。添加自定义提供方并拉取模型 id 后，用 [pi.dev/api/models](https://pi.dev/api/models) 填窗口、输出上限、`input`、推理和 `compat`。

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

## License

MIT
