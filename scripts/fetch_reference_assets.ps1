$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$revision = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482'
$destinationRoot = Join-Path $projectRoot 'assets/vendor/makehuman'
New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
$files = @(
    @{ path='makehuman/data/3dobjs/base.obj'; sha='8e761e6624b8f54536409135d1636da63b32486a90d4897f84e121d144f6fb4c' },
    @{ path='makehuman/data/rigs/default.mhskel'; sha='99f179bce0aa850b45d4191a1d0d234c5851f881c057439470ded3bddf729a24' },
    @{ path='makehuman/data/rigs/default_weights.mhw'; sha='0f3641d651ae3d00ad6b4ccee43142edb109d3bd909d27d9e4139ef1beed8625' }
)
foreach ($file in $files) {
    $destination = Join-Path $destinationRoot (Split-Path $file.path -Leaf)
    if (Test-Path -LiteralPath $destination) {
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha) {
            throw "Existing asset differs from pinned source; preserve and inspect it: $destination"
        }
    } else {
        Invoke-WebRequest -Uri "https://raw.githubusercontent.com/makehumancommunity/makehuman/$revision/$($file.path)" -OutFile $destination
        if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() -ne $file.sha) { throw "Downloaded asset hash mismatch: $destination" }
    }
    Write-Output "Verified $destination"
}
