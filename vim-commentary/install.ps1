#!/usr/bin/env pwsh

$my_name = "commentary"
$my_pkg_name = "vim-commentary"
$my_repo = "https://github.com/tpope/vim-commentary"

IF (!(Test-Path -Path "$Env:USERPROFILE\.vim\pack\plugins\start")) {
    New-Item -Path "$Env:USERPROFILE\.vim\pack\plugins\start" -ItemType Directory -Force | Out-Null
}

Remove-Item -Path "$Env:USERPROFILE\.vim\pack\plugins\start\${my_name}" -Recurse -ErrorAction Ignore
& git clone --depth=1 "$my_repo" "$Env:USERPROFILE\.vim\pack\plugins\start\$my_name.vim"

IF (!(Test-Path -Path "$Env:USERPROFILE\.vim\plugin\$my_name.vim")) {
    IF ($null -eq $Env:WEBI_HOST -or $Env:WEBI_HOST -eq "") { $Env:WEBI_HOST = "https://webinstall.dev" }
    curl.exe -sS -o "$Env:USERPROFILE\.vim\plugin\$my_name.vim" "$Env:WEBI_HOST/packages/${my_pkg_name}/${my_name}.vim"
}
