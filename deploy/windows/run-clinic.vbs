' ==========================================================================
' run-clinic.vbs  -  the file the desktop / startup icon points at.
' Starts the Eye EMR server with NO console window, waits until it is
' listening, then opens it in a clean app-mode browser window.
'
' Safe to double-click repeatedly: if the server is already running it just
' opens the browser again instead of starting a second copy.
'
' Per-machine settings (DB location, port, secret) are read from
' config.bat in this same folder, which install.bat generates once.
' ==========================================================================
Option Explicit

Dim fso, shell, here, root, standalone, cfg
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")

' This script lives in <root>\deploy\windows\ ; app root is two levels up.
here = fso.GetParentFolderName(WScript.ScriptFullName)
root = fso.GetParentFolderName(fso.GetParentFolderName(here))
standalone = fso.BuildPath(root, ".next\standalone")

' ---- load config.bat (KEY=VALUE lines, ignore "set " prefix & comments) ----
Dim dbPath, port, secret, hostName
dbPath = "C:\ClinicData\clinic.db"
port = "3000"
hostName = "0.0.0.0"
secret = ""

cfg = fso.BuildPath(here, "config.bat")
If fso.FileExists(cfg) Then
    Dim f, line, k, v, p
    Set f = fso.OpenTextFile(cfg, 1)
    Do Until f.AtEndOfStream
        line = Trim(f.ReadLine)
        If Left(LCase(line), 4) = "set " Then line = Trim(Mid(line, 5))
        If line <> "" And Left(line, 1) <> ":" And Left(line, 3) <> "rem" Then
            p = InStr(line, "=")
            If p > 0 Then
                k = UCase(Trim(Left(line, p - 1)))
                v = Trim(Mid(line, p + 1))
                Select Case k
                    Case "DB_PATH"        : dbPath = v
                    Case "PORT"           : port = v
                    Case "HOSTNAME"       : hostName = v
                    Case "SESSION_SECRET" : secret = v
                End Select
            End If
        End If
    Loop
    f.Close
End If

Dim url
url = "http://localhost:" & port

' ---- start the server only if it is not already listening ----
If Not PortInUse(port) Then
    ' Set env for the child node process, then launch it hidden (0 = no window).
    shell.Environment("PROCESS").Item("NODE_ENV") = "production"
    shell.Environment("PROCESS").Item("DB_PATH") = dbPath
    shell.Environment("PROCESS").Item("PORT") = port
    shell.Environment("PROCESS").Item("HOSTNAME") = hostName
    If secret <> "" Then shell.Environment("PROCESS").Item("SESSION_SECRET") = secret

    ' Resolve node.exe by full path: a process launched from Explorer can have a
    ' stale PATH (e.g. set before Node was installed), so "node" alone may fail.
    Dim nodeExe
    nodeExe = "node"
    If fso.FileExists("C:\Program Files\nodejs\node.exe") Then
        nodeExe = "C:\Program Files\nodejs\node.exe"
    ElseIf fso.FileExists("C:\Program Files (x86)\nodejs\node.exe") Then
        nodeExe = "C:\Program Files (x86)\nodejs\node.exe"
    End If

    ' Launch hidden via cmd so we can capture stdout/stderr to a log for debugging.
    Dim logPath, cmdLine
    logPath = fso.BuildPath(standalone, "server.log")
    shell.CurrentDirectory = standalone
    cmdLine = "cmd /c " & Chr(34) & Chr(34) & nodeExe & Chr(34) & _
              " server.js > " & Chr(34) & logPath & Chr(34) & " 2>&1" & Chr(34)
    shell.Run cmdLine, 0, False

    ' wait up to ~30s for it to come up
    Dim i
    For i = 1 To 60
        WScript.Sleep 500
        If PortInUse(port) Then Exit For
    Next
End If

' ---- open the browser (app mode if Edge/Chrome exist, else default) ----
OpenBrowser url

' --------------------------------------------------------------------------
Function PortInUse(p)
    Dim exec, out
    Set exec = shell.Exec("cmd /c netstat -ano -p tcp")
    out = exec.StdOut.ReadAll
    PortInUse = (InStr(out, ":" & p & " ") > 0) And (InStr(out, "LISTENING") > 0)
End Function

Sub OpenBrowser(theUrl)
    Dim edge, chrome
    edge = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
    If fso.FileExists(edge) Then
        shell.Run """" & edge & """ --app=" & theUrl, 1, False
    ElseIf fso.FileExists(chrome) Then
        shell.Run """" & chrome & """ --app=" & theUrl, 1, False
    Else
        shell.Run theUrl, 1, False  ' default browser, normal tab
    End If
End Sub
