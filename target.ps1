# Full-screen window that logs the input Windows really delivers.
param([string]$Log)
Add-Type -AssemblyName System.Windows.Forms,System.Drawing
Add-Type -Name P -Namespace U -MemberDefinition '[DllImport("user32.dll")] public static extern bool SetProcessDPIAware();'
[U.P]::SetProcessDPIAware()|Out-Null
$f=New-Object Windows.Forms.Form;$f.FormBorderStyle='None';$f.WindowState='Maximized';$f.TopMost=$true;$f.KeyPreview=$true;$f.Text='CONNECT-ZIEL'
$t=New-Object Windows.Forms.TextBox;$t.Dock='Bottom';$f.Controls.Add($t)
$sw=New-Object IO.StreamWriter((New-Object IO.FileStream($Log,'Append','Write','ReadWrite')));$sw.AutoFlush=$true
function w($s){$sw.WriteLine($s)}
$f.add_MouseDown({$p=[Windows.Forms.Cursor]::Position;w "down $($_.Button) $($p.X) $($p.Y) clicks=$($_.Clicks)"})
$f.add_MouseUp({$p=[Windows.Forms.Cursor]::Position;w "up $($_.Button) $($p.X) $($p.Y)"})
$f.add_MouseWheel({w "wheel $($_.Delta)"})
$f.add_KeyDown({w "keydown $($_.KeyCode)"});$f.add_KeyUp({w "keyup $($_.KeyCode)"})
$t.add_TextChanged({w "text $($t.Text)"})
$f.add_Shown({$b=[Windows.Forms.Screen]::PrimaryScreen.Bounds;w "ready $($b.Width) $($b.Height)";$f.Activate();$t.Focus()})
[Windows.Forms.Application]::Run($f)
