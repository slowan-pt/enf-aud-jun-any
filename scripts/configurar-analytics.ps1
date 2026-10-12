# Configura o painel "Estatisticas do Site" (token + zona) e testa a Cloudflare.
# O token e digitado AQUI (nao aparece na tela) e vai direto para o Worker.
# Este script NUNCA imprime o token.

$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$domain = 'essencialsaudeauditoria.com.br'

$secure = Read-Host 'Cole o token da Cloudflare e tecle Enter (nao aparece na tela)' -AsSecureString
$token = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)).Trim()
if (-not $token) { throw 'Token vazio.' }
$token = $token -replace '^Bearer\s+',''
if ($token -notmatch '^[A-Za-z0-9_-]{40}$') {
  throw ("O texto colado tem {0} caracteres e um token da Cloudflare tem 40 (so letras, numeros, - e _). Copie SO o token, sem o comando curl, sem espacos e sem aspas." -f $token.Length)
}
$headers = @{ Authorization = "Bearer $token" }

Write-Host "`n1) Procurando o ID da zona de $domain ..."
$zones = Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/zones?name=$domain" -Headers $headers
if (-not $zones.success -or $zones.result.Count -eq 0) {
  throw 'Nao achei a zona. O token precisa ter tambem a permissao Zona > Zona > Leitura.'
}
$zoneId = $zones.result[0].id
Write-Host "   Zona encontrada: $zoneId (ID de zona nao e segredo)"

Write-Host "`n2) Gravando os dois segredos no Worker ..."
$token  | npx wrangler secret put CLOUDFLARE_API_TOKEN -c wrangler.nova.jsonc
$zoneId | npx wrangler secret put CLOUDFLARE_ZONE_ID -c wrangler.nova.jsonc

Write-Host "`n3) Testando os campos da Cloudflare (copie TUDO abaixo e cole no chat) ..."
function Test-Query([string]$name, [string]$dimension, [string]$extra, [int]$days) {
  $to = (Get-Date).ToUniversalTime()
  $from = $to.AddDays(-$days)
  $f = $from.ToString('yyyy-MM-ddTHH:mm:ssZ'); $t = $to.ToString('yyyy-MM-ddTHH:mm:ssZ')
  $filter = "{ datetime_geq: `"$f`", datetime_leq: `"$t`", requestSource: `"eyeball`"$extra }"
  $q = "query { viewer { zones(filter: { zoneTag: `"$zoneId`" }) { rows: httpRequestsAdaptiveGroups(limit: 3, filter: $filter, orderBy: [count_DESC]) { count sum { visits } dimensions { $dimension } } } } }"
  try {
    $res = Invoke-RestMethod -Uri 'https://api.cloudflare.com/client/v4/graphql' -Method Post -Headers $headers -ContentType 'application/json' -Body (@{ query = $q } | ConvertTo-Json)
    if ($res.errors) { Write-Host ("   ERRO   {0,-28} {1}" -f $name, $res.errors[0].message); return }
    $n = @($res.data.viewer.zones[0].rows).Count
    Write-Host ("   OK     {0,-28} {1} linhas" -f $name, $n)
  } catch {
    Write-Host ("   ERRO   {0,-28} {1}" -f $name, $_.Exception.Message)
  }
}
$html = ', edgeResponseContentTypeName: "html", edgeResponseStatus_lt: 400'
Test-Query 'por hora (24h)'          'datetimeHour'      ''    1
Test-Query 'por dia (7 dias)'        'date'              ''    7
Test-Query 'por dia (30 dias)'       'date'              ''    30
Test-Query 'visualizacoes (html)'    'date'              $html 7
Test-Query 'paises'                  'clientCountryName' ''    7
Test-Query 'dispositivos'            'clientDeviceType'  ''    7
Test-Query 'navegadores'             'userAgentBrowser'  ''    7
Test-Query 'sistemas operacionais'   'userAgentOS'       ''    7
Test-Query 'paginas'                 'clientRequestPath' $html 7
Test-Query 'user-agents (robos)'     'userAgent'         ''    7

Write-Host "`nPronto. Os segredos foram gravados. Cole a lista acima no chat."
