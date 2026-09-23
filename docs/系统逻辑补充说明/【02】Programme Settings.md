# 【02】Programme Settings

## 1. Document Information

| Item | Value |
|---|---|
| Document Type | System Logic Supplement / Functional Design |
| Configuration Function | Programme Settings |
| Status | Confirmed working baseline |
| Confirmation Date | 2026-08-31 |
| Primary Reference | System Requirements Specification (SyRS) 20260825 LATEST |
| Prototype Reference | Current TOA/DUT Prototype |

## 2. Purpose

Programme Settings provides one central source of configuration for the following relationship:

```text
Intern Category
└── Internship Window
    └── Allowed Project Duration
```

The configured values are used by Programme and Project Request functions. They must not be maintained independently or hard-coded in individual business pages.

The current Prototype values are the approved initial configuration for system rollout. After initialisation, authorised administrators maintain the values through Programme Settings.

## 3. SyRS Basis

| Requirement | Application in This Design |
|---|---|
| FR-ADM-017 | Authorised administrators maintain Intern Categories. |
| FR-ADM-018 | Internship Windows are configured for each Intern Category. |
| FR-ADM-019 | Project Durations are configured for each Intern Category and/or Internship Window. |
| FR-ADM-020 | Each Internship Window contains a configured period. |
| FR-ADM-021 | Only Windows applicable to the selected Intern Category are displayed. |
| FR-ADM-022 | Only Durations applicable to the selected Category and Window are displayed. |
| FR-ADM-023 | Categories, Windows and Durations can be activated or deactivated without deleting historical records. |
| FR-ADM-024 | Category–Window–Duration relationships are validated before activation. |
| FR-ADM-027 | Configured values are validated for type, format, range and value. |
| FR-ADM-028 | Configuration changes do not retrospectively change existing Programme or Internship records. |
| FR-A1.1-012 | Project Request displays the configured Windows applicable to the selected Intern Category. |
| FR-A1.1-013 | Project Request displays the configured Durations applicable to the selected Category and Window. |
| FR-A1.1-014 | A Custom Internship Window is available only where it is permitted by the selected Intern Category configuration. |

### 3.1 Confirmed Deviation from SyRS

FR-ADM-026 refers to a configurable placement variance threshold. The confirmed business decision is that this configuration is not required.

Consequently:

- Programme Settings does not contain a placement variance threshold;
- Project Request records the required number of placements directly in each request row; and
- no percentage-based or headcount-based variance rule is applied by this configuration function.

This decision must be treated as an approved clarification or SyRS deviation so that FR-ADM-026 is not implemented separately by development.

## 4. Scope Boundary

### 4.1 Included

- Intern Category maintenance;
- Internship Window maintenance under each Intern Category;
- Project Duration standard-value maintenance;
- allowed Duration configuration for each Internship Window;
- Custom Internship Window permission by Intern Category;
- display-order maintenance;
- activation and deactivation;
- Category–Window–Duration relationship validation;
- initial configuration using the confirmed Prototype values;
- dynamic use of the settings by Programme and Project Request; and
- historical-data protection and configuration audit.

### 4.2 Excluded

- Programme Centre and recipient configuration;
- Placement Variance Threshold;
- placement quantity maintenance outside Project Request;
- Calendar integration;
- Officer Hours management;
- application form configuration;
- email template configuration;
- role and permission management; and
- manual administration of Internship Year values.

Internship Year is a transaction context. The system generates the supported current and future years and uses the selected year to resolve the configured seasonal Internship Windows into actual dates.

## 5. Page Structure

The System Settings menu contains one `Programme Settings` function.

The page contains:

1. an Intern Category list on the left;
2. the selected Intern Category details on the right;
3. the Internship Windows configured for the selected Category;
4. the Allowed Project Durations for each Window;
5. Project Duration standard values; and
6. configuration change history.

Internship Windows are maintained in the context of an Intern Category. A separate top-level Window administration page is not required.

## 6. Functional Catalogue

| ID | Function | Description |
|---|---|---|
| PGS-01 | View Programme Settings | View Intern Categories and their configured Windows and Durations. |
| PGS-02 | Maintain Intern Category | Create and edit an Intern Category. |
| PGS-03 | Order Intern Categories | Control the order of Category options in business-page selection lists. |
| PGS-04 | Activate / Deactivate Intern Category | Control Category availability for new transactions without deleting history. |
| PGS-05 | Maintain Internship Window | Create and edit seasonal Windows under an Intern Category. |
| PGS-06 | Order Internship Windows | Control the order of Window options for the selected Category. |
| PGS-07 | Activate / Deactivate Internship Window | Control Window availability for new transactions without deleting history. |
| PGS-08 | Maintain Project Duration Values | Maintain standard Project Duration values expressed in months. |
| PGS-09 | Configure Allowed Durations | Select the Duration values permitted for each Internship Window. |
| PGS-10 | Configure Custom Window Permission | Allow or prevent `Customise…` for each Intern Category. |
| PGS-11 | Validate Configuration | Validate Category–Window–Duration relationships before activation or use. |
| PGS-12 | Initialise Prototype Values | Load the confirmed Prototype Categories, Windows and Durations as rollout defaults. |
| PGS-13 | View Change History | View configuration changes, previous values, operator and time. |

## 7. Intern Category Management

### 7.1 List Fields

| Field | Description |
|---|---|
| Category Code | Unique business code. |
| Intern Category Name | Name displayed in Programme and Project Request. |
| Internship Windows | Number of Active Windows configured for the Category. |
| Custom Window | `Allowed` or `Not Allowed`. |
| Display Order | Selection-list order. |
| Status | `Active` or `Inactive`. |
| Actions | View, Edit, Activate or Deactivate. |

### 7.2 Configuration Fields

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| Intern Category ID | System | System generated | Unique and read-only. |
| Category Code | Yes | Manual input | Unique. Must not be blank. Cannot be changed after use by a business record. |
| Intern Category Name | Yes | Manual input | Unique and displayed to business users. |
| Description | No | Manual input | Administrative description. |
| Allow Custom Internship Window | Yes | Selection | `Yes` or `No`. Controls whether `Customise…` is displayed. |
| Display Order | Yes | Manual input | Positive integer. Controls selection-list order. |
| Status | Yes | Selection | `Active` or `Inactive`. |
| Created By / At | System | System generated | Read-only audit information. |
| Updated By / At | System | System generated | Read-only audit information. |

### 7.3 Business Rules

- Category Code and Intern Category Name must be unique.
- Only Active Categories are available for new Project Request rows and new Programme configuration.
- A Category used by any business record cannot be physically deleted; it can only be deactivated.
- An Active Category must have at least one Active Internship Window, unless `Allow Custom Internship Window` is `Yes`.
- Deactivating a Category does not modify previously issued Requests, Programmes, Projects or Internship records.
- Reordering Categories changes future selection lists only and does not modify saved business records.

## 8. Internship Window Management

Internship Windows are configured as reusable seasonal month ranges under an Intern Category. A Window does not store a permanently fixed calendar year.

### 8.1 Configuration Fields

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| Internship Window ID | System | System generated | Unique and read-only. |
| Window Code | Yes | Manual input | Unique within the selected Intern Category. |
| Start Month | Yes | Month selection | January to December. |
| End Month | Yes | Month selection | January to December. |
| Cross-Year Indicator | System | Derived | `Yes` when End Month is earlier than Start Month; otherwise `No`. |
| Display Label | System | Derived | Generated from the selected year and month range. |
| Allowed Project Durations | Yes | Multi-selection | One or more Active Project Duration values. |
| Display Order | Yes | Manual input | Positive integer. Controls Window selection-list order. |
| Status | Yes | Selection | `Active` or `Inactive`. |
| Created By / At | System | System generated | Read-only audit information. |
| Updated By / At | System | System generated | Read-only audit information. |

No editable year is stored in an Internship Window configuration.

### 8.2 Date Resolution

The selected Internship Year provides the start-year context for each configured Window.

| Configured Window | Selected Internship Year | Resolved Period |
|---|---:|---|
| Jan–Jun | 2027 | 1 Jan 2027 – 30 Jun 2027 |
| Sep–Feb | 2027 | 1 Sep 2027 – 29 Feb 2028, where applicable |
| Dec | 2027 | 1 Dec 2027 – 31 Dec 2027 |

The system uses the first day of the Start Month and the last day of the End Month.

When End Month is earlier than Start Month, the End Month falls in the following calendar year. The system derives this behaviour; the administrator does not maintain a separate Cross-Year field.

### 8.3 Business Rules

- The same Start Month and End Month combination cannot be duplicated under one Intern Category.
- An Active Window must have at least one Active Allowed Project Duration.
- A Window used by a business record cannot be physically deleted; it can only be deactivated.
- Only Active Windows belonging to the selected Active Category are displayed for new transactions.
- Deactivating a Window does not modify previously issued Requests or other historical records.
- A single-month Window uses the same Start Month and End Month.

## 9. Project Duration Management

Project Duration values are maintained once and then selected as Allowed Project Durations under each Internship Window.

### 9.1 Configuration Fields

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| Project Duration ID | System | System generated | Unique and read-only. |
| Duration Value | Yes | Manual input | Positive whole number. Must be unique. |
| Unit | System | Derived constant | Always `Month`. |
| Display Label | System | Derived | `1 Month` for value 1; otherwise `{value} Months`. |
| Display Order | Yes | Manual input | Positive integer. Controls selection-list order. |
| Status | Yes | Selection | `Active` or `Inactive`. |
| Created By / At | System | System generated | Read-only audit information. |
| Updated By / At | System | System generated | Read-only audit information. |

### 9.2 Business Rules

- Duration Value must be a positive whole number.
- The same Duration Value cannot be created more than once.
- Only Active Duration values can be assigned to a Window.
- An Allowed Duration cannot exceed the number of calendar months covered by the Window.
- Administrators can configure a subset of the technically valid Duration values for a Window.
- A Duration used by a business record cannot be physically deleted; it can only be deactivated.
- Deactivating a Duration does not modify historical records.

For example, a Jan–Jun Window can technically contain a Duration of up to six months, but the administrator may choose to allow only `4 Months` and `6 Months`.

## 10. Custom Internship Window

Custom Internship Window availability is controlled separately for every Intern Category through `Allow Custom Internship Window`.

### 10.1 When Set to No

- the Window selection displays only Active configured Windows;
- `Customise…` is not displayed; and
- the user cannot manually enter a Window for that Category.

### 10.2 When Set to Yes

- `Customise…` is displayed after the Active configured Window options;
- selecting it allows the user to enter a custom Start Date and End Date; and
- the system displays Active Duration values that fit within the custom period.

### 10.3 Validation

- Start Date and End Date are required.
- End Date cannot be earlier than Start Date.
- Project Duration cannot exceed the custom Window length.
- The custom Window uses the selected Internship Year as its year context.
- A custom Window may cross into the following year.

All seven Prototype Intern Categories are initialised with `Allow Custom Internship Window = Yes`. An administrator may subsequently disable the option for an individual Category.

## 11. Project Request Behaviour

### 11.1 Selecting an Intern Category

The system displays:

- Active Internship Windows configured for the selected Category; and
- `Customise…` only when the selected Category allows a Custom Internship Window.

The same Intern Category may be used in more than one Project Request row because different Windows, Durations or placement quantities may be requested.

### 11.2 Changing Intern Category

When the user changes the Intern Category in one request row, the system:

- retains Placements;
- clears Internship Window;
- clears Project Duration; and
- loads the Active Windows configured for the newly selected Category.

### 11.3 Changing Internship Window

When the user changes the Internship Window, the system:

- clears the previously selected Project Duration; and
- displays only the Active Allowed Durations configured for the newly selected Window.

### 11.4 Changing Internship Year

When request rows already contain values, the system displays a confirmation message before changing Internship Year:

> Changing the internship year will clear the Internship Window and Project Duration entered for all request rows. You will need to select them again. Continue?

If the user confirms, the system:

- retains Intern Category in every row;
- retains Placements in every row;
- clears Internship Window in every row;
- clears Project Duration in every row; and
- resolves the configured Windows using the newly selected Internship Year.

If the user cancels, the existing Internship Year and request-row values remain unchanged.

The system must not silently shift already selected request-row dates to the new Internship Year.

## 12. Initial Configuration

The following current Prototype values are the approved rollout configuration.

### 12.1 Intern Categories and Internship Windows

| Intern Category | Initial Internship Windows |
|---|---|
| Junior College Scholar/Junior College Student | Jun; Dec |
| Post Junior College/Post Polytechnic Student | Jan–Jun |
| Polytechnic Scholar/Polytechnic Student | Mar–Aug; Sep–Feb; Mar–Feb |
| Undergraduate Scholar/Merit Scholar | Jan–Jun; May–Sep; Jul–Dec; Jan–Dec |
| Young Defence Scientist Programme | Sep–Dec |
| Undergraduate Student | Jan–Jun; May–Aug; Jul–Dec |
| Tech UP | Jan–Jun; May–Sep; Jul–Dec; Jan–Dec |

The Project Request version is authoritative for `Tech UP`. The different legacy mapping in the Prototype Programme page is not an approved initial value and must be replaced by the central configuration.

### 12.2 Project Duration Values

The initial Active Duration values are:

- `1 Month`;
- `2 Months`;
- `3 Months`;
- `4 Months`;
- `6 Months`; and
- `12 Months`.

### 12.3 Initial Allowed-Duration Rule

For rollout initialisation, each Window is assigned every initial Active Duration whose Duration Value is less than or equal to the number of calendar months covered by that Window.

| Window Length | Initial Allowed Durations |
|---:|---|
| 1 month | 1 Month |
| 4 months | 1, 2, 3 and 4 Months |
| 5 months | 1, 2, 3 and 4 Months |
| 6 months | 1, 2, 3, 4 and 6 Months |
| 12 months | 1, 2, 3, 4, 6 and 12 Months |

After initialisation, authorised administrators may reduce or otherwise maintain the Allowed Durations, subject to the Window-length validation.

## 13. Activation and Validation

Before an Intern Category is activated, the system validates that:

- required Category fields are complete;
- Category Code and Name are unique; and
- the Category has at least one valid Active Window or permits a Custom Internship Window.

Before an Internship Window is activated, the system validates that:

- required Window fields are complete;
- the month range is not duplicated under the Category;
- at least one Active Allowed Duration is selected; and
- every Allowed Duration fits within the Window.

Before a Project Duration is deactivated, the system warns the administrator when it is currently assigned to an Active Window. The administrator must remove or replace the assignment before completing deactivation.

Validation errors prevent activation and identify the configuration that must be corrected.

## 14. Configuration Change and Historical Data

### 14.1 New Transactions

New Project Requests and new request rows use the latest Active Programme Settings.

### 14.2 Unsent Drafts

An unsent Draft is revalidated against the current Active configuration before it can be issued.

If a selected Category, Window or Duration has subsequently been deactivated:

- the saved value remains visible with an unavailable warning;
- the user must select a currently valid value before issuing the Request; and
- the system must not silently substitute a different value.

### 14.3 Issued Requests and Historical Records

When a Project Request is issued, the system retains a snapshot of:

- Intern Category ID and displayed name;
- Internship Year;
- resolved Internship Window dates and displayed label;
- selected Project Duration value and displayed label; and
- Custom Window indicator, where applicable.

Later configuration changes must not retrospectively change:

- issued Project Requests;
- submitted or approved Projects;
- Programmes already created from the configuration; or
- Internship and placement history.

## 15. Audit Requirements

The system records Programme Settings changes, including:

- configuration entity and identifier;
- action performed;
- previous value;
- new value;
- operator;
- date and time; and
- activation or deactivation status change.

Audit records are read-only and cannot be edited or deleted through Programme Settings.

## 16. Confirmed Decisions

1. Custom Internship Window permission is configured separately for each Intern Category.
2. When Custom Internship Window is not enabled for a Category, `Customise…` is not available.
3. Placement Variance Threshold is not required and is excluded from Programme Settings.
4. The current Prototype's seven Intern Categories and Project Request Window values are the approved rollout initial configuration.
5. `Tech UP` uses the Project Request mapping: Jan–Jun, May–Sep, Jul–Dec and Jan–Dec.
6. Project Duration initial values are 1, 2, 3, 4, 6 and 12 months.
7. Programme Settings becomes the central source of Category, Window and Duration options; individual pages must not maintain separate hard-coded copies.
8. Internship Year is not manually maintained in Programme Settings.
9. Changing Internship Year clears Window and Duration values after user confirmation, while retaining Intern Category and Placements.
10. Configuration changes do not retrospectively change issued or historical business records.

