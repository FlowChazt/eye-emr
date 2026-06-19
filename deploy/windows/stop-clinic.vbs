' ==========================================================================
' stop-clinic.vbs  -  stop the Eye EMR server.
' Double-click to shut the server down. It finds the node process that is
' listening on the configured port (from config.bat) and stops just that one,
' so other programs are never touched. Shows a popup with the result.
' ==========================================================================
Option Explicit

Dim fso, shell, cfg
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' ---- read PORT from C:\ClinicData\config.bat (default 3000) ----
Dim port
port = "3000"
cfg = "C:\ClinicData\config.bat"
If fso.FileExists(cfg) Then
    Dim f, line, p
    Set f = fso.OpenTextFile(cfg, 1)
    Do Until f.AtEndOfStream
        line = Trim(f.ReadLine)
        If Left(LCase(line), 4) = "set " Then line = Trim(Mid(line, 5))
        p = InStr(line, "=")
        If p > 0 Then
            If UCase(Trim(Left(line, p - 1))) = "PORT" Then port = Trim(Mid(line, p + 1))
        End If
    Loop
    f.Close
End If

' ---- find the PID listening on that port ----
Dim exec, txt, lines, i, pid, parts, j
pid = ""
Set exec = shell.Exec("cmd /c netstat -ano -p tcp")
txt = exec.StdOut.ReadAll
lines = Split(txt, vbCrLf)
For i = 0 To UBound(lines)
    If InStr(lines(i), ":" & port & " ") > 0 And InStr(lines(i), "LISTENING") > 0 Then
        ' last whitespace-separated token on the line is the PID
        parts = Split(Trim(lines(i)))
        pid = parts(UBound(parts))
        Exit For
    End If
Next

If pid = "" Then
    MsgBox "The clinic program does not appear to be running (nothing on port " & port & ").", _
           vbInformation, "Eye EMR"
    WScript.Quit
End If

' ---- confirm, then stop it ----
Dim answer
answer = MsgBox("Stop the clinic program?" & vbCrLf & vbCrLf & _
                "Anyone using it (including other PCs) will be disconnected.", _
                vbQuestion + vbYesNo + vbDefaultButton2, "Eye EMR")
If answer <> vbYes Then WScript.Quit

shell.Run "taskkill /F /PID " & pid, 0, True
MsgBox "The clinic program has been stopped." & vbCrLf & _
       "Double-click the desktop icon to start it again.", vbInformation, "Eye EMR"
