# Changelog

本项目基于 [deepseek-ai/dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype) 的首个公开版本（0.1.0）。

## 未发布

### 新增

- **钉钉卡片回复**：带链接的回复（如交付的 PR/MR）以 ActionCard 卡片发送，每个链接一个按钮（最多 3 个），PR/MR/Issue 按编号命名按钮；不带链接的回复仍是 Markdown。卡片无法 @ 人。`dingtalk-bot message send` 新增 `--button title=url`。

## 0.2.0 — 2026-11-03

open-superagent 的首个版本。

### 新增

- **自建 GitLab Source**：读取智能体账号的 Todo（读完 Thread 后自动标记完成）、订阅的 Issue 和 MR；可选接收项目内所有新 Issue、MR、评论和默认分支流水线；用评论回复；MR 绑定到工单，合并后工单结束；支持部署在相对路径下的 GitLab。
- **钉钉 Source**：基于 Stream 模式的 `dingtalk-bot` CLI，无需公网回调地址；接收群里 @机器人的消息和私聊；会话 Webhook 有效期内回复会 @ 发送人，过期后改走机器人 API。
- **钉钉白名单按部门同步**：从通讯录的一个部门（含全部子部门）同步允许派活的人。
- **只接聊天 Source 也能运行**：不配置代码平台，用于排查、调研这类不需要 PR 的工作。
- **代码平台接口**：PR/MR 相关能力统一抽象，GitHub 和 GitLab 各自实现。

### 修复

- 按对话语言回复，中文对话里回中文。
- 改写更多 SSH 地址形式，worker 不会用到运维人员自己的密钥。
- 钉钉会话 Webhook 不会出现在进程列表里；宿主进程退出时事件消费进程随之结束；无法投递的回复不再无限重试；无效会话 ID 视为会话已消失。
- GitLab：被删除的 Issue/MR 不再重复回复；评论按内容去重；存量屏蔽列表可正常加载。
- 读取含非 UTF-8 字节的进程列表；清空 GitHub Source 时保留保存校验。

### 工程

- CI：Node 22 / 24 上运行 `pnpm check`。
- `upstream-sync` 工作流：每天检查上游，有更新就自动开合并 PR，冲突时开 Issue。
