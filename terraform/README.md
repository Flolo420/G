---
title: Terraform
homepage: https://www.terraform.io/
tagline: |
  Provision, change, and version resources on any environment.
description: |
  Terraform is an infrastructure as code (IaC) tool that allows you to build, change, and version infrastructure safely and efficiently.
---

To update or switch versions, run `webi terraform@stable` (or `@v1.6.1`,
`@beta`, etc).

### Files

These are the files / directories that are created and/or modified with this
install:

```text
~/.config/envman/PATH.env
~/.local/bin/terraform
<PROJECT-DIR>/main.tf
```

## Cheat Sheet

> With HashiCorp Terraform, provisioning and security can be automated based on
> infrastructure and policy as code. Infrastructure and policies are codified,
> shared, managed, and executed within a workflow that is consistent across all
> infrastructure.

### How to Define Infrastructure State

Create configurations that provide an outline for Terraform to provision your
target infrastructure. For example:

`main.tf`:

```tf
terraform {
  required_providers {
    docker = {
      source = "kreuzwerker/docker"
      version = "~> 2.13.0"
    }
  }
}

provider "docker" {
    # provider-specific configuration goes here, e.g.,
    # browse provider documentation here https://registry.terraform.io/browse/providers
}

# Define some resources!
resource "docker_image" "nginx" {
    name         = "nginx:latest"
    keep_locally = false
}

resource "docker_container" "nginx" {
    image = docker_image.nginx.latest
    name  = "web-server"
    ports {
        internal = 80
        external = 8080
    }
}
```

### How to Initialize Terraform

Terraform needs to install provider-specific plugins, generate lockfiles, etc.
before you can begin provisioning.

```sh
terraform init
```

You should only need to run this on new configurations, or other configurations
checked-out from version control.

### How to Lint / Check / Validate your Config

To check you have a valid configuration

```sh
terraform validate
```

To format your configuration files

```sh
terraform fmt
```

### How to Provision Resources

You can generate an execution plan before committing to provisioning real
resources. This command allows you to see exactly what Terraform will do when
running the next command.

```sh
terraform plan
```

Then, **to apply your configurations and provision infrastructure** resources:

```sh
terraform apply
```

Use `-auto-approve` to automatically accept all user prompts (non-interactive,
batch mode):

```sh
terraform apply -auto-approve
```

### How to Execute Plans

Execution plans generated by `terraform plan` also act as the _last working
state of your infrastructure_. You may wish to save the generated `.tfstate`
file so that you may re-provision these resources reliably.

You can pass in the execution plan to `terraform apply` (example):

```sh
terraform apply -auto-approve ./main.tf
```
