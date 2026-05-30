$folder = "I:\cnnhgcn"

Write-Host "Papka o'chirilmoqda: $folder"

try {
    # Birinchi urinish
    Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction Stop
    Write-Host "Muvaffaqiyatli o'chirildi!"
} catch {
    Write-Host "Oddiy yo'l bilan o'chirib bo'lmadi, ruxsatlar o'zgartirilmoqda..."
    # Ruxsatlarni o'zgartirish (Takeown va Icacls)
    cmd.exe /c "takeown /f `"$folder`" /r /d y"
    cmd.exe /c "icacls `"$folder`" /grant administrators:F /t"
    
    # Ruxsatlar olingach qayta o'chirish
    try {
        Remove-Item -LiteralPath $folder -Recurse -Force -ErrorAction Stop
        Write-Host "Ruxsatlar olingach muvaffaqiyatli o'chirildi!"
    } catch {
        Write-Host "Yana xatolik yuz berdi: $($_.Exception.Message)"
    }
}
