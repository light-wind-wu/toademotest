# GitHub Daily Changelog

## 2026-06-29

### Commit Summary

| Commit | Author | Time | Message |
|---|---|---|---|
| `HEAD` | Codex / jiangxiaoming | 2026-06-29 | Update TOA allocation flow and PRIZM 4 programme experience |

### Changed Files

#### `HEAD`

- `app/projects-v2/page.tsx`
- `components/layout/ia-rail.tsx`
- `components/ui/eligibility-read.tsx`
- `components/ui/month-year-picker.tsx`
- `docs/assets/eligibility-drawer-after-prizm4.svg`
- `docs/assets/eligibility-drawer-after.png`
- `docs/assets/eligibility-drawer-before.png`
- `docs/assets/intake_project_allocation_lofi_v7.html`
- `docs/assets/programme-details-current.png`
- `docs/assets/programme-details-prizm4-proposed.svg`
- `docs/assets/sidebar-workstream-after.png`
- `docs/github-daily-changelog.md`
- `docs/programme-details-prizm4-audit.md`
- `lib/types.ts`
- `views/programme-form.tsx`
- `views/projects-v2.tsx`
- `views/projects.tsx`

### Generated Summary

#### `HEAD`

English:
- Reworked Programme creation Step 2 into an intake-first allocation accordion.
- Added PRIZM 4 aligned month picker behavior, including portal-based popover positioning to avoid clipping and overlap.
- Added right-side Sheet workflows for project allocation management and internship-period editing.
- Added placement counts to project-intake attachments so each assigned intake can carry its own placement quantity.
- Added Step 2 gating so Review only becomes available after every intake has complete application and internship dates.
- Reworked Projects into review workspace tabs: Pending Review, Project Pool, Allocated Projects, and Archived.
- Routed `/projects-v2` to the consolidated Projects view and removed the obsolete v2 view file.
- Tightened PRIZM 4 typography, radius, and semantic-token usage in the IA rail and eligibility read surfaces.
- Added audit/reference documentation and visual assets for the PRIZM 4 programme details and intake allocation work.

中文：
- 将创建 Programme 的第 2 步重构为以 intake 为中心的分配手风琴。
- 新增符合 PRIZM 4 的月份选择器行为，并通过 portal 定位修复弹层被裁切或遮盖的问题。
- 将项目分配管理和项目实习周期编辑改为右侧 Sheet 工作流。
- 在 project-intake attachment 中加入 placement 数量，支持每个 intake 单独设置分配名额。
- 为第 2 步增加进入 Review 的门禁：每个 intake 必须填写完整申请日期和实习月份。
- 将 Projects 页面整理为 Pending Review、Project Pool、Allocated Projects、Archived 四个工作区。
- 将 `/projects-v2` 路由到合并后的 Projects 视图，并删除旧的 v2 view 文件。
- 对 IA rail 和 eligibility read 区域做 PRIZM 4 字体、圆角和语义 token 对齐。
- 新增 PRIZM 4 Programme Details 与 Intake Allocation 的审计说明和视觉参考资产。

Diff stats:
- Tracked diff before staging: 7 files changed, 1009 insertions(+), 1957 deletions(-)
- Additional new files planned for staging: 10 files

Validation:
- `pnpm exec tsc --noEmit` passes.
- `/programmes/new` returns `200 OK`.
- `/projects` returns `200 OK`.

Excluded from staging:
- `.pnpm-store/` local package cache.
- `views/projects-bak.tsx` local backup file.
