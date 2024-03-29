#!/usr/bin/env pwsh

IF (!(Test-Path -Path "$Env:USERPROFILE\.vim\pack\plugins\start")) {
    New-Item -Path "$Env:USERPROFILE\.vim\pack\plugins\start" -ItemType Directory -Force | Out-Null
}
Remove-Item -Path "$Env:USERPROFILE\.vim\pack\plugins\start\ale" -Recurse -ErrorAction Ignore
& git clone --depth=1 https://github.com/dense-analysis/ale.git "$Env:USERPROFILE\.vim\pack\plugins\start\ale"
