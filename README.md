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
- uses: cargo-bins/release-rust
  with:
   github-token: ${{ secrets.GITHUB_TOKEN }}
   crates-token: ${{ secrets.CRATES_TOKEN }}
   target: ${{ matrix.target }}
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
| `package-name` | `'{crate}-{target}-{version}'` | Name of the package, excluding the extension. |
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

You're responsible for checking out the repository at the right commit for the build. In most cases,
this will be the default behaviour of `actions/checkout@v3`, but in some situations you may need to
specify its `ref` input.

This action also does not bump versions or commit to the repository. You can use [release-pr] for
that if you want a PR-based workflow, push to the repository directly, or use a different tool. It's
up to you.

### Packaging

The `package-archive` input selects the package archive format. For all compressed formats, the
maximum compression setting is used.

| Value | Description |
|:-:|:-|
| `none` | Do not archive the package. This is an advanced option, and you should use `post-package-command` alongside it, otherwise you may not have anything to upload. |
| `zip` | ZIP archive, with DEFLATE compression. This is the default, as it has the widest compatibility. |
| `tar+gzip` | Posix (pax) TAR archive, with GZIP compression. |
| `tar+bzip2` | Posix (pax) TAR archive, with BZIP2 compression. |
| `tar+xz` | Posix (pax) TAR archive, with XZ compression. |
| `tar+zstd` | Posix (pax) TAR archive, with ZSTD compression. |

There's no support to select different formats based on the target: if you wish to, you should make
that logic yourself in the workflow, prior to calling this action.

The `package-name` input is a template string that will be used to name the package. The following
placeholders can be used:

- `{target}`: The target being built for.

- `{crate}`: The name of the crate being built. If all crates are being built, this will be
  the name of the first binary crate in lexicographic order. If the `crates` input is given, this
  will be the name of the first crate in the resolved list.

- `{version}`: The version of the crate being built. If all crates are being built, this will be
  the version of the first binary crate in lexicographic order. If the `crates` input is given, this
  will be the version of the first crate in the resolved list.

The `package-separately` option affects the above, as each crate will be packaged separately. See
the [With multiple crates](#with-multiple-crates) section for more details.

## Outputs

All outputs of a Github Action are strings.

| Name | Description |
|:-|:-|
| `files` | Newline-separated list of files generated by the action. This does not include all built files, only those within the `package-output` path. |

## Behaviour

### Signing

### Hooks

(describe lifecycle/flow)

(hooks run even if their section is disabled, so can be used as replacement functionality)

### Custom build command

(TODO: document expected output, e.g. binaries in target/...)

### With multiple crates

## Examples

### Basic usage

This example runs when pull requests tagged with a `release` label are merged to the `main` branch.

It builds the project for six targets (x64 and ARM64 for the big three platforms) and otherwise uses
all defaults: compiles with `build-std`, packs the debuginfo, uses zip archives, publishes to crates.io,
pushes a tag, publishes to GitHub releases, and uploads signatures to sigstore. The binaries can then
be securely installed with [`cargo binstall`][cargo-binstall].

```yaml
name: Release on PR merge
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

### Running on tags

This example runs when a version tag is pushed. While the action would detect the tag exists before pushing it,
we disable tag publishing to save a little time. Otherwise it does everything the above example does.

```yaml
name: Release on tag push
on:
  push:
    tag: v*.*.*

jobs:
  release:
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
       publish-tag: false
```

### Installing compile-time dependencies

(post-setup command with runner.os and target interpolation to install compiler-rt for musl)

### Custom command: justfile

(+ post-setup command using cargo-binstall to install just)

### Custom command: bazel

(TODO: pick a project using bazel or make or whatever and write it a config)

### Compile out panic messages

(use extra flags to set build-std=abort etc)

### Multiple crates with globs

### Publish all crates that need publishing

### Publishing to crates.io before or after packaging anything

(TODO: dependent job before/after the action, disable publish-crate)

### Extra signing attestations

(with extra cosign flags)

### Distribute signatures alongside packages

(use extra cosign flags to write sig to outside, use post-package hook to bring sig files back in)

### Sign using GPG instead

(disable sigstore, using post-sign hook to sign and write sig to outside, use post-package hook to bring sig files back in)
