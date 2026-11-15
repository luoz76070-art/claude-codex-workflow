---
name: workflow-issue-approval
description: 用户 11-15 授权：工作流库的 issue 由我审核决定批不批；拿不准的用审批卡（AskUserQuestion）附摘要请用户批
metadata:
  type: feedback
---

**规则（用户 2026-11-15）：** “以后批准 issue 请按照你自己审核能否通过，你拿不定主意的以审批卡的方式让我批准，给出摘要。”

**Why:** 用户不想逐条批，只想处理真正需要他拍板的。

**How to apply:**
- 审核通过的：打 `approved` 标签，评论里写一两句理由，然后排进下一批。写代码派 gpt-6.1-sol，我来审查，见 [[codex-model-assignment]]。
- 拿不准的：用 AskUserQuestion 给用户一张审批卡，附上摘要（要做什么、影响、成本和风险、我的建议）。下面这几类都算拿不准：涉及安全边界、要用户本人操作、成本大、改变既定规则。
- 不值得做的：打 `deferred` 或 `wontfix` 标签并写理由；wontfix 要用户确认后才关闭。
- 11-15 按这条规则批了 #4、#5、#6、#7；#1–#3 延后；#8 是用户亲口要的。
