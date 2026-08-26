# Applicant Lifecycle — Gmail Email & In-app Notification Specification

> 用途：Applicant Portal 可用性测试（UT）与前端场景配置  
> 参考：`Gmail.jpg` 中的 DSTA Internship Officer 邮件结构  
> 默认示例：Jenny Aw · University Internship 2027 · AI Threat Detection  
> 文案语言：Applicant-facing English；配置说明为中文

## 1. 目标

这份文档定义 Applicant 从申请提交到实习完成的完整通知生命周期，包括：

- Gmail 邮件主题、正文与 CTA
- Portal 内的 Notification 标题、摘要与目标页面
- 触发条件、状态变化和通知优先级
- 无须行动、需要行动、截止日期提醒与流程结束场景

推荐原则：

- **Email 是主要外部触达渠道**：把不常驻 Portal 的 Applicant 带回系统。
- **In-app Notification 是站内记录**：保留状态变化，并直接链接到对应页面。
- **需要行动、带截止日期或最终结果的事件使用 Email + In-app Notification。**
- **普通进度变化使用较低强度提醒，避免制造通知疲劳。**
- 状态名称统一使用 sentence case，例如 `Submitted`、`Under review`、`Offer received`。

## 2. 通用变量

| Variable | Example |
|---|---|
| `{{applicantFirstName}}` | Jenny |
| `{{applicantFullName}}` | Jenny Aw |
| `{{programmeName}}` | University Internship 2027 |
| `{{projectName}}` | AI Threat Detection |
| `{{applicationId}}` | APP-UI27-00418 |
| `{{interviewDateTime}}` | 27 Aug 2026, 2:30 PM SGT |
| `{{responseDeadline}}` | 4 Sep 2026, 11:59 PM SGT |
| `{{internshipStartDate}}` | 5 Jan 2027 |
| `{{internshipEndDate}}` | 30 Jun 2027 |
| `{{mentorName}}` | Aisha Rahman |
| `{{officerName}}` | Davina Tan |
| `{{portalUrl}}` | Applicant Portal deep link |

## 3. Gmail 邮件通用结构

每封邮件沿用参考图中的层级：

1. Gmail subject
2. Sender：`{{officerName}} (DSTA)` 或 `DSTA Talent Acquisition`
3. Greeting：`Dear {{applicantFirstName}},`
4. Programme / project context
5. 一句明确说明发生了什么
6. 下一步、截止日期或无需行动说明
7. 灰色 Action panel（仅在需要行动或有可查看文件时出现）
8. 单一主 CTA
9. `Warm regards,` + Internship Officer signature

## 4. Lifecycle notification matrix

| ID | Lifecycle event | Application status | Email subject | In-app notification | CTA | Priority |
|---|---|---|---|---|---|---|
| APP-01 | Application submitted | Submitted | Application submitted — {{programmeName}} | Application submitted | View application | Info |
| APP-02 | Review begins | Under review | Application update — Review in progress | Application under review | View application | Info |
| APP-03 | Additional information required | Under review | Action required — Additional information needed | Additional information required | Review request | Action |
| INT-01 | Mentor interview invitation | Interview | Interview invitation — {{programmeName}} | Interview invitation received | Choose a timeslot | Action |
| INT-02 | Interview timeslot confirmed | Interview | Interview confirmed — {{interviewDateTime}} | Interview confirmed | View interview | Action |
| INT-03 | Applicant requests reschedule | Interview | Interview reschedule request received | Reschedule request submitted | View request | Info |
| INT-04 | Rescheduled time confirmed | Interview | Updated interview time confirmed | New interview time confirmed | View interview | Action |
| INT-05 | Reschedule unavailable | Interview | Action required — Choose another interview time | Choose another interview time | Choose a timeslot | Action |
| INT-06 | Interview reminder | Interview | Reminder — Interview tomorrow | Interview tomorrow | View interview | Reminder |
| INT-07 | Interview completed | Under review | Interview completed — What happens next | Interview completed | View application | Info |
| OFF-01 | Offer issued | Offer received | Internship offer — {{programmeName}} | Offer received | Review offer | Action |
| OFF-02 | Offer response reminder | Offer received | Reminder — Respond to your offer by {{responseDeadline}} | Offer response due soon | Review offer | Reminder |
| OFF-03 | Offer accepted | Offer accepted | Offer accepted — Next steps | Offer accepted | Start onboarding | Info |
| OFF-04 | Offer declined | Offer declined | Offer response received | Offer declined | View application | Info |
| OFF-05 | Offer expired | Offer expired | Offer expired — {{programmeName}} | Offer expired | View application | Outcome |
| ONB-01 | Onboarding tasks created | Offer accepted | Action required — Complete your onboarding | Onboarding tasks are ready | Start onboarding | Action |
| ONB-02 | Onboarding reminder | Offer accepted | Reminder — Complete onboarding by {{onboardingDeadline}} | Onboarding due soon | Continue onboarding | Reminder |
| ONB-03 | Onboarding completed | Offer accepted | Onboarding completed | Onboarding completed | View internship | Info |
| PRE-01 | Welcome letter, T-10 days | Offer accepted | Welcome to DSTA — Your internship starts in 10 days | Welcome letter available | View welcome letter | Action |
| INTN-01 | Internship starts | Offer accepted | Your DSTA internship starts today | Internship started | View internship | Info |
| EXIT-01 | Offboarding opens | Offer accepted | Action required — Complete your offboarding tasks | Offboarding tasks are ready | Start offboarding | Action |
| EXIT-02 | Offboarding reminder | Offer accepted | Reminder — Complete offboarding by {{offboardingDeadline}} | Offboarding due soon | Continue offboarding | Reminder |
| FB-01 | Feedback requested | Offer accepted | Share your internship feedback | Internship feedback requested | Give feedback | Action |
| FB-02 | Feedback submitted | Offer accepted | Feedback received — Thank you | Feedback submitted | View internship | Info |
| CERT-01 | Certificate generated | Offer accepted | Your DSTA internship certificate is ready | Certificate available | View certificate | Outcome |
| REC-01 | Mentor recommendation letter | Offer accepted | Recommendation letter from {{mentorName}} is available | Recommendation letter available | View recommendation | Outcome |
| WD-01 | Applicant withdraws before offer | Withdrawn | Application withdrawn — {{programmeName}} | Application withdrawn | View application | Outcome |
| OUT-01 | Application unsuccessful | Unsuccessful | Update on your application — {{programmeName}} | Application outcome available | View outcome | Outcome |

## 5. Detailed email and notification copy

### APP-01 — Application submitted

**Trigger**  
Applicant successfully submits the application form.

**Email subject**  
`Application submitted — {{programmeName}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Thank you for applying to the **{{programmeName}}**.
>
> Your application has been submitted successfully and your supporting information has been received.
>
> Our Talent Acquisition team will review your application next. We will contact you if further information or action is required.
>
> **Application reference:** {{applicationId}}
>
> [View application]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Application submitted`
- Body: `Your {{programmeName}} application was received successfully.`
- CTA: `View application`
- Destination: `/apply/applications/{{applicationId}}`

---

### APP-02 — Application under review

**Trigger**  
Talent Acquisition changes the application from `Submitted` to `Under review`.

**Email subject**  
`Application update — Review in progress`

**Email body**

> Dear {{applicantFirstName}},
>
> We are writing to let you know that your application for the **{{programmeName}}** has moved to the review stage.
>
> Our team is reviewing your application against the programme requirements and suitable project opportunities. **No action is required from you at this time.**
>
> We will notify you when there is a further update.
>
> [View application status]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Application under review`
- Body: `Your application has moved to the review stage. No action is required.`
- CTA: `View application`

---

### APP-03 — Additional information required

**Trigger**  
Reviewer requests missing or updated applicant information.

**Email subject**  
`Action required — Additional information needed`

**Email body**

> Dear {{applicantFirstName}},
>
> We need some additional information to continue reviewing your application for the **{{programmeName}}**.
>
> Please review the request in the Applicant Portal and submit the required information by **{{responseDeadline}}**.
>
> [Review request]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Additional information required`
- Body: `Submit the requested information by {{responseDeadline}}.`
- CTA: `Review request`
- Priority: Action required

---

### INT-01 — Mentor interview invitation

**Trigger**  
Mentor or Internship Officer invites the applicant to select an interview slot.

**Email subject**  
`Interview invitation — {{programmeName}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Thank you for your application for the **{{programmeName}}**.
>
> We are pleased to let you know that your application is progressing to the interview stage for **{{projectName}}** with **{{mentorName}}**.
>
> The next step is to select a suitable interview date and time. Available slots are offered on a first-come, first-served basis.
>
> Please choose a timeslot by **{{responseDeadline}}**.
>
> [Choose a timeslot]
>
> We look forward to speaking with you.
>
> Warm regards,  
> {{officerName}}  
> Internship Officer, DSTA

**In-app Notification**

- Title: `Interview invitation received`
- Body: `Choose a timeslot for your {{projectName}} interview by {{responseDeadline}}.`
- CTA: `Choose a timeslot`
- Priority: Action required

---

### INT-02 — Interview confirmed

**Trigger**  
Applicant selects a slot, or Mentor confirms the final interview time.

**Email subject**  
`Interview confirmed — {{interviewDateTime}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Your interview for **{{projectName}}** has been confirmed.
>
> **Date and time:** {{interviewDateTime}}  
> **Interviewer:** {{mentorName}}  
> **Format:** Microsoft Teams  
> **Duration:** 1 hour
>
> Joining instructions are available in the Applicant Portal.
>
> [View interview details]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Interview confirmed`
- Body: `Your interview is scheduled for {{interviewDateTime}}.`
- CTA: `View interview`

---

### INT-03 — Reschedule request received

**Trigger**  
Applicant submits alternative availability.

**Email subject**  
`Interview reschedule request received`

**Email body**

> Dear {{applicantFirstName}},
>
> We have received your request to reschedule the interview for **{{projectName}}**.
>
> Your alternative availability has been sent to {{mentorName}} for review. **No further action is required while the request is pending.**
>
> We will notify you when the updated time is confirmed.
>
> [View request]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Reschedule request submitted`
- Body: `Your alternative availability is awaiting mentor confirmation.`
- CTA: `View request`

---

### INT-04 — Rescheduled time confirmed

**Trigger**  
Mentor accepts one of the applicant's alternative times.

**Email subject**  
`Updated interview time confirmed`

**Email body**

> Dear {{applicantFirstName}},
>
> Your updated interview time for **{{projectName}}** has been confirmed.
>
> **New date and time:** {{interviewDateTime}}
>
> The previous interview time is no longer active. Please review the latest joining instructions in the Applicant Portal.
>
> [View updated interview]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `New interview time confirmed`
- Body: `Your interview has been rescheduled to {{interviewDateTime}}.`
- CTA: `View interview`

---

### INT-05 — Alternative time unavailable

**Trigger**  
Mentor cannot accept the proposed availability and publishes new slots.

**Email subject**  
`Action required — Choose another interview time`

**Email body**

> Dear {{applicantFirstName}},
>
> We were unable to confirm your proposed interview times for **{{projectName}}**.
>
> New interview slots are now available. Please choose another timeslot by **{{responseDeadline}}**.
>
> [Choose a timeslot]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Choose another interview time`
- Body: `New interview slots are available. Respond by {{responseDeadline}}.`
- CTA: `Choose a timeslot`
- Priority: Action required

---

### INT-06 — Interview reminder

**Trigger**  
24 hours before the confirmed interview.

**Email subject**  
`Reminder — Interview tomorrow`

**Email body**

> Dear {{applicantFirstName}},
>
> This is a reminder that your interview for **{{projectName}}** is scheduled for **{{interviewDateTime}}**.
>
> Please join the Microsoft Teams meeting five minutes before the scheduled time.
>
> [View interview details]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Interview tomorrow`
- Body: `Your {{projectName}} interview is scheduled for {{interviewDateTime}}.`
- CTA: `View interview`

---

### INT-07 — Interview completed

**Trigger**  
Mentor marks the interview as completed.

**Email subject**  
`Interview completed — What happens next`

**Email body**

> Dear {{applicantFirstName}},
>
> Thank you for meeting with {{mentorName}} to discuss the **{{projectName}}** opportunity.
>
> Your interview has been completed. The internship team will review the outcome next. **No action is required from you at this time.**
>
> We will notify you when a decision is available.
>
> [View application]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Interview completed`
- Body: `The internship team is reviewing the interview outcome.`
- CTA: `View application`

---

### OFF-01 — Offer received

**Trigger**  
Internship Officer issues an offer.

**Email subject**  
`Internship offer — {{programmeName}}`

**Email body**

> Dear {{applicantFirstName}},
>
> We are pleased to offer you an internship under the **{{programmeName}}** for **{{projectName}}**.
>
> Please review the internship period, reporting location and offer terms in the Applicant Portal. Submit your response by **{{responseDeadline}}**.
>
> [Review offer]
>
> We hope you will join us at DSTA.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offer received`
- Body: `Review and respond to your internship offer by {{responseDeadline}}.`
- CTA: `Review offer`
- Priority: Action required

---

### OFF-02 — Offer response reminder

**Trigger**  
48 hours before offer expiry when no response has been submitted.

**Email subject**  
`Reminder — Respond to your offer by {{responseDeadline}}`

**Email body**

> Dear {{applicantFirstName}},
>
> This is a reminder that your internship offer for **{{projectName}}** is awaiting your response.
>
> Please accept or decline the offer by **{{responseDeadline}}**. The offer will expire automatically after the deadline.
>
> [Review offer]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offer response due soon`
- Body: `Respond to your offer by {{responseDeadline}}.`
- CTA: `Review offer`
- Priority: Reminder

---

### OFF-03 — Offer accepted

**Trigger**  
Applicant accepts the offer.

**Email subject**  
`Offer accepted — Next steps`

**Email body**

> Dear {{applicantFirstName}},
>
> Thank you for accepting your internship offer for **{{projectName}}**.
>
> Your place has been confirmed. The next step is to complete the required onboarding tasks in the Applicant Portal.
>
> [Start onboarding]
>
> We look forward to welcoming you to DSTA.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offer accepted`
- Body: `Your place is confirmed. Complete the required onboarding tasks.`
- CTA: `Start onboarding`

---

### OFF-04 — Offer declined

**Trigger**  
Applicant declines the offer.

**Email subject**  
`Offer response received`

**Email body**

> Dear {{applicantFirstName}},
>
> We have received your decision to decline the internship offer for **{{projectName}}**.
>
> No further action is required. Your application record will remain available in the Applicant Portal.
>
> Thank you for your interest in DSTA.
>
> [View application]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offer declined`
- Body: `Your response has been recorded. No further action is required.`
- CTA: `View application`

---

### OFF-05 — Offer expired

**Trigger**  
Offer deadline passes without a response.

**Email subject**  
`Offer expired — {{programmeName}}`

**Email body**

> Dear {{applicantFirstName}},
>
> The response deadline for your internship offer for **{{projectName}}** has passed, and the offer is no longer available.
>
> Your application is now closed. If you believe this is an error, please contact the Internship Office.
>
> [View application]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offer expired`
- Body: `The offer response deadline has passed and the application is closed.`
- CTA: `View application`

---

### ONB-01 — Onboarding tasks available

**Trigger**  
Offer is accepted and onboarding checklist is generated.

**Email subject**  
`Action required — Complete your onboarding`

**Email body**

> Dear {{applicantFirstName}},
>
> Your onboarding checklist for **{{projectName}}** is now available.
>
> Please complete the required personal, banking, policy and security information by **{{onboardingDeadline}}**.
>
> [Start onboarding]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Onboarding tasks are ready`
- Body: `Complete your onboarding checklist by {{onboardingDeadline}}.`
- CTA: `Start onboarding`
- Priority: Action required

---

### ONB-02 — Onboarding reminder

**Trigger**  
Three days before the onboarding deadline when tasks remain incomplete.

**Email subject**  
`Reminder — Complete onboarding by {{onboardingDeadline}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Some onboarding tasks for your upcoming DSTA internship are still incomplete.
>
> Please complete the remaining items by **{{onboardingDeadline}}** to avoid delays to your start date.
>
> [Continue onboarding]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Onboarding due soon`
- Body: `Complete the remaining onboarding tasks by {{onboardingDeadline}}.`
- CTA: `Continue onboarding`

---

### ONB-03 — Onboarding completed

**Trigger**  
All onboarding tasks are completed and accepted.

**Email subject**  
`Onboarding completed`

**Email body**

> Dear {{applicantFirstName}},
>
> Your onboarding requirements for **{{projectName}}** have been completed successfully.
>
> No further onboarding action is required. We will send your welcome letter and first-day information closer to your internship start date.
>
> [View internship]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Onboarding completed`
- Body: `All required onboarding tasks have been completed.`
- CTA: `View internship`

---

### PRE-01 — Welcome letter available, 10 days before start

**Trigger**  
Exactly 10 calendar days before `{{internshipStartDate}}` when onboarding is complete.

**Email subject**  
`Welcome to DSTA — Your internship starts in 10 days`

**Email body**

> Dear {{applicantFirstName}},
>
> Your DSTA internship for **{{projectName}}** begins on **{{internshipStartDate}}**.
>
> Your welcome letter is now available. It includes your reporting time, location, mentor contact and first-day instructions.
>
> Please review the letter before your first day.
>
> [View welcome letter]
>
> We look forward to welcoming you to DSTA.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Welcome letter available`
- Body: `Your internship starts in 10 days. Review your first-day information.`
- CTA: `View welcome letter`

---

### INTN-01 — Internship starts

**Trigger**  
Start date at 8:00 AM local time.

**Email subject**  
`Your DSTA internship starts today`

**Email body**

> Dear {{applicantFirstName}},
>
> Welcome to DSTA. Your internship on **{{projectName}}** starts today.
>
> Your internship record, mentor details and key dates are available in the Applicant Portal.
>
> [View internship]
>
> We wish you a meaningful and rewarding internship experience.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Internship started`
- Body: `Welcome to your first day on {{projectName}}.`
- CTA: `View internship`

---

### EXIT-01 — Offboarding tasks available

**Trigger**  
Internship enters the configured ending-soon window.

**Email subject**  
`Action required — Complete your offboarding tasks`

**Email body**

> Dear {{applicantFirstName}},
>
> As your internship for **{{projectName}}** approaches completion, your offboarding checklist is now available.
>
> Please complete exit clearance, return any issued items and confirm the required declarations by **{{offboardingDeadline}}**.
>
> [Start offboarding]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offboarding tasks are ready`
- Body: `Complete your offboarding checklist by {{offboardingDeadline}}.`
- CTA: `Start offboarding`
- Priority: Action required

---

### EXIT-02 — Offboarding reminder

**Trigger**  
Two days before the deadline when offboarding tasks remain incomplete.

**Email subject**  
`Reminder — Complete offboarding by {{offboardingDeadline}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Some offboarding tasks for your DSTA internship are still incomplete.
>
> Please complete the remaining items by **{{offboardingDeadline}}**. Your certificate and final documents can only be issued after the required clearance is completed.
>
> [Continue offboarding]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Offboarding due soon`
- Body: `Complete the remaining offboarding tasks by {{offboardingDeadline}}.`
- CTA: `Continue offboarding`

---

### FB-01 — Internship feedback requested

**Trigger**  
Internship ends or the feedback form becomes available.

**Email subject**  
`Share your internship feedback`

**Email body**

> Dear {{applicantFirstName}},
>
> Congratulations on completing your internship for **{{projectName}}**.
>
> We would appreciate your feedback on the project, mentorship and overall internship experience. Please submit the feedback form by **{{feedbackDeadline}}**.
>
> [Give feedback]
>
> Thank you for helping us improve the internship experience for future applicants.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Internship feedback requested`
- Body: `Share your internship experience by {{feedbackDeadline}}.`
- CTA: `Give feedback`
- Priority: Action required

---

### FB-02 — Feedback submitted

**Trigger**  
Applicant submits the internship feedback form.

**Email subject**  
`Feedback received — Thank you`

**Email body**

> Dear {{applicantFirstName}},
>
> Thank you for sharing your feedback on the **{{projectName}}** internship.
>
> Your response has been recorded successfully. No further feedback action is required.
>
> [View internship record]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Feedback submitted`
- Body: `Thank you. Your internship feedback was recorded successfully.`
- CTA: `View internship`

---

### CERT-01 — Certificate generated

**Trigger**  
Internship is completed, offboarding is cleared and certificate approval is final.

**Email subject**  
`Your DSTA internship certificate is ready`

**Email body**

> Dear {{applicantFirstName}},
>
> Your Certificate of Completion for the **{{programmeName}}** is now available.
>
> The certificate recognises your successful completion of the **{{projectName}}** internship from **{{internshipStartDate}}** to **{{internshipEndDate}}**.
>
> [View certificate]
>
> Congratulations on completing your internship with DSTA.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Certificate available`
- Body: `Your DSTA internship Certificate of Completion is ready.`
- CTA: `View certificate`

---

### REC-01 — Mentor recommendation letter available

**Trigger**  
Mentor submits and releases the recommendation letter to the applicant.

**Email subject**  
`Recommendation letter from {{mentorName}} is available`

**Email body**

> Dear {{applicantFirstName}},
>
> {{mentorName}} has provided a recommendation letter following your internship on **{{projectName}}**.
>
> The letter is now available in your completed internship record.
>
> [View recommendation letter]
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Recommendation letter available`
- Body: `{{mentorName}} has shared a recommendation letter with you.`
- CTA: `View recommendation`

---

### WD-01 — Application withdrawn before offer

**Trigger**  
Applicant confirms withdrawal while the application is in `Submitted`, `Under review` or `Interview`.

**Email subject**  
`Application withdrawn — {{programmeName}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Your request to withdraw from the **{{programmeName}}** application process has been completed.
>
> The application is now closed and no further recruitment action will be taken. Your record will remain available in the Applicant Portal.
>
> **Application reference:** {{applicationId}}
>
> [View application]
>
> Thank you for your interest in DSTA.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Application withdrawn`
- Body: `Your application has been withdrawn and is now closed.`
- CTA: `View application`

---

### OUT-01 — Application unsuccessful

**Trigger**  
Talent Acquisition releases an unsuccessful outcome before an offer is issued.

**Email subject**  
`Update on your application — {{programmeName}}`

**Email body**

> Dear {{applicantFirstName}},
>
> Thank you for your interest in the **{{programmeName}}** and for the time you invested in your application.
>
> After careful consideration, we regret to inform you that your application will not be progressing further on this occasion.
>
> Your application is now closed and remains available in the Applicant Portal for your records.
>
> [View outcome]
>
> We appreciate your interest in DSTA and encourage you to consider future opportunities.
>
> Warm regards,  
> DSTA Talent Acquisition

**In-app Notification**

- Title: `Application outcome available`
- Body: `An update is available for your {{programmeName}} application.`
- CTA: `View outcome`

## 6. Notification behaviour rules

### 6.1 Email delivery

- Action-required email：事件触发后立即发送。
- Informational email：状态保存成功后立即发送，允许最多 5 分钟队列延迟。
- Reminder email：仅在任务仍未完成时发送。
- 同一事件使用唯一 notification key，避免重复发送。
- Gmail subject 不使用全大写、不使用 emoji、不使用感叹号制造紧迫感。

### 6.2 In-app Notification

- 未读通知在 Topbar Notification 图标显示数量。
- 点击通知后标记为已读并打开对应 deep link。
- Action-required 通知必须保留到任务完成，不使用临时 Toast 替代。
- 状态变化记录需要出现在 Applicant Home 的 Latest activity。
- Email 与 In-app Notification 使用相同事件 ID，方便 UT 追踪用户从哪个渠道进入。

### 6.3 CTA rules

- 每封邮件只提供一个主 CTA。
- CTA 使用动词开头，例如 `Choose a timeslot`、`Review offer`、`Start onboarding`。
- 无需行动的事件使用 `View application` 或 `View internship`。
- CTA 必须 deep-link 到具体记录，不能只进入 Dashboard。

## 7. UT 测试建议

建议把通知测试拆成不同任务，避免 Email 与 In-app Notification 同时暴露导致归因不清：

1. **Email-led task**：给用户一封模拟 Gmail 邮件，观察其是否理解状态变化并点击 CTA。
2. **Notification-led task**：仅显示 Portal 未读 Notification，观察用户是否能发现并定位下一步。
3. **Critical dual-channel task**：Interview invitation、Offer received、Deadline reminder 同时使用 Email 与 Notification，测试用户是否感觉安心而非重复。
4. **No-action task**：Under review 与 Interview completed 明确写出 `No action is required`，测试用户是否仍会寻找 CTA 或担心遗漏任务。
5. **Lifecycle recall**：完成多个任务后，请用户回到 Latest activity，确认是否能复述状态变化顺序。

建议记录：

- 首次注意到 Email / Notification 的时间
- 是否理解当前状态与下一步
- 是否知道是否需要行动
- 是否找到正确 CTA
- 是否理解截止日期与后果
- 是否认为通知过多、重复或缺乏可信度
