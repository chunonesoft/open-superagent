# 参与贡献

感谢你愿意让 open-superagent 变得更好。

## 欢迎的贡献

- **新的 Source**：企业微信、Gitee、Gitea、Jira……照着 [008 扩展手册](docs/008-cookbook.md) 实现一个 Source 即可，GitLab 和钉钉的实现可以当参考。
- **中文文档**：`docs/` 目前是英文，欢迎翻译。
- **真实使用反馈**：在 Issue 或 Discussions 里说说你们团队怎么用、哪里不顺。
- **Bug 修复**：附上能复现问题的测试。

## 开发

```sh
pnpm install
pnpm check   # 类型检查 + 全部测试 + 构建
```

- 一个 PR 只做一件事。行为改动要有测试，`docs/` 里描述它的地方一并更新。
- `tests/docs.spec.ts` 会检查文档链接、`docs/007-architecture.md` 的模块表和测试表，新增 `src/` 或 `tests/` 文件时记得登记。
- 提交信息沿用仓库现有风格：`feat(gitlab): ...`、`fix(dingtalk): ...`、`docs: ...`，用英文祈使句。
- 不要提交密钥、令牌、内网地址或任何公司内部信息。

## 和上游的关系

本仓库定期合并 [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)（`upstream-sync` 工作流每天检查一次）。为了让合并保持顺利：

- 尽量**新增**文件和模块，少改上游已有的代码；必须改时，改动集中、写清原因。
- 不要大规模格式化或重命名上游文件。

## 行为准则

友善、就事论事。智能体以团队的名义说话，我们对它的要求同样适用于我们自己：少打扰，多给价值。
