# Real Windows display scaling for this session: resolution plus DPI step (undocumented DisplayConfig call the Settings app uses).
param([int]$W=1920,[int]$H=1080,[int]$Steps=2)
try{Set-DisplayResolution -Width $W -Height $H -Force|Out-Null}catch{"resolution: $_"}
Start-Sleep 3
Add-Type @'
using System;using System.Runtime.InteropServices;
public static class D{
 [StructLayout(LayoutKind.Sequential)]public struct H{public int type;public int size;public uint lo;public int hi;public uint id;}
 [StructLayout(LayoutKind.Sequential)]public struct G{public H h;public int min;public int cur;public int max;}
 [StructLayout(LayoutKind.Sequential)]public struct S{public H h;public int rel;}
 [DllImport("user32.dll")]public static extern int GetDisplayConfigBufferSizes(uint f,out uint p,out uint m);
 [DllImport("user32.dll")]public static extern int QueryDisplayConfig(uint f,ref uint p,byte[] pa,ref uint m,byte[] ma,IntPtr t);
 [DllImport("user32.dll")]public static extern int DisplayConfigGetDeviceInfo(ref G g);
 [DllImport("user32.dll")]public static extern int DisplayConfigSetDeviceInfo(ref S s);
 [DllImport("user32.dll")]public static extern uint GetDpiForSystem();
 public static string Set(int steps){uint p,m;GetDisplayConfigBufferSizes(2,out p,out m);var pa=new byte[p*72];var ma=new byte[m*64];int r=QueryDisplayConfig(2,ref p,pa,ref m,ma,IntPtr.Zero);if(r!=0||p==0)return "query "+r+" paths "+p;
  var g=new G();g.h.type=-3;g.h.size=32;g.h.lo=BitConverter.ToUInt32(pa,0);g.h.hi=BitConverter.ToInt32(pa,4);g.h.id=BitConverter.ToUInt32(pa,8);int a=DisplayConfigGetDeviceInfo(ref g);
  var s=new S();s.h=g.h;s.h.type=-4;s.h.size=24;s.rel=Math.Min(g.max,g.cur+steps);int b=DisplayConfigSetDeviceInfo(ref s);return "get "+a+" min "+g.min+" cur "+g.cur+" max "+g.max+" set "+s.rel+" -> "+b;}
}
'@
[D]::Set($Steps);Start-Sleep 3
