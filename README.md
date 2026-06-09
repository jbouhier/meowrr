# MeowRR

Keep an eye on your MRR

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
