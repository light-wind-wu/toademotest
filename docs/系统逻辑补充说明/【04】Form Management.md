# 【04】Form Management

## 1. Document Information

| Item | Value |
|---|---|
| Document Type | System Logic Supplement / Functional Design |
| Configuration Function | Form Management |
| Status | Confirmed working baseline with identified Technical / Business confirmations |
| Confirmation Date | 2026-09-02 |
| Primary Reference | System Requirements Specification (SyRS) 20260825 LATEST |
| Business Field Reference | Copy of Internship Form Field Request_Consolidated.xlsx — `Internship Application Form v2` |
| Prototype Reference | Current TOA/DUT Prototype |

## 2. Purpose

Form Management allows authorised administrators to create and maintain the Application Form used by Applicants for each Intern Category through the administrator user interface without requiring a software code change.

The function covers:

- the Application Form mapped to each Intern Category;
- Form Sections and Fields;
- field types, labels, instructions, mandatory rules and validations;
- conditional-display rules;
- form-specific options and bindings to shared Dictionaries;
- supporting-document requirements;
- Academic Transcript upload and OCR-supported Academic Results;
- Grade Scale and Subject data required by Eligibility Screening;
- Applicant-facing preview;
- Form versioning, activation and historical integrity; and
- complete configuration audit history.

The core relationship is:

```text
Intern Category
    -> one Active Application Form
    -> Programme loads the applicable Active Form Version
    -> Programme retains the selected Form Version
    -> Applicant completes and submits the Form
    -> confirmed Application data supports Eligibility Screening
```

## 3. SyRS, Business Workbook and Prototype Basis

| Requirement / Source | Application in This Design |
|---|---|
| FR-A2.1-004 | The Active Application Form mapped to the selected Intern Category is automatically populated during Programme creation and can be previewed. |
| FR-B1.1-006–010 | Applicable Applicant particulars may be obtained through MyInfo, reviewed and updated where permitted. |
| FR-B1.1-012–013 | The configured Form content is presented within the Application journey with applicable instructions. |
| FR-B1.1-014 | Academic Transcript is a mandatory supporting document. |
| FR-B1.1-015 | Curriculum Vitae is supported as an upload. It is Optional in this confirmed design. |
| FR-B1.1-016–017 | Supported academic information is extracted from uploaded documents and may be reviewed and amended by the Applicant. |
| FR-B1.1-018–019 | Preferred Internship Start and End Dates are captured and validated. |
| FR-B1.1-020 | Areas of Interest are configurable selections. This design limits the Applicant to a maximum of three selections. |
| FR-B1.1-031–033 | Programme-specific questions, credit-bearing declarations and Source Channel information are conditionally captured. |
| FR-B1.1-035–040 | The Applicant may save, resume, amend and submit an Application subject to completeness validation. |
| FR-B1.1-044–046 | Profile Photograph upload is supported and is Optional in this design. |
| FR-ADM-029–041 | Authorised administrators maintain Form Templates, Sections, Fields, options, validations, conditional rules, supporting documents, preview, status and historical versions. |
| BR-ADM-001–005, BR-ADM-009 | Configuration is restricted to authorised users; inactive configurations are unavailable for new use; historical configurations remain intact. |
| Internship Application Form v2 | Provides the seven Intern Category applicability and mandatory-field matrix used as the initial field baseline. |
| Current Prototype | Provides the working Form Builder, Form list, preview and Programme linkage interaction patterns. Prototype Template mappings are not the final one-to-one mapping. |

## 4. Scope Boundary

### 4.1 Included

- one Application Form for each of the seven Intern Categories;
- one current Active Form Version per Active Intern Category;
- administrator front-end maintenance of Form Sections, Fields and form-specific options;
- Applicant front-end completion and amendment of Application responses before submission;
- field ordering and Section ordering;
- mandatory and optional field configuration;
- field instructions, descriptions, help text and placeholders;
- validation and conditional-display rules;
- shared-Dictionary binding and form-specific option maintenance;
- MyInfo, Manual, OCR and System-derived data sources;
- Academic Transcript, CV and Profile Photograph requirements;
- configurable Academic Results blocks by Qualification and Institution;
- Grade Scale selection and Grade validation;
- Subject normalisation and STEM classification for Eligibility Screening;
- Form preview and activation validation;
- versioning, Programme linkage, Application snapshots and audit history; and
- initialisation using the confirmed business workbook and approved supporting reference data.

### 4.2 Excluded

- Intern Category creation and status maintenance;
- Educational Institution value maintenance;
- Area of Interest value maintenance;
- Source Channel value maintenance;
- Eligibility Criterion creation, threshold configuration and screening-outcome workflow;
- MyInfo authentication and identity-verification implementation;
- Defender Archetype Quiz configuration;
- Project recommendation and ranking logic;
- post-submission Application amendment workflow;
- OCR engine implementation details and vendor selection;
- external synchronisation of Institution, Qualification, Grade Scale or Subject data; and
- Role and Permission matrix definition.

Intern Categories are maintained under `Programme Settings`. Educational Institutions, Areas of Interest and Source Channels are maintained under `Dictionary Management`. Eligibility Criteria are maintained under `Eligibility Criteria Settings`.

## 5. Configuration Model

The following seven Intern Categories each have an independent Application Form:

1. Undergraduate Scholar / Merit Scholar;
2. Tech UP;
3. Undergraduate Student;
4. Polytechnic Scholar / Polytechnic Student;
5. Junior College Scholar / Junior College Student;
6. Post Junior College / Post Polytechnic Student; and
7. Young Defence Scientist Programme.

The following rules apply:

- one Application Form belongs to exactly one Intern Category;
- one Active Intern Category must have exactly one Active Application Form Version;
- an Application Form cannot be shared by multiple Intern Categories;
- a Programme cannot select a Form belonging to another Intern Category;
- the system automatically resolves the applicable Form from the selected Intern Category;
- each Form remains independently editable even where two Forms contain similar Fields; and
- the Prototype's shared and legacy Template mappings must be consolidated into the seven confirmed Forms during production initialisation.

## 6. User Responsibilities

### 6.1 Authorised Administrator

An authorised administrator uses the System Settings user interface to:

- create a Form or a new Form Version;
- edit Form metadata, Sections, Fields and form-specific options;
- bind Fields to shared Dictionaries and system-controlled lists;
- configure validations, conditional rules and supporting documents;
- configure the applicable Academic Results blocks;
- preview and validate the Form;
- activate or deactivate an applicable Form Version; and
- view Form version and audit history.

No software code or seed-data amendment is required for normal Form maintenance.

### 6.2 Applicant

An Applicant may:

- enter and amend permitted Application responses;
- save and resume an Application Draft;
- review MyInfo-populated values;
- update permitted contact values;
- upload or replace supporting documents;
- review and amend OCR-extracted Academic Results; and
- amend the Application before submission.

An Applicant cannot amend the Form structure, selectable-value master data, Grade Scale or Eligibility Criteria.

## 7. Page Structure

System Settings contains one `Form Management` function.

The function contains:

1. an Application Form list by Intern Category;
2. Form status, current version and usage information;
3. Form metadata;
4. Section and Field Builder;
5. Field configuration panel;
6. option-source and option-maintenance panel;
7. supporting-document configuration;
8. Academic Results configuration;
9. Applicant-facing live preview;
10. validation and activation actions;
11. version history; and
12. change history.

The Form Builder may support drag-and-drop or explicit Move Up / Move Down controls. The functional requirement is that administrators can reliably reorder Sections, Fields and applicable options.

## 8. Functional Catalogue

| ID | Function | Description |
|---|---|---|
| FM-01 | View Application Forms | View the seven Intern Categories and their current Form, Version, Status and usage information. |
| FM-02 | Create Application Form | Create an initial Form for an Intern Category that does not already have a Form. |
| FM-03 | Duplicate Application Form | Copy an existing Form as the starting point for another Category or a new Draft Version. |
| FM-04 | Edit Form Draft | Maintain Form content through the administrator user interface. Editing an Active Version creates a Draft Version. |
| FM-05 | Manage Sections | Add, edit, remove and reorder Form Sections. |
| FM-06 | Manage Fields | Add, edit, remove, deactivate and reorder Fields. |
| FM-07 | Configure Field Rules | Configure mandatory status, instructions, validations, data source and conditional-display rules. |
| FM-08 | Manage Form-specific Options | Add, edit, deactivate, delete and reorder options belonging only to the applicable Form Field. |
| FM-09 | Bind Shared Dictionary | Bind a selection Field to a supported Dictionary Type without copying its values into the Form. |
| FM-10 | Configure Option Behaviour | Configure single or multiple selection, maximum selections, `Other` behaviour and additional-input requirements. |
| FM-11 | Configure Supporting Documents | Configure Transcript, CV, Profile Photograph and approved future document requirements. |
| FM-12 | Configure Academic Results | Configure Qualification-dependent GPA, CAP, Score, Subject and Grade blocks. |
| FM-13 | Preview Form | Preview the Form as an Applicant, including conditional Fields and current Active options. |
| FM-14 | Validate Form | Validate Form completeness, references, Eligibility dependencies and rendering before activation. |
| FM-15 | Activate Form Version | Activate a valid Draft Version and supersede the previous Active Version. |
| FM-16 | Deactivate Application Form | Deactivate a Form where this does not leave an Active Intern Category without a valid Active Form. |
| FM-17 | Delete Draft | Permanently delete only an unreferenced Draft Form or Draft Version. |
| FM-18 | View Version History | View previous Form Versions and their complete configuration. |
| FM-19 | View Change History | View creation, amendment, option, status and activation changes. |

## 9. Application Form List

The list contains:

| Field | Description |
|---|---|
| Intern Category | The one Category to which the Form belongs. |
| Form Name | Administrative and Applicant-facing Form name. |
| Active Version | Current Active Version number. |
| Status | `Draft`, `Active`, `Superseded` or `Inactive`. |
| Sections / Fields | Number of configured Sections and Fields. |
| Programmes Using Version | Number of Programmes referencing the displayed Version. |
| Last Updated By / At | Latest change information. |
| Actions | View, Edit, Duplicate, Preview, Activate, Deactivate or Delete Draft, as applicable. |

## 10. Form, Section and Field Configuration

### 10.1 Form Header Fields

| Field | Required | Source / Rules |
|---|---:|---|
| Form ID | System | Stable unique identifier. |
| Form Name | Yes | Unique administrative name. Recommended to use the Intern Category name followed by `Application Form`. |
| Intern Category | Yes | Selected from Programme Settings. Cannot be changed after the Form is referenced. |
| Description | No | Administrative description. |
| Version | System | System-generated sequential Version. |
| Status | Yes | `Draft`, `Active`, `Superseded` or `Inactive`. |
| Created By / At | System | Read-only audit information. |
| Updated By / At | System | Read-only audit information. |
| Activated By / At | System | Populated when the Version becomes Active. |

### 10.2 Section Fields

| Field | Required | Rules |
|---|---:|---|
| Section ID | System | Stable unique identifier. |
| Section Name | Yes | Applicant-facing Section heading. |
| Instructions | No | Text displayed before the Section Fields. |
| Conditional Display Rule | No | Uses supported Field and value conditions. |
| Display Order | Yes | Positive integer or derived from the reorder action. |
| Status | Yes | `Active` or `Inactive` within the Draft. |

### 10.3 Field Configuration

| Field | Required | Rules |
|---|---:|---|
| Field ID | System | Stable unique identifier. |
| Stable Field Key | Yes | Unique within the Form. Used to store and retrieve Application data. |
| Field Label | Yes | Applicant-facing label. Label changes do not change the Stable Field Key. |
| Field Type | Yes | One supported standard or system-composite Field Type. |
| Data Source | Yes | `Manual`, `MyInfo`, `OCR` or `System`. |
| Mandatory | Yes | `Yes` or `No`. May become Mandatory through a conditional rule. |
| Read-only | Yes | Controls whether the Applicant can amend the value. |
| Placeholder | No | Input example or short prompt. |
| Instructions / Help Text | No | Guidance displayed with the Field. |
| Option Source | Conditional | Required for selection Fields. |
| Validation Rules | Conditional | Applicable format, length, range, precision, date or file rules. |
| Conditional Display Rule | No | Controls Field visibility and conditional mandatory status. |
| Eligibility Data Mapping | Conditional | Canonical Applicant / Academic Result value supplied to Eligibility Screening. |
| Display Order | Yes | Positive integer or derived from the reorder action. |
| Status | Yes | `Active` or `Inactive` within the Draft. |

Application answers must be stored using the Stable Field Key and Form Version. A change to a Field Label must not break or reinterpret historical Application data.

## 11. Supported Field Types

### 11.1 Standard Field Types

- Single-line Text;
- Multi-line Text;
- Number;
- Date;
- Dropdown;
- Radio Button;
- Checkbox;
- Multi-select; and
- File Upload.

### 11.2 System-composite Field Types

The following composite types are required because they cannot be represented safely by an unstructured Textbox:

- Institution Selector;
- Academic Qualification Selector;
- Academic Transcript Upload;
- Academic Results / OCR Review Block;
- GPA / CAP / Total Score Field;
- Subject and Grade Table; and
- MyInfo-prefilled Field.

The Academic Results block dynamically displays the Fields applicable to the Applicant's Institution and Academic Qualification.

## 12. Selection Option Sources

Each Dropdown, Radio Button, Checkbox or Multi-select Field uses exactly one Option Source.

### 12.1 Shared Dictionary

Shared Dictionaries are used where the same controlled values are consumed by multiple Forms or business functions.

Initial Form bindings include:

| Field | Dictionary Type | Behaviour |
|---|---|---|
| Name of Institution | Educational Institutions | Single selection. Free-text Institution Name is not allowed. |
| Areas of Interest | Areas of Interest | Multi-selection with a confirmed maximum of three selections. |
| How did you hear of this Internship opportunity? | Source Channels | Uses the configured selection behaviour; `Others` requires additional details. |

Form Management stores the Dictionary Type reference rather than copying its items into the Form.

New selections use the current Active Dictionary Items. Each saved Application retains both the selected Dictionary Item ID and the Display Label applicable when the selection was saved.

### 12.2 Form-specific Options

Form-specific Options are used for values applicable only to one Form Field, for example:

```text
Are you a bonded scholarship recipient?
- Yes
- No
```

Each Form-specific Option contains:

| Field | Required | Rules |
|---|---:|---|
| Option ID | System | Stable unique identifier. |
| Option Code | Yes | Unique within the Field and stable after use. |
| Display Label | Yes | Applicant-facing text. |
| Additional Input Rule | Yes | `None`, `Optional` or `Required`. |
| Display Order | Yes | Selection order. |
| Status | Yes | `Active` or `Inactive`. |

An unreferenced Draft Option may be deleted. An Option referenced by an Application can only be deactivated. A Display Label change does not amend the label snapshot retained by a historical Application.

### 12.3 System-controlled Lists

The following are system-controlled reference values and cannot be freely maintained as Form-specific Options:

- Country and Nationality;
- Academic Qualification;
- Subject Level, including G1/G2/G3, H1/H2/H3 and HL/SL;
- Grade Scale;
- Form Status; and
- Application Status.

The Form can bind to these lists but cannot change their technical meaning.

## 13. Confirmed Initial Forms and Fields

### 13.1 Common Fields

The following Fields apply to all seven Forms.

#### Programme Information

- Programme — System-populated and read-only;
- Intern Category — System-populated and read-only.

The Applicant does not select or change the Intern Category within the Form.

#### Personal Details

- Profile Photograph — Optional;
- Name — Mandatory;
- NRIC / FIN — Mandatory;
- Nationality — Mandatory;
- Country of Birth — Mandatory;
- Date of Birth — Mandatory;
- Sex — Mandatory;
- Mobile Number — Mandatory; and
- Email — Mandatory.

MyInfo-populated values display their source. Fields that the Applicant may update, including Mobile Number and Email, are configured as editable.

#### Education Details

- Name of Institution — Mandatory configured dropdown, no free-text Institution Name;
- Year of Study as of Preferred Internship Start Date — Mandatory;
- Current / Intended Course of Study — Mandatory except where identified for YDSP;
- Academic Qualification — System-suggested or Applicant-confirmed where required;
- Academic Transcript — Mandatory; and
- Academic Results Review — dynamically generated from the applicable Qualification and Grade Scale.

#### Application Details

- Preferred Internship Start Date — Mandatory;
- Preferred Internship End Date — Mandatory and later than Start Date;
- Areas of Interest — Mandatory, minimum one and maximum three selections;
- Other Achievements — Optional;
- Source Channel — Mandatory; and
- Other Source Details — conditionally Mandatory when `Others` is selected.

#### Supporting Documents

- Academic Transcript — Mandatory;
- Curriculum Vitae — Optional; and
- Profile Photograph — Optional.

### 13.2 Category-specific Differences

| Intern Category | Category-specific or Conditional Content |
|---|---|
| Undergraduate Scholar / Merit Scholar | Bonded Scholarship declaration and conditional Scholarship Name; Credit-bearing Internship declaration; University Academic Results extracted from the mandatory Transcript. |
| Tech UP | Bonded Scholarship declaration and conditional Scholarship Name; DSTA Scholarship Interest is Optional; Expected Graduation; University GPA; Credit-bearing Internship declaration. |
| Undergraduate Student | Bonded Scholarship declaration and conditional Scholarship Name; DSTA Scholarship Interest; Expected Graduation; University GPA; Credit-bearing Internship declaration. |
| Polytechnic Scholar / Polytechnic Student | DSTA Scholarship Interest; Polytechnic cGPA; Credit-bearing Internship declaration. |
| Junior College Scholar / Junior College Student | DSTA Scholarship Interest; A-Level, IB or NUS High Academic Results. |
| Post Junior College / Post Polytechnic Student | Bonded Scholarship declaration and conditional Scholarship Name; DSTA Scholarship Interest; A-Level, IB, NUS High or Polytechnic Academic Results according to Qualification. |
| Young Defence Scientist Programme | DSTA Scholarship Interest; Current / Intended Course of Study is Optional; O-Level, SEC or IP Subject Grades. |

### 13.3 Undergraduate Scholar GPA Handling

The business workbook does not identify GPA / CAP / Rank Points as a separate manual-input Field for Undergraduate Scholar / Merit Scholar, while the confirmed initial Eligibility Criteria require University GPA.

The design therefore applies the following rule:

- a separate manual GPA question is not added to the basic Form;
- the Academic Transcript remains Mandatory;
- the system extracts the applicable University GPA from the Transcript;
- the GPA is displayed in the Academic Results Review block;
- the Applicant may correct the extracted value before submission; and
- the confirmed GPA is supplied to Eligibility Screening.

## 14. Conditional-display Rules

The Form Builder supports at least single-parent Field conditions using supported operators such as `is`, `is not`, `contains` and `is any of`.

Initial rules include:

```text
If Bonded Scholarship Recipient = Yes
    show Scholarship Name
    Scholarship Name becomes Mandatory
```

```text
If Source Channel = Others
    show Other Source Details
    Other Source Details becomes Mandatory
```

```text
If Academic Qualification = IB Diploma
    show IB Subject Grades and IB Total Score
```

```text
If Academic Qualification = GCE A-Level
    show H1/H2/H3 Subject and Grade Fields
```

```text
If Academic Qualification = Polytechnic Diploma
    show Polytechnic cGPA and applicable Module Results
```

A conditional rule cannot reference a removed, Inactive or incompatible parent Field or Option.

## 15. Academic Results and OCR

### 15.1 Processing Flow

```text
Applicant selects Institution
    -> system determines or suggests Academic Qualification
    -> Applicant uploads Academic Transcript
    -> file validation and security checks
    -> OCR extracts Institution, Qualification, GPA / CAP / Score, Subjects and Grades
    -> system normalises extracted Subjects and Grades
    -> Applicant reviews and amends the extracted values
    -> Applicant confirms the Academic Results
    -> confirmed values are saved and supplied to Eligibility Screening
```

Where the Institution does not uniquely identify the Qualification, the Applicant confirms the applicable Academic Qualification.

### 15.2 Stored Extraction Information

The system retains:

- Transcript File Reference;
- OCR Processing Status;
- OCR Raw Value;
- OCR Confidence by extracted Field where available;
- Normalised Value;
- Applicant Confirmed Value;
- whether the Applicant amended the extracted value;
- previous and amended value;
- extraction date and time; and
- applicable Institution, Qualification, Grade Scale and Subject mapping references.

Eligibility Screening uses the Applicant Confirmed Value, not an unconfirmed OCR Raw Value.

### 15.3 Re-upload Behaviour

When an Applicant replaces a Transcript after extracted or confirmed values exist, the system must:

1. inform the Applicant that reprocessing may replace the current Academic Results;
2. require confirmation before continuing;
3. retain the previous extraction in audit history;
4. process the replacement Transcript; and
5. require the Applicant to review the new extraction before submission.

### 15.4 OCR Confidence — Technical Confirmation Required

The final OCR accuracy target and Field-level confidence thresholds require Technical confirmation based on the selected OCR service and a representative Transcript proof of concept.

The thresholds must be configurable rather than hard-coded. The following values are a recommended starting point for Technical validation only:

| Confidence | Recommended Initial Behaviour |
|---|---|
| `>= 90%` | Populate the extracted value and display it for Applicant confirmation. |
| `70%–89%` | Populate the value with a low-confidence warning and require explicit Applicant review. |
| `< 70%` | Do not treat the value as confirmed; require Applicant correction or manual entry. |

No Applicant may be automatically rejected solely because OCR confidence is low or extraction failed.

The final threshold values and accuracy acceptance criteria remain `Pending Technical Confirmation`.

## 16. Grade Scale and Academic Result Structures

The system uses the Applicant's Institution and Academic Qualification to resolve the applicable Academic Result structure and Grade Scale.

### 16.1 University

The Academic Results block supports:

- Institution;
- Course / Major;
- Year of Study;
- Current GPA;
- Maximum GPA;
- applicable Academic Term / Year; and
- resolved Grade Scale.

Initial GPA Scales:

| Institution | GPA Scale |
|---|---:|
| National University of Singapore | `0.00–5.00` |
| Nanyang Technological University | `0.00–5.00` |
| Singapore University of Technology and Design | `0.00–5.00` |
| Singapore Management University | Cumulative GPA `0.00–4.00` |

### 16.2 Polytechnic

The Academic Results block supports:

- Institution;
- Diploma / Course;
- Year of Study;
- current cumulative GPA;
- Maximum GPA `4.00`; and
- Module Grades where extracted and applicable.

The initial Eligibility comparison uses cumulative GPA. Polytechnic-specific Module Grade labels may be retained as raw and normalised values where extracted.

### 16.3 GCE A-Level

Each extracted result contains:

- Subject Name;
- Subject Level; and
- Grade.

H1/H2 Grade Scale:

```text
A, B, C, D, E, S, Ungraded
```

H3 Grade Scale:

```text
Distinction, Merit, Pass, Ungraded
```

### 16.4 International Baccalaureate Diploma

Each extracted result contains:

- Subject Name;
- Subject Level — `HL` or `SL`;
- Subject Grade — `7` to `1`;
- IB Total Score — `0` to `45`; and
- Examination Session / Year.

### 16.5 NUS High School Diploma

The Academic Results block supports:

- Subject / Module Name;
- Grade; and
- CAP `0.00–5.00`.

### 16.6 GCE O-Level and Secondary Education Certificate

Each extracted result contains:

- Subject Name;
- Subject Level where applicable; and
- Grade.

Initial Grade Scales:

| Qualification / Level | Grade Scale |
|---|---|
| GCE O-Level / SEC G3 | `A1, A2, B3, B4, C5, C6, D7, E8, 9` |
| SEC G2 | `1, 2, 3, 4, 5, 6` |
| SEC G1 | `A, B, C, D, E` |

The Subject Level must be stored for SEC results so that Grades are interpreted using the correct Scale.

### 16.7 Integrated Programme

IP Academic Results contain:

- Institution;
- Academic Year;
- Subject Name;
- Raw Grade;
- Normalised Grade; and
- resolved Institution Grade Scale.

The initial IP Institution, Subject Alias and Grade Scale dataset remains `Pending Business Confirmation`.

## 17. STEM Subject Identification

The confirmed Eligibility Criteria remain unchanged, including:

```text
IP STEM Subject Grade >= B3
O-Level STEM Subject Grade >= B3
A-Level STEM Subject Grade >= B
```

Form Management and its supporting reference data provide the normalised Academic Result required by those Criteria. They do not change the Eligibility mechanism or configured thresholds.

The system uses a Subject Master containing:

| Field | Description |
|---|---|
| Canonical Subject ID | Stable system identifier. |
| Canonical Subject Name | Standard Subject name. |
| Qualification Type | Qualification under which the Subject is recognised. |
| Subject Level | Applicable G1/G2/G3, H1/H2/H3, HL/SL or other level. |
| STEM Indicator | `Yes` or `No`. |
| OCR Aliases | Alternative Transcript names and abbreviations. |
| Status | `Active` or `Inactive`. |

The initial STEM scope includes applicable versions of:

- Mathematics;
- Additional Mathematics;
- Further Mathematics;
- Physics;
- Chemistry;
- Biology;
- Science;
- Combined Science;
- Computing / Computer Science;
- Electronics; and
- Biotechnology.

The processing sequence is:

```text
OCR Subject Name
    -> match OCR Alias
    -> resolve Canonical Subject
    -> determine STEM Indicator
    -> compare Grade using the applicable Grade Scale
    -> supply the Criterion result to Eligibility Screening
```

An unrecognised Subject must be flagged for Applicant correction or manual review. It must not cause automatic rejection solely because the Subject Alias was not resolved.

## 18. Supporting Documents and File Validation

### 18.1 Initial Requirements

| Document | Requirement | Recommended Initial Formats | Recommended Initial Limit |
|---|---|---|---:|
| Academic Transcript | Mandatory | PDF, JPG/JPEG, PNG | `10 MB` per file; `20 MB` per Transcript upload set |
| Curriculum Vitae | Optional | PDF | `10 MB` per file |
| Profile Photograph | Optional | JPG/JPEG, PNG | `5 MB` per file |

The values above are a recommended general starting point and remain `Pending Technical Confirmation`.

PDF is preferred for multi-page Academic Transcripts. Image uploads support scanned or photographed pages. HEIC is not included in the initial recommendation because browser, server-side conversion and OCR compatibility must be confirmed before support is offered.

The Technical team must confirm:

- final permitted MIME types and file-signature validation;
- whether multiple image files may form one Transcript upload set;
- maximum file count for a Transcript upload set;
- final per-file and total upload limits;
- encrypted or password-protected PDF handling;
- malware and file-security scanning;
- image resolution and minimum quality requirements; and
- OCR and storage impact of the proposed limits.

File extension alone must not be treated as sufficient validation. An invalid, unsupported, corrupted, encrypted or oversized file is rejected with a clear error and can be replaced by the Applicant.

## 19. Areas of Interest Selection

The Areas of Interest Field is configured as follows:

| Setting | Confirmed Value |
|---|---|
| Option Source | Shared Dictionary — Areas of Interest |
| Selection Type | Multi-select |
| Minimum Selections | `1` |
| Maximum Selections | `3` |
| Mandatory | `Yes` |

The maximum-selection rule is maintained on the Form Field, not on individual Area of Interest Dictionary Items.

## 20. Form Versioning and Historical Integrity

### 20.1 Edit and Activation

- an Active Version cannot be directly overwritten;
- selecting `Edit` on an Active Version creates a new Draft Version;
- administrators edit, preview and validate the Draft;
- activating the Draft atomically makes it the current Active Version;
- the previous Active Version becomes `Superseded`; and
- cancelling or deleting an unreferenced Draft does not affect the Active Version.

### 20.2 Programme Behaviour

- a new Programme loads the current Active Form Version mapped to its Intern Category;
- the Programme retains the resolved Form ID and Form Version;
- a Draft Programme may explicitly refresh to the latest Active Form Version before publication;
- a Published Programme remains linked to the Form Version applicable when it was published; and
- a later Form activation does not automatically change a Published Programme.

### 20.3 Application Behaviour

- an Application retains its Form ID and Form Version;
- saved responses are associated with Stable Field Keys and applicable Option IDs;
- Draft and submitted Applications remain readable using the applicable historical Form Version;
- Form, Field or Option label changes do not rewrite historical response snapshots; and
- a referenced Form Version, Field or Option cannot be permanently deleted where deletion would affect history.

## 21. Activation Validation

Before a Draft Form Version becomes Active, the system validates that:

- the Form belongs to one valid Intern Category;
- activation will not create more than one Active Form Version for the Category;
- every Active Intern Category has an applicable Active Form;
- Form and Section names are present;
- Stable Field Keys are complete and unique within the Form;
- all Mandatory Fields have valid configurations;
- Field Types and Data Sources are compatible;
- all selection Fields have a valid Option Source;
- Shared Dictionary references exist;
- form-specific Option Codes are unique within the Field;
- conditional rules do not contain missing, Inactive, circular or incompatible references;
- Academic Transcript remains Mandatory;
- Fields required by the applicable Eligibility Criteria can be collected or extracted;
- Institution, Qualification, Grade Scale and Academic Result relationships are valid;
- Areas of Interest enforce a maximum of three selections;
- file requirements contain valid Technical configuration; and
- the Applicant-facing Form can be rendered and progressed without a blocking configuration error.

An invalid Form cannot be activated. The system identifies the affected Section, Field, Option or rule and requires correction.

## 22. Status and Deletion Rules

- only an Active Form Version is available for a new Programme mapping;
- an Inactive or Superseded Version is not available for new Programme mapping;
- an Active Form cannot be deactivated if doing so would leave its Active Intern Category without a valid Form;
- an unreferenced Draft may be permanently deleted;
- a referenced Version, Field or Option cannot be permanently deleted;
- referenced content is deactivated or superseded while remaining available for historical display; and
- status, deletion and activation actions are recorded in the audit history.

## 23. Confirmed and Pending Items

### 23.1 Confirmed

- one Application Form per Intern Category;
- seven initial Forms;
- administrator front-end Form editing;
- administrator maintenance of form-specific selection options;
- shared-Dictionary binding for Educational Institutions, Areas of Interest and Source Channels;
- Educational Institution is a configured dropdown with no free-text Institution Name;
- Academic Transcript is Mandatory;
- Curriculum Vitae is Optional;
- Profile Photograph is Optional;
- Qualification-dependent Academic Results and Grade Scales;
- Applicant review and amendment of OCR-extracted information;
- STEM Subject identification through Canonical Subject mapping;
- Eligibility Criteria and thresholds remain unchanged;
- Areas of Interest allows a maximum of three selections;
- Form versioning and historical Application integrity; and
- configuration and operational audit history.

### 23.2 Pending Technical Confirmation

- OCR accuracy target;
- OCR Field-level confidence thresholds;
- final permitted file formats and MIME types;
- Transcript multi-file handling and maximum file count;
- final per-file and total upload-size limits;
- image quality requirements;
- encrypted or password-protected PDF handling;
- malware and file-security scanning; and
- storage, OCR and performance impact of the recommended file limits.

### 23.3 Pending Business Confirmation

- final IP Institution list;
- IP Institution-to-Qualification mapping;
- IP Subject names and OCR aliases;
- IP Institution Grade Scales; and
- applicable normalised IP Grade values used by the confirmed Eligibility comparison.

These pending datasets and Technical parameters do not prevent confirmation of the Form Management functional design. They must be resolved before production configuration, integration testing and production acceptance.
