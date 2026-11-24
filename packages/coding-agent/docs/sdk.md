# SDK

`@earendil-works/pi-coding-agent` embeds Pi in a Node.js or Bun process. It provides direct TypeScript access to the agent, sessions, tools, models, and resources used by the command-line application.

Use the SDK when your application owns the lifecycle and calls Pi in process. For a language-independent subprocess, use RPC from `@earendil-works/pi-tui`. The SDK does not supply terminal controls, CLI argument parsing, or a browser runtime.

## Find the API

Import public functions, classes and types from `@earendil-works/pi-coding-agent`, never from `dist/` or `host-support/*`. [The complete API index](sdk-api.md) lists every named export and its declaration file. In an installed package, `dist/index.d.ts` is the declaration entry point; in VS Code, use completion inside `import { }` and **Go to Definition** to find exact signatures and all public members. From JavaScript you can list the runtime exports with:

```bash
node --input-type=module -e "import('@earendil-works/pi-coding-agent').then(sdk => console.log(Object.keys(sdk).sort()))"
```

This prints functions, classes and other values, not TypeScript-only interfaces or types. Instance methods are declared on their classes, not exported as standalone functions.

## Integration Map

| Host responsibility | Public API | When to use it |
|---|---|---|
| Create one conversation | `createAgentSession(options)`, `CreateAgentSessionOptions`, `CreateAgentSessionResult` | Choose the working directory, model, tools, resource discovery and storage. Read `extensionsResult` and `modelFallbackMessage` before accepting input. |
| Drive work | `AgentSession.prompt()`, `steer()`, `followUp()`, `abort()`, `waitForIdle()`, `dispose()` | Start work, redirect or queue messages, implement Stop, and release resources. |
| Drive your UI | `AgentSession.subscribe()`, `AgentSessionEvent`, `messages`, `getLastAssistantText()`, `getSessionStats()` | Render streamed text, tool progress and settled state; read transcript and session statistics. |
| Configure models and credentials | `ModelRuntime`, `ModelRegistry`; `session.setModel()`, `session.setThinkingLevel()` | Choose available models with `ModelRuntime.getAvailable()`, install runtime credentials with `setRuntimeApiKey()` or use normal provider auth, and switch models during a conversation. |
| Enable or replace tools | `tools`, `excludeTools`, `noTools`, `customTools` options; `createCodingTools()`, `createReadOnlyTools()`, `defineTool()`; `session.getAllTools()`, `getActiveToolNames()`, `setActiveToolsByName()` | Control which tools the model can use. Custom definitions and tool operation adapters can route calls to your own backend. |
| Load plugins and project resources | `DefaultResourceLoader`, `DefaultResourceLoaderOptions`, `ResourceLoader`, `session.bindExtensions()`, `ExtensionBindings`, `session.reload()` | Load file or inline extensions, skills, prompts and project context. Bind host UI and command callbacks where supported; pass `{}` for headless operation. |
| Write a plugin | `ExtensionFactory`, `ExtensionAPI`, `ExtensionContext`, `defineTool()` | The SDK invokes your extension. The extension uses `pi.on()`, `pi.registerTool()` and `pi.registerCommand()` to hook into the session. See [Extensions](extensions.md). |
| Persist and restore history | `SessionManager.create()`, `inMemory()`, `open()`, `list()`; `session.setSessionName()`, `navigateTree()`, `compact()`, `exportToJsonl()` | Choose file-backed or in-memory storage, reopen an existing conversation, manage branches or export history. |
| Replace the current conversation | `createAgentSessionRuntime()`, `AgentSessionRuntime.newSession()`, `switchSession()`, `fork()`, `importFromJsonl()` | Manage a host that switches conversations or working directories. Rebind subscriptions and extension callbacks on the replacement session. |
| Configure policy and defaults | `SettingsManager.create()`, `SettingsManager.inMemory()`, `ProjectTrustStore` | Choose persisted or per-host settings and how to handle project-provided resources. These settings are not a process sandbox. |
| Add optional built-ins | `createMcpExtension()`, `createCodemodeExtension()`, `createToolSearchExtension()` | Add the optional extensions explicitly when the application needs MCP, codemode, or deferred tool discovery. |
| Assemble a custom host | `createAgentSessionServices()`, `createAgentSessionFromServices()`, `AgentSessionServices`, `CreateAgentSessionRuntimeFactory` | Manage service construction and diagnostics separately from each conversation, as the `pi` CLI does. |

SDK exports also include lower-level compaction and session-format utilities, package and skill management, tool input and result types, event payloads, and image and diff helpers. Find those by name in the [complete index](sdk-api.md). They are not steps required to start every host.

## Configure the Host

1. **Set the workspace and policy.** Choose `cwd`, `agentDir`, and `SettingsManager`. Decide which on-disk extensions and context files to load; for full control, supply a custom `ResourceLoader`. Tool allowlists alone do not isolate your process from extension code. Only load trusted extensions; run untrusted work in a separate sandboxed process.
2. **Set up models and tools.** Provide a `ModelRuntime` and an explicit model when your product owns model selection. Pass `tools` or `noTools: "builtin"` to control built-ins, and `customTools` or registered extension tools for product-specific actions. See [models](../examples/sdk/02-custom-model.ts), [credentials](../examples/sdk/09-api-keys-and-oauth.ts) and [tools](../examples/sdk/05-tools.ts).
3. **Choose session storage.** Use `SessionManager.create(cwd)` for file-backed conversations, `inMemory(cwd)` for ephemeral work, or `open(path)` for existing history. Use the [full control example](../examples/sdk/12-full-control.ts) for an explicit setup without ambient project discovery.
4. **Connect the application.** Subscribe before running work and call `bindExtensions()` to initialize the plugin runtime. Map user input to `prompt()`, queued input to `steer()` or `followUp()`, Stop to `abort()`, and output to session events. Drive the next UI state from `agent_settled`, not just the end of a single agent run.
5. **Handle replacement and shutdown.** For multiple conversations follow the [session runtime example](../examples/sdk/13-session-runtime.ts); it creates services for the new workspace and binds the new session. When the host closes, unsubscribe and dispose the session, or `await runtime.dispose()` when using the runtime.

### Choose configuration and storage explicitly

| Boundary | Factory default | What a host can provide |
|---|---|---|
| Workspace | `cwd`, then the supplied `SessionManager`'s cwd, then `process.cwd()` | Pass an absolute workspace path and use it consistently for the session, resources, and storage. This is not a filesystem restriction. |
| Agent data | `getAgentDir()` (normally `~/.pi/agent`) | Pass a separate `agentDir` to avoid sharing Pi's normal configuration and credential paths. |
| Settings | `SettingsManager.create(cwd, agentDir)` | Pass `SettingsManager.inMemory()` for host-owned settings without reading settings files. Share that instance with a custom loader. |
| Resources | The SDK creates and reloads a `DefaultResourceLoader` | To customize discovery, pass a loader you have already reloaded. Set the individual discovery flags or implement `ResourceLoader` to supply everything directly. |
| Models and auth | `ModelRuntime` using the configured auth and model files | Pass a runtime with explicit credential paths and select a model for this conversation. |
| History | File-backed `SessionManager` for the workspace | Use `SessionManager.inMemory(cwd)` for temporary work or pass `SessionManager.open(path)` when restoring history. |

### Assemble a host-owned conversation

This function uses an explicit model, in-memory settings and history, and an optional extension file chosen by the host. It does not discover extensions, skills, prompts, or context files from the workspace. The returned session is the same object the host uses for subscriptions, model and tool changes, input, and export.

```typescript
import { join } from "node:path";
import {
  createAgentSession,
  DefaultResourceLoader,
  ModelRuntime,
  SessionManager,
  SettingsManager,
  type AgentSessionEventListener,
} from "@earendil-works/pi-coding-agent";

export async function openConversation(options: {
  cwd: string;
  agentDir: string;
  providerId: string;
  modelId: string;
  onEvent: AgentSessionEventListener;
  extensionPath?: string;
}) {
  const { cwd, agentDir, providerId, modelId, onEvent, extensionPath } = options;
  const settingsManager = SettingsManager.inMemory();
  const modelRuntime = await ModelRuntime.create({
    authPath: join(agentDir, "auth.json"),
    modelsPath: join(agentDir, "models.json"),
  });
  const models = await modelRuntime.getAvailable(providerId);
  const model = models.find((candidate) => candidate.id === modelId);
  if (!model) throw new Error(`Model unavailable: ${providerId}/${modelId}`);

  const resourceLoader = new DefaultResourceLoader({
    cwd,
    agentDir,
    settingsManager,
    noExtensions: true,
    additionalExtensionPaths: extensionPath ? [extensionPath] : [],
    noSkills: true,
    noPromptTemplates: true,
    noThemes: true,
    noContextFiles: true,
  });
  await resourceLoader.reload();

  const { session, extensionsResult } = await createAgentSession({
    cwd, agentDir, modelRuntime, model, settingsManager, resourceLoader,
    sessionManager: SessionManager.inMemory(cwd),
    noTools: "builtin",
  });
  const unsubscribe = session.subscribe(onEvent);
  const close = () => {
    unsubscribe();
    session.dispose();
  };
  try {
    if (extensionsResult.errors.length) {
      throw new Error(extensionsResult.errors.map(({ path, error }) => `${path}: ${error}`).join("\n"));
    }
    await session.bindExtensions({});
    return { session, close };
  } catch (error) {
    close();
    throw error;
  }
}
```

Use absolute paths for the workspace, agent directory, and explicitly selected extension. Configure provider credentials before opening the conversation. `noTools: "builtin"` leaves tools registered by a trusted extension available; it does not sandbox that extension or restrict what its code can do. Replace `SessionManager.inMemory(cwd)` with a file-backed manager if the product offers conversation history.

## Start a Session

```typescript
import { createAgentSession } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession();

try {
  await session.bindExtensions({});
  await session.prompt("What files are in the current directory?");
  console.log(session.getLastAssistantText());
} finally {
  session.dispose();
}
```

This uses the working directory, discovered resources, stored settings, and configured credentials. `prompt()` resolves when the run finishes.

The [complete minimal example](../examples/sdk/01-minimal.ts) also streams text events. All [SDK examples](../examples/sdk/) are typechecked with the repository.

<a id="session-management"></a>

## Session lifecycle

`createAgentSession()` creates an `AgentSession`. The session owns one conversation, its model and tools, queued messages, compaction state, and extension runtime.

Read current state through `session.messages`, `session.model`, `session.thinkingLevel`, `session.systemPrompt`, and `session.getActiveToolNames()`.

`session.systemPrompt` is read-only and returns the current effective system prompt, including changes that have not yet been sent to the model. Tool changes are declared to the model before the next request.

<a id="sessionmanager-api"></a>

### Session storage

Sessions are file-backed by default. `SessionManager` owns the persisted or in-memory entry tree and tracks its active leaf. Branching changes that leaf without deleting abandoned branches. When Pi reconstructs model context, the manager selects the active branch and applies compaction.

`SessionManager` is authoritative for finalized model context. Restore external history by constructing the session with a manager containing those entries. Assigning `session.agent.state.messages` does not replace persisted context.

Use an in-memory manager when the host does not want session files:

```typescript
import { createAgentSession, SessionManager } from "@earendil-works/pi-coding-agent";

const { session } = await createAgentSession({
  sessionManager: SessionManager.inMemory(),
});
```

For a history picker, use `SessionManager.list(cwd)` for that workspace or `SessionManager.listAll()` across workspaces. Pass `SessionManager.open(path)` into `createAgentSession()` to reopen a selected conversation. Check `modelFallbackMessage` after restore: a saved model may no longer be available with the host's models or credentials. An explicit `model` option takes precedence over the saved selection.

To render branches, read the tree from `session.sessionManager.getTree()` and the active leaf from `getLeafId()`. To change the live session's context, use `session.navigateTree()` rather than manipulating the active manager directly. `session.exportToJsonl(path)` exports the **active branch**, not the entire tree. Keep the backing session file if the product needs to preserve every branch.

See the checked [sessions example](../examples/sdk/11-sessions.ts) for creating, opening, continuing, listing, and forking sessions. [Session File Format](session-format.md) defines the persisted JSONL contract, and [Message Types](message-types.md) defines transcript values.

`cwd` selects the workspace used for project resource discovery, context files, session grouping, and built-in tool paths. Pass it explicitly when the target differs from `process.cwd()`.

`session.dispose()` aborts active work, invalidates extension contexts, disconnects from the agent, and removes event listeners. Call it when the session is no longer needed.

### Replace the active conversation

Use `AgentSessionRuntime` when one host surface swaps between conversations. Use independent `AgentSession` instances if the product needs several conversations active at the same time. The runtime manages one active conversation, not a pool of concurrent sessions.

The runtime calls a `CreateAgentSessionRuntimeFactory` at startup and for replacements. The factory receives the target `cwd`, `agentDir`, `sessionManager`, and start metadata. Create the workspace-bound services with `createAgentSessionServices()` and create the session from those services with `createAgentSessionFromServices()`. Keep product configuration in the factory closure so the same policy applies to new and restored conversations.

Call `newSession()` for a fresh conversation, `switchSession(path)` to resume a saved one, `fork(entryId, options)` to continue as a separate conversation, or `importFromJsonl(path)` to import an external transcript. A plugin can cancel a replacement; check the returned `cancelled` flag. When a replacement proceeds, the runtime aborts and shuts down the old session before constructing the new one. If construction throws, do not assume the old session is still usable.

Bind extension callbacks and subscribe again on the new `runtime.session` after a successful replacement, or register `setRebindSession()` for that step. Report startup and replacement diagnostics with `takeUnreportedDiagnostics()` and show any `modelFallbackMessage` separately. Use `await runtime.dispose()` for asynchronous shutdown. See the [session runtime example](../examples/sdk/13-session-runtime.ts).

## Prompting

Use `await session.prompt(text, options)` to start a turn in an idle session. Before it starts the model call, the SDK runs extension input hooks and checks model selection and credentials. Slash commands registered by extensions can handle the input without a model call. By default, Pi also expands `/skill:name` commands and file-based prompt templates. Set `expandPromptTemplates: false` to skip those expansions and slash command dispatch; extension input hooks still run. Use `PromptOptions.images` to attach images.

### Input while a run is active

| Intent | Call | What it means |
|---|---|---|
| Start work in an idle session | `await session.prompt(text)` | Waits for an accepted run to finish, including automatic retries. It can also return without a model run if an extension handled the input. |
| Redirect ongoing work | `await session.steer(text)` or `prompt(text, { streamingBehavior: "steer" })` while streaming | Inserts the message at the next steering boundary, after the current assistant response and tool processing. This is not an abort. |
| Submit a follow-up | `await session.followUp(text)` or `prompt(text, { streamingBehavior: "followUp" })` while streaming | Queues the input until current work finishes. Waiting for the call to return does not wait for the queued message to run. |
| Inspect or clear pending inputs | `getSteeringMessages()`, `getFollowUpMessages()`, `pendingMessageCount`, `clearQueue()` | Use `queue_update` to render pending inputs. `clearQueue()` returns the removed texts so the host can restore a draft. |
| Stop or wait | `await session.abort()` or `await session.waitForIdle()` | Abort requests cancellation of active work and waits for idle. Waiting alone does not cancel anything. Neither call rolls back file changes or effects of tools that have already run. |

During streaming, a regular `prompt()` without `streamingBehavior` rejects rather than guessing how to queue it. The direct queue methods return `"queued"` when the input was added, or `"handled"` when an extension consumed it. If the host implements **Stop and discard pending input**, clear the queues explicitly rather than relying on cancellation to implement that policy.

### Report failures separately from completion

Catch rejected calls at the host boundary. For example, input can be rejected because no model or credentials are configured, because a streaming policy was not specified, or because compaction or branch summary is in progress. A resolved `prompt()` is not itself a success result. A run can end with a failed assistant message; narrow the completed message to role `"assistant"` and inspect its `stopReason` and `errorMessage` when showing the result. Use the retry events below to distinguish transient failures from the final attempt.

## Subscribing to events

Subscribe before prompting when the host needs streamed output:

```typescript
const unsubscribe = session.subscribe((event) => {
  if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
    process.stdout.write(event.assistantMessageEvent.delta);
  }
});

try {
  await session.prompt("Explain this repository");
} finally {
  unsubscribe();
}
```

Drive presentation from `AgentSessionEvent`, not from terminal output. A typical run starts with `agent_start`, emits one or more assistant messages and tool calls, then reaches `agent_settled`. Automatic retries or continuation can add more events before settlement.

| Event | What the host should do |
|---|---|
| `message_update` | Append `text_delta` to a draft for that assistant message. Narrow `assistantMessageEvent.type` before reading `delta`; not every update is text. |
| `message_end` | Replace the corresponding draft with the authoritative completed message. Check its `role` before treating it as an assistant reply. |
| `tool_execution_start`, `tool_execution_update`, `tool_execution_end` | Create, update, and finish an item keyed by `toolCallId`. Treat updates as progress, and use the end event's `isError` for the final status. Nested calls can also carry `parentToolCallId`. |
| `queue_update` | Render the `steering` and `followUp` queues independently. A queued input is not yet a turn in the transcript. |
| `auto_retry_start`, `auto_retry_end` | Display the attempt and retry delay; `auto_retry_end` reports success or final failure of automatic retry. |
| `compaction_start`, `compaction_end` | Indicate transcript compaction separately from a model reply. The end event includes the reason, result, and whether it was aborted or will be retried. |
| `agent_end` | One low-level run ended. Automatic retries or subsequent work can still follow; do not re-enable input from this event alone. |
| `agent_settled` | This run will not continue automatically. Use `aborted` to distinguish cancellation, and inspect the completed message or reported error separately to determine success. |

`subscribe()` observes one session. It does not replay an existing conversation: load the initial transcript from `session.messages`, use events for ongoing updates, and unsubscribe when the view detaches. If your UI renders partial text, do not append the final message a second time on `message_end`.

## Configuring a session

### Models and credentials

Use `ModelRuntime.getAvailable()` to populate a model picker with models whose providers have usable authentication. Use `getModel(providerId, modelId)` to look up a known model by identity; finding it in the catalog is not proof that the host can authenticate. Set runtime-only API keys with `await modelRuntime.setRuntimeApiKey(providerId, apiKey)` before creating or prompting the session, and remove overrides with `removeRuntimeApiKey()` when no longer needed. For provider login and credential storage, see [Providers](providers.md) and the [credentials example](../examples/sdk/09-api-keys-and-oauth.ts).

An explicit `model` goes into `createAgentSession()`. After startup, `await session.setModel(model)` changes the active selection. Use `session.getAvailableThinkingLevels()` to populate a thinking selector and `session.setThinkingLevel(level)` to update it. Model and thinking changes apply to the session by default; pass `{ persist: true }` only when the host intends to update the default settings too. Use `scopedModels` to define a cycle for `session.cycleModel()`.

### Tool registration and selection

Registration makes a tool available to the session; activation is what lets the model use it. Supply a `ToolDefinition` through `customTools` when the application owns it, or call `pi.registerTool(defineTool(...))` when an extension owns it. `defineTool()` preserves type inference from the parameter schema for the tool's `execute` callback.

| Desired initial policy | Configuration |
|---|---|
| Use Pi defaults | Omit `tools` and `noTools`. The resolved `defaultTools` setting can override the built-in selection. |
| Let only named tools work directly | Set `tools`, for example `["read", "find", "grep", "ls"]`. Plain names or `*` patterns form an allowlist. Use `["+name", "-name"]` instead to modify defaults; do not mix the two forms. |
| Keep product and extension tools without default built-ins | Set `noTools: "builtin"` with no explicit allowlist. |
| Start without tools | Set `tools: []` or `noTools: "all"`. |
| Remove tools from a broader selection | Set `excludeTools`. It applies after `tools` and can exclude MCP tool names as well. |

Inspect `session.getAllTools()` to build a tool picker and `getActiveToolNames()` to show the current selection. Update the selection with `setActiveToolsByName()`; the next model request sees the new declarations. MCP is a special case: a non-empty allowlist without `mcp__` entries can still leave MCP tools registered for tool search and codemode. If the host must not connect to MCP servers, do not load the MCP extension for that session. Tool choices are not a security boundary for in-process plugins.

### Resources and extension lifecycle

Use `DefaultResourceLoader` for Pi discovery with selected overrides. `additionalExtensionPaths`, `additionalSkillPaths`, and `additionalPromptTemplatePaths` add to discovery rather than replacing it. Use the corresponding `no*` options when the host wants to disable automatic discovery, or supply a custom `ResourceLoader` when it owns storage entirely. To configure the system prompt, supply `systemPrompt` to replace the default prefix or `appendSystemPrompt` to add instructions; [the prompt example](../examples/sdk/03-custom-prompt.ts) shows both.

1. **Load.** Use file paths or `extensionFactories`, then `await resourceLoader.reload()` before passing a custom loader into `createAgentSession()`. Display load diagnostics from `extensionsResult.errors` and `extensionsResult.warnings`; decide whether the application can continue with a missing extension.
2. **Bind.** Call `await session.bindExtensions(bindings)` before presenting the session as ready. `{}` initializes a headless session and its `session_start` handlers. A custom UI can provide `uiContext`, `commandContextActions`, and `onError` through `ExtensionBindings`. Extensions should check `ctx.hasUI` before attempting interactive UI. A host does not need to implement terminal widgets just to run tool and event extensions.
3. **Observe or intercept.** The host uses `session.subscribe()` to render state. A plugin uses `pi.on()` to react to extension events or, where allowed, modify input, tool behavior, and results. These are different interfaces. See [Extensions](extensions.md) for the lifecycle and supported hooks.
4. **Reload or shut down.** Use `await session.reload()` when reloading an existing live session, so its runner and tools are rebuilt with the resources. Use `await runtime.dispose()` when the runtime owns the session and needs to run shutdown hooks; a direct session can be disposed with `session.dispose()`.

<a id="inlineextension"></a>

Inline extension factories can be supplied through `DefaultResourceLoader`. Give one an `InlineExtension` name only when it needs a stable name in diagnostics and startup output. A named inline extension with `replaceable: true` is left out when another extension registers a tool, command, or flag with a name it registers during loading, instead of both loading with a conflict. The CLI's built-in codemode, tool search, and MCP extensions are replaceable. A named entry with `builtin: true` is not an inline extension: it supplies the code of the `builtin:<name>` extension, which loads like a configured extension file. It loads by default, is listed in `pi config`, and is disabled by `-builtin:<name>` in the `extensions` setting or by `noExtensions`; `additionalExtensionPaths: ["builtin:<name>"]` loads it explicitly. It loads after project trust is resolved, so it cannot handle `project_trust`. The CLI's built-in extensions use it.

<a id="codemode-mcp"></a>

The CLI loads `codemode`, `tool_search`, and MCP as built-in extensions. SDK sessions do not; add `createCodemodeExtension()`, `createToolSearchExtension()`, and `createMcpExtension()` to the `extensionFactories` of `DefaultResourceLoader`. `codemode` and `tool_search` are registered inactive: enable them through the `defaultTools` setting (`["+codemode", "+tool_search"]` keeps the other default tools), or let the MCP extension activate them: `codemode` for servers with `codemode` exposure, `tool_search` for servers with `deferred` exposure. The MCP extension connects its servers on `session_start`, so call `session.bindExtensions()`. See [Codemode and MCP](../examples/sdk/14-codemode-mcp.ts).

See the focused examples for [models](../examples/sdk/02-custom-model.ts), [tools](../examples/sdk/05-tools.ts), [extensions](../examples/sdk/06-extensions.ts), and [full control](../examples/sdk/12-full-control.ts).

## Examples

| Example | Purpose |
|---|---|
| [Minimal](../examples/sdk/01-minimal.ts) | Create, prompt, observe, and dispose a session |
| [Custom model](../examples/sdk/02-custom-model.ts) | Select a model and thinking level |
| [System prompt](../examples/sdk/03-custom-prompt.ts) | Replace or append to the system prompt |
| [Skills](../examples/sdk/04-skills.ts) | Discover, filter, and add skills |
| [Tools](../examples/sdk/05-tools.ts) | Select built-in tools and their working directory |
| [Extensions](../examples/sdk/06-extensions.ts) | Load file-based and inline extensions |
| [Context files](../examples/sdk/07-context-files.ts) | Add or replace project instructions |
| [Prompt templates](../examples/sdk/08-prompt-templates.ts) | Add file-style prompt templates |
| [Credentials](../examples/sdk/09-api-keys-and-oauth.ts) | Configure credential and model storage |
| [Settings](../examples/sdk/10-settings.ts) | Supply file-backed or in-memory settings |
| [Sessions](../examples/sdk/11-sessions.ts) | Control session persistence and restoration |
| [Full control](../examples/sdk/12-full-control.ts) | Replace default discovery and state services |
| [Session runtime](../examples/sdk/13-session-runtime.ts) | Replace the active session safely |
| [Codemode and MCP](../examples/sdk/14-codemode-mcp.ts) | Add the `codemode`, `tool_search`, and MCP extensions |

<a id="exports"></a>

## Resources

- [Choose a Model](models.md) covers model selection and compatible endpoints; [Providers](providers.md) covers credentials and provider-specific setup.
- [Settings](settings.md) lists the settings available to a host.
- [Session Format](session-format.md) defines persisted entries; [Message Types](message-types.md) defines shared transcript values.
- [Extensions](extensions.md), [Skills](skills.md), and [Prompt Templates](prompt-templates.md) document resources supplied through a `ResourceLoader`.
- For subprocess integration instead, see the CLI documentation supplied with `@earendil-works/pi-tui`.
