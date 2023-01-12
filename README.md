# Action: release-rust

An all-in-one action to build, optimise, tag, sign, and publish a Cargo-based Rust project.

## Purpose

This action is your one-stop shop for building and publishing a Rust project. It will:
- Install the Rust toolchain and target, including necessary components
- Use [cross] for cross-compilation if needed
- Enable some useful compiler options by default, like:
  + building the standard library (`-Z build-std`),
  + codegen units for maximum optimisations (`-C codegen-units=1`),
  + static linking of libgcc for musl builds (`-C link-arg=-static-libgcc`),
  + outputting split debuginfo (`-C split-debuginfo=packed`).
- Package binaries and support files in an archive
- Sign the archive with [sigstore]
- Tag the release if it isn't already, and sign the tag with sigstore
- Publish the crate to crates.io
- Publish the archives to GitHub Releases

Sounds complicated? Fear not! In most cases, using this action is a 5-line job.

It can be used standalone, as part of your own release workflow, or alongside our own [release-pr]
and [release-meta] actions. See the `onrelease` workflow in the test repo for [a complete example]
of the latter.

[release-pr]: https://github.com/cargo-bins/release-pr
[release-meta]: https://github.com/cargo-bins/release-meta
[a complete example]: https://github.com/passcod/cargo-release-pr-test/blob/main/.github/workflows/onrelease.yml

## Usage

```yaml
name: Release build
on:
  pull_request:
    types: closed
    branches: [main] # target branch of release PRs

jobs:
  release:
    if: github.event.pull_request.merged && contains(github.event.pull_request.labels.*.name, 'release')
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
       target: ${{ matrix.t }}
```

The action needs no dependencies and runs on all hosted-spec runners (or compatible).

## Inputs

| Name | Default | Description |
|:-|:-:|:-|
| __🔑 Credentials__ |||
| `github-token` | **required** | A github token to interact with the API and to use for OIDC claims. |
| `crates-token` | _optional_ | A crates.io token with publish scope for the crate(s). If not provided, crates will not be published. |
| __🧰 Setup options__ |||
| `toolchain` | `'nightly'` | The rustup toolchain to use. |
| `target` | _host target_ | The target to install and build for. |
| `cosign-version` | _latest 1.x_ | Specify the cosign tool version to use. |
| __✂️ Function switches__ |||
| `publish-crate` | `true` | Set to `false` to disable publishing to crates.io. |
| `publish-release` | `true` | Set to `false` to disable publishing a GitHub release. Packages will be left in the `packages/` directory. |
| `use-cross` | `'auto'` | Force use of cross to compile. By default, will use cross if the target is not the host target. |
| `sigstore` | `true` | Set to `false` to disable signing tags and packages with sigstore. Requires the github token to be enabled for OIDC. |
| __⚒️ Compilation options__ |||
| `crates` | _all binary crates_ | Newline-separated list of crate globs to build within the workspace. |
| `features` | _optional_ | Newline-separated features to enable when building. |
| `buildstd` | `true` | Set to `false` to disable building the standard library from source. Will also disable `debuginfo`. |
| `debuginfo` | `true` | Set to `false` to disable generating and outputting split debuginfo. |
| `musl-libgcc` | `true` | Set to `false` to disable static-linking libgcc for musl builds. |
| __🚩 Extra flags__ |||
| `extra-rustup-components` | _optional_ | Extra components to install with rustup. |
| `extra-cargo-flags` | _optional_ | Extra flags to pass to cargo build. |
| `extra-rustc-flags` | _optional_ | Extra flags to pass to rustc (RUSTFLAGS). |
| `extra-cosign-flags` | _optional_ | Extra flags to pass to cosign. |
| __📦 Packaging options__ |||
| `package-archive` | `'zip'` | [Packaging archive format](#packaging). |
| `package-files` | _optional_ | Newline-separated list of file globs to include in the package in addition to compiled binaries. |
| `package-name` | `'{crate_name}-{target}-{version}'` | Name of the package, excluding the extension. |
| `package-in-dir` | `true` | Wrap the package contents in a directory with the same name before archiving. |
| `package-separately` | `false` | Package each crate separately. |
| `package-short-ext` | `false` | Use the short variant of the archive extension, if relevant for the format. E.g. `tgz` instead of `tar.gz`. |
| `package-output` | `'packages/'` | Path to write finished packages to. |
| __🚢 Github release__ |||
| `release-notes` | _optional_ | Body of the github release. |
| `release-name` | _version_ | Name of the github release. |
| `release-tag` | _version_ | Tag to create for the release, or to use if it already exists. |
| __🪝 Hooks__ |||
| `post-setup-command` | _optional_ | Command to run after toolchain setup, but before building. |
| `build-command` | _optional_ | Completely [custom build command](#custom-build-command). Compilation options and extra cargo/rustc flags will be ignored if this is set. |
| `post-build-command` | _optional_ | Command to run after building, but before packaging. |
| `post-package-command` | _optional_ | Command to run after packaging, but before signing. |
| `post-sign-command` | _optional_ | Command to run after signing, but before publishing. |
| `post-publish-command` | _optional_ | Command to run after publishing. |

### Checkout

### Packaging

## Outputs

All outputs of a Github Action are strings.

| Name | Description |
|:-|:-|
| `files` | Newline-separated list of files generated by the action. |

## Behaviour

### Signing

### Hooks

### Custom build command

### With multiple crates
