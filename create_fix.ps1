@'
# Fix JSX syntax errors in MirrorScreen.tsx
$file = "c:\MITHAS GLOW\IONTIX\src\components\MirrorScreen.tsx"
$content = Get-Content $file -Raw

$oldContent = "            )}
          </div>

        </>
      )}"

$newContent = "            )}
            </TabsContent>

            <TabsContent value=""analysis"">
              <div className=""bg-white rounded-xl shadow-lg p-6"">
                <div className=""text-center"">
                  <h3 className=""text-lg font-semibold text-gray-800 mb-2"">Skin Analysis</h3>
                  <p className=""text-sm text-gray-600"">Advanced skin analysis coming soon</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}"

$content = $content.Replace($oldContent, $newContent)
Set-Content $file $content

Write-Host "JSX syntax fixes applied"
'@ | Out-File -FilePath 'c:\MITHAS GLOW\IONTIX\fix_jsx_v3.ps1' -Encoding UTF8
