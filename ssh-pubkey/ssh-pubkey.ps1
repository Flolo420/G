#!/usr/bin/env pwsh

# TODO: can we use some of this?
# https://github.com/PowerShell/openssh-portable/blob/latestw_all/contrib/win32/openssh/FixUserFilePermissions.ps1

if (!(Test-Path -Path "$Env:USERPROFILE/.ssh")) {
    New-Item -Path "$Env:USERPROFILE/.ssh" -ItemType Directory -Force | Out-Null
    #& icacls "$Env:USERPROFILE/.ssh" /inheritance:r
    #& icacls "$Env:USERPROFILE/.ssh" /grant:r "$Env:USERNAME":"(F)"
}

if (!(Test-Path -Path "$Env:USERPROFILE/.ssh/config")) {
    New-Item -Path "$Env:USERPROFILE/.ssh/config" -ItemType "file" -Value ""
    #& icacls "$Env:USERPROFILE/.ssh/config" /inheritance:r
    #& icacls "$Env:USERPROFILE/.ssh/config" /grant:r "$Env:USERNAME":"(F)"
}

#if (!(Test-Path -Path "$Env:USERPROFILE/.ssh/authorized_keys"))
#{
#    New-Item -Path "$Env:USERPROFILE/.ssh/authorized_keys" -ItemType "file" -Value ""
#    #& icacls "$Env:USERPROFILE/.ssh/authorized_keys" /inheritance:r
#    #& icacls "$Env:USERPROFILE/.ssh/authorized_keys" /grant:r "$Env:USERNAME":"(F)"
#}

if (!(Test-Path -Path "$Env:USERPROFILE/.ssh/id_rsa")) {
    & ssh-keygen -b 2048 -t rsa -f "$Env:USERPROFILE/.ssh/id_rsa" -q -N """"
    Write-Output ""
}

if (!(Test-Path -Path "$Env:USERPROFILE/.ssh/id_rsa.pub")) {
    & ssh-keygen -y -f "$Env:USERPROFILE/.ssh/id_rsa" > "$Env:USERPROFILE/.ssh/id_rsa.pub"
    Write-Output ""
}

# TODO use the comment (if any) for the name of the file
Write-Output ""
Write-Output "~/Downloads/id_rsa.$Env:USERNAME.pub":
Write-Output ""
#rm -f "$Env:USERPROFILE/Downloads/id_rsa.$Env:USERNAME.pub":
Copy-Item -Path "$Env:USERPROFILE/.ssh/id_rsa.pub" -Destination "$Env:USERPROFILE/Downloads/id_rsa.$Env:USERNAME.pub"
& Get-Content "$Env:USERPROFILE/Downloads/id_rsa.$Env:USERNAME.pub"
Write-Output ""
