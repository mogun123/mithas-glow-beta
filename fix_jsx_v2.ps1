# Fix JSX syntax errors in MirrorScreen.tsx
$file = "c:\MITHAS GLOW\IONTIX\src\components\MirrorScreen.tsx"
$content = Get-Content $file -Raw

# Define the exact old and new content
$oldContent = "            )}
          </div>

        </>
      )}"

$newContent = "            )}
            </TabsContent>

            <TabsContent value=""analysis"">
              <div className=""bg-white rounded-xl shadow-lg p-6"">
                <div className=""text-center"">
                  <h3 className=""text-lg font-semibold text-gray-800 mb-2"">🔬 Skin Analysis</h3>
                  <p className=""text-sm text-gray-600"">Advanced skin analysis coming soon</p>
                  <div className=""mt-4 p-8 bg-gray-50 rounded-lg"">
                    <div className=""text-gray-500 text-sm"">
                      <Sparkles className=""w-8 h-8 mx-auto mb-2 text-purple-600"" />
                      <p>Skin analysis features will be available here</p>
                      <p className=""text-xs mt-2"">Including skin tone detection, texture analysis, and personalized recommendations</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}"

# Replace the content
$content = $content.Replace($oldContent, $newContent)
Set-Content $file $content

Write-Host "JSX syntax fixes applied successfully"
