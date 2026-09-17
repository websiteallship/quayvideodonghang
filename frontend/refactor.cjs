const fs = require('fs');
let content = fs.readFileSync('src/pages/HistoryPage.tsx', 'utf8');

const replacements = [
  // 587
  [`style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', padding: '0 4px' }}`, `className="flex justify-between items-center text-xs text-muted-foreground px-1"`],
  // 592
  [`style={{ color: 'var(--color-text-primary)' }}`, `className="text-foreground"`],
  // 605
  [`style={{\n            display: 'flex',\n            alignItems: 'center',\n            gap: '8px',\n            padding: '12px',\n            backgroundColor: 'rgba(239, 68, 68, 0.1)',\n            border: '1px solid var(--color-error)',\n            borderRadius: 'var(--radius-md)',\n            color: 'var(--color-error)',\n            fontSize: 'var(--text-xs)'\n          }}`, `className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive rounded-md text-destructive text-xs"`],
  // 617
  [`style={{ flexShrink: 0 }}`, `className="shrink-0"`],
  // 624
  [`style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', padding: 'var(--space-8)' }}`, `className="flex flex-col gap-2.5 items-center p-8"`],
  // 626
  [`style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}`, `className="text-xs text-muted-foreground"`],
  // 653
  [`style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}`, `className="flex flex-col gap-3"`],
  // 662
  [`style={{\n                position: 'relative',\n                display: 'flex',\n                flexDirection: 'column',\n                borderRadius: 'var(--radius-lg)',\n                border: isExpanded ? '1px solid var(--color-primary-500)' : '1px solid var(--color-border)',\n                backgroundColor: 'var(--color-bg-card)',\n                boxShadow: 'var(--shadow-sm)',\n                overflow: 'hidden',\n                transition: 'all 0.2s ease'\n              }}`, `className={\`relative flex flex-col rounded-lg border bg-card shadow-sm overflow-hidden transition-all duration-200 \${isExpanded ? 'border-primary' : 'border-border'}\`}`],
  // 676
  [`style={{\n                  position: 'absolute',\n                  left: 0,\n                  top: 0,\n                  bottom: 0,\n                  width: '4px',\n                  backgroundColor: isDongGoi ? 'var(--color-primary-500)' : '#f59e0b'\n                }}`, `className={\`absolute left-0 top-0 bottom-0 w-1 \${isDongGoi ? 'bg-primary' : 'bg-amber-500'}\`}`],
  // 688
  [`style={{\n                  padding: '14px 16px 14px 18px',\n                  display: 'flex',\n                  flexDirection: 'column',\n                  gap: '12px'\n                }}`, `className="p-3.5 pr-4 pl-4.5 flex flex-col gap-3"`],
  // 696
  [`style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}`, `className="flex justify-between items-center flex-wrap gap-2"`],
  // 697
  [`style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}`, `className="flex items-center gap-2 flex-wrap"`],
  // 699
  [`style={{\n                        fontFamily: 'var(--font-mono, monospace)',\n                        fontWeight: 700,\n                        fontSize: '15px',\n                        color: 'var(--color-text-primary)',\n                        letterSpacing: '0.5px'\n                      }}`, `className="font-mono font-bold text-[15px] text-foreground tracking-wide"`],
  // 716
  [`style={{\n                        background: 'var(--color-bg-elevated)',\n                        border: '1px solid var(--color-border)',\n                        borderRadius: 'var(--radius-sm)',\n                        cursor: 'pointer',\n                        padding: '3px 7px',\n                        color: copiedId === \`track-\${item.id}\` ? 'var(--color-success)' : 'var(--color-text-muted)',\n                        display: 'inline-flex',\n                        alignItems: 'center',\n                        gap: '4px',\n                        fontSize: '11px',\n                        transition: 'all 0.15s ease'\n                      }}`, `className={\`inline-flex items-center gap-1 px-1.5 py-0.5 border rounded-sm cursor-pointer text-[11px] transition-all \${copiedId === \\\`track-\\\${item.id}\\\` ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' : 'text-muted-foreground bg-muted hover:bg-accent border-border'}\`}`],
  // 733
  [`style={{ fontWeight: 600 }}`, `className="font-semibold"`],
  // 741
  [`style={{\n                        fontSize: '11px',\n                        padding: '2px 8px',\n                        borderRadius: 'var(--radius-sm)',\n                        backgroundColor: 'var(--color-bg-elevated)',\n                        border: '1px solid var(--color-border)',\n                        color: 'var(--color-text-secondary)',\n                        fontWeight: 600\n                      }}`, `className="text-[11px] px-2 py-0.5 rounded-sm bg-muted border border-border text-muted-foreground font-semibold"`],
  // 755
  [`style={{ display: 'flex', alignItems: 'center', gap: '6px' }}`, `className="flex items-center gap-1.5"`],
  // 770
  [`style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}`, `className="flex justify-between items-center flex-wrap gap-2.5"`],
  // 772
  [`style={{\n                      display: 'flex',\n                      alignItems: 'center',\n                      gap: '14px',\n                      flexWrap: 'wrap',\n                      fontSize: '12px',\n                      color: 'var(--color-text-secondary)'\n                    }}`, `className="flex items-center gap-3.5 flex-wrap text-xs text-muted-foreground"`],
  // 781
  [`style={{ display: 'flex', alignItems: 'center', gap: '4px' }}`, `className="flex items-center gap-1"`],
  // 782
  [`style={{ color: 'var(--color-text-muted)' }}`, `className="text-muted-foreground"`],
  // 807
  [`style={{ display: 'flex', alignItems: 'center', gap: '6px' }}`, `className="flex items-center gap-1.5"`],
  // 827
  [`style={{\n                        background: 'var(--color-bg-elevated)',\n                        border: '1px solid var(--color-border)',\n                        borderRadius: 'var(--radius-md)',\n                        cursor: 'pointer',\n                        padding: '6px',\n                        display: 'flex',\n                        alignItems: 'center',\n                        justifyContent: 'center',\n                        color: 'var(--color-text-secondary)',\n                        transition: 'all 0.2s ease'\n                      }}`, `className="flex items-center justify-center p-1.5 bg-muted border border-border rounded-md cursor-pointer text-muted-foreground transition-all hover:bg-accent"`],
  // 879
  [`style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 500 }}`, `className="flex items-center gap-1.5 text-xs text-foreground font-medium"`],
  // 881
  [`style={{ color: 'var(--color-accent-500)' }}`, `className="text-blue-500"`],
  // 939
  [`style={{ flexShrink: 0 }}`, `className="shrink-0"`],
  // 973
  [`style={{ fontStyle: 'italic', alignSelf: 'center' }}`, `className="italic self-center text-xs text-muted-foreground"`],
  // 988
  [`style={{\n            display: 'flex',\n            justifyContent: 'space-between',\n            alignItems: 'center',\n            paddingTop: '16px',\n            borderTop: '1px solid var(--color-border)'\n          }}`, `className="flex justify-between items-center pt-4 border-t border-border"`],
  // 998
  [`style={{ display: 'flex', alignItems: 'center', gap: '8px' }}`, `className="flex items-center gap-2"`],
  // 999
  [`style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}`, `className="text-xs text-muted-foreground"`],
  // 1006
  [`style={{ height: '36px', fontSize: 'var(--text-xs)', padding: '0 8px' }}`, `className="h-9 text-xs px-2 border border-border rounded-md bg-background"`],
  // 1014
  [`style={{ display: 'flex', alignItems: 'center', gap: '8px' }}`, `className="flex items-center gap-2"`],
  // 1024
  [`style={{ fontSize: 'var(--text-xs)', fontWeight: 'bold' }}`, `className="text-xs font-bold"`],
  // 1032
  [`style={{ minHeight: '36px', height: '36px', padding: '0 12px' }}`, `className="h-9 px-3"`],
  // 1048
  [`style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}`, `className="flex flex-col gap-3"`],
  // 1051
  [`style={{\n              display: 'flex',\n              justifyContent: 'space-between',\n              alignItems: 'center',\n              flexWrap: 'wrap',\n              gap: '8px'\n            }}`, `className="flex justify-between items-center flex-wrap gap-2"`],
  // 1061
  [`style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}`, `className="flex items-center gap-2.5 flex-wrap"`],
  // 1064
  [`style={{\n                  display: 'inline-flex',\n                  backgroundColor: 'rgba(255, 255, 255, 0.06)',\n                  borderRadius: 'var(--radius-md)',\n                  padding: '2px'\n                }}`, `className="inline-flex bg-muted rounded-md p-0.5"`],
  // 1075
  [`style={{\n                    display: 'flex',\n                    alignItems: 'center',\n                    gap: '6px',\n                    padding: '6px 12px',\n                    fontSize: 'var(--text-xs)',\n                    fontWeight: 600,\n                    border: 'none',\n                    cursor: 'pointer',\n                    transition: 'all 0.2s',\n                    borderRadius: '4px',\n                    backgroundColor: videoMode === 'native' ? 'var(--color-bg-elevated)' : 'transparent',\n                    color: videoMode === 'native' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',\n                    boxShadow: videoMode === 'native' ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',\n                  }}`, `className={\`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-all \${videoMode === 'native' ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground'}\`}`],
  // 1097
  [`style={{\n                    display: 'flex',\n                    alignItems: 'center',\n                    gap: '6px',\n                    padding: '6px 12px',\n                    fontSize: 'var(--text-xs)',\n                    fontWeight: 600,\n                    border: 'none',\n                    cursor: 'pointer',\n                    transition: 'all 0.2s',\n                    borderRadius: '4px',\n                    backgroundColor: videoMode === 'iframe' ? 'var(--color-bg-elevated)' : 'transparent',\n                    color: videoMode === 'iframe' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',\n                    boxShadow: videoMode === 'iframe' ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',\n                  }}`, `className={\`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-all \${videoMode === 'iframe' ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground'}\`}`],
  // 1119
  [`style={{\n                  display: 'inline-flex',\n                  backgroundColor: 'rgba(255, 255, 255, 0.06)',\n                  borderRadius: 'var(--radius-md)',\n                  padding: '2px'\n                }}`, `className="inline-flex bg-muted rounded-md p-0.5"`],
  // 1130
  [`style={{\n                    display: 'flex',\n                    alignItems: 'center',\n                    gap: '6px',\n                    padding: '6px 12px',\n                    fontSize: 'var(--text-xs)',\n                    fontWeight: 600,\n                    border: 'none',\n                    cursor: 'pointer',\n                    transition: 'all 0.2s',\n                    borderRadius: '4px',\n                    backgroundColor: videoOrientation === 'portrait' ? 'var(--color-bg-elevated)' : 'transparent',\n                    color: videoOrientation === 'portrait' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',\n                    boxShadow: videoOrientation === 'portrait' ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',\n                  }}`, `className={\`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-all \${videoOrientation === 'portrait' ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground'}\`}`],
  // 1152
  [`style={{\n                    display: 'flex',\n                    alignItems: 'center',\n                    gap: '6px',\n                    padding: '6px 12px',\n                    fontSize: 'var(--text-xs)',\n                    fontWeight: 600,\n                    border: 'none',\n                    cursor: 'pointer',\n                    transition: 'all 0.2s',\n                    borderRadius: '4px',\n                    backgroundColor: videoOrientation === 'landscape' ? 'var(--color-bg-elevated)' : 'transparent',\n                    color: videoOrientation === 'landscape' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',\n                    boxShadow: videoOrientation === 'landscape' ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',\n                  }}`, `className={\`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded cursor-pointer transition-all \${videoOrientation === 'landscape' ? 'bg-background text-foreground shadow-sm' : 'bg-transparent text-muted-foreground'}\`}`],
  // 1178
  [`style={{\n                  display: 'inline-flex',\n                  alignItems: 'center',\n                  gap: '6px',\n                  fontSize: 'var(--text-xs)',\n                  fontWeight: 600,\n                  color: 'var(--color-primary-500)',\n                  textDecoration: 'none',\n                  padding: '6px 12px',\n                  borderRadius: 'var(--radius-md)',\n                  backgroundColor: 'rgba(59, 130, 246, 0.1)',\n                  transition: 'background-color 0.2s'\n                }}`, `className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary px-3 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 transition-colors"`],
  // 1194
  [`style={{ height: '320px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}`, `className="h-[320px] flex flex-col items-center justify-center gap-2"`],
  // 1196
  [`style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}`, `className="text-xs text-muted-foreground"`],
  // 1204
  [`style={{\n                padding: '16px',\n                borderRadius: 'var(--radius-md)',\n                backgroundColor: 'rgba(239, 68, 68, 0.1)',\n                color: 'var(--color-danger-500)',\n                display: 'flex',\n                flexDirection: 'column',\n                alignItems: 'center',\n                gap: '8px',\n                textAlign: 'center'\n              }}`, `className="p-4 rounded-md bg-destructive/10 text-destructive flex flex-col items-center gap-2 text-center"`],
  // 1215
  [`style={{ margin: '0 auto' }}`, `className="mx-auto"`],
  // 1216
  [`style={{ fontSize: 'var(--text-sm)', fontWeight: 'bold' }}`, `className="text-sm font-bold"`],
  // 1217
  [`style={{ fontSize: 'var(--text-xs)' }}`, `className="text-xs"`],
  // 1224
  [`style={{\n                position: 'relative',\n                width: '100%',\n                aspectRatio: videoOrientation === 'portrait' ? '9/16' : '16/9',\n                backgroundColor: '#000',\n                borderRadius: 'var(--radius-md)',\n                overflow: 'hidden',\n                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'\n              }}`, `className={\`relative w-full bg-black rounded-md overflow-hidden shadow-lg \${videoOrientation === 'portrait' ? 'aspect-[9/16]' : 'aspect-video'}\`}`],
  // 1245
  [`style={{\n                    width: '100%',\n                    height: '100%',\n                    objectFit: 'contain',\n                  }}`, `className="w-full h-full object-contain"`],
  // 1262
  [`style={{ width: '100%', height: '100%', border: 'none' }}`, `className="w-full h-full border-none"`],
  // 1272
  [`style={{\n                display: 'flex',\n                justifyContent: 'space-between',\n                alignItems: 'center',\n                paddingTop: '12px',\n                borderTop: '1px solid rgba(255,255,255,0.1)'\n              }}`, `className="flex justify-between items-center pt-3 border-t border-border"`],
  // 1305
  [`style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', alignItems: 'center' }}`, `className="flex flex-col gap-3 items-center"`],
  // 1307
  [`style={{\n              position: 'relative',\n              width: '100%',\n              height: '240px',\n              backgroundColor: '#000',\n              borderRadius: 'var(--radius-lg)',\n              overflow: 'hidden'\n            }}`, `className="relative w-full h-[240px] bg-black rounded-lg overflow-hidden"`],
  // 1324
  [`style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', textAlign: 'center' }}`, `className="text-xs text-muted-foreground text-center"`],
];

for (let i = 0; i < replacements.length; i++) {
  const [oldStr, newStr] = replacements[i];
  if (content.includes(oldStr)) {
    content = content.replace(oldStr, newStr);
  } else {
    // Try to normalize whitespace to match format
    const normalizedContent = content.replace(/\s+/g, ' ');
    const normalizedOldStr = oldStr.replace(/\s+/g, ' ');
    if (normalizedContent.includes(normalizedOldStr)) {
       // Since it's a simple replace, we can use regex
       const regexStr = oldStr.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&').replace(/\\\s+/g, '\\s+');
       const regex = new RegExp(regexStr, 'g');
       if(regex.test(content)) {
           content = content.replace(regex, newStr);
       } else {
           console.log('NOT FOUND (regex failed): ', i);
       }
    } else {
       console.log('NOT FOUND: ', i);
    }
  }
}

// Additional dynamic replacements for the ones that share the exact same style definition
content = content.split(`style={{ display: 'flex', alignItems: 'center', gap: '4px' }}`).join(`className="flex items-center gap-1"`);
content = content.split(`style={{ color: 'var(--color-text-muted)' }}`).join(`className="text-muted-foreground"`);

// Let's also fix the listStyle one from line 605 in previous context
content = content.replace(
  `style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}`,
  `className="list-none p-0 m-0 flex flex-col gap-3"`
);

fs.writeFileSync('src/pages/HistoryPage.tsx', content, 'utf8');
console.log('Done');
