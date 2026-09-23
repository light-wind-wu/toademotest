# 【01】Programme Centre & Recipient Settings

## 1. Document Information

| Item | Value |
|---|---|
| Document Type | System Logic Supplement / Functional Design |
| Configuration Function | Programme Centre & Recipient Settings |
| Status | Confirmed working baseline |
| Confirmation Date | 2026-08-31 |
| Primary Reference | System Requirements Specification (SyRS) 20260825 LATEST |

## 2. Purpose

This function maintains:

- Programme Centre master records;
- the PC Head associated with each Programme Centre;
- the AD (P&C) associated with each Programme Centre;
- the default `To` recipients for a Project Request;
- the default `CC` recipients for a Project Request; and
- the rules used to populate recipients when a Programme Centre is selected.

The function does not grant system access to any contact. Access permissions are managed separately through Role & Permission Management.

## 3. SyRS Basis

| Requirement | Application in This Design |
|---|---|
| FR-ADM-001 | Authorised administrators can create and maintain Programme Centre records. |
| FR-ADM-002 | A PC Head is associated with each Programme Centre. |
| FR-ADM-003 | An AD (P&C) is associated with each Programme Centre. |
| FR-ADM-005–008 | Assignments can be updated, activated/deactivated and retained for historical traceability. |
| FR-A1.1-008 | Project Request recipients are populated from the selected Programme Centre. |
| FR-A1.1-009 | Recipient Name and Appointment are displayed where available. |
| FR-A1.1-010 | IO Admin can add or remove CC recipients for one Project Request without changing the configured mapping. |
| FR-A1.1-011 | Authorised users can maintain Project Request recipient mappings. |
| BR-A1.1-007–008 | Default recipients are determined by Programme Centre; request-level CC changes do not update the configured mapping. |
| ES-A1.1-001 | A Project Request cannot be issued when required recipient configuration is missing. |

### 3.1 Confirmed Business Clarification

PC Head and AD (P&C) contact details are manually maintained in this function. They do not need TOA user accounts.

Consequently:

- contacts are not selected from User Management;
- no User ID or Account ID is stored against the contact;
- the system does not validate whether a contact holds a TOA role;
- disabling a TOA account does not automatically disable a Programme Centre contact; and
- FR-ADM-004 and ES-ADM-001 role-eligibility validation do not apply to these manually maintained contact records.

Any TOA access held by the same person is independently controlled through Role & Permission Management.

## 4. Scope Boundary

### 4.1 Included
- Programme Centre list, search and filtering;
- create and edit Programme Centre;
- activate and deactivate Programme Centre;
- manual PC Head name and email maintenance;
- manual AD (P&C) name and email maintenance;
- Project Request `To` mapping;
- Project Request default `CC` mapping;
- HQ recipient maintenance;
- other recipient maintenance;
- recipient preview;
- configuration validation; and
- configuration change history and audit.

### 4.2 Excluded

- user login account management;
- role and permission assignment;
- email template content;
- Fixed CC or Mandatory CC;
- Reminder and chase-notification processing;
- Resend processing;
- Calendar integration; and
- Officer Hours management.

## 5. Page Structure

The System Settings menu contains one `Programme Centre & Recipient Settings` function.

The function contains:

1. Programme Centre List; and
2. Programme Centre Detail.

Programme Centre Detail is divided into:

1. Basic Information;
2. PC Head;
3. AD (P&C);
4. Project Request Recipient Mapping;
5. Recipient Preview; and
6. Change History.

These sections do not require separate System Settings menu items.

## 6. Functional Catalogue

| ID | Function | Description |
|---|---|---|
| PCR-01 | View Programme Centres | View, search and filter Programme Centre records. |
| PCR-02 | Create Programme Centre | Create a Programme Centre with its required contacts and initial recipient mapping. |
| PCR-03 | Edit Programme Centre | Amend Programme Centre information and manually maintained contact information. |
| PCR-04 | Activate / Deactivate | Control availability for new transactions without deleting historical data. |
| PCR-05 | Maintain PC Head | Maintain the single PC Head name and email address for the Programme Centre. |
| PCR-06 | Maintain AD (P&C) | Maintain the single AD (P&C) name and email address for the Programme Centre. |
| PCR-07 | Maintain To Mapping | Configure the recipients populated as `To` for Project Requests. |
| PCR-08 | Maintain Default CC Mapping | Configure the recipients populated as editable `CC` for Project Requests. |
| PCR-09 | Preview Recipients | Preview the resolved recipient names, appointments, email addresses and types. |
| PCR-10 | View Change History | View configuration changes, previous values, operator and time. |

## 7. Programme Centre List

### 7.1 Display Fields

| Field | Description |
|---|---|
| Programme Centre Code | Unique business code. |
| Programme Centre Name | Full display name. |
| PC Head | Current manually maintained PC Head name. |
| AD (P&C) | Current manually maintained AD (P&C) name. |
| To Recipients | Number of active configured `To` recipients. |
| Default CC Recipients | Number of active configured `CC` recipients. |
| Status | `Active` or `Inactive`. |
| Actions | View, Edit, Activate or Deactivate. |

### 7.2 Supported Actions

- search by Programme Centre Code or Name;
- filter by Status;
- open Programme Centre Detail;
- create a Programme Centre;
- activate a Programme Centre; and
- deactivate a Programme Centre.

## 8. Configuration Fields

### 8.1 Basic Information

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| Programme Centre ID | System | System generated | Unique and read-only. |
| Programme Centre Code | Yes | Manual input | Unique. Cannot be changed after use by a business record. |
| Programme Centre Name | Yes | Manual input | Must not be blank. |
| Short Name | No | Manual input | Used where a shorter label is required. |
| Display Order | No | Manual input | Positive integer; controls selection-list order. |
| Status | Yes | Selection | `Active` or `Inactive`. |
| Remarks | No | Manual input | Administrative note; not shown in Project Request communication. |
| Created By / At | System | System generated | Read-only audit information. |
| Updated By / At | System | System generated | Read-only audit information. |

### 8.2 PC Head

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| PC Head Name | Yes | Manual input | Exactly one PC Head must be maintained for each Programme Centre. |
| PC Head Email Address | Yes | Manual input | Must be a valid email address. |
| Appointment | System | Derived constant | Always displayed as `PC Head`; not stored as an editable field. |

PC Head Contact Number is not required and is not included.

### 8.3 AD (P&C)

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| AD (P&C) Name | Yes | Manual input | Exactly one AD (P&C) must be maintained for each Programme Centre. |
| AD (P&C) Email Address | Yes | Manual input | Must be a valid email address. |
| Appointment | System | Derived constant | Always displayed as `AD (P&C)`; not stored as an editable field. |

AD (P&C) Contact Number is not required and is not included.

The same AD (P&C) may be manually configured against multiple Programme Centres. Cross-Programme-Centre duplicate name or email validation must not prevent this arrangement.

### 8.4 Recipient Mapping

Each active mapping represents a default Project Request recipient for the Programme Centre.

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| Mapping ID | System | System generated | Unique and read-only. |
| Recipient Source | Yes | Selection | `PC Head`, `AD (P&C)`, `HQ Recipient` or `Other Recipient`. |
| Recipient Type | Yes | Selection or derived | `To` or `CC`; `HQ Recipient` is always `CC`. |
| Recipient Name | Conditional | Manual input | Required for `HQ Recipient` and `Other Recipient`. |
| Appointment | Conditional | Derived or manual | Derived for PC Head, AD (P&C) and HQ; optional manual value for Other Recipient. |
| Email Address | Conditional | Manual input or contact reference | Required for HQ and Other Recipient; resolved from the PC contact for PC Head and AD (P&C). |
| Display Order | No | Manual input | Controls recipient display order. |
| Status | Yes | Selection | `Active` or `Inactive`. |

No `Default / Fixed`, `Mandatory CC` or `is_mandatory` field is required.

## 9. Recipient Source Rules

### 9.1 PC Head

The mapping references the manually maintained PC Head record for the same Programme Centre.

Resolved values:

- Name: `PC Head Name`;
- Email Address: `PC Head Email Address`; and
- Appointment: fixed value `PC Head`.

### 9.2 AD (P&C)

The mapping references the manually maintained AD (P&C) record for the same Programme Centre.

Resolved values:

- Name: `AD (P&C) Name`;
- Email Address: `AD (P&C) Email Address`; and
- Appointment: fixed value `AD (P&C)`.

### 9.3 HQ Recipient

HQ Recipient is used for an IO/HQ person or HQ shared mailbox that should be included as a default CC.

| Field | Behaviour |
|---|---|
| Recipient Name | Manually maintained. |
| Email Address | Manually maintained. |
| Recipient Type | Fixed as `CC`. |
| Appointment | Fixed as `HQ`. |

`HQ` is a communication label only. It does not grant an IO role or any system permission.

A Programme Centre may have multiple HQ Recipients.

### 9.4 Other Recipient

Other Recipient can be configured as either `To` or `CC`.

| Field | Behaviour |
|---|---|
| Recipient Name | Required manual input. |
| Email Address | Required manual input. |
| Appointment | Optional manual input. |
| Recipient Type | `To` or `CC`. |

## 10. Initial Recipient Mapping

When a Programme Centre is created, the system creates the following initial mappings:

| Recipient Source | Recipient Type |
|---|---|
| AD (P&C) | `To` |
| PC Head | `CC` |

This mapping follows the confirmed business decision and the SyRS actor descriptions:

- AD (P&C) receives the Project Request and coordinates project preparation; and
- PC Head provides oversight and endorsement where applicable.

Authorised configuration users may subsequently maintain the mapping, but at least one active valid `To` mapping must remain.

## 11. Request-Level Recipient Behaviour

### 11.1 To Recipients

- populated automatically from the selected Programme Centre;
- read-only within an individual Project Request;
- cannot be added, removed or replaced at request level;
- changed only through Programme Centre Recipient Mapping; and
- at least one valid `To` is required before Issue.

Suggested UI guidance:

> To recipients are configured by Programme Centre and cannot be changed for this request.

### 11.2 Default CC Recipients

- populated automatically from the selected Programme Centre;
- may be removed for an individual Project Request;
- additional CC recipients may be added for an individual Project Request;
- request-level changes do not update the Programme Centre mapping; and
- no CC recipient is mandatory or fixed.

Suggested UI guidance:

> Default CC recipients may be adjusted for this request.

## 12. Recipient Loading Flow

When a Programme Centre is selected on a Project Request, the system shall:

1. verify that the Programme Centre is Active;
2. load all Active Recipient Mappings for that Programme Centre;
3. resolve PC Head and AD (P&C) details from the manually maintained fields;
4. load HQ Recipient and Other Recipient details;
5. separate the results into `To` and `CC`;
6. validate the email addresses;
7. remove duplicate recipient email addresses;
8. display Name, Appointment and Email Address; and
9. store the recipients in the Project Request Draft.

## 13. Changing Programme Centre on a Draft Request

Before changing the Programme Centre, the system shall display:

> Changing the Programme Centre will replace the configured To and CC recipients. Manually added CC recipients will be retained.

After confirmation, the system shall:

1. remove the previous Programme Centre's configured `To` recipients;
2. remove the previous Programme Centre's configured `CC` recipients;
3. retain CC recipients manually added to the Project Request;
4. load the new Programme Centre's configured `To` recipients;
5. load the new Programme Centre's configured `CC` recipients; and
6. perform duplicate-recipient validation.

Each Project Request recipient shall retain its source classification:

```text
CONFIGURED_TO
CONFIGURED_CC
MANUAL_CC
```

Configured recipients shall also retain the source Programme Centre ID.

## 14. Validation Rules

### 14.1 Programme Centre

- Programme Centre Code is required and unique.
- Programme Centre Name is required.
- PC Head Name and Email Address are required.
- AD (P&C) Name and Email Address are required.
- Email addresses are trimmed before validation and comparison.
- Email comparison is case-insensitive.
- An Inactive Programme Centre is unavailable for a new Project Request.
- A Programme Centre referenced by a business record cannot be permanently deleted.

### 14.2 PC Head and AD (P&C) Same-Person Warning

Business expectation is that the two contacts are different people.

The system shall display a warning when:

- the normalised names are the same; or
- the normalised email addresses are the same.

Warning text:

> PC Head and AD (P&C) appear to be the same person. Please verify the contact details before saving.

Actions:

- `Review Details`; and
- `Save Anyway`.

The warning does not block Save. A `Save Anyway` decision is recorded in the audit log.

### 14.3 Recipient Mapping

- at least one active and valid `To` mapping is required before a Project Request can be issued;
- every active mapping must resolve to a valid email address;
- HQ Recipient can only be configured as `CC`;
- Other Recipient can be configured as `To` or `CC`;
- duplicate email addresses shall not cause duplicate email delivery; and
- inactive mappings are not used for new recipient resolution.

### 14.4 Duplicate Resolution

Duplicate resolution priority is:

```text
To > Configured CC > Manual CC
```

When a retained Manual CC matches a new Programme Centre `To`, the recipient remains only as `To`.

When a retained Manual CC matches a new Programme Centre configured `CC`, only one `CC` entry is displayed and used.

If PC Head and AD (P&C) are saved with the same email after the warning is overridden, the runtime recipient list shall contain the email only once. If the email resolves as both `To` and `CC`, it remains as `To`.

## 15. Configuration Changes and Draft Requests

- a newly created Project Request uses the latest active mapping;
- a Draft is not silently changed when configuration changes;
- when a Draft uses an outdated mapping, the system informs the user that recipient settings have changed;
- before Issue, configured `To` and configured `CC` recipients are refreshed from the active mapping;
- manually added CC recipients are retained during refresh; and
- duplicate validation runs again after refresh.

## 16. Issue Validation

Before a Project Request is issued, the system shall confirm that:

- the Programme Centre remains Active;
- at least one valid `To` is available;
- all recipient email addresses are valid;
- all configured recipient sources can be resolved;
- duplicate addresses have been resolved; and
- the Draft uses the current active Recipient Mapping.

When required recipient configuration is missing, the system shall:

- prevent Issue;
- identify the missing or invalid configuration; and
- direct the user to select another Programme Centre or correct the Recipient Mapping.

## 17. Historical Integrity

When a Project Request is issued, the system stores the actual recipient snapshot, including:

- Recipient Name;
- Appointment;
- Email Address;
- `To` or `CC`;
- configured or manual source;
- Programme Centre; and
- Issue date and time.

Subsequent Programme Centre or Recipient Mapping changes do not modify an issued Project Request or its original recipient snapshot.

## 18. Activation and Deactivation

- an Inactive Programme Centre cannot be selected for a new Project Request;
- deactivation does not remove the Programme Centre from historical records;
- PC Head, AD (P&C) and mapping history is retained;
- used Programme Centres and recipient mappings are not physically deleted where deletion would affect historical traceability; and
- configuration changes apply to subsequent routing and notification processing.

## 19. Audit Requirements

The audit trail shall record:

- Programme Centre creation and amendment;
- activation and deactivation;
- PC Head name or email changes;
- AD (P&C) name or email changes;
- Recipient Mapping creation, amendment and deactivation;
- creation of the initial AD (P&C) `To` and PC Head `CC` mappings;
- the same-person warning and any `Save Anyway` decision;
- operator;
- operation date and time; and
- previous and revised values.

## 20. Permission Statement

This document does not assign permissions to IO, IO Admin or other roles.

> Access to Programme Centre & Recipient Settings shall be controlled through Role & Permission Management.

The detailed View, Create, Edit, Activate and Deactivate permissions will be determined in the Role & Permission Matrix.

