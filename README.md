<div align="center">

# open-superagent

**能接自建 GitLab 和钉钉的主动式编程智能体：在群里 @ 它派活，它自己开工单、写代码、提 MR，再回到原对话里交付。**

基于 DeepSeek 开源的 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)，由社区独立维护

[![CI](https://github.com/chunonesoft/open-superagent/actions/workflows/ci.yml/badge.svg)](https://github.com/chunonesoft/open-superagent/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Upstream](https://img.shields.io/badge/upstream-deepseek--ai%2Fdsh--superagent--prototype-4d6bfe)](https://github.com/deepseek-ai/dsh-superagent-prototype)
![Tests](https://img.shields.io/badge/tests-1367%20passed-brightgreen)

简体中文 · [English](README.en.md)

</div>

> [!NOTE]
> 本项目是社区维护的独立分支，**不是 DeepSeek 官方产品，与 DeepSeek 没有隶属关系**。官方仓库不接受外部 PR，所以我们把补充的能力放在这里单独维护，并定期合并上游更新。和上游一样，它是研究原型，不是生产级软件，接入团队前请先阅读[安全须知](#安全须知)。

<p align="center"><img src="docs/assets/flow.svg" alt="open-superagent 工作流程：GitHub、自建 GitLab、飞书、钉钉的消息进入 Trigger，经过 Eval 策略判断后生成 Ticket 工单，在独立会话中执行，最后以 PR/MR 或回复交付" width="860"></p>

## 它是什么

dsh-superagent 是 DeepSeek 团队开源的一套「主动式编程智能体」，跑在 [DeepSeek Harness](https://www.deepseek.com/en/harness/) 上。它不是一个等你开对话的聊天框，而是团队里的一个成员：

- **在你们平时干活的地方听需求**：Issue、PR 评论、群聊里的 @。
- **按团队写好的规则决定接不接**：谁可以派活、什么活能主动做，都写在策略里。
- **每件事开一个工单**，在独立的会话和目录里干活，互不干扰。
- **结果回到原对话**：一个 PR/MR、一段调查结论，或者一个需要你拍板的问题。
- **一个 Web 面板**只列出需要人处理的事，健康状态不占地方。

核心原则只有一句：**尽量少占用人的注意力，尽量多给出价值。**（见 [000 理念](docs/000-philosophy.md)）

## 为什么要有社区版

官方原型只支持 **github.com + 飞书**。而国内很多团队的代码在**内网自建 GitLab**，沟通在**钉钉**，官方版本接不进来，官方仓库又不收外部贡献。open-superagent 补上了这两块，并保持和上游同步。

| | 官方原型 | open-superagent |
| --- | :---: | :---: |
| GitHub（Issue / PR / 评论 / CI） | ✅ | ✅ |
| 飞书（群聊 / 私聊 / 话题） | ✅ | ✅ |
| **自建 GitLab**（Todo / MR / 评论 / 流水线，支持相对路径部署） | — | ✅ |
| **钉钉**（@机器人、私聊、Stream 模式，无需公网回调） | — | ✅ |
| **钉钉白名单按部门同步**（含所有子部门） | — | ✅ |
| 只接聊天、不接代码平台（用于排查、调研类工作） | — | ✅ |
| 统一的代码平台接口（新增平台只需实现一个 Source） | — | ✅ |
| 按对话语言回复（中文群里回中文） | — | ✅ |
| worker 不会用到运维人员自己的 SSH 密钥 | — | ✅ |
| 定期合并上游更新 | — | ✅ |

全部改动见 [CHANGELOG](CHANGELOG.md)。

## 典型用法

以下对话为示意。

**钉钉群里派活**

> 张三：@小助手 订单列表页分页从第二页开始就重复了，帮忙看下
>
> 小助手：收到，我去查订单列表的分页逻辑，修好后提 MR。
>
> （二十分钟后）小助手：已修复：分页游标用的是创建时间，同一秒的订单会重复。改成了「创建时间 + id」，MR：!128

**GitLab MR 里追加要求**：在 MR 下评论 `@agent 顺便补一个分页的单测`，它会接着在同一个工单里改，合并后工单自动结束。

**只接钉钉/飞书、不接代码平台**：用来做「帮我查一下昨天的报错是哪次提交引入的」这类调研，结论直接回到群里。

## 快速开始

需要：Node.js 22.19+ 或 24+、pnpm、git 2.32+、tmux、Python 3.8+、[DeepSeek Harness](https://www.deepseek.com/en/harness/)（版本见 `package.json` 的 `engines.dsh`），以及所选平台的 CLI（GitHub 用 `gh`，GitLab 用 `glab`，飞书用 `lark-cli`；钉钉的 `dingtalk-bot` 已内置）。

```sh
git clone https://github.com/chunonesoft/open-superagent.git
cd open-superagent
pnpm install && pnpm check
```

配置步骤较多，推荐让你的编程智能体（Claude Code、Codex、Cursor 等）带你走完：

> 读一下这个仓库的 SETUP.md，带我把 dsh-superagent 配好。

它会一次只问一个问题，问完后给出完整计划，你确认后再执行。也可以照着 [006 部署](docs/006-deployment.md) 手动配置。

## 文档

按编号顺序阅读，后面的文档只依赖前面的（目前为英文）：

| 文档 | 内容 |
| --- | --- |
| [000 理念](docs/000-philosophy.md) | 为什么它默认安静、只在被请求时行动 |
| [001 领域模型](docs/001-domain.md) | Source、Trigger、Eval、Ticket 这些概念 |
| [002 授权](docs/002-authorization.md) | 谁能派活、白名单、主动工作的规则 |
| [003 执行](docs/003-execution.md) | 工单怎么在独立会话里执行 |
| [004 提示词](docs/004-prompts.md) | 团队如何改写智能体的行为 |
| [005 面板](docs/005-panel.md) | Web 面板的各个页签 |
| [006 部署](docs/006-deployment.md) | 账号、安装、配置、升级和排错 |
| [007 架构](docs/007-architecture.md) | 模块和测试一览 |
| [008 扩展手册](docs/008-cookbook.md) | 如何新增一个 Source |

## 安全须知

- worker 以 `danger-full-access` 权限、用运行它的系统账号身份执行，能读该账号的主目录。**请用一个只放智能体凭据的独立系统账号运行**，尤其不要放在登录了生产系统 CLI 的机器上。
- 智能体在代码平台上用的账号应是**专门的机器人账号**，不要用你自己的。
- 先用很短的白名单起步，主动工作先只记录不执行，确认行为符合预期后再放开。

详见 [006 部署 · 权限与隔离](docs/006-deployment.md#permissions-and-isolation)。发现安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

## 参与贡献

欢迎提 Issue 和 PR，尤其是：新的 Source（企业微信、Gitee、Gitea……）、中文文档翻译、真实团队的使用反馈。开始前请看 [CONTRIBUTING.md](CONTRIBUTING.md)。

`pnpm check` 会跑类型检查、全部测试和构建。

## 致谢与许可

核心设计与实现来自 DeepSeek Harness Team 开源的 [dsh-superagent-prototype](https://github.com/deepseek-ai/dsh-superagent-prototype)，以及文章 *Exploring Super-agent Design: Towards a More Autonomous Agent System*。本仓库在 [MIT](LICENSE) 许可下保留原版权声明。

如果它对你有帮助，点个 ⭐ 让更多用 GitLab 和钉钉的团队看到。
