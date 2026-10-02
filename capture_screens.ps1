$dir = "C:\Users\root\Desktop\PhotoApp_Dev\src\assets\presentation_screens"
if (!(Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force
}

$edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

$items = @(
    @("01_login.png", "http://localhost:3000/"),
    @("02_dashboard.png", "http://localhost:3000/?role=admin&active=dashboard"),
    @("03_ajanda.png", "http://localhost:3000/?role=admin&active=ajanda"),
    @("04_musteriler.png", "http://localhost:3000/?role=admin&active=musteriler"),
    @("05_muhasebe.png", "http://localhost:3000/?role=admin&active=muhasebe"),
    @("06_ekip.png", "http://localhost:3000/?role=admin&active=ekip"),
    @("07_kartvizit.png", "http://localhost:3000/?role=admin&active=kartvizit"),
    @("08_paketler.png", "http://localhost:3000/?role=admin&active=paketler"),
    @("09_takvim.png", "http://localhost:3000/?role=admin&active=takvim"),
    @("10_altinsaat.png", "http://localhost:3000/?role=admin&active=altinsaat"),
    @("11_pozrehberi.png", "http://localhost:3000/?role=admin&active=pozrehberi")
)

foreach ($item in $items) {
    $file = Join-Path $dir $item[0]
    $url = $item[1]
    Write-Host "Capturing $file from $url"
    Start-Process -FilePath $edge -ArgumentList "--headless", "--disable-gpu", "--virtual-time-budget=2000", "--window-size=430,932", "--screenshot=$file", $url -Wait
}

Get-ChildItem -Path $dir | Select-Object Name, Length
