# Real OS mouse drag inside a window's client area (split border test, 28.11.2026).
param([string]$Title,[int]$X,[int]$Y,[int]$DX,[int]$DY=0,[int]$Steps=15)
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;
public static class D{
 public delegate bool P(IntPtr h,IntPtr l);public struct PT{public int X,Y;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(P p,IntPtr l);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool ClientToScreen(IntPtr h,ref PT p);
 [DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")]public static extern void mouse_event(uint f,uint x,uint y,uint d,IntPtr e);
 [DllImport("user32.dll")]public static extern bool SetProcessDPIAware();
 public static IntPtr Find(string t){IntPtr f=IntPtr.Zero;EnumWindows((h,l)=>{var s=new StringBuilder(300);GetWindowText(h,s,300);if(f==IntPtr.Zero&&IsWindowVisible(h)&&s.ToString()==t)f=h;return true;},IntPtr.Zero);return f;}
}
'@
[D]::SetProcessDPIAware()|Out-Null
$h=[D]::Find($Title);if($h -eq [IntPtr]::Zero){"no window '$Title'";exit 1}
[D]::SetForegroundWindow($h)|Out-Null;Start-Sleep -Milliseconds 400
$p=New-Object D+PT;$p.X=$X;$p.Y=$Y;[D]::ClientToScreen($h,[ref]$p)|Out-Null
[D]::SetCursorPos($p.X,$p.Y)|Out-Null;Start-Sleep -Milliseconds 300
[D]::mouse_event(2,0,0,0,[IntPtr]::Zero);Start-Sleep -Milliseconds 150
for($i=1;$i -le $Steps;$i++){[D]::SetCursorPos($p.X+[int]($DX*$i/$Steps),$p.Y+[int]($DY*$i/$Steps))|Out-Null;Start-Sleep -Milliseconds 40}
Start-Sleep -Milliseconds 150;[D]::mouse_event(4,0,0,0,[IntPtr]::Zero)
"dragged from $($p.X),$($p.Y) by $DX,$DY"
