Write-Host "SumatraPDF yuklab olinmoqda..."
$url = "https://www.sumatrapdfreader.org/dl/SumatraPDF-3.5.2-64-install.exe"
$installerPath = "$env:TEMP\SumatraPDF-install.exe"

try {
    Invoke-WebRequest -Uri $url -OutFile $installerPath -UseBasicParsing
    Write-Host "Yuklab olindi. O'rnatish boshlanmoqda..."
    
    # SumatraPDF ni jim rejimda o'rnatish (-s parametri bilan)
    $process = Start-Process -FilePath $installerPath -ArgumentList "-s" -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-Host "SumatraPDF kompyuterga muvaffaqiyatli o'rnatildi!"
        # O'rnatkichni tozalash
        Remove-Item -Path $installerPath -Force -ErrorAction SilentlyContinue
    } else {
        Write-Host "O'rnatishda muammo chiqdi. Exit code: $($process.ExitCode)"
    }
} catch {
    Write-Host "Yuklab olishda xatolik yuz berdi: $($_.Exception.Message)"
}
