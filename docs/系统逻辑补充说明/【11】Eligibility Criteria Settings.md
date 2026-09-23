# 【11】Eligibility Criteria Settings

## 1. Document Information

| Item | Value |
|---|---|
| Document Type | System Logic Supplement / Functional Design |
| Configuration Function | Eligibility Criteria Settings |
| Status | Confirmed working baseline |
| Last Updated | 2026-09-02 |
| Primary Reference | System Requirements Specification (SyRS) 20260825 LATEST |
| Prototype Reference | Current TOA/DUT Prototype |

## 2. Purpose

Eligibility Criteria Settings is the central administrative function for maintaining the default Eligibility Criteria for each Intern Category.

When an IO creates a Programme and selects an Intern Category, the system automatically loads the current Active default Eligibility Configuration for that Category. The loaded configuration becomes a Programme-specific snapshot and may subsequently be adjusted at Programme level by an authorised user.

```text
Intern Category
    -> Active Default Eligibility Configuration
    -> copied into a new Programme
    -> Programme Eligibility Criteria snapshot and version
    -> Applicant Eligibility Screening
```

The administrator configures the criteria. The system, rather than the Applicant, determines which Academic Pathway applies during screening.

## 3. SyRS and Prototype Basis

| Requirement / Source | Application in This Design |
|---|---|
| FR-A2.1-005 | The system automatically populates the Eligibility Criteria mapped to the selected Intern Category. |
| FR-A2.1-006 | Authorised users maintain Eligibility Criteria mappings and may make permitted Programme-level adjustments. |
| BR-A2.1-008 | Singapore Citizenship is the initial Mandatory Eligibility Criterion for all Internship Programmes. |
| BR-A2.1-009–012 | Mandatory and Configurable criteria are processed separately and defaults are maintained by Intern Category. |
| FR-B2.1-001–012 | Applications are assessed against the applicable Programme Criteria and the result, override and status history are recorded. |
| BR-B2.1-002–007 | Mandatory and Configurable failures follow different workflows. |
| FR-B2.2-001–005 | Individual Criterion outcomes are recorded; Configurable education or academic failures are routed to IO Review and may be overridden with mandatory Remarks. |
| SyRS Exception Scenario | Changes to Programme Eligibility Criteria after Applications exist require impact warning and confirmation. |
| Current Prototype | Provides the seven Intern Categories and the initial GPA, CAP, IB and STEM-grade thresholds. |

The academic threshold values in this document originate from the current Prototype. The SyRS establishes the configuration and screening principles but does not define all numerical thresholds.

## 4. Scope

### 4.1 Included

- one versioned default Eligibility Configuration for each Intern Category;
- Common Criteria applying to every Applicant in the Category;
- Academic Pathways automatically selected by Institution and Academic Qualification;
- supported Criterion Types, operators, values and option sources;
- Mandatory and Configurable classifications;
- applicant-facing Preview generated from the configuration;
- validation before activation;
- copying the Active default into a new Programme;
- Programme-level Criteria snapshots and versions;
- impact control when Programme Criteria change after Applications exist;
- Criterion-level screening evidence;
- IO override controls; and
- audit and historical integrity.

### 4.2 Excluded

- Intern Category creation and status maintenance;
- Educational Institution CRUD operations;
- Institution, Qualification, Grade Scale, Grade Mapping, STEM taxonomy or Subject Alias maintenance;
- Application Form field maintenance;
- Internship Window and Project Duration configuration;
- arbitrary formulas, custom scripts or unrestricted nested rule building;
- Project Suitability scoring or matching;
- Role and Permission matrix maintenance;
- Mandatory rejection-notification delay configuration; and
- automatic synchronisation with MOE, SSG or another external source.

Dependencies are maintained as follows:

| Dependency | Owning Function |
|---|---|
| Intern Categories | Programme Settings |
| Educational Institutions and Education Levels | Dictionary Management |
| Application fields, Qualifications, transcripts, subjects, Grade Scales and OCR mappings | Form Management and supporting master data |
| Permission to view or edit Eligibility Configuration | Role & Permission Management |

## 5. Configuration Model

### 5.1 Fixed Structure

The function must use a controlled structure rather than an unrestricted ALL/ANY rule engine.

```text
Intern Category Default Eligibility Configuration
|
+-- Common Criteria
|   +-- fixed ALL relationship
|   +-- Citizenship Status
|   +-- Education Level
|
+-- Academic Pathways
    +-- Applicable When
    |   +-- Academic Qualification
    |   +-- Institution Scope
    |
    +-- Academic Criteria
        +-- fixed ALL relationship within the matched Pathway
        +-- GPA / CAP / IB Total Score / STEM Subject Grade
```

### 5.2 Pathway Selection Principle

Academic Pathway is determined automatically from:

```text
Current Educational Institution + Academic Qualification
```

The following rules apply:

1. Applicant cannot select an Eligibility Pathway.
2. Applicant cannot switch to a more favourable Pathway.
3. Exactly one Pathway should apply to an Applicant.
4. Other Pathways are recorded as `Not Applicable` and are skipped.
5. A configuration that allows the same Institution and Qualification to match two Pathways cannot be activated.
6. If no Pathway matches, the system records `Unable to Assess`; the overall result is `Ineligible - Pending IO Review` and the Applicant is not automatically rejected.
7. Pathways represent different applicable academic systems; they are not rules that the Applicant may try in turn until one passes.

### 5.3 Intern Categories

Each of the following Categories has an independent configuration:

| Display Value | Suggested System Value |
|---|---|
| Undergraduate Scholar/Merit Scholar | `UNDERGRADUATE_SCHOLAR_MERIT_SCHOLAR` |
| Tech UP | `TECH_UP` |
| Undergraduate Student | `UNDERGRADUATE_STUDENT` |
| Junior College Scholar/Junior College Student | `JC_SCHOLAR_JC_STUDENT` |
| Polytechnic Scholar/Polytechnic Student | `POLYTECHNIC_SCHOLAR_STUDENT` |
| Post Junior College/Post Polytechnic Student | `POST_JC_POST_POLYTECHNIC_STUDENT` |
| Young Defence Scientist Programme | `YOUNG_DEFENCE_SCIENTIST_PROGRAMME` |

Configurations remain independent even where their initial content is identical.

## 6. Page Structure

The page contains:

1. Intern Category list;
2. Configuration Status and Version;
3. Common Criteria;
4. Academic Pathways;
5. generated applicant-facing Preview;
6. Edit, Validate, Save and Activate actions; and
7. Version and Change History.

The Intern Category list is sourced from Programme Settings and is read-only here.

## 7. Functional Catalogue

| ID | Function | Description |
|---|---|---|
| ELC-01 | View Intern Categories | View Categories and the current configuration status/version. |
| ELC-02 | View Active Configuration | View the current Active Common Criteria and Academic Pathways. |
| ELC-03 | Create Editing Draft | Copy the Active version into an editable Draft. |
| ELC-04 | Add Common Criterion | Add a supported Common Criterion. |
| ELC-05 | Edit Common Criterion | Edit Classification and Required Value. |
| ELC-06 | Remove Common Criterion | Remove a Common Criterion with confirmation and audit. |
| ELC-07 | Add Academic Pathway | Add a Pathway and define its applicability. |
| ELC-08 | Edit Academic Pathway | Edit Pathway Name, Qualification, Institution Scope and order. |
| ELC-09 | Remove Academic Pathway | Remove a Pathway from the Draft with confirmation. |
| ELC-10 | Add Academic Criterion | Add a supported academic check within a Pathway. |
| ELC-11 | Edit Academic Criterion | Edit Classification and threshold fields allowed for its Type. |
| ELC-12 | Remove Academic Criterion | Remove an academic check with confirmation. |
| ELC-13 | Reorder | Reorder Common Criteria, Pathways and Criteria for presentation. |
| ELC-14 | Preview | Generate the applicant-facing plain-language summary. |
| ELC-15 | Validate | Validate completeness, overlap, supported combinations and data dependencies. |
| ELC-16 | Save and Activate | Create a new immutable Active version and supersede the previous version. |
| ELC-17 | Cancel Edit | Discard the unsaved Draft. |
| ELC-18 | View History | View previous versions, changes and activation records. |
| ELC-19 | Reset Programme Criteria | Replace a Programme copy with the latest Active default, subject to impact controls. |

## 8. Configuration Header Fields

| Field | Type | Required | Editable | Options / Rule |
|---|---|---:|---:|---|
| Configuration ID | System ID | Yes | No | Stable system identifier. |
| Intern Category | Dropdown | Yes | No | One of the seven values in Section 5.3. |
| Configuration Status | System Status | Yes | No | `Draft`, `Active`, `Superseded`. |
| Version | System Generated | Yes | No | Sequential version, for example V1 or V2. |
| Effective From | Date/Time | System | No | Activation date and time. |
| Change Remarks | Text Area | Yes on activation | Yes | Reason for the new version. |
| Last Updated By | User Reference | System | No | Latest editing user. |
| Last Updated Date | Date/Time | System | No | Latest editing date and time. |
| Applicant-facing Preview | Generated Text | System | No | Generated from the complete Draft or Active configuration. |

## 9. Common Criteria Fields

Common Criteria are evaluated using a fixed `ALL` relationship. Match Logic is not an administrator-editable field.

### 9.1 Common Criterion Record

| Field | Type | Required | Editable | Options / Rule |
|---|---|---:|---:|---|
| Criterion ID | System ID | Yes | No | Stable identifier. |
| Criterion Type | Dropdown | Yes | Yes | `Citizenship Status` or `Education Level`. |
| Classification | Dropdown | Yes | Yes | `Mandatory` or `Configurable`. |
| Operator | System Controlled | Yes | No | Derived from Criterion Type. |
| Required Value | Dynamic Field | Yes | Yes | Option set determined by Criterion Type. |
| Display Order | Integer / Drag Sort | Yes | Yes | Controls administration and Preview order. |

### 9.2 Common Criterion Type Options

| Display Value | System Value |
|---|---|
| Citizenship Status | `CITIZENSHIP_STATUS` |
| Education Level | `EDUCATION_LEVEL` |

`Race`, `Age` and `Nationality` are not part of the confirmed V1 Eligibility configuration.

### 9.3 Classification Options

| Display Value | System Value | Failure Behaviour |
|---|---|---|
| Mandatory | `MANDATORY` | Mandatory eligibility failure and rejection workflow. |
| Configurable | `CONFIGURABLE` | `Ineligible - Pending IO Review`; no automatic rejection. |

Classification controls the handling of a failed Criterion. It does not determine whether the corresponding Application Form field is mandatory.

### 9.4 Citizenship Status

| Property | Configuration |
|---|---|
| Criterion Type | Citizenship Status |
| Operator | `Is` / `IS` |
| Value Type | Single-select |
| Initial Classification | Mandatory |
| Initial Value | Singapore Citizen |

| Display Value | System Value | Definition |
|---|---|---|
| Singapore Citizen | `SINGAPORE_CITIZEN` | Applicant is a Singapore Citizen. |
| Non-Singapore Citizen | `NON_SINGAPORE_CITIZEN` | Includes Singapore PR and all other non-citizens for this binary check. |

Rules:

- do not use `Singaporean / Others` as the stored option set;
- Citizenship Status and Nationality are separate Applicant fields;
- the option set is system-controlled and administrators cannot add, rename or remove its values;
- the Citizenship Criterion itself is not hard-locked: an authorised administrator may amend or remove it;
- removing it, changing its value, or changing it from Mandatory requires a prominent SyRS-deviation warning, confirmation and audit record.

### 9.5 Education Level

| Property | Configuration |
|---|---|
| Criterion Type | Education Level |
| Operator | `Is` / `IS` |
| Value Type | Single-select |
| Initial Classification | Configurable |
| Applicant Data Source | Education Level of the selected Current Educational Institution |

| Display Value | System Value |
|---|---|
| Secondary | `SECONDARY` |
| Post-Secondary (Non-University) | `POST_SECONDARY_NON_UNIVERSITY` |
| University | `UNIVERSITY` |

Initial mapping:

| Intern Category | Required Education Level |
|---|---|
| Undergraduate Scholar/Merit Scholar | University |
| Tech UP | University |
| Undergraduate Student | University |
| Polytechnic Scholar/Polytechnic Student | Post-Secondary (Non-University) |
| Junior College Scholar/Junior College Student | Post-Secondary (Non-University) |
| Post Junior College/Post Polytechnic Student | Post-Secondary (Non-University) |
| Young Defence Scientist Programme | Secondary |

Education Level is a broad guardrail used to identify an Applicant who has selected a clearly inconsistent Intern Category. It does not determine Scholar status, Year of Study or an exact academic qualification.

## 10. Academic Pathway Fields

### 10.1 Pathway Record

| Field | Type | Required | Editable | Options / Rule |
|---|---|---:|---:|---|
| Pathway ID | System ID | Yes | No | Stable identifier. |
| Pathway Name | Text | Yes | Yes | Administrative label, for example `GCE A-Level Pathway`. |
| Academic Qualification | Dropdown | Yes | Yes | One value from Section 10.2. |
| Institution Scope Mode | Dropdown | Yes | Yes | One value from Section 10.3. |
| Selected Institutions | Multi-select | Conditional | Yes | Required for `Selected Institutions Only`. |
| Display Order | Integer / Drag Sort | Yes | Yes | Controls administration and Preview order. |

Pathways do not have independent Active/Inactive status. A Pathway is added or removed in a Draft; the complete configuration becomes effective only when that Draft is activated.

### 10.2 Academic Qualification Options

| Display Value | System Value |
|---|---|
| University Undergraduate | `UNIVERSITY_UNDERGRADUATE` |
| Polytechnic Diploma | `POLYTECHNIC_DIPLOMA` |
| GCE A-Level | `GCE_A_LEVEL` |
| International Baccalaureate Diploma | `IB_DIPLOMA` |
| NUS High School Diploma | `NUS_HIGH_DIPLOMA` |
| GCE O-Level | `GCE_O_LEVEL` |
| Integrated Programme | `INTEGRATED_PROGRAMME` |

These are controlled Qualification Types supported by V1. The mapping between an Institution and the Qualification Types it offers is maintained in the supporting Institution/Form master data, not in Eligibility Criteria Settings.

### 10.3 Institution Scope Mode Options

| Display Value | System Value | Rule |
|---|---|---|
| All Institutions Offering This Qualification | `ALL_MATCHING_INSTITUTIONS` | Applies to every Active Institution mapped to the selected Qualification. |
| Selected Institutions Only | `SELECTED_INSTITUTIONS` | Applies only to the selected Institution IDs. |

`Selected Institutions` rules:

- source: Educational Institutions in Dictionary Management;
- only Active Institutions are available for new selection;
- options are filtered by the selected Academic Qualification;
- free-text entry is not permitted;
- the system stores Institution ID rather than Institution Name; and
- a previously used inactive Institution remains visible in historical versions.

## 11. Academic Criterion Fields

Academic Criteria within the matched Pathway use a fixed `ALL` relationship.

### 11.1 Academic Criterion Record

| Field | Type | Required | Editable | Options / Rule |
|---|---|---:|---:|---|
| Academic Criterion ID | System ID | Yes | No | Stable identifier. |
| Criterion Type | Dropdown | Yes | Yes | GPA, CAP, IB Total Score or STEM Subject Grade. |
| Classification | Dropdown | Yes | Yes | Mandatory or Configurable. |
| Operator | System Controlled | Yes | No | Derived from Criterion Type. |
| Threshold Value | Dynamic Field | Yes | Yes | Numeric value or Grade option. |
| Subject Scope | Controlled Value | Conditional | No in V1 | Required for STEM Subject Grade; fixed to STEM Subjects. |
| Subject Quantifier | Controlled Value | Conditional | No in V1 | Required for STEM Subject Grade; fixed to All Recognised STEM Subjects. |
| Grade Scale | Derived | Conditional | No | Derived from Qualification and Institution. |
| Display Order | Integer / Drag Sort | Yes | Yes | Controls administration and Preview order. |

### 11.2 Academic Criterion Type Options

| Display Value | System Value |
|---|---|
| Grade Point Average (GPA) | `GPA` |
| Cumulative Average Point (CAP) | `CAP` |
| IB Total Score | `IB_TOTAL_SCORE` |
| STEM Subject Grade | `STEM_SUBJECT_GRADE` |

The following Prototype-capable fields are not included in the confirmed V1 catalogue because they are not part of the agreed default Eligibility logic:

- Race;
- Age;
- Course / Major;
- unrestricted Institution pass/fail criterion;
- arbitrary free-text criterion;
- arbitrary custom formula; and
- custom script.

## 12. Academic Criterion Rules and Values

### 12.1 GPA

| Property | Configuration |
|---|---|
| Operator | `At Least` / `AT_LEAST` |
| Threshold Type | Decimal number |
| Step | 0.1 |
| Allowed Range | Derived from the Institution Grade Scale |
| Initial Classification | Configurable |

GPA limits must not be hard-coded globally. The valid range is determined by the Institution/Qualification Grade Scale. Institutions may share a Pathway only where their scale and threshold interpretation are compatible.

### 12.2 CAP

| Property | Configuration |
|---|---|
| Operator | `At Least` / `AT_LEAST` |
| Threshold Type | Decimal number |
| Step | 0.1 |
| Allowed Range | Derived from the applicable Grade Scale |
| Initial Classification | Configurable |

The current initial use is NUS High CAP with a threshold of 4.5.

### 12.3 IB Total Score

| Property | Configuration |
|---|---|
| Operator | `At Least` / `AT_LEAST` |
| Threshold Type | Integer |
| Minimum | 0 |
| Maximum | 45 |
| Step | 1 |
| Initial Classification | Configurable |

The current initial threshold is 40.

### 12.4 STEM Subject Grade

| Property | Configuration |
|---|---|
| Operator | `At Least` / `AT_LEAST` |
| Subject Scope | `STEM Subjects` / `STEM_SUBJECTS` |
| Subject Quantifier | `All Recognised STEM Subjects` / `ALL_RECOGNISED_STEM_SUBJECTS` |
| Threshold Type | Grade from the applicable Grade Scale |
| Initial Classification | Configurable |

V1 provides only one Subject Scope and one Quantifier. Therefore these values are displayed read-only or implied by the selected Criterion Type; administrators do not receive a misleading one-option dropdown.

The meaning is:

> Every STEM subject recognised on the Applicant's transcript must meet or exceed the configured threshold.

It does not mean that one qualifying STEM subject is sufficient.

| Applicant Evidence | Criterion Result |
|---|---|
| All recognised STEM subjects meet the threshold | Pass |
| At least one recognised STEM subject is below the threshold | Fail |
| No STEM subject is recognised | Unable to Assess |
| A possible STEM subject cannot be mapped | Unable to Assess |
| OCR confidence is insufficient to confirm a relevant grade | Unable to Assess |

`Unable to Assess` results in `Ineligible - Pending IO Review`, not automatic rejection.

## 13. Grade Scales

Grade Scale options are not created in Eligibility Criteria Settings. The system resolves the applicable scale from Academic Qualification and Institution.

### 13.1 GCE A-Level

Ordered high to low:

```text
A, B, C, D, E, S, U
```

Initial STEM threshold: `B`.

### 13.2 GCE O-Level

Ordered high to low:

```text
A1, A2, B3, B4, C5, C6, D7, E8, F9
```

Initial STEM threshold: `B3`.

### 13.3 Integrated Programme

IP schools may use different school-based Grade Scales. The Eligibility configuration displays and stores the normalised threshold:

```text
B3 Equivalent
```

The system uses the Institution's confirmed Grade Mapping to convert the raw school grade into the normalised equivalent before evaluation.

The final IP Institution list, Grade Scales, Subject Aliases and Grade Equivalent Mappings remain subject to business confirmation.

### 13.4 IB Diploma

The current initial Eligibility configuration uses IB Total Score, range 0–45, with threshold 40.

If IB Subject Grade is introduced in a future approved scope, its ordered values are 7 to 1. IB Subject Grade is not part of the current default Criteria.

### 13.5 NUS High

The current initial Eligibility configuration uses CAP with threshold 4.5. The permitted numeric range must be validated against the confirmed NUS High Grade Scale maintained by the supporting master data.

NUS High Subject Grade is not part of the current default Criteria.

### 13.6 University and Polytechnic GPA

The system obtains the valid minimum and maximum from the Institution/Qualification Grade Scale. The Prototype's initial thresholds are retained, but the scale maximum is not assumed to be identical for all Institutions.

## 14. Allowed Qualification and Criterion Combinations

The editor limits Criterion Type options according to the selected Qualification.

| Academic Qualification | Allowed Criterion Type in V1 |
|---|---|
| University Undergraduate | GPA |
| Polytechnic Diploma | GPA |
| GCE A-Level | STEM Subject Grade |
| International Baccalaureate Diploma | IB Total Score |
| NUS High School Diploma | CAP |
| GCE O-Level | STEM Subject Grade |
| Integrated Programme | STEM Subject Grade |

An additional combination requires an approved business rule and supporting structured Application data before it can be enabled.

## 15. Confirmed Initial Default Configurations

Unless otherwise stated, Citizenship is `Mandatory` and Education Level and all Academic Criteria are `Configurable`.

### 15.1 Undergraduate Scholar/Merit Scholar

```text
COMMON CRITERIA - ALL
- Citizenship Status Is Singapore Citizen
- Education Level Is University

ACADEMIC PATHWAY 1
- Name: University GPA - NUS/NTU/SUTD
- Applicable When:
  - Qualification = University Undergraduate
  - Institution = NUS, NTU or SUTD
- Academic Criteria - ALL:
  - GPA At Least 4.0

ACADEMIC PATHWAY 2
- Name: University GPA - SMU
- Applicable When:
  - Qualification = University Undergraduate
  - Institution = SMU
- Academic Criteria - ALL:
  - GPA At Least 3.6
```

### 15.2 Tech UP

Initial configuration is the same as Undergraduate Scholar/Merit Scholar but is maintained as an independent configuration and version history.

### 15.3 Undergraduate Student

Initial configuration is the same as Undergraduate Scholar/Merit Scholar but is maintained as an independent configuration and version history.

### 15.4 Polytechnic Scholar/Polytechnic Student

```text
COMMON CRITERIA - ALL
- Citizenship Status Is Singapore Citizen
- Education Level Is Post-Secondary (Non-University)

ACADEMIC PATHWAY
- Name: Polytechnic GPA
- Applicable When:
  - Qualification = Polytechnic Diploma
  - Institution Scope = All Institutions Offering This Qualification
- Academic Criteria - ALL:
  - GPA At Least 3.8
```

### 15.5 Junior College Scholar/Junior College Student

```text
COMMON CRITERIA - ALL
- Citizenship Status Is Singapore Citizen
- Education Level Is Post-Secondary (Non-University)

ACADEMIC PATHWAY 1
- Name: GCE A-Level
- Applicable When: Qualification = GCE A-Level
- Academic Criteria - ALL:
  - All Recognised STEM Subject Grades At Least B

ACADEMIC PATHWAY 2
- Name: IB Diploma
- Applicable When: Qualification = International Baccalaureate Diploma
- Academic Criteria - ALL:
  - IB Total Score At Least 40

ACADEMIC PATHWAY 3
- Name: NUS High
- Applicable When: Qualification = NUS High School Diploma
- Academic Criteria - ALL:
  - CAP At Least 4.5
```

### 15.6 Post Junior College/Post Polytechnic Student

```text
COMMON CRITERIA - ALL
- Citizenship Status Is Singapore Citizen
- Education Level Is Post-Secondary (Non-University)

ACADEMIC PATHWAYS
- GCE A-Level: All Recognised STEM Subject Grades At Least B
- IB Diploma: IB Total Score At Least 40
- NUS High: CAP At Least 4.5
- Polytechnic Diploma: GPA At Least 3.8
```

Each Pathway is applicable only when the Applicant's Institution and Qualification match that Pathway.

### 15.7 Young Defence Scientist Programme

```text
COMMON CRITERIA - ALL
- Citizenship Status Is Singapore Citizen
- Education Level Is Secondary

ACADEMIC PATHWAY 1
- Name: GCE O-Level
- Applicable When: Qualification = GCE O-Level
- Academic Criteria - ALL:
  - All Recognised STEM Subject Grades At Least B3

ACADEMIC PATHWAY 2
- Name: Integrated Programme
- Applicable When: Qualification = Integrated Programme
- Academic Criteria - ALL:
  - All Recognised STEM Subject Grades At Least B3 Equivalent
```

## 16. Applicant Data Mapping

Applicant field mapping is system logic and is not configured by administrators in this function.

| Eligibility Field | Canonical Applicant Data |
|---|---|
| Citizenship Status | Applicant Citizenship Status |
| Education Level | Current Educational Institution -> Education Level(s) |
| Academic Qualification | Institution-supported Qualification + Applicant's confirmed Qualification |
| Institution Scope | Current Educational Institution ID |
| GPA | Applicable structured GPA value |
| CAP | Applicable structured CAP value |
| IB Total Score | Structured IB Total Score |
| STEM Subject Grade | Structured transcript Subject Results -> canonical Subject -> STEM flag -> normalised Grade |

Institution scope and threshold are evaluated together. A threshold configured for SMU cannot be satisfied by an Applicant from another Institution solely because the numerical value is met.

## 17. System-Controlled Fields and Logic

The following are stored or derived but are not administrator inputs:

| Field / Logic | Rule |
|---|---|
| Configuration ID, Criterion ID and Pathway ID | System-generated stable identifiers. |
| Option System Values | Stable codes; display labels are not used as database keys. |
| Common Criteria Match Logic | Fixed `ALL`. |
| Pathway Selection | Institution + Qualification automatic match. |
| Academic Criteria Match Logic | Fixed `ALL` inside the matched Pathway. |
| Grade Scale | Derived from Institution and Qualification. |
| Applicant Field Mapping | Defined by system integration with the Category's Form Template. |
| Screening Result | Pass, Fail, Unable to Assess or Not Applicable. |
| Audit Metadata | Created, Updated, Activated and Superseded user/date fields. |

## 18. Validation Before Activation

The system blocks activation where:

- the Intern Category has no configuration;
- a Common Criterion has no Type, Classification or Required Value;
- the same Common Criterion Type is duplicated;
- a Pathway has no Name or Academic Qualification;
- `Selected Institutions Only` has no selected Institution;
- an Institution is not valid for the selected Qualification;
- the same Institution and Qualification can match two Pathways;
- a Pathway has no Academic Criterion;
- an Academic Criterion has no Type, Classification or Threshold;
- Criterion Type is incompatible with the selected Qualification;
- a numeric threshold is invalid or outside the resolved Grade Scale;
- a STEM Subject Grade threshold is not part of the applicable normalised Grade Scale;
- a referenced Institution is unavailable for new configuration;
- the Category's Active Application Form does not collect the structured data required to evaluate the Criterion; or
- the generated applicant-facing Preview cannot represent the configuration.

The system warns but may allow authorised activation where:

- one or more Active Institutions have no matching Pathway;
- the Singapore Citizenship Criterion is removed or changed;
- Citizenship Classification is changed from Mandatory;
- the new version materially reduces or expands Eligibility; or
- a dependency is awaiting business-confirmed initial master data but an authorised exception process permits activation.

Warnings require confirmation and are recorded in the audit history. A coverage warning does not change the runtime no-match behaviour: the affected Applicant becomes `Ineligible - Pending IO Review` and is not automatically rejected.

## 19. Editing, Versioning and Activation

### 19.1 Editing Draft

The Active configuration is never edited in place. Selecting `Edit` creates a Draft copy. New Programmes continue to use the current Active version until the Draft passes validation and is activated.

### 19.2 Save and Activate

On `Save and Activate`, the system:

1. validates the complete Draft;
2. generates the applicant-facing Preview;
3. requires Change Remarks and confirmation;
4. creates a new immutable version;
5. activates the new version;
6. supersedes the previous Active version in the same transaction; and
7. records the old/new values, user and date/time.

There must never be a period in which an Intern Category points to a partially saved configuration.

### 19.3 Effect of Default Changes

A newly activated default applies only to Programmes created or explicitly reset after activation. It does not retrospectively change:

- an existing Draft, Published, Active or Completed Programme;
- an existing Programme Criteria snapshot;
- an existing Application;
- a previous Screening result; or
- a previous Eligibility override.

## 20. Programme Integration

### 20.1 Programme Creation

When the IO selects an Intern Category before the Programme's first save, the system loads:

- the Active Application Form Template mapped to the Category;
- the Active Default Eligibility Configuration mapped to the Category;
- applicable Internship Windows; and
- the matching approved Project pool.

The Default Eligibility Configuration is copied into the Programme working record.

### 20.2 Category Change Before First Save

If the IO changes the Category before first save, the system replaces Category-dependent Form, Eligibility, Window and Project data. If any of that data has already been edited, the system displays an impact warning and requires confirmation.

### 20.3 Category Immutability

After the Programme is first created or saved as Draft, Intern Category is read-only. It cannot be changed even when no Application exists.

### 20.4 Programme Snapshot

On first Programme save, the system stores:

- the complete Programme Criteria structure;
- source Default Configuration Version;
- Programme Criteria Version;
- Intern Category;
- Created By and Created Date; and
- subsequent modification metadata.

The Programme uses a snapshot, not a live reference to the current Category default.

### 20.5 Reset to Latest Default

An authorised Programme user may select `Reset to Latest Default`. The action replaces Programme-level adjustments with the latest Active default for the Programme's immutable Category and requires confirmation. It is never performed automatically.

## 21. Programme Criteria Changes After Applications Exist

Where Applications exist, saving a revised Programme Criteria version must:

1. identify the affected Programme;
2. display the number of potentially affected Applications;
3. warn that previous Screening results used an earlier Criteria Version;
4. require confirmation;
5. preserve all earlier Criteria Versions and Screening evidence; and
6. allow an authorised user to opt into re-screening eligible early-stage Applications.

Applicants already at Shortlisted, Interview, Offer or a later stage are not automatically moved backwards. Every Screening result records the Programme Criteria Version used.

## 22. Screening Behaviour

This section describes how an activated configuration is consumed. It is separate from the administrator's configuration fields.

### 22.1 Criterion-Level Results

| Result | Meaning |
|---|---|
| Pass | The Applicant evidence meets the Criterion. |
| Fail | The Applicant evidence is assessable and does not meet the Criterion. |
| Unable to Assess | Required evidence is missing, unreadable, unsupported or cannot be mapped reliably. |
| Not Applicable | The Pathway does not apply to the Applicant and is skipped. |

### 22.2 Overall Flow

```text
Evaluate all Common Criteria
    -> determine one Academic Pathway from Institution + Qualification
        -> no matching Pathway:
            Ineligible - Pending IO Review; no automatic rejection
        -> matching Pathway:
            evaluate all Academic Criteria in that Pathway

Any Mandatory Fail?
    -> Yes: Ineligible and Mandatory rejection workflow
    -> No:
        Any Configurable Fail or Unable to Assess?
            -> Yes: Ineligible - Pending IO Review; no automatic rejection
            -> No: Eligible and continue to Project Suitability Assessment
```

Missing or unreadable data is never treated as an automatic Pass.

### 22.3 IO Override

An IO may override a Configurable failure or Unable to Assess result where authorised.

An override:

- requires mandatory Remarks;
- preserves the original Criterion and overall results;
- records user, date/time and reason;
- changes the applicable Eligibility Status to Eligible; and
- allows the Applicant to proceed to the applicable downstream process.

## 23. Historical Integrity and Audit

The system records:

- Draft creation;
- Common Criterion additions, amendments and removals;
- Pathway additions, amendments and removals;
- Academic Criterion additions, amendments and removals;
- Classification, threshold, scope and order changes;
- validation and Preview outcome;
- activation and supersession;
- Change Remarks;
- old and new values;
- user and date/time;
- Programme-level Criteria changes;
- Reset to Latest Default actions;
- Criteria versions used for Screening;
- re-screening decisions; and
- Eligibility overrides and mandatory Remarks.

Historical versions and Screening evidence are read-only and cannot be edited or deleted through Eligibility Criteria Settings.

## 24. Confirmed Design Decisions

1. One independent versioned default Eligibility Configuration is maintained for each of the seven Intern Categories.
2. Configuration uses a controlled Common Criteria and Academic Pathway structure, not unrestricted nested ALL/ANY logic.
3. Common Criteria and Criteria within the matched Pathway use fixed `ALL` relationships.
4. Academic Pathway is determined from Institution and Academic Qualification; Applicant cannot select it.
5. A non-applicable Pathway is recorded as `Not Applicable` and skipped.
6. No matching Pathway produces `Unable to Assess` and `Ineligible - Pending IO Review`, not automatic rejection.
7. Singapore Citizenship is initially Mandatory but the Criterion is not hard-locked.
8. Citizenship options are `Singapore Citizen` and `Non-Singapore Citizen`; Nationality is separate.
9. Education Level is a broad Configurable guardrail derived from Institution.
10. Education Level values are `Secondary`, `Post-Secondary (Non-University)` and `University`.
11. Mandatory/Configurable Classification controls failure handling, not Form field requiredness.
12. All recognised STEM subjects on the transcript must meet the configured threshold.
13. No recognised STEM subject or an unresolved relevant subject produces `Unable to Assess`, not Pass.
14. Grade Scale and Applicant field mapping are derived system logic, not free configuration in this function.
15. The Prototype's seven Category mappings and academic thresholds are the initial default values.
16. Default changes do not retrospectively alter existing Programmes.
17. Each Programme stores its own Criteria snapshot and version.
18. Programme Intern Category cannot be changed after the Programme is first created or saved as Draft.
19. Programme Criteria changes after Applications exist require impact warning, confirmation and historical preservation.
20. Educational Institution, IP school, Subject Alias and Grade Mapping initial data require business confirmation.

## 25. Pending Business / Technical Confirmation

The functional design and supported configuration fields are defined. The following implementation data still require confirmation:

- final Educational Institution list and Education Level classification;
- final Institution-to-Qualification mappings;
- final University and Polytechnic Grade Scale metadata;
- final NUS High Grade Scale metadata;
- IP school list and school-specific Grade Scales;
- Grade Equivalent Mapping for `B3 Equivalent`;
- canonical STEM Subject taxonomy and Subject Aliases; and
- technical mapping between each Category's Application Form/OCR output and canonical Eligibility fields.

These pending master-data items do not change the confirmed Eligibility Criteria Settings functional design.
