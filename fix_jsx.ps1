# Fix JSX syntax errors in MirrorScreen.tsx
$file = "c:\MITHAS GLOW\IONTIX\src\components\MirrorScreen.tsx"
$content = Get-Content $file -Raw

# Replace the problematic closing structure
$oldPattern = '            \)}\r\n\r\n          </div>\r\n\r\n        </>\r\n\r\n      \)}'
$newPattern = '            )}' + "`r`n" + '            </TabsContent>' + "`r`n" + "`r`n" + '            <TabsContent value="analysis">' + "`r`n" + '              <div className="bg-white rounded-xl shadow-lg p-6">' + "`r`n" + '                <div className="text-center">' + "`r`n" + '                  <h3 className="text-lg font-semibold text-gray-800 mb-2">🔬 Skin Analysis</h3>' + "`r`n" + '                  <p className="text-sm text-gray-600">Advanced skin analysis coming soon</p>' + "`r`n" + '                  <div className="mt-4 p-8 bg-gray-50 rounded-lg">' + "`r`n" + '                    <div className="text-gray-500 text-sm">' + "`r`n" + '                      <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-600" />' + "`r`n" + '                      <p>Skin analysis features will be available here</p>' + "`r`n" + '                      <p className="text-xs mt-2">Including skin tone detection, texture analysis, and personalized recommendations</p>' + "`r`n" + '                    </div>' + "`r`n" + '                  </div>' + "`r`n" + '                </div>' + "`r`n" + '              </div>' + "`r`n" + '            </TabsContent>' + "`r`n" + '          </Tabs>' + "`r`n" + '        </>' + "`r`n" + "`r`n" + '      )}'

$content = $content -replace [regex]::Escape($oldPattern), $newPattern
Set-Content $file $content

Write-Host "JSX syntax fixes applied"
