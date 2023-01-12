# Action: release-rust

An all-in-one action to build, optimise, tag, checksum, sign, and publish a Cargo-based Rust project.

## Purpose

This action...

The action can be used standalone, as part of your own release workflow, or alongside our own
[release-pr] and [release-meta] actions. See the `onrelease` workflow in the test repo for
[a complete example](https://github.com/passcod/cargo-release-pr-test/blob/main/.github/workflows/onrelease.yml)
of the latter.

[release-pr]: https://github.com/cargo-bins/release-pr
[release-meta]: https://github.com/cargo-bins/release-meta

## Usage

```yaml
name: Release build
on:
  pull_request:
    types: closed
    branches: [main] # target branch of release PRs

jobs:
  release:
    if: contains(github.event.pull_request.tags, 'release')
    strategy:
      fail-fast: false
      matrix:
        include:
        - { o: macos-latest,    t: x86_64-apple-darwin        }
        - { o: macos-latest,    t: aarch64-apple-darwin       }
        - { o: ubuntu-latest,   t: x86_64-unknown-linux-musl  }
        - { o: ubuntu-latest,   t: aarch64-unknown-linux-musl }
        - { o: windows-latest,  t: x86_64-pc-windows-msvc     }
        - { o: windows-latest,  t: aarch64-pc-windows-msvc    }

    name: ${{ matrix.t }}
    runs-on: ${{ matrix.o }}
    steps:
    - uses: actions/checkout@v3
    - uses: cargo-bins/release-rust
     with:
       github-token: ${{ secrets.GITHUB_TOKEN }}
       crates-token: ${{ secrets.CRATES_TOKEN }}
       toolchain: stable
       target: ${{ matrix.t }}
       packaging: tar+zstd
       release-notes: ${{ github.event.pull_request.body }}
```

The action needs no dependencies and runs on all hosted-spec runners (or compatible).

## Inputs

| Name | Type | Default | Description |
|:-|:-:|:-:|:-|
| Credentials ||||
| `github-token` | String | **required** | A github token to interact with the API and to use for OIDC claims. |
| `crates-token` | String | _optional_ | A crates.io token with publish scope for the crate(s). If not provided, crates will not be published. |
| Setup options ||||
| `toolchain` | String | `'nightly'` | The rustup toolchain to use. |
| `target` | String | _host target_ | The target to install and build for. |
| `cosign-version` | String | _latest 1.x_ | Specify the cosign tool version to use. |
| Function switches ||||
| `publish-crate` | Boolean | `true` | Set to `false` to disable publishing to crates.io. |
| `publish-release` | Boolean | `true` | Set to `false` to disable publishing a GitHub release. Packages will be left in the `packages/` directory. |
| `use-cross` | Boolean/`auto` | `'auto'` | Force use of cross to compile. By default, will use cross if the target is not the host target. |
| `sigstore` | Boolean | `true` | Set to `false` to disable signing tags and packages with sigstore. Requires the github token to be enabled for OIDC. |
| Compilation options ||||
| `crates` | String | _all binary crates_ | Newline-separated list of crate globs to build within the workspace. |
| `features` | String | _optional_ | Newline-separated features to enable when building. |
| `buildstd` | Boolean | `true` | Set to `false` to disable building the standard library from source. Will also disable `debuginfo`. |
| `debuginfo` | Boolean | `true` | Set to `false` to disable generating and outputting split debuginfo. |
| `musl-libgcc` | Boolean | `true` | Set to `false` to disable static-linking libgcc for musl builds. |
| Extra flags ||||
| `extra-rustup-components` | String | _optional_ | Extra components to install with rustup. |
| `extra-cargo-flags` | String | _optional_ | Extra flags to pass to cargo build. |
| `extra-rustc-flags` | String | _optional_ | Extra flags to pass to rustc (RUSTFLAGS). |
| `extra-cosign-flags` | String | _optional_ | Extra flags to pass to cosign. |
| Packaging options ||||
| `package-format` | String | `'zip'` | [Packaging format](#packaging). |
| `package-files` | String | _optional_ | Newline-separated list of file globs to include in the package in addition to compiled binaries. |
| `package-dir` | String | `'packages/'` | Directory to write finished packages to. |
| Github release ||||
| `release-notes` | String | _optional_ | Body of the github release. |
| `release-name` | String | _version_ | Name of the github release. |
| `release-tag` | String | _version_ | Tag to create for the release, or to use if it already exists. |
| Hooks ||||
| `post-setup-command` | String | _optional_ | Command to run after toolchain setup, but before building. |
| `build-command` | String | _optional_ | Completely [custom build command](#custom-build-command). Compilation options and extra cargo/rustc flags will be ignored if this is set. |
| `post-build-command` | String | _optional_ | Command to run after building, but before packaging. |
| `post-package-command` | String | _optional_ | Command to run after packaging, but before signing. |
| `post-sign-command` | String | _optional_ | Command to run after signing, but before publishing. |
| `post-publish-command` | String | _optional_ | Command to run after publishing. |

### Checkout

### Packaging

## Outputs

All outputs of a Github Action are strings.

| Name | Description |
|:-|:-|
| `files` | Comma-separated list of files generated by the action. |

## Behaviour

### Signing

### Hooks

### Custom build command

### With multiple crates
