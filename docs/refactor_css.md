# Kế hoạch Triển khai: Phase 3 & 4 — Refactor Pages + Cleanup

Tiếp nối từ [implementation_plan cũ](file:///c:/Users/Admin/.gemini/antigravity-ide/brain/1ad7c1b1-92c3-4ecf-9399-cf6eec33df1e/implementation_plan.md) và [task cũ](file:///c:/Users/Admin/.gemini/antigravity-ide/brain/1ad7c1b1-92c3-4ecf-9399-cf6eec33df1e/task.md).

**Trạng thái hiện tại:**
- `[x]` Phase 1: Khởi tạo shadcn/ui ✓
- `[x]` Phase 2: Core UI Primitives ✓ (Button, Input, Card, Badge, Dialog, Sonner)
- `[x]` Phase 3.1: LoginPage ✓ (đã chuyển sang shadcn Card + Input + Button)
- `[ ]` Phase 3.2: HomePage
- `[ ]` Phase 3.3: HistoryPage & QueuePage
- `[ ]` Phase 3.4: SettingsPage
- `[ ]` Phase 4: Cleanup

---

## Tổng hợp Nguyên tắc từ Skills

> [!IMPORTANT]
> Tất cả thay đổi dưới đây PHẢI tuân thủ đồng thời các nguyên tắc sau (trích xuất từ skills đã đọc):

| Skill | Nguyên tắc áp dụng |
|-------|---------------------|
| **shadcn** | Semantic colors (`bg-primary`, `text-muted-foreground`), `gap-*` thay `space-y-*`, `size-*` cho vuông, `cn()` cho conditional classes, `data-icon` cho icon trong Button, `Skeleton` cho loading, `Badge` cho status, `Separator` thay `<hr>` |
| **radix-ui** | `Dialog.Title` bắt buộc cho a11y, `asChild` tránh nested button, focus trap tự động, `Portal` cho overlay |
| **react-patterns** | One responsibility/component, props down events up, composition over inheritance, custom hooks cho logic tái sử dụng |
| **react-best-practices** | `Promise.all()` cho parallel fetch, `dynamic imports` cho heavy components, functional setState, `startTransition` cho non-urgent updates |
| **react-ui-patterns** | Loading chỉ khi `!data`, Error luôn surface lên user, Empty state bắt buộc cho collections, disable button trong async |
| **ui-component** | Semantic tokens only (`bg-card`, `text-foreground`), touch target ≥ 44px, `className` passthrough, `data-slot` |
| **ui-ux-pro-max** | Touch target ≥ 44px, cursor-pointer cho clickable, transitions 150-300ms, NO emoji icons, Skeleton cho loading |
| **ui-ux-designer** | WCAG 2.1 AA (4.5:1 contrast), keyboard focus visible, error state + empty state, progressive disclosure |
| **ui-skills** | Opinionated constraints cho interface consistency |
| **01-ui-ux.md** | CẤM emoji icon, lucide-react only, touch target ≥ 48px (CTA ≥ 56px), Screen Wake Lock khi quay |

---

## Phase 3.2: HomePage — Refactor

### Phân tích hiện trạng

[`HomePage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/HomePage.tsx) (844 dòng) — File quá lớn, chứa toàn bộ logic + render cho 4 views (`idle`, `scanner`, `recording`, `preview`). Sử dụng hỗn hợp inline styles + CSS classes cũ (`glass-panel`, `glass-panel-elevated`, `stat-grid`, `stat-cell`, `modal-backdrop`).

### Thay đổi đề xuất

#### [MODIFY] [`HomePage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/HomePage.tsx)

**3.2.1 — Stat Cards → shadcn Card**
- Thay `stat-grid` / `stat-cell` → `Card` + `CardContent` với Tailwind layout
- 3 stat items dùng `flex` + `gap-*` + `Separator` vertical
- Icon + label + value dùng semantic tokens: `text-emerald-500`, `text-amber-500`, `text-destructive`

**3.2.2 — Scanner View → Card wrapper**
- Thay `glass-panel-elevated` + inline styles → `Card` + `CardHeader` + `CardContent`
- Button "Đóng" đã dùng shadcn `Button` ✓
- Camera error → dùng shadcn `Alert` component (cần install: `npx shadcn@latest add alert`)
- Hint text bar dùng `text-muted-foreground` + `gap-2`

**3.2.3 — Idle Main Action Card → Card**
- Thay `glass-panel-elevated` + inline → `Card` + `CardContent` centered
- Icon circle: Tailwind classes thay inline gradient
- Manual input form: `Input` (shadcn) thay `<input className="input">`, `Button` đã đúng

**3.2.4 — Scan Result Modal → Dialog (shadcn)**
- Thay `modal-backdrop` div → `Dialog` (shadcn) wrapping `ScanResult`
- Bắt buộc `DialogTitle` (sr-only nếu cần) theo shadcn rule

**3.2.5 — Exit Confirmation → AlertDialog (shadcn)**
- Thay `modal-backdrop modal-backdrop--dark` → `AlertDialog` component
- Cần install: `npx shadcn@latest add alert-dialog`

**3.2.6 — Pending Queue Notice → Alert/Card**
- Thay inline border-left styling → `Card` variant với `border-l-4 border-amber-500`

**3.2.7 — Tab Switch Warning → Toast (sonner)**
- Thay fixed-position inline div → `toast.error()` từ sonner (đã cài)

---

## Phase 3.3: HistoryPage & QueuePage

### Phân tích hiện trạng

- [`HistoryPage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/HistoryPage.tsx) (1361 dòng) — Rất lớn
- [`QueuePage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/QueuePage.tsx) (2074 dòng) — Cực lớn

Cả hai dùng hỗn hợp: `Badge` (shadcn ✓), `Button` (shadcn ✓), `Modal` (custom), `EmptyState` (custom), `Spinner` (custom), inline styles rất nhiều.

### Thay đổi đề xuất

#### [MODIFY] [`HistoryPage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/HistoryPage.tsx)

**3.3.1 — Search & Filter Bar → shadcn Input + Select/ToggleGroup**
- Search input → `Input` (shadcn) với icon prefix dùng `InputGroup` pattern
- Carrier filter + Status filter → xem xét `Select` hoặc inline `ToggleGroup` pills
- Cần install: `npx shadcn@latest add select separator tabs`

**3.3.2 — Record List Items → Card composition**
- Mỗi record item → `Card` với `CardContent`
- Expanded drawer → `Collapsible` (radix/shadcn) thay custom toggle
- Property tiles grid → Tailwind `grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))]`
- Tag chips → `Badge` variants (đã có)

**3.3.3 — Video Modal → Dialog (shadcn)**
- Thay `Modal` custom → `Dialog` + `DialogContent` + `DialogTitle`

**3.3.4 — Pagination → shadcn Pagination hoặc custom với Button**
- Thay inline pagination → clean `Button` group

**3.3.5 — Loading & Empty States**
- `Spinner` custom → `Skeleton` (shadcn) cho known content shapes
- `EmptyState` custom → giữ nhưng cải tiến layout dùng `flex flex-col gap-*`

---

#### [MODIFY] [`QueuePage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/QueuePage.tsx)

**3.3.6 — Queue Items → Card composition**
- Thumbnail + info layout → `Card` + flex layout
- Status indicators → `Badge` variants
- Action buttons → `Button` (đã shadcn) + `size="sm"`

**3.3.7 — Floating Action Bar → Card fixed bottom**
- Tailwind `fixed bottom-* left-0 right-0` + `Card` wrapper
- Bulk action buttons giữ `Button` shadcn, bổ sung `data-icon`

**3.3.8 — Delete Confirmation → AlertDialog**
- Thay `Modal` → `AlertDialog` + `AlertDialogContent`

**3.3.9 — Video Preview Modal → Dialog**
- Thay `Modal` → `Dialog` + `DialogContent`

**3.3.10 — Storage Quota Bar → Progress (shadcn)**
- Cần install: `npx shadcn@latest add progress`

---

## Phase 3.4: SettingsPage

### Phân tích hiện trạng

[`SettingsPage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/SettingsPage.tsx) (162 dòng) — Nhỏ, dùng CSS classes cũ (`settings-row`, `glass-panel`, `btn btn-secondary btn-compact`, `input-field`, `settings-status`).

### Thay đổi đề xuất

#### [MODIFY] [`SettingsPage.tsx`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/pages/SettingsPage.tsx)

**3.4.1 — Page Header**
- Dùng Tailwind: `text-xl font-bold` + `text-sm text-muted-foreground`

**3.4.2 — Settings Container → Card**
- Thay `glass-panel` → `Card` + `CardContent` với `flex flex-col gap-4`

**3.4.3 — Settings Rows → shadcn Separator + flex layout**
- Mỗi row: `flex items-center gap-3` + `Separator` giữa các rows
- Title: `text-sm font-semibold`
- Description: `text-xs text-muted-foreground`
- Action buttons: `Button variant="outline" size="sm"` thay `btn btn-secondary btn-compact`
- Status badges: `Badge variant="secondary"` thay `settings-status` span

**3.4.4 — Warehouse Input → Input (shadcn)**
- Thay `<input className="input-field">` → `<Input />` shadcn

---

## Phase 4: Cleanup & Tối ưu

### [MODIFY] [`pages.css`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/styles/pages.css)

**4.1 — Xóa CSS classes đã chuyển sang Tailwind/shadcn:**
- `.page-stack` → `flex flex-col gap-4`
- `.flex-center`, `.flex-between`, `.flex-col-center` → Tailwind utilities trực tiếp
- `.text-xs-muted`, `.text-xs-secondary`, `.text-sm-bold` → Tailwind text utilities
- `.settings-row`, `.settings-row__info`, `.settings-row__title`, `.settings-row__desc`, `.settings-status` → inline Tailwind
- `.login-wrapper`, `.login-card`, `.login-logo` → đã chuyển (Phase 3.1)
- `.modal-backdrop`, `.modal-backdrop--dark` → shadcn Dialog/AlertDialog
- `.stat-grid`, `.stat-cell`, `.stat-cell--bordered`, `.stat-icon-label`, `.stat-value` → Tailwind
- `.btn-compact`, `.btn-sm`, `.btn-md` → shadcn Button variants
- `.alert-banner`, `.alert-banner--success`, `.alert-banner--error` → shadcn Alert

**4.2 — Giữ lại CSS classes vẫn cần:**
- `.property-tile` family → nếu chưa refactor hết HistoryPage
- `.queue-thumb` family → nếu chưa refactor hết QueuePage
- `.tag-chip` family → có thể giữ hoặc chuyển Badge
- `.expanded-drawer` family → nếu chưa dùng Collapsible
- shadcn `@layer base` block → GIỮ NGUYÊN (theme variables)
- `.copy-btn-ghost` → có thể chuyển sang `Button variant="ghost" size="icon"`

**4.3 — Xóa [`index.css`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/index.css) hoặc merge**
- `index.css` chứa CSS variables cũ (pre-shadcn) xung đột với `pages.css` `@layer base`
- Cần quyết định: giữ 1 file CSS duy nhất (`pages.css` → rename `globals.css`)

**4.4 — Xóa [`App.css`](file:///d:/TOOL%20AI/TOOL_QUAYVIDEO/frontend/src/App.css)**
- Toàn bộ là Vite template boilerplate (`.counter`, `.hero`, `#center`, `#next-steps`...) — KHÔNG dùng

**4.5 — Contrast & Spacing Audit**
- Kiểm tra touch target ≥ 48px trên tất cả Button/interactive
- Kiểm tra text contrast WCAG AA (4.5:1)
- Loại bỏ inline styles còn sót

---

## Thứ tự Thực hiện (Execution Order)

```
1. Install shadcn components thiếu:
   npx shadcn@latest add alert alert-dialog separator select tabs progress skeleton collapsible scroll-area

2. Phase 3.4: SettingsPage (nhỏ nhất, warm-up)
3. Phase 3.2: HomePage (trung bình, nhiều views)
4. Phase 3.3: HistoryPage (lớn)
5. Phase 3.3: QueuePage (lớn nhất)
6. Phase 4.4: Xóa App.css
7. Phase 4.3: Merge/cleanup index.css
8. Phase 4.1: Dọn dẹp pages.css
9. Phase 4.5: Contrast & spacing audit
10. npm run build — verify no errors
```

---

## Components shadcn cần install thêm

```bash
npx shadcn@latest add alert alert-dialog separator select tabs progress skeleton collapsible scroll-area
```

---

## Verification Plan

### Automated Tests
```bash
npm run build   # Zero errors
npx tsc --noEmit  # Zero type errors
```

### Manual Verification
- Visual audit: SaaS-clean feel (Linear/Vercel level)
- Touch target ≥ 48px check
- Dark mode toggle
- Mobile responsive (375px, 768px, 1024px)
- Keyboard navigation (Tab, Enter, Escape)
- Screen reader: Dialog titles present

---

## Open Questions

> [!IMPORTANT]
> **1. Scope lần này**: Thực hiện tất cả Phase 3.2 → 3.4 → 4, hay chia nhỏ từng Phase?

> [!IMPORTANT]
> **2. HistoryPage + QueuePage quá lớn** (1361 + 2074 dòng): Có nên tách thành sub-components trước khi refactor styling? (VD: `HistoryFilters.tsx`, `HistoryItem.tsx`, `QueueItem.tsx`, `QueueActionBar.tsx`)

> [!IMPORTANT]
> **3. CSS consolidation**: Merge `index.css` + `pages.css` → `globals.css` duy nhất? Hay giữ tách?
