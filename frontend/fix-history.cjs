const fs = require('fs');
const file = 'd:/TOOL AI/TOOL_QUAYVIDEO/frontend/src/pages/HistoryPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. RefreshCw
content = content.replace(
  /leftIcon={<RefreshCw size={14} className={isLoading \? 'animate-spin' : ''} \/>}\s+style={{ minHeight: '40px', height: '40px' }}\s*>\s*Làm mới/g,
  `style={{ minHeight: '40px', height: '40px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Làm mới`
);

// 2. Button Scan size
content = content.replace(
  /variant="secondary"\s+size="large"\s+onClick={handleOpenScanner}/g,
  `variant="secondary"
          size="lg"
          onClick={handleOpenScanner}`
);

// 3. Button Filter variant & size
content = content.replace(
  /variant={showFilters \|\| activeFiltersCount > 0 \? 'primary' : 'secondary'}\s+size="large"/g,
  `variant={showFilters || activeFiltersCount > 0 ? 'default' : 'secondary'}
          size="lg"`
);

// 4. Button Reset Filter leftIcon
content = content.replace(
  /leftIcon={<RotateCcw size={14} \/>}\s+style={{ minHeight: '36px', height: '36px', padding: '0 12px', fontSize: 'var\(--text-xs\)' }}\s*>\s*Đặt lại bộ lọc/g,
  `style={{ minHeight: '36px', height: '36px', padding: '0 12px', fontSize: 'var(--text-xs)' }}
            >
              <RotateCcw size={14} />
              Đặt lại bộ lọc`
);

// 5. Badge status -> variant + inline label
content = content.replace(
  /<Badge status={item\.trang_thai} \/>/g,
  `<Badge variant={item.trang_thai === 'da_upload' ? 'default' : item.trang_thai === 'loi' ? 'destructive' : item.trang_thai === 'dang_upload' ? 'secondary' : 'outline'}>
                      {item.trang_thai === 'da_upload' ? 'Đã lưu' : item.trang_thai === 'loi' ? 'Lỗi' : item.trang_thai === 'dang_upload' ? 'Đang tải' : 'Chờ tải'}
                    </Badge>`
);

// 6. Xem video Button leftIcon
content = content.replace(
  /variant="primary"\s+size="default"\s+onClick=\{\(e\) => \{\s+e\.stopPropagation\(\);\s+void handleOpenVideo\(item\);\s+\}\}\s+leftIcon=\{<Play size=\{13\} fill="currentColor" \/>\}\s+className="btn-sm"\s*>\s*Xem video/g,
  `variant="default"
                        size="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleOpenVideo(item);
                        }}
                        className="btn-sm"
                      >
                        <Play size={13} fill="currentColor" />
                        Xem video`
);

// 7. Tải video Button leftIcon
content = content.replace(
  /leftIcon=\{<Download size=\{14\} \/>\}\s+className="btn-md"\s*>\s*Tải video/g,
  `className="btn-md"
                        >
                          <Download size={14} />
                          Tải video`
);

// 8. Phát video Drive Button leftIcon & variant
content = content.replace(
  /variant="primary"\s+size="default"\s+onClick=\{\(e\) => \{\s+e\.stopPropagation\(\);\s+void handleOpenVideo\(item\);\s+\}\}\s+leftIcon=\{<Play size=\{14\} fill="currentColor" \/>\}\s+className="btn-md"\s*>\s*Phát video Drive/g,
  `variant="default"
                          size="default"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenVideo(item);
                          }}
                          className="btn-md"
                        >
                          <Play size={14} fill="currentColor" />
                          Phát video Drive`
);

// 9. Pagination Trước button leftIcon
content = content.replace(
  /leftIcon=\{<ChevronLeft size=\{16\} \/>\}\s+style=\{\{ minHeight: '36px', height: '36px', padding: '0 12px' \}\}\s*>\s*Trước/g,
  `style={{ minHeight: '36px', height: '36px', padding: '0 12px' }}
            >
              <ChevronLeft size={16} />
              Trước`
);

// 10. Pagination Sau button rightIcon
content = content.replace(
  /rightIcon=\{<ChevronRight size=\{16\} \/>\}\s+style=\{\{ minHeight: '36px', height: '36px', padding: '0 12px' \}\}\s*>\s*Sau/g,
  `style={{ minHeight: '36px', height: '36px', padding: '0 12px' }}
            >
              Sau
              <ChevronRight size={16} />`
);

// 11. Scanner modal button size
content = content.replace(
  /size="large" onClick={handleCloseScanner}/g,
  `size="lg" onClick={handleCloseScanner}`
);

fs.writeFileSync(file, content);
