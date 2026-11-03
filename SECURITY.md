# Security

请不要在公开 Issue 里报告安全问题。通过 GitHub 的 [Private vulnerability reporting](https://github.com/chunonesoft/open-superagent/security/advisories/new) 私下提交，我们会尽快回复。

Please report vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/chunonesoft/open-superagent/security/advisories/new), not in public issues.

## 已知的设计边界

worker 以 `danger-full-access` 权限、用运行它的系统账号执行。账号包装器只决定默认使用哪套凭据，不提供隔离。请用一个只放智能体凭据的独立系统账号运行，详见 [006 部署 · 权限与隔离](docs/006-deployment.md#permissions-and-isolation)。这一点本身不算漏洞；能绕过白名单、策略或让智能体用到不该用的凭据的问题，才是我们想知道的。
