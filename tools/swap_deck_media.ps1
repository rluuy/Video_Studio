# Put a finished video into a PowerPoint deck that already holds an older version of it. Only when Ryan asks.
# Everything else in the deck stays as it is. The deck is copied to -Backup first.
#
#   powershell -ExecutionPolicy Bypass -File tools\swap_deck_media.ps1 -Deck deck.pptx -Shape "Clip P" `
#              -Video videos\x\out\deliver\x.mp4 -Poster videos\x\out\deliver\x_poster.png -Notes videos\x\out\deliver\notes.txt
#
# -Shape   the name of the video on its slide (Selection Pane in PowerPoint). It must be on exactly one slide
# -Notes   a text file that replaces the slide's speaker notes. Left out, the notes stay
# -Credit  a small line at the top right of the slide, such as "Voice: elevenlabs.io". Left out, nothing is added
# -Check   say what would be done and stop
#
# The deck must be closed. PowerPoint itself may be open with other files, and is left open then.
param(
  [Parameter(Mandatory = $true)][string]$Deck,
  [Parameter(Mandatory = $true)][string]$Shape,
  [Parameter(Mandatory = $true)][string]$Video,
  [string]$Poster = '',
  [string]$Notes = '',
  [string]$Credit = '',
  [string]$Backup = '',
  [switch]$Check
)
$ErrorActionPreference = 'Stop'
$Deck = (Resolve-Path $Deck).Path; $Video = (Resolve-Path $Video).Path
if ($Poster) { $Poster = (Resolve-Path $Poster).Path }
if ($Notes) { $Notes = (Resolve-Path $Notes).Path }
if (-not $Backup) { $Backup = Join-Path (Split-Path $Deck) 'backup' }
$lock = Join-Path (Split-Path $Deck) ('~$' + (Split-Path $Deck -Leaf))
if (Test-Path -LiteralPath $lock) { throw "The deck is open in PowerPoint. Close it first." }

$ppt = New-Object -ComObject PowerPoint.Application
$before = $ppt.Presentations.Count
$pres = $null
try {
  $pres = $ppt.Presentations.Open($Deck, $(if ($Check) { -1 } else { 0 }), 0, 0)
  $hits = @()
  foreach ($sl in $pres.Slides) { foreach ($sh in $sl.Shapes) { if ($sh.Name -eq $Shape) { $hits += , @($sl, $sh) } } }
  if ($hits.Count -ne 1) { throw ('{0} shapes are called "{1}", there must be exactly one' -f $hits.Count, $Shape) }
  $slide = $hits[0][0]; $old = $hits[0][1]
  if ($old.Type -ne 16) { throw ('"{0}" is not a video (shape type {1})' -f $Shape, $old.Type) }
  Write-Output ('slide {0} of {1}: "{2}", {3:N1} s now' -f $slide.SlideIndex, $pres.Slides.Count, $Shape, ($old.MediaFormat.Length / 1000))
  if ($Check) { Write-Output 'check only, nothing changed'; return }
  New-Item -ItemType Directory -Force $Backup | Out-Null
  $copy = Join-Path $Backup ('{0}_{1}.pptx' -f [IO.Path]::GetFileNameWithoutExtension($Deck), (Get-Date -Format 'yyyyMMdd-HHmmss'))
  Copy-Item -LiteralPath $Deck $copy
  Write-Output ('copy of the deck: {0}' -f $copy)
  $L = $old.Left; $T = $old.Top; $Wd = $old.Width; $Ht = $old.Height; $z = $old.ZOrderPosition
  $old.Delete()
  $v = $slide.Shapes.AddMediaObject2($Video, 0, -1, $L, $T, $Wd, $Ht)
  $v.Name = $Shape
  while ($v.ZOrderPosition -gt $z) { $v.ZOrder(3) }                        # back to the layer it had
  if ($Poster) { $v.MediaFormat.SetDisplayPictureFromFile($Poster) }
  $p = $v.AnimationSettings.PlaySettings
  $p.PlayOnEntry = -1; $p.HideWhileNotPlaying = 0; $p.RewindMovie = 0; $p.LoopUntilStopped = 0; $p.PauseAnimation = 0
  # PlayOnEntry alone leaves the video waiting for a click, so its play effect is set to start by itself
  $seq = $slide.TimeLine.MainSequence
  for ($k = 1; $k -le $seq.Count; $k++) { if ($seq.Item($k).Shape.Name -eq $Shape) { $seq.Item($k).Timing.TriggerType = 3 } }
  if ($Credit) {
    foreach ($sh in @($slide.Shapes)) { if ($sh.Name -eq 'VoiceCredit') { $sh.Delete() } }
    $tb = $slide.Shapes.AddTextbox(1, $pres.PageSetup.SlideWidth - 232, 6, 220, 20)
    $tb.Name = 'VoiceCredit'; $tb.TextFrame.WordWrap = 0; $tb.TextFrame.MarginRight = 0
    $tr = $tb.TextFrame.TextRange; $tr.Text = $Credit; $tr.Font.Size = 11; $tr.Font.Color.RGB = 0x8a + 0x94 * 256 + 0xa0 * 65536; $tr.ParagraphFormat.Alignment = 3
    $tb.Left = $pres.PageSetup.SlideWidth - 48 - $tb.Width
  }
  if ($Notes) { $slide.NotesPage.Shapes.Placeholders.Item(2).TextFrame.TextRange.Text = [IO.File]::ReadAllText($Notes, [Text.Encoding]::UTF8) }
  $pres.Save()
  Write-Output ('swapped in, {0:N1} s, deck saved' -f ($v.MediaFormat.Length / 1000))
} finally {
  if ($pres) { $pres.Close() }
  if ($before -eq 0 -and $ppt.Presentations.Count -eq 0) { $ppt.Quit() }    # only if it was not in use
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
