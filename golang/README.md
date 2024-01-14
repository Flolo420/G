---
title: Go
homepage: https://golang.org
tagline: |
  Go makes it easy to build simple, reliable, and efficient software.
---

## Updating `go`

```bash
webi golang@stable
```

Use the `@beta` tag for pre-releases, or `@x.y.z` for a specific version.

## Cheat Sheet

> Go is designed, through and through, to make Software Engineering easy. It's
> fast, efficient, reliably, and something you can learn in a weekend. If you
> subscribe to [_The Zen of Python_](https://www.python.org/dev/peps/pep-0020/),
> you'll [love](https://go-proverbs.github.io/) >
> [Go](https://www.youtube.com/watch?v=PAAkCSZUG1c).

### Hello World

```bash
mkdir -p hello/
pushd hello/
```

```bash
cat << EOF >> main.go
package main

import (
  "fmt"
)

func main () {
  fmt.Println("Hello, World!")
}
EOF
```

```bash
go fmt ./...
go build .
./hello
> Hello, World!
```
