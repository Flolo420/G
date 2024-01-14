---
title: Gitea
homepage: https://github.com/go-gitea/gitea
tagline: |
  Gitea: Git with a cup of tea, painless self-hosted git service.
---

## Updating `gitea`

```bash
webi gitea@stable
```

Use the `@beta` tag for pre-releases, or `@x.y.z` for a specific version.

## Cheat Sheet

> Gitea is a clean, lightweight self-hosted Github clone. It only uses a few
> megabytes of RAM so it's perfect for hosting git on small VPSes and Raspberry
> Pis. It's forked from Gogs, and very familiar user-friendly for Github users
> in comparison to Gitlab or Bitbucket.

### How to run `gitea`

```bash
gitea web --config ~/.local/opt/gitea/custom/conf/app.ini
```

Note: `gitea` does NOT respect the _current working directory_ - the `./custom/`
folder must always exist in the location of the binary, which will be
`~/.local/opt/gitea/`.
