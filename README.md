# MeowRR

Desktop MMR tracker

Built with Tauri v2, TypeScript, Vite, and Bun.

## Prerequisites

- [Rust](https://rustup.rs)
- [Bun](https://bun.sh)
- Xcode Command Line Tools (macOS): `xcode-select --install`

## Install

```bash
bun install
```

## Run

```bash
bun tauri dev
```

First run compiles Rust (~2–3 min). Subsequent runs are fast.

## Build

```bash
bun tauri build
```

Outputs to `src-tauri/target/release/bundle/`:

- macOS → `.dmg`
- Windows → `.exe` / `.msi`
- Linux → `.AppImage` / `.deb`

## Checks

```bash
bun run check   # type-check + lint
bun run format  # format everything
bun test        # run tests
```
