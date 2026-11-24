<p align="center">
  <a href="https://pi.dev">
    <img alt="Pi logo" src="https://pi.dev/logo-auto.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://www.npmjs.com/package/@earendil-works/pi-coding-agent"><img alt="npm" src="https://img.shields.io/npm/v/@earendil-works/pi-coding-agent?style=flat-square&logo=npm&logoColor=white" /></a>
</p>

> New issues and PRs from new contributors are closed automatically. Maintainers review closed submissions daily. See [CONTRIBUTING.md](https://github.com/earendil-works/pi/blob/main/CONTRIBUTING.md).

# Pi Coding Agent SDK

Embed Pi in a Node.js application without a terminal UI. The SDK manages agent sessions, built-in tools, model configuration, and Pi extensions. It also discovers [skills](docs/skills.md), [prompt templates](docs/prompt-templates.md), and [Pi packages](docs/packages.md).

## Getting started

Install the SDK with Node.js 22.19 or newer:

```bash
npm install --ignore-scripts @earendil-works/pi-coding-agent
```

Configure a [model provider](docs/providers.md) before prompting:

```ts
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.bindExtensions({});
  await session.prompt("What files are in the current directory?");
  console.log(session.state.messages);
} finally {
  session.dispose();
}
```

Use `DefaultResourceLoader` with `additionalExtensionPaths` to load extensions from explicit files. Extensions that register tools or listen to session events can run without a UI. Extensions that need terminal widgets or themes run in the TUI host. See the [SDK guide](docs/sdk.md), [SDK examples](examples/sdk), and [extension guide](docs/extensions.md).

## Terminal host

For the `pi` CLI, including interactive, print, JSON, and RPC modes, install `@earendil-works/pi-tui` instead. It installs and drives the SDK. See the [Pi repository](https://github.com/earendil-works/pi) for CLI setup and session sharing.

## Development

Clone the repository, install its dependencies, and run Pi from source:

```bash
git clone https://github.com/earendil-works/pi
cd pi
npm install --ignore-scripts
./pi-test.sh
```

`pi-test.sh` can be called from any directory and preserves the caller's working directory.

Before submitting changes, run:

```bash
npm run check
./test.sh
```

Read [CONTRIBUTING.md](https://github.com/earendil-works/pi/blob/main/CONTRIBUTING.md) before opening an issue or pull request. It defines the contribution gate, issue quality bar, and required checks. Read [AGENTS.md](https://github.com/earendil-works/pi/blob/main/AGENTS.md) for repository-specific implementation, testing, dependency, and release rules.

## License

MIT
