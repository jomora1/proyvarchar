$paths = @('C:\Program Files\nodejs','C:\Program Files (x86)\nodejs',"$env:LOCALAPPDATA\Programs\nodejs")
$found = $false
foreach($p in $paths){
  $nodePath = Join-Path $p 'node.exe'
  if(Test-Path $nodePath){
    Write-Output "FOUND:$p"
    $env:PATH = "$p;$env:PATH"
    & $nodePath -v
    $npmPath = Join-Path $p 'npm.cmd'
    if(Test-Path $npmPath){ & $npmPath -v }
    npm install
    $found = $true
    break
  }
}
if(-not $found){ Write-Output 'NODE_NOT_FOUND' }
