# iOS Archive Failure — Diagnosis & Handoff

Context: this was diagnosed from the **iOS project only** (`mobile/ios`). The durable fix
belongs in the JS/Expo layer, which is why it's being handed off.

**Status: archive now succeeds, and the durable fix is in place.** Option A below is implemented
as the inline `withScriptSandboxingDisabled` plugin in `mobile/app.config.ts`, which sets
`ENABLE_USER_SCRIPT_SANDBOXING = NO` on every build configuration of the app project on each
prebuild. Verify after the next `expo prebuild --clean` with the `grep` shown below.

---

## Environment (verified)

| Item | Value |
|---|---|
| Expo SDK | `~57.0.22` |
| React Native | `0.86.3` |
| Xcode | 27.0 (27A266a), iPhoneOS 27.0 SDK |
| Target / scheme | `PahadPulse` |
| Bundle ID | `in.pahadpulse.app` |
| Team | `9Q56J23Z23` |
| Version | 1.0.0 (build 1) |
| `mobile/.gitignore` | ignores `/ios` (lines 13 **and** 45 — duplicated) |

Because `/ios` is gitignored, `mobile/ios` is **prebuild-generated output**. Any hand-edit there
is invisible to git and is destroyed by the next `expo prebuild`.

---

## There were two *separate* failures, not one

### Failure 1 — transient, environmental (already cleared)

Reported as two errors:

```
unable to rename temporary '.../RNReanimated.build/Objects-normal/arm64/EasingFunctions-ee40f135.o.tmp'
  to output file '.../EasingFunctions.o': 'No such file or directory'

error: accessing build database
  '.../ArchiveIntermediates/PahadPulse/IntermediateBuildFilesPath/XCBuildData/build.db': disk I/O error
```

**This is not a code error.** The entire `Build/` directory under
`DerivedData/PahadPulse-dilmgugyntfquneeqgxgkwrosncn/` was deleted *while the archive was
running* — only `Index.noindex` and `info.plist` survived. The compiler wrote its `.o.tmp`, then
could not rename it because the parent directory had vanished; the build database became
unreachable for the same reason.

Most likely cause: **Clean Build Folder (⇧⌘K) triggered during the archive** — that removes
`Build/` and leaves `Index.noindex`, which matches the surviving-files signature exactly. A
secondary candidate is APFS reclaiming DerivedData as purgeable space: the disk was at ~90–92%
(17–18 GiB free on 228 GiB).

**Resolution:** deleted the corrupted `PahadPulse-*` DerivedData plus regenerable caches
(`ModuleCache.noindex`, `SymbolCache.noindex`, `SDKStatCaches.noindex`), reclaiming ~7 GiB.
Nothing in the project causes this — the scheme has no pre/post actions. No code change needed.
Just don't clean mid-archive, and keep some disk headroom.

### Failure 2 — the real, reproducible bug

After the clean rebuild, all ~80 pods and all native code compiled with **zero errors**. The
archive still failed, at the very last step:

```
iOS Bundled 15169ms node_modules/expo-router/entry.js (1757 modules)
Writing bundle output to: .../ArchiveIntermediates/PahadPulse/BuildProductsPath/Release-iphoneos/main.jsbundle
Copying 51 asset files
Error: EPERM: operation not permitted, open '.../Release-iphoneos/main.jsbundle'
    at async open (node:internal/fs/promises:640:25)
    at async writeFile (node:internal/fs/promises:1260:14)
Command PhaseScriptExecution failed with a nonzero exit code
** ARCHIVE FAILED **

The following build commands failed:
  PhaseScriptExecution Bundle\ React\ Native\ code\ and\ images ... (in target 'PahadPulse')
```

#### Root cause

Two facts combine:

1. `PahadPulse.xcodeproj` sets **`ENABLE_USER_SCRIPT_SANDBOXING = YES`** at the *project* level,
   in both Debug and Release configurations.
2. The **`Bundle React Native code and images`** shell script phase declares
   **`outputPaths = ( )`** — empty. Its only declared inputs are `.xcode.env` and
   `.xcode.env.local`.

Under user script sandboxing, a script phase may only write to paths it declares as outputs.
Metro/`expo export:embed` bundles successfully, then is denied permission to write
`main.jsbundle` into `$CONFIGURATION_BUILD_DIR` → `EPERM` → phase fails → archive fails.

#### Why nobody saw this in development

The same script phase contains:

```sh
if [[ "$CONFIGURATION" = *Debug* ]]; then
  export SKIP_BUNDLING=1
fi
```

Debug builds skip bundling entirely (they load from the Metro dev server), so the sandbox is
never exercised. **Only Release/Archive bundles JS, so only archiving fails.** This is why it
looked like "build errors during archive" specifically.

Nothing in `node_modules` sets `ENABLE_USER_SCRIPT_SANDBOXING` (checked `@expo/*`, `expo`,
`react-native`), so the `YES` comes from the **Expo SDK 57 prebuild template**, not from a local
edit. It will come back on every prebuild.

---

## Fix applied locally (works, but temporary)

Set on the `PahadPulse` **target** (Debug + Release), overriding the project-level `YES`:

```
ENABLE_USER_SCRIPT_SANDBOXING = NO
```

Verified resolved value:

```
$ xcodebuild -workspace PahadPulse.xcworkspace -scheme PahadPulse -configuration Release \
    -destination 'generic/platform=iOS' -showBuildSettings | grep ENABLE_USER_SCRIPT_SANDBOXING
    ENABLE_USER_SCRIPT_SANDBOXING = NO
```

Then a full clean archive:

```
** ARCHIVE SUCCEEDED **
```

Archive contents verified — 201 MB, `main.jsbundle` present (4,169,854 bytes), `arm64`,
`in.pahadpulse.app`, 1.0.0 (1), signed with team `9Q56J23Z23`, dSYMs generated
(`PahadPulse.app.dSYM` + 6 framework dSYMs).

**This edit lives only in gitignored `mobile/ios/PahadPulse.xcodeproj/project.pbxproj`.**
`git status` is clean — the change is untracked and will be wiped by `expo prebuild`.

---

## Durable fix required (your call — this is the handoff)

`expo-build-properties` is **not** installed and does **not** expose
`ENABLE_USER_SCRIPT_SANDBOXING`, so that route is unavailable. Three real options:

### Option A — local Expo config plugin (recommended)

Adds no new runtime dependency: `@expo/config-plugins@57.0.9` is already present as a transitive
dependency of `expo`. Write a plugin that sets `ENABLE_USER_SCRIPT_SANDBOXING = NO` on the app
target via `withXcodeProject`, and register it in the `plugins` array of
`mobile/app.config.ts` (currently: `expo-router`, `expo-secure-store`, `expo-localization`,
`expo-splash-screen`). Survives `expo prebuild --clean`; keeps `/ios` disposable, which is what
the current `.gitignore` intends.

### Option B — declare the script phase's output instead (keeps sandboxing ON)

Strictly better security posture: leave sandboxing enabled and have a config plugin add
`$(CONFIGURATION_BUILD_DIR)/main.jsbundle` (plus the asset output directory) to the phase's
`outputPaths`. More correct, but more fragile — it must track whatever RN's
`react-native-xcode.sh` actually writes, and the asset copy destination is not a single file.
Only worth it if script sandboxing is a deliberate security requirement for this project.

### Option C — commit the prebuilt `ios/` directory

Remove `/ios` from `mobile/.gitignore` and check the project in. Makes the fix permanent and
archives reproducible, but abandons the managed-prebuild workflow and makes every Expo SDK
upgrade a manual native merge. Not recommended given the current setup.

### Also worth cleaning up while in there

- `mobile/.gitignore` lists `/ios` **twice** (lines 13 and 45).
- Pre-existing non-blocking warning: the `[CP-User] [Hermes] Replace Hermes for the right
  configuration, if needed` phase in the `hermes-engine` pod declares no outputs, so it re-runs
  on every build. Cosmetic/perf only — it did not fail.

---

## Reproduce / verify

```sh
cd mobile/ios
rm -rf ~/Library/Developer/Xcode/DerivedData/PahadPulse-*
xcodebuild -workspace PahadPulse.xcworkspace -scheme PahadPulse \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath /tmp/PahadPulse.xcarchive archive
```

With `ENABLE_USER_SCRIPT_SANDBOXING = YES` → `EPERM ... main.jsbundle`, archive fails at the
bundling phase after all native code compiles.
With it `NO` → `** ARCHIVE SUCCEEDED **` (~5 minutes warm).

Note: a full archive needs roughly 10–15 GiB of intermediates. Keep >20 GiB free or the
Failure-1 class of error can reappear.
