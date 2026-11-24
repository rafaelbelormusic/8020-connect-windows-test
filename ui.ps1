# Real mouse click on a native button found by its visible text. -Shot prints a small screenshot, -Keys reports held keys.
param([string]$Button,[switch]$Keys,[switch]$Shot,[int]$Wait=20)
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type @'
using System;using System.Text;using System.Collections.Generic;using System.Runtime.InteropServices;
public static class W{
 public delegate bool P(IntPtr h,IntPtr l);public struct R{public int L,T,Rt,B;}
 [DllImport("user32.dll")]public static extern bool EnumWindows(P p,IntPtr l);
 [DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr h,P p,IntPtr l);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder s,int n);
 [DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);
 [DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")]public static extern void mouse_event(uint f,uint x,uint y,uint d,IntPtr e);
 [DllImport("user32.dll")]public static extern short GetAsyncKeyState(int k);
 [DllImport("user32.dll")]public static extern bool SetProcessDPIAware();
 static string T(IntPtr h){var s=new StringBuilder(300);GetWindowText(h,s,300);return s.ToString();}
 static string C(IntPtr h){var s=new StringBuilder(100);GetClassName(h,s,100);return s.ToString();}
 public static List<string> List(){var o=new List<string>();EnumWindows((h,l)=>{if(IsWindowVisible(h)){o.Add(C(h)+" | "+T(h));if(C(h)=="#32770")EnumChildWindows(h,(c,m)=>{if(T(c)!="")o.Add("   "+C(c)+" | "+T(c));return true;},IntPtr.Zero);}return true;},IntPtr.Zero);return o;}
 public static IntPtr Find(string t){IntPtr f=IntPtr.Zero;EnumWindows((h,l)=>{if(IsWindowVisible(h))EnumChildWindows(h,(c,m)=>{R q;if(f==IntPtr.Zero&&IsWindowVisible(c)&&T(c).Replace("&","")==t&&GetWindowRect(c,out q)&&q.Rt-q.L>20&&q.B-q.T>8)f=c;return true;},IntPtr.Zero);return true;},IntPtr.Zero);return f;}
}
'@
[W]::SetProcessDPIAware()|Out-Null
if($Keys){foreach($k in 0x10,0x11,0x12,0x41,1,2){"$k=$([int](([W]::GetAsyncKeyState($k) -band 0x8000) -ne 0))"};exit}
if($Shot){$b=[Windows.Forms.Screen]::PrimaryScreen.Bounds;$m=New-Object Drawing.Bitmap $b.Width,$b.Height;[Drawing.Graphics]::FromImage($m).CopyFromScreen(0,0,0,0,$m.Size)
 $s=New-Object Drawing.Bitmap $m,([int]($b.Width*.6)),([int]($b.Height*.6));$ms=New-Object IO.MemoryStream;$s.Save($ms,[Drawing.Imaging.ImageFormat]::Jpeg);[Convert]::ToBase64String($ms.ToArray());exit}
$end=(Get-Date).AddSeconds($Wait)
while((Get-Date) -lt $end){$h=[W]::Find($Button)
 if($h -ne [IntPtr]::Zero){Start-Sleep -Milliseconds 900;$r=New-Object W+R;[W]::GetWindowRect($h,[ref]$r)|Out-Null;$x=[int](($r.L+$r.Rt)/2);$y=[int](($r.T+$r.B)/2)
  [W]::SetCursorPos($x,$y)|Out-Null;Start-Sleep -Milliseconds 100;[W]::mouse_event(2,0,0,0,[IntPtr]::Zero);[W]::mouse_event(4,0,0,0,[IntPtr]::Zero);Start-Sleep -Milliseconds 700
  if([W]::Find($Button) -eq [IntPtr]::Zero){"clicked '$Button' at $x,$y";exit}}
 Start-Sleep -Milliseconds 300}
"NOT FOUND '$Button'";[W]::List()
