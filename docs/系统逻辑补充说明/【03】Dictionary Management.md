# 【03】Dictionary Management

## 1. Document Information

| Item | Value |
|---|---|
| Document Type | System Logic Supplement / Functional Design |
| Configuration Function | Dictionary Management |
| Status | Confirmed working baseline |
| Confirmation Date | 2026-09-01 |
| Primary Reference | System Requirements Specification (SyRS) 20260825 LATEST |
| Prototype Reference | Current TOA/DUT Prototype |

## 2. Purpose

Dictionary Management provides one central administrative function for reusable selection values used across TOA.

It prevents approved dropdown and multi-select values from being hard-coded or maintained independently in Application Forms, Project functions, Offer functions and other business pages.

The function contains the following eight fixed Dictionary Types:

1. Skillsets;
2. Disciplines of Study;
3. Source Channels;
4. Offer Decline Reasons;
5. Educational Institutions;
6. Areas of Interest;
7. Bank Names; and
8. Termination Reasons.

Initial values are loaded during system initialisation. After initialisation, authorised administrators maintain the values manually through Dictionary Management. No external source is synchronised automatically.

## 3. SyRS and Prototype Basis

| Requirement / Source | Application in This Design |
|---|---|
| FR-ADM-009–016 | Authorised administrators maintain approved reference and master data, status, order and historical integrity. |
| FR-A1.3-034–035 | Skillsets and Disciplines of Study are controlled reference values used for Internship Project preparation. |
| FR-B1.1-033–034 | Source Channels use the approved values and require additional source details when `Others` is selected. |
| FR-B4.1-015 | The system records an Applicant's Offer decline reason and supporting remarks. |
| FR-B4.2-010–011 | An Applicant selects a reason from a configurable Offer Decline Reason list and may provide additional remarks. |
| BR-B4.2-005 | Offer decline requires a configured reason; remarks may depend on the selected reason. |
| IF-B5.1-002; FR-B5.1-006 | Onboarding captures Bank Name and bank account details. The business confirms Bank Names as an additional maintained Dictionary Type with 47 supplied initial Display Labels. |
| Business-confirmed supplement — Termination Reasons | Apply for Termination uses a configurable, mandatory single-selection Reason for Termination and mandatory Supporting Remarks for every reason. The four initial labels and their meanings are defined in Section 14B. |
| BR-ADM-001–005 | Configuration is restricted to authorised administrators and referenced values must retain historical integrity. |
| Current Prototype | Provides reference values for Disciplines of Study and Areas of Interest, but does not represent the final approved Dictionary design in all cases. |

## 4. Scope Boundary

### 4.1 Included

- fixed catalogue of eight Dictionary Types;
- dictionary-item list, search and status filtering;
- creation, viewing, editing and deletion of dictionary items;
- activation and deactivation;
- display-order maintenance;
- Dictionary-Type-specific fields and validation;
- additional-input rules where applicable;
- protection of referenced and historical values;
- use of Active values by relevant business functions; and
- complete configuration audit history.

### 4.2 Excluded

- creation, editing or deletion of Dictionary Types;
- Intern Category, Internship Window and Project Duration relationships;
- Programme Centre and recipient configuration;
- Nationality and Country standard-code maintenance;
- application-form structure and field validation design;
- Area of Interest-to-Project matching weights;
- Skillset or Discipline scoring weights;
- approval workflow for dictionary changes;
- effective-date scheduling;
- spreadsheet import or export through the administrator page;
- multilingual labels; and
- automatic synchronisation with MOE or another external source.

Intern Category → Internship Window → Project Duration relationships are maintained in Programme Settings and must not be represented as generic dictionary values.

Nationality and Country values are controlled standard reference lists and are not editable through this function.

## 5. Page Structure

System Settings contains one `Dictionary Management` function.

The page contains:

1. Dictionary Type selector;
2. selected Dictionary Item list;
3. Search and Status Filter;
4. Add and Edit Dictionary Item form;
5. Activate, Deactivate and Delete actions;
6. Display Order controls; and
7. Change History.

The Dictionary Type selector displays the eight system-defined types. Administrators cannot add, rename, deactivate or delete Dictionary Types.

## 6. Functional Catalogue

| ID | Function | Description |
|---|---|---|
| DIC-01 | Select Dictionary Type | Select one of the eight fixed Dictionary Types. |
| DIC-02 | View Dictionary Items | View Active and Inactive items belonging to the selected type. |
| DIC-03 | Search and Filter | Search by Code or Display Label and filter by Status. |
| DIC-04 | Add Dictionary Item | Create a dictionary item with the applicable common and type-specific fields. |
| DIC-05 | Edit Dictionary Item | Amend permitted item information and special rules. |
| DIC-06 | Delete Dictionary Item | Permanently delete an item only when it has never been referenced. |
| DIC-07 | Activate / Deactivate | Control whether an item is available for new selections. |
| DIC-08 | Reorder Dictionary Items | Maintain the sequence used by dropdown and multi-select controls. |
| DIC-09 | View Change History | View creation, amendment, deletion, status and ordering changes. |

## 7. Dictionary Item List

### 7.1 Common List Fields

| Field | Description |
|---|---|
| Code | Stable technical and business code. |
| Display Label | Text displayed to the user. |
| Description | Administrative description where provided. |
| Special Rule | Applicable additional-input or Dictionary-Type-specific rule. |
| Display Order | Order used in the consuming selection control. |
| Status | `Active` or `Inactive`. |
| Last Updated | Date and time of the latest change. |
| Actions | View, Edit, Delete, Activate or Deactivate. |

Educational Institutions additionally display `Institution Level`.

### 7.2 Supported List Actions

- select a Dictionary Type;
- search by Code or Display Label;
- filter by Active or Inactive Status;
- add an item;
- open an item for viewing or editing;
- activate or deactivate an item;
- delete an unused item; and
- change Display Order.

## 8. Common Configuration Fields

| Field | Required | Input / Source | Rules |
|---|---:|---|---|
| Dictionary Item ID | System | System generated | Unique and read-only. |
| Dictionary Type | Yes | System-defined selection | Must be one of the eight supported types. Cannot be changed after creation. |
| Code | Yes | Manual input | Unique within the Dictionary Type after trimming and case normalisation. |
| Display Label | Yes | Manual input | Unique within the Dictionary Type after trimming and case normalisation. |
| Description | No | Manual input | Administrative description. |
| Additional Input Rule | Yes | Selection | `None`, `Optional` or `Required`; displayed only where applicable to the Dictionary Type. |
| Display Order | Yes | Manual or reorder action | Positive integer; the system may resequence items after reordering. |
| Status | Yes | Selection | `Active` or `Inactive`. |
| Created By / At | System | System generated | Read-only audit information. |
| Updated By / At | System | System generated | Read-only audit information. |

### 8.1 Code Rules

Codes use stable English technical values, for example:

```text
CYBERSECURITY
COMPUTER_SCIENCE
PERSONAL_CIRCUMSTANCES
NATIONAL_UNIVERSITY_OF_SINGAPORE
```

The following rules apply:

- leading and trailing spaces are removed;
- uniqueness comparison is case-insensitive;
- an unused Code may be corrected before the item is referenced;
- a Code cannot be changed after the item is referenced by a business record; and
- a Display Label may be changed without changing the Code.

## 9. Skillsets

### 9.1 Purpose

Skillsets are used for:

- Internship Project creation and maintenance;
- Project Upload Template values;
- Applicant-to-Project suitability and search; and
- applicable reporting dimensions.

### 9.2 Design

- use a general-purpose Skillset list;
- support multi-selection in applicable business functions;
- use a flat list rather than a hierarchy;
- do not maintain matching or scoring weights in Dictionary Management;
- do not treat the Prototype's highly detailed Tech Competency list as the approved production Skillset list; and
- maintain selection-count limits in the applicable Project or Application function, not in the dictionary item.

The confirmed initial Skillset Display Labels are listed in Section 9.4.

### 9.3 Other Skillset

The confirmed special value is:

```text
Other Skillset
```

When selected:

```text
Additional Input Rule = Required
```

The user must provide the specific Skillset in the applicable transaction field.

### 9.4 Confirmed Initial Values

The confirmed TOA initial list contains 132 skill and tool Display Labels plus `Other Skillset`, giving 133 items in total. It covers technical, research, design, business, communication, collaboration and tool-related capabilities. It is a TOA-curated list, not an official LinkedIn catalogue or a verbatim industry-standard list.

The group headings below are for document review only. They do not introduce new Dictionary Types, a hierarchy or mandatory Area of Interest associations. The consuming business function continues to use a flat multi-select list.

Capability and tool selections may coexist, for example `Data Analysis` with `Python`, or `Mechanical Design` with `SolidWorks`. General skills are not selected by default. Inclusion in this dictionary does not establish an Applicant's proficiency; academic discipline alone must not be treated as evidence of communication or collaboration skills.

`Relationship & Network Analysis` means analysis of relationships between entities, not computer-network analysis.

Technical Codes and one-sentence definitions remain to be prepared and confirmed. This section confirms Display Labels only; Code preparation must follow Section 8.1.

#### 9.4.1 Research & Investigation

1. Research Planning
2. Literature Review
3. Desk Research
4. Qualitative Research
5. Quantitative Research
6. Survey Design
7. Research Interviewing
8. Experimental Design
9. Source Evaluation
10. Information Synthesis
11. Open-Source Research
12. Research Ethics

#### 9.4.2 Data & Analysis

13. Data Collection
14. Data Cleaning
15. Data Analysis
16. Statistical Analysis
17. Data Visualisation
18. Predictive Modelling
19. Optimisation
20. Geospatial Analysis
21. Time Series Analysis
22. Simulation Modelling
23. Relationship & Network Analysis
24. Root Cause Analysis

#### 9.4.3 Design & Creative Skills

25. Design Thinking
26. User Research
27. User Experience Design
28. User Interface Design
29. Interaction Design
30. Graphic Design
31. 3D Modelling
32. Prototyping
33. Usability Testing
34. Video Editing

#### 9.4.4 Business & Management

35. Business Analysis
36. Market Research
37. Financial Analysis
38. Cost Estimation
39. Cost-Benefit Analysis
40. Business Process Improvement
41. Requirements Gathering
42. Procurement Analysis
43. Policy Analysis
44. Sustainability Assessment

#### 9.4.5 Project & Operations

45. Project Planning
46. Project Coordination
47. Resource Planning
48. Risk Assessment
49. Quality Assurance
50. Test Planning
51. Logistics Planning
52. Event Coordination

#### 9.4.6 Communication & Content

53. Written Communication
54. Verbal Communication
55. Presentation Skills
56. Technical Writing
57. Report Writing
58. Content Creation
59. Stakeholder Engagement
60. Meeting Facilitation

#### 9.4.7 Collaboration & Thinking

61. Teamwork
62. Critical Thinking
63. Problem Solving
64. Creative Thinking
65. Systems Thinking
66. Decision Making
67. Adaptability
68. Time Management

#### 9.4.8 Software, AI, Networks & Security

69. Software Programming
70. Algorithm Design
71. Front-End Development
72. Back-End Development
73. Mobile Application Development
74. API Development & Integration
75. Database Design
76. Software Testing
77. Machine Learning
78. Natural Language Processing
79. Computer Vision
80. Network Configuration
81. Cloud Computing
82. Embedded Systems Programming
83. Secure Software Development
84. Vulnerability Assessment
85. Digital Forensics
86. Security Monitoring

#### 9.4.9 Engineering & Applied Sciences

87. Systems Engineering
88. Mechanical Design
89. Electronic Circuit Design
90. Control Systems
91. Robotics
92. Digital Signal Processing
93. Sensor Integration
94. Radio Frequency Engineering
95. Aerodynamics
96. Fluid Dynamics
97. Marine Engineering
98. Structural Analysis
99. Finite Element Analysis
100. Thermal Analysis
101. Materials Testing
102. Laboratory Testing
103. Measurement & Calibration
104. Building Information Modelling
105. Energy Systems Analysis
106. Life Cycle Assessment
107. Reliability Analysis
108. Engineering Drawing

#### 9.4.10 Programming Languages & Tools

109. Python
110. R
111. SQL
112. JavaScript
113. TypeScript
114. C
115. C++
116. Java
117. MATLAB
118. Simulink
119. Microsoft Excel
120. Microsoft Power BI
121. Tableau
122. AutoCAD
123. SolidWorks
124. CATIA
125. ANSYS
126. Autodesk Revit
127. ArcGIS
128. QGIS
129. Figma
130. Blender
131. Unity
132. Git

#### 9.4.11 Other Skillset

133. Other Skillset

### 9.5 Areas of Interest Coverage Reference

The following examples check coverage of the 14 named Areas of Interest. They are illustrative, not an exhaustive assessment of each domain, a configured mapping, a selection restriction or an AI matching/scoring rule. A Skillset may be relevant to multiple Areas of Interest.

| Area of Interest | Example Skillsets |
|---|---|
| Aerospace Engineering | Aerodynamics; Structural Analysis; Control Systems; MATLAB; CATIA |
| Simulation & Immersive Technologies | Simulation Modelling; 3D Modelling; Interaction Design; Unity; Blender |
| Application Development | Front-End Development; Back-End Development; API Development & Integration; Software Testing |
| Network & Connectivity | Network Configuration; Cloud Computing; Radio Frequency Engineering; Security Monitoring |
| Naval & Maritime Engineering | Marine Engineering; Fluid Dynamics; Mechanical Design; Reliability Analysis |
| Robotics & Autonomous Systems | Robotics; Control Systems; Computer Vision; Sensor Integration; Embedded Systems Programming |
| Command, Control & Communication (C3) Systems | Systems Engineering; Requirements Gathering; Network Configuration; User Interface Design |
| Sustainable Technologies & Energy Systems | Energy Systems Analysis; Sustainability Assessment; Life Cycle Assessment; Cost-Benefit Analysis |
| Armoured Vehicles & Armament Engineering | Mechanical Design; Materials Testing; Finite Element Analysis; Thermal Analysis |
| Building & Protective Infrastructure | Building Information Modelling; Structural Analysis; Engineering Drawing; Autodesk Revit |
| Cybersecurity | Secure Software Development; Vulnerability Assessment; Digital Forensics; Risk Assessment |
| Sensors & Guided Weapons Systems | Sensor Integration; Digital Signal Processing; Radio Frequency Engineering; Measurement & Calibration |
| Artificial Intelligence & Data Analytics | Machine Learning; Statistical Analysis; Data Visualisation; Python; R |
| Information Intelligence | Open-Source Research; Source Evaluation; Information Synthesis; Geospatial Analysis; Report Writing |

## 10. Disciplines of Study

### 10.1 Purpose

Disciplines of Study are used for:

- Internship Project requirements;
- Project Upload Template values;
- Applicant-to-Project suitability; and
- applicable search and reporting dimensions.

### 10.2 Design

- use the confirmed initial Discipline list in Section 10.3;
- support multi-selection in applicable functions;
- use a flat list without parent-child discipline relationships;
- do not maintain selection-count limits in Dictionary Management;
- use the confirmed list rather than the Prototype's previous 23-value reference list; and
- do not provide a free-text `Other Discipline` option in the confirmed baseline.

### 10.3 Confirmed Initial Values

The following 1,060 Display Labels are the confirmed initial values supplied by the business. The supplied wording and sequence are retained, including `Not Available` and `Other Fields nec`. These are predefined values and do not introduce a free-text `Other Discipline` option.

Technical Codes are not supplied in this list and remain to be defined before production initialisation in accordance with Section 8.1.

1. Not Available
2. General Teacher Training
3. Early Childhood Education
4. Special Education
5. Physical Education
6. Teacher Training nec
7. Education Management & Administration
8. Curriculum Development
9. Educational Assessment
10. Educational Psychology
11. Educational Technology
12. Educational Management
13. Education Science nec
14. Music
15. Drama (including theatre studies)
16. Dance
17. Fine & Performing Arts nec
18. Graphic & Multi-media Design
19. Fashion Design
20. Interior Design
21. Product/Industrial Design
22. Experience and Product Design
23. Design & Applied Arts nec
24. Design
25. Photography
26. Videography
27. Cinematography (including digital filmmaking)
28. Moving Images
29. Media Production nec
30. Publishing
31. Fine & Applied Arts nec
32. English Studies
33. Malay Studies
34. Chinese Studies
35. Tamil Studies
36. Language & Cultural Studies nec (eg applied linguistics)
37. Sociology & Anthropology
38. Psychology
39. Behavioural Science nec (eg criminology)
40. Economics
41. Social Work
42. Student/Youth Care (eg after-school care, student counselling)
43. Counselling
44. Sports and Recreation (including fitness training and sports coaching)
45. Religious Studies
46. Philosophy
47. Geography (including cartography)
48. Political Science
49. History
50. Humanities & Social Sciences nec (including regional studies, international relations, demography, labour studies)
51. Mass Communication (including radio & TV broadcasting)
52. Public Relations
53. Journalism
54. Communications and Media
55. Information Science (including library science)
56. Curatorial Studies (including archival studies, museum studies)
57. Business Management
58. Human Resource Management
59. Industrial Management
60. Operations/Logistics Management
61. Public and Institution Management
62. Hospitality and Tourism Management
63. Arts & Events Management
64. Resort Facilities Services and Management
65. Administration & Management nec
66. Leisure & Resort Management
67. Accountancy
68. Auditing
69. Bookkeeping
70. Tax accounting
71. Hotel Management (Hotel Star)
72. Hotel & Leisure Facilities Management
73. Banking & Financial Investment
74. Insurance
75. Actuarial Science
76. Banking, Insurance & Financial Services nec (including computational finance)
77. Banking and Financial Services
78. Marketing
79. Advertising
80. Retailing & Wholesaling
81. Merchandising
82. Sales & Marketing nec
83. Secretarial/Office Skills
84. Keyboarding and Shorthand/Stenography
85. Management Support Services nec
86. Engineering with Business
87. E-commerce Management
88. Business & Administration nec (including entrepreneurship)
89. Law
90. Legal Studies
91. Law & Management
92. Biology (including botany, zoology)
93. Physiology
94. Biochemistry
95. Microbiology
96. Biotechnology
97. Food Science & Technology
98. Molecular Biotechnology
99. Biological Sciences & Technologies nec (including environmental science, molecular biology, cell & molecular biology, computational biology)
100. Chemistry with Specialisation in Nuclear Chemistry
101. Chemistry (including applied chemistry)
102. Physics (including applied physics)
103. Materials Science
104. Physics with medical physics
105. Physical Sciences & Technologies nec (including meteorology, astronomy, geology, oceanography, soil & water science,computational chemistry, computational physics)
106. Agricultural Science (including agrobiology)
107. Fishery
108. Horticulture
109. Forestry
110. Mathematics (including applied mathematics)
111. Statistics
112. Operations Research
113. Econometrics
114. Mathematics & Statistics nec (including computational mathematics)
115. Natural, Physical, Chemical & Mathematical Sciences nec
116. General Medicine (including internal/occupational/public health/family & community medicine)
117. General Surgery
118. Obstetrics & Gynaecology
119. Paediatrics
120. Anaesthesiology
121. Radiology
122. Psychiatry
123. Orthopaedics
124. Ophthalmology
125. Cardiology
126. Specialised Medical Sciences nec
127. General Dentistry
128. Endodontics
129. Oral & Maxillo-facial Surgery
130. Oral Pathology & Oral Medicine
131. Orthodontics
132. Paediatrics Dentistry
133. Periodontics
134. Prosthodontics
135. Dental Sciences nec
136. Veterinary Medicine
137. Veterinary Support Services
138. Nursing
139. Health care
140. Pharmacy
141. Complementary Therapies (eg Traditional Chinese Medicine, Acupuncture and Naturopathy)
142. Physiotherapy
143. Occupational Therapy
144. Radiography
145. Nutrition and Dietetics
146. Public Health
147. Optometry
148. Biomedical Science
149. Medical Laboratory Technology
150. Health Sciences nec (including cardiac technology)
151. Computer Science (including programming, networking)
152. Information Systems (including MIS, system design)
153. Software Engineering
154. Business Information Technology (including e-commerce technology, business information systems)
155. Multi-Media Technology (eg Interactive Digital Media)
156. Internet Technology
157. Infocomm Security Management (including network security)
158. Infocomm Security Management
159. Information Technology nec
160. Computer Operations/Technical Support
161. Infocomm & Network Engineering
162. Architecture
163. Landscape Architecture
164. Architectural Technology
165. Town/Urban Planning
166. Land Surveying
167. Quantity Surveying
168. Building Surveying & Inspection
169. Building Science & Technology
170. Building
171. Building/Estate/Property Management
172. Building Science & Management nec (including contract management)
173. Building Trades
174. Architectural Drafting
175. Real Estate (including valuation)
176. Architecture & Building nec
177. Chemical Engineering (including chemical process engineering)
178. Polymer Engineering & Technology
179. Industrial Chemical Technology
180. Chemical Engineering nec
181. Civil Engineering
182. Structural Engineering
183. Geotechnical Engineering
184. Hydraulics Engineering
185. Transportation Engineering
186. Environmental Engineering (including public health, water resources engineering)
187. Civil Engineering nec (including construction engineering, construction technology & materials)
188. Electronics Engineering
189. Electrical Engineering (including power engineering)
190. Communications Engineering (including Wireless Technology)
191. Microelectronics
192. Electrical Engineering in Eco-Design
193. Electrical Engineering and Physics
194. Electrical & Electronics Engineering nec
195. Computer Engineering
196. Mechanical Engineering
197. Aeronautical Engineering (including Aerospace Electronics)
198. Automotive Engineering
199. Thermal Engineering
200. Mechatronics
201. Mechanical Engineering nec
202. Marine Engineering
203. Shipbuilding Engineering
204. Naval Architecture
205. Marine Engineering nec
206. Manufacturing/Production Engineering
207. Industrial Engineering
208. Materials Engineering
209. Precision Engineering
210. Quality Assurance Engineering
211. Manufacturing & Related Engineering nec
212. Environmental Science
213. Metallurgical Engineering
214. Building Services Engineering
215. Biomedical Engineering
216. Green Building & Sustainability
217. Engineering Sciences nec
218. Electrical/Electronics Installation & Servicing (eg air-conditioning & refrigeration)
219. Mechanical Installation & Servicing
220. Precision Tool Engineering & Design
221. Motor Vehicle Mechanics
222. Aircraft Mechanics
223. Marine Engineering Mechanics
224. Engineering Trades nec (eg pipe & steel fabrication, welding, diesel engine mechanics)
225. Manufacture of Electronic Products & Components
226. Printing Crafts
227. Furniture Production/Carpentry
228. Footwear/Textile/Clothing Production
229. Manufacturing Trades nec
230. Civil & Structural Drafting
231. Electrical Drafting
232. Mechanical Drafting
233. Engineering, Manufacturing & Related Trades nec
234. Hairdressing
235. Beauty Services
236. Fashion Garment/Garment Patternmaking
237. Domestic Science
238. Personal Services nec
239. Food Preparation/Culinary Skills
240. Food & Beverage Management/Services
241. Food Services nec
242. Front Office Operations
243. Accommodation Services
244. Housekeeping
245. Travel/Tourism Services
246. Hospitality Services nec
247. Maritime Studies (including nautical studies, maritime transportation)
248. Aircraft Operation
249. Air Traffic Control
250. Transport Services nec
251. Police Studies & Security Management
252. Civil Defence
253. Fire Fighting
254. Hotel Security
255. Occupational Safety Management (including fire & safety management)
256. Security Services nec
257. Fund Management & Adminstration
258. Accountancy & Taxation
259. Accounting
260. Accounting & Banking
261. Accounting & Finance
262. Administrative Management
263. Advanced Computing
264. Advanced Management Program
265. Advanced Materials For Micro- & Nano- Systems
266. Aerodynamics
267. Aeronautics
268. Aeronautics & Astronautics
269. Aerospace & Aerothermal Engineering
270. Aerospace & Mechanical Engineering
271. Aerospace Engineering
272. Aerospace Operations
273. Aerospace Vehicle Design
274. Air Transport Management
275. Air-Conditioning & Refrigeration Mechanics
276. Aircraft Maintenance
277. Analysis, Design & Management Of Information Systems
278. Ancient History, French
279. Application Delivery Networking
280. Application Development
281. Application Programming
282. Application Systems
283. Applied Chemistry
284. Applied Electronics
285. Applied Finance
286. Applied Food Science & Nutrition
287. Applied Mathematics
288. Applied Physics
289. Applied Psychology
290. Applied Science & Engineering
291. Applied Sociology
292. Arbitration
293. Architectural Draughtsmanship
294. Architectural Studies
295. Artificial Complex Systems Engineering
296. Artificial Intelligence
297. Arts
298. Arts & Social Science
299. Automation Control
300. Automation In Manufacturing
301. Automotive Product Engineering
302. Automotive Technology
303. Aviation Management
304. Banking
305. Banking & Finance
306. Banking, Finance
307. Biochemical Research
308. Biochemistry, Chemistry
309. Bioengineering
310. Bioinformatics
311. Biological Sciences
312. Biology, Environmental Studies
313. Biology, Mathematics
314. Biomedical Informatics & Engineering
315. Biomedical Sciences
316. Book-Keeping
317. Building & Property Management
318. Building & Real Estate Management
319. Building Automation & Services
320. Building Drafting
321. Building Environment Engineering
322. Building Maintenance & Management
323. Building Management
324. Building Science
325. Business
326. Business & Commerce
327. Business & Human Resource Management
328. Business & Management Studies
329. Business Administration
330. Business Administration & Marketing
331. Business Analytics
332. Business Computing
333. Business Computing & Information Technology
334. Business Continuity Management
335. Business Efficiency & Productivity
336. Business Informatics
337. Business Information Systems
338. Business Studies
339. Business With Psychology
340. Change Management
341. Chemical & Biomolecular Engineering
342. Chemical Engineering, Material Science
343. Chemical Process Technology
344. Chemistry, Biological Chemistry
345. Chemistry, Computer Programming & Applications
346. Chemistry, Environmental Studies
347. Chemistry, Mathematics
348. Chief Information Officer Program
349. Chinese
350. Chinese Culture
351. Chinese Language And Literature
352. Chinese Studies, Geography
353. Civil & Environmental Engineering
354. Civil & Structural Engineering
355. Civil Aviation
356. Civil Engineering Construction
357. Cognitive And Decision Sciences
358. Combat Systems
359. Combat Systems Technology (Sensors)
360. Commerce
361. Commercial Management
362. Communication & Computer Networking
363. Communication & Media Studies
364. Communication & Network Systems
365. Communication And Signal Processing
366. Communication Software
367. Communication Software & Networks
368. Communication Studies
369. Communications & Media Management
370. Communications & New Media
371. Communications Systems Engineering
372. Community Services Management
373. Computation
374. Computation For Design And Optimization
375. Computational Engineering
376. Computational Science
377. Computational Science, Mathematics
378. Computer & Communication Engineering
379. Computer & Communication Systems
380. Computer & Information Networks
381. Computer & Information Sciences
382. Computer & Information Systems
383. Computer & Mathematical Sciences
384. Computer & Networking
385. Computer Applications In Electrical Engineering
386. Computer Data Processing
387. Computer Information Science
388. Computer Information Systems
389. Computer Integrated Manufacturing
390. Computer Networking
391. Computer Programming & Information Processing
392. Computer Science & Artificial Intelligence
393. Computer Science & Electrical Engineering
394. Computer Science & Information Sciences
395. Computer Science & Information Systems
396. Computer Science & Information Technology
397. Computer Science & Software Development
398. Computer Science With Business
399. Computer Science With Management
400. Computer Science, Economics
401. Computer Science, Mathematics
402. Computer Science, Physics
403. Computer Science, Statistics
404. Computer Simulation
405. Computer Studies
406. Computer System Architecture
407. Computer Technology
408. Computing
409. Computing & Information Systems
410. Computing & Information Technology
411. Computing & Software Engineering
412. Computing Science
413. Computing Technology
414. Computing With Management
415. Construction Engineering
416. Construction Law & Arbitration
417. Construction Management
418. Construction Management & Economics
419. Construction Management And Economics
420. Consumer Electronics
421. Consumer Science & Technology
422. Control Self-Assessment
423. Control System
424. Counselling Psychology
425. Culture & Communication
426. Data Communication And Networking Software
427. Data Communications
428. Data Communications & Networking
429. Database Administration
430. Defence Systems Engineering
431. Defence Technology & Systems
432. Design Of Information Systems
433. Digital Electronics
434. Digital Media Technology
435. Digital Systems Security
436. E-Commerce
437. Economics & Social Work
438. Economics, Business Studies
439. Economics, Chinese Studies
440. Economics, English Language
441. Economics, Government
442. Economics, History
443. Economics, Japanese Studies
444. Economics, Management
445. Economics, Management Studies
446. Economics, Mathematics
447. Economics, Political Science
448. Economics, Sociology
449. Economics, Statistics
450. Education
451. Education And Human Development
452. Education Training & Development
453. Electrical & Computer Control Engineering
454. Electrical & Computer Engineering
455. Electrical & Electronic Engineering With Management
456. Electrical & Electronics Engineering
457. Electrical & Information Sciences
458. Electrical & Mechanical Engineering
459. Electrical Energy Generation
460. Electrical Engineering & Computer Science
461. Electrical Engineering & Mathematics
462. Electrical Engineering And Information Technology
463. Electrical Engineering-Systems
464. Electrical Installation
465. Electrical Installation & Servicing
466. Electrical Power Engineering
467. Electrical Technical
468. Electrical, Computer & Communications Engineering
469. Electrical, Electronics & Computer Engineering
470. Electro-Mechanical Servicing
471. Electronic & Telecommunication Engineering
472. Electronic Media Design
473. Electronics
474. Electronics & Communications Engineering
475. Electronics & Computer Engineering
476. Electronics & Electrical Engineering
477. Electronics & Telecommunication Engineering
478. Electronics Instrumentation
479. Electronics Science & Engineering
480. Electronics Servicing
481. Electronics System Engineering
482. Electronics, Computer & Communications Engineering
483. Electronics, Computer & Control Engineering
484. Embedded Systems
485. Engineering
486. Engineering Business Management
487. Engineering Geology
488. Engineering Informatics
489. Engineering Management
490. Engineering Mathematics
491. Engineering Physics
492. Engineering Production
493. Engineering Science
494. English & Sociology
495. English Language
496. English Language, Economics
497. English Language, Sociology
498. English Literature, Sociology
499. English With Business
500. Enterprise Architecture
501. Enterprise Resource Planning Systems
502. Estate Management
503. Explosives Ordnance Engineering
504. Facilities Maintenance Supervision
505. Facilities Management
506. Facilities Management For Business
507. Facility & Environment Management
508. Facility & Safety Management
509. Facility Management Enhancement
510. Film, Sound & Video
511. Finance
512. Finance, Banking
513. Finance, Marketing
514. Financial Management
515. Financial Services
516. Fine Arts
517. Fire & Safety Management
518. Fluid Mechanics
519. Food Science And Nutrition
520. Food Science And Technology
521. Food Technology
522. Fraud Examination
523. Furniture Design & Production
524. Games Development
525. General Mathematics, Chemistry
526. General Mathematics, Economics
527. General Mathematics, Physics
528. General Mathematics, Psychology
529. General Secretary
530. General Welding
531. Graphic & Media Design
532. Graphic Design
533. Guided Weapon System
534. Gun Systems Design
535. Heavy Duty Diesel Mechanics
536. High Performance Computation For Engineered Systems
537. History Of Science, Medicine And Techonolgy
538. History, Political Science
539. Horticultural Management
540. Horticulture & Landscape Management
541. Hospitality & Tourism Management
542. Hospitality & Tourism Management, Marketing
543. HR And Organisational Psychology
544. HR Management And Organisation & Management Studies
545. Human Capital Management
546. Human Factors Engineering
547. Human Resource Consulting
548. Human Resource Development
549. Hydraulic Engineering
550. Hydrographic Surveying
551. Immunology
552. Industrial & Business Management
553. Industrial & Systems Engineering
554. Industrial Chemistry
555. Industrial Design
556. Industrial Electricity
557. Industrial Engineering & Management
558. Industrial Engineering Technology
559. Info Security & Intelligence
560. Infocomm Security
561. Info-Communications
562. Information And Computer Engineering
563. Information Communication Technology
564. Information Engineering And Media
565. Information Management
566. Information Operations And Assurance
567. Information Sciences
568. Information Security Technology & Management
569. Information Storage And Management
570. Information Studies
571. Information Studies (Library Science)
572. Information Systems & Software Engineering
573. Information Systems Audit
574. Information Systems Engineering
575. Information Systems Management
576. Information Systems Security
577. Information Systems Technology
578. Information Technology
579. Information Technology & Human Factors
580. Information Technology & Systems
581. Information Technology And Business (ERP)
582. Information Technology Management
583. Information Technology Security
584. Information Technology, Computer Science
585. Information-Communication Technology
586. Instrumentation & Control
587. Intelligent Building Technology
588. Interactive Simulation
589. Interior Design & Decoration
590. Internal Audit
591. International Business
592. International Business Engineering
593. International Commercial Law
594. International Construction Management
595. International Relations
596. International Relations And Sociology
597. International Supply Chain Management
598. Internet Communication
599. Internet Computing
600. Internet Security Management
601. IT Project Management
602. IT-Service Management
603. J2Ee & Web Services
604. Japanese Language
605. Japanese Studies, English Language
606. Japanese Studies, Sociology
607. Jig & Tool Design
608. Kinesiology
609. Knowledge Engineering
610. Knowledge Management
611. Landscape Studies
612. Learning Science
613. Life Sciences
614. Linguistics, Psychology
615. Logistics
616. Logistics & Distribution Management
617. Logistics & Transport
618. Logistics And Operations Management
619. Logistics And Supply Chain Management
620. Logistics Engineering & Management
621. Management
622. Management Consultancy
623. Management Data Processing & Cobol Programming
624. Management Information System
625. Management Of Information Technology
626. Management Of Technology
627. Management Science
628. Management Science And Engineering
629. Management Studies
630. Manufacturing Engineering
631. Manufacturing Systems And Technology
632. Marine Technology
633. Marketing & International Management
634. Marketing & Organisational Behaviour & Human Resources
635. Marketing & Public Relations
636. Marketing Management
637. Marketing, Logistics
638. Mass Communications
639. Material Science
640. Materials & Purchasing Management
641. Materials Science And Engineering
642. Materials, Structures & Systems Engineering
643. Mathematical Sciences
644. Mathematics, Computer Science
645. Mathematics, Management Science
646. Mathematics, Physics
647. Mathematics, Statistics
648. Mechanical & Aerospace Engineering
649. Mechanical & Control Engineering
650. Mechanical & Production Engineering
651. Mechanical Engineering & Applied Mechanics
652. Mechanical Engineering & Science
653. Mechanical Technology
654. Mechanics & Processing Of Materials
655. Mechanics (Explosive Engineering)
656. Mechatronics & Software Engineering
657. Mechatronics Engineering
658. Media Studies
659. Metal Machining
660. Military Electronic Systems Engineering
661. Military Vehicle Technology
662. Mining Engineering
663. Mobile & Wireless Computing
664. Modeling, Virtual Environments & Simulation
665. Molecular And Cellular Biology
666. Multimedia & Infocommunications Technology
667. Multimedia Arts
668. Multimedia Computing
669. Multimedia Development
670. Multimedia Production
671. Multimedia Software Engineering
672. Multimedia Technology
673. Natural Sciences
674. Nautical Studies
675. Naval Architecture & Marine Technology / Engineering
676. Naval Architecture & Ocean Engineering
677. Naval Architecture & Small Craft Engineering
678. Network Computing
679. Network Engineering
680. Network Planning & Simulation
681. Network Security
682. Nuclear Engineering
683. Nutrition & Food Science
684. Office Skills
685. Operations Research & Industrial Engineering
686. Operations Research, Modelling & Simulation
687. Optics & Photonics
688. Optronics
689. Organisational Psychology
690. Organizational Behaviour
691. Ornamental Horticulture & Garden Design
692. Personnel Management
693. Pharmaceutical Sciences
694. Philosophy, Sociology
695. Philosophy, Statistics
696. Photonics Engineering
697. Physics In Technology
698. Physics With Theoretical Physics
699. Physics, Chemistry
700. Physics, Mathematics
701. Political Science, History
702. Politics, International Studies
703. Polymer Technology
704. Power Electrical & Industrial Application
705. Power Electronics & Conservation System
706. Power Engineering
707. Power Line Communications
708. Power Plant Engineering
709. Power System Engineering
710. Practical Law
711. Precision Machining (Lathe)
712. Process Engineering
713. Production Engineering
714. Production Technology
715. Programming & System Analysis
716. Project And Facilities Management
717. Project Coordination & Construction Management
718. Project Management
719. Property
720. Property Management
721. Protective Technology
722. Psychology & Economics
723. Psychology & Mathematics
724. Psychology Organisational Behaviour & Human Resources
725. Public Management
726. Public Relations Management
727. Quality Assurance
728. Quality Engineering & Management
729. Quality Management
730. Radar & Communications
731. Remote Sensing
732. Risk & Insurance Management
733. Risk Management
734. Safety, Health And Environmental Technology
735. Sales & Marketing
736. Scb Engineering
737. Science
738. Science & Mathematics
739. Science Management
740. Secretarial
741. Security Management
742. Semiconductor Technology
743. Service Excellence
744. Ship & Marine Technology
745. Ship Production Technology
746. Shipbuilding
747. Shipbuilding & Offshore Engineering
748. Shipbuilding & Repair Technology
749. Shipping Operation And Management
750. Singapore Law
751. Smart Product Design
752. Social Sciences, Political Science
753. Sociology
754. Sociology, History
755. Sociology, Social Work
756. Sociology, Statistics
757. Software Systems Engineering
758. Software Technology
759. Spacecraft Technology And Satellite Communications
760. Sports Administration
761. Statistics & Geography
762. Strategic Management Of Human Resources
763. Strategic Marketing
764. Structural Steel Supervising
765. Supervisory Management
766. Supply Chain Management
767. Surveying
768. Surveying, Mapping Science
769. System Administration
770. System Analysis
771. System Design
772. System Design And Management
773. System Development
774. System Management
775. System, Information & Control Engineering
776. Systems Analysis
777. Systems Design And Management
778. Systems Engineering
779. Systems Engineering & Analysis
780. Systems Management & Project Management
781. Systems, Control & Information Technology
782. Technician Production Engineering
783. Technology & Operations Management
784. Technology And Policy
785. Technology Focus
786. Technology Management
787. Technology Management & Computing
788. Technology With Electronics
789. Technopreneurship & Innovation
790. Telecommunication & Signal Processing
791. Telecommunications
792. Telecommunications & Electrical Engineering
793. Telecommunications & Electronics
794. Telecommunications & Networking Engineering
795. Telecommunications Engineering
796. Tourism
797. Training & Development
798. Training & Development Management
799. Translation And Interpretation
800. Transportation Systems And Management
801. Travel And Tourism
802. Tunnelling
803. Valuation
804. Vision Science
805. Vision Visualisation & Virtual Environments
806. Visual Arts
807. Visual Communications
808. Weapons & Vehicle Systems
809. Weapons Effect On Structures
810. Weapons Systems Engineering
811. Web Development Technology
812. Zoology
813. Architectural Science
814. Biological Science
815. Information Management And Systems
816. Management, Marketing
817. Operations & Purchasing Management
818. Stics Engineering & Management
819. Telecommunications Technical
820. Industrial And Operations Engineering
821. International Tourism And Hospitality Management
822. Learning Disorders Management & Child Psychology
823. Library & Information Management
824. Urban Planning
825. Vehicle Technology
826. Aeronautical Engineering
827. Biology
828. Business Information Technology
829. Chemical Engineering
830. Chemistry
831. Communications Engineering
832. Computer Science
833. Electrical Engineering
834. Environmental Engineering
835. Geography
836. Information Systems
837. Mathematics
838. Physics
839. Real Estate
840. HR and Talent Management
841. Operations and Supply Chain Management
842. Advanced Materials Science And Engineering
843. Digital Media Design
844. Chemical & Pharmaceutical Technology
845. Planning and Design
846. Computer & Network Technology
847. Advanced Computer Science
848. Organisational Behaviour Human Resource
849. Financial Business Informatics
850. Multimedia & Animation
851. Bioelectronics
852. Space Systems Operations
853. Integrated Sustainable Design
854. Microwave Engineering & Wireless Subsystems Design
855. Satellite Communications Engineering
856. Engineering Acoustics
857. Quantum Fields and Fundamental Forces
858. Aerospace Electronics
859. Cyber & Digital Security
860. Interactive Media Design
861. Social Science
862. Pure Mathematics
863. Aeronautical & Astronautical Engineering
864. Mathematics and Foundations of Computer Science
865. Electronic Commerce
866. Mathematics and Economics
867. Multimedia Design
868. Facilities and Events Management
869. Engineering Systems and Design
870. Integrated Facility Design and Management
871. Real Estate Business
872. Information Systems Technology and Design
873. Computing with Psychology
874. Public Management and Governance
875. Integrated Events and Project Management
876. Coastal and Oceanographic
877. Engineering Product Development
878. Web Technology and Service
879. Aerospace Technology
880. Marine and Offshore Technology
881. Clean Energy
882. Mechanical Design Engineering (SIT)
883. Linguistic and Multilingual Studies
884. Industrial Engineering and Design
885. Small Craft Technology
886. Computational Intelligence
887. Sonic Arts
888. Building and Project Management
889. Biostatistics
890. Hospitality & Resort Management
891. Linguistics & Multilingual Studies
892. Game & Entertainment Technology
893. Marine Science & Technology
894. IT Network Systems
895. Building Information Modeling
896. Tourism & Resort Management
897. Business Process & Quality Engineering
898. Airport Engineering
899. Industrial Systems, Manufacture and Management
900. Engineering Project Management
901. Engineering (By Research)
902. Electrical Engineering Research
903. Emergency Response
904. Human Computer Interaction
905. Web Science and Big Data Analytics
906. Fire Engineering
907. Industrial Engineering & Operations Research
908. Strategic Studies
909. Molecular Biology and Biomedical Science
910. Integrated Biology and Medicine
911. Pathology
912. Advanced Computing Mathematics
913. Web Design & Development
914. Financial Informatics
915. Robotics and Computation
916. Mobile Satellite Comm
917. Operation Analytics
918. Applied Analytics
919. Management Studies (Governance)
920. Communication Design
921. Design Communication
922. Digital Forensics
923. Business Innovation and Design
924. Applied Chemistry with Pharmaceutical Science
925. Internetworking & Communications
926. Robotics
927. Chinese Medicine
928. Digital & Precision Engineering
929. Aerospace Systems and Management
930. Clean Energy Management
931. Digital Animation
932. Computing (Artifical Intelligence)
933. Visual Effects and Motion Graphics
934. Advanced Engineering Mathematics
935. Business & Big Data Analytics
936. Integrated Events Management
937. Cyber Security Management
938. Digital Media Creation
939. Intelligent Transportation Systems Engineering
940. Telematics
941. Aerospace Engineering and Management
942. Aviation Service and Management
943. Automotive Systems
944. Network Systems and Security
945. Computational Science and Engineering
946. Aviation Management and Services
947. Computer Control and Automation
948. Multimedia Studies
949. Distributed Computing Systems
950. Digital Art and Animation
951. Intelligent Systems
952. Data Science and Artifical Intelligence
953. Business Intelligence & Analytics
954. Security by Design
955. Innovation by Design
956. Aerospace Systems
957. Cybersecurity & Digital Forensics
958. Applied Artificial Intelligence and Analytics
959. English with Psychology
960. Aerospace Avionics
961. Security Consultancy
962. Integrated Digital Communication
963. Computer Science and Design
964. Human Resource Management Practices and Marketing
965. Artificial Intelligence and Innovation
966. Quantitative Finance
967. Hospitality Business
968. Common ICT Programme
969. Mechatronics and Robotics
970. Multimedia & Infocomm Technology
971. Autonomous Vehicle Dynamics and Control
972. Enterprise Business Analytics
973. Network Technology
974. Information & Communications Technology
975. Biomedical Research
976. Mechanical and Mechatronics Engineering - Nanotechnology
977. Electronics and Information Engineering
978. Interaction Design
979. Infocomm & Digital Media (ICT Systems, Services & Support)
980. Infocomm & Digital Media (CyberSecurity)
981. Full Stack Web Development
982. Interactive Edutainment
983. Engineering and Management
984. Data Science (Artificial Intelligence)
985. Info-Communication Engineering & Design
986. Architecting Scalable Systems
987. Sustainable Infrastructure Engineering (Land)
988. Environmental Management & Water Technology
989. Built Environment
990. Business Enterprise IT
991. Professional Communication
992. Animation
993. Logistics with Military Studies
994. Supply Chain & Logistics
995. Engineering Systems
996. Energy Systems and Management
997. Cyber Forensics, Information Security and Management Computer Science
998. Business Finance
999. Sustainable Building Design
1000. Industry 4.0
1001. Big Data & Analytics
1002. Biochemistry and Molecular Biology
1003. International Business and Market
1004. Design for Interactivity
1005. Finance, Operations Management
1006. Biologics & Process Technology
1007. Business Process & Systems Engineering
1008. Communication
1009. Big Data Management & Governance
1010. Analytics
1011. Cybersecurity
1012. Sensor Systems (Above Water Sensors Engineering)
1013. Data Science
1014. Computing (Networking)
1015. Building Construction Management
1016. Creative Writing for Television and New Media
1017. International Logistics & Supply Chain Management
1018. Computer Science and Technology
1019. Digital Technologies Architect
1020. Game Development & Technology
1021. Creative Industries
1022. Communication & Psychology
1023. Tourism and Events Management Public Relations
1024. Industrial & Operations Management
1025. Animation & 3D Arts
1026. Business Management with Communications
1027. Tourism Management
1028. Digital Filmmaking
1029. Systems & Project Management
1030. Business Applications
1031. Human Factors and Systems
1032. Nuclear Science/Chemistry
1033. Nuclear Science (Nuclear Physics)
1034. Digital Entertainment Technology
1035. Building Performance and Sustainability
1036. Distributed Computing Systems, Database Technology and Computer Systems
1037. Nanotechnology & Materials Science
1038. Sport Science & Management
1039. Business Practice
1040. Cardiac Technology
1041. Medical Technology
1042. Electronic Systems Engineering
1043. Acquisition And Contract Management
1044. Chemical, Biological, Radiological and Nuclear Defense
1045. Information Security
1046. Modeling and Simulation
1047. Human Resource Management and Marketing
1048. Mobile Business Solutions
1049. Urban and Regional Planning
1050. Information Systems and Management
1051. Pharmacology
1052. Electrical & Computer Sciences
1053. Geographic Information Systems
1054. Ground Shock
1055. Public Policy and Global Affairs
1056. Health Data Science
1057. Data Science and Analytics
1058. Wellness, Lifestyle and Spa Management
1059. Translation & Interpretation
1060. Other Fields nec

## 11. Source Channels

### 11.1 Confirmed Initial Values

| Code | Display Label | Additional Input Rule |
|---|---|---|
| `DSTA_WEBSITE` | DSTA Website | None |
| `LINKEDIN` | LinkedIn | None |
| `CAREER_FAIR` | Career Fair | None |
| `EDUCATION_INSTITUTE` | Education Institute | None |
| `EMPLOYEE_REFERRAL` | Employee Referral | None |
| `OTHERS` | Others | Required |

### 11.2 Business Rules

- the Applicant selects one Active Source Channel where the applicable form requests this information;
- selecting `Others` requires the Applicant to provide the specific source;
- Source Channel is recorded for source analysis and reporting; and
- Source Channel selection does not initiate another workflow.

## 12. Offer Decline Reasons

### 12.1 Confirmed Initial Values

| Code | Display Label | Additional Remarks |
|---|---|---|
| `ACCEPTED_ANOTHER_OPPORTUNITY` | Accepted another internship or job opportunity | Optional |
| `UNABLE_TO_COMMIT_TO_WINDOW` | Unable to commit to the internship window | Optional |
| `ACADEMIC_COMMITMENTS` | Academic or school commitments | Optional |
| `SCHOOL_APPROVAL_NOT_OBTAINED` | Unable to obtain approval from school or institution | Optional |
| `PERSONAL_CIRCUMSTANCES` | Personal circumstances | Optional |
| `OTHER` | Other | Required |

### 12.2 Business Rules

- an Applicant must select one Active Offer Decline Reason when declining an Offer;
- `Other` requires additional Remarks;
- Remarks are optional for the other initial reasons;
- the system must not require an Applicant selecting `Personal circumstances` to disclose personal or sensitive details;
- selecting a Decline Reason records the terminal Offer-decline outcome only;
- no Decline Reason initiates Project replacement, Offer amendment, re-offer, approval or another automated workflow; and
- the six values above are the confirmed initial configuration and may subsequently be maintained by authorised administrators.

An Applicant accepting an Offer may use Acceptance Remarks to request a minor Internship Start Date adjustment within the applicable Internship Window. This is information for subsequent offline arrangement and is not an Offer Decline Reason or a separate system outcome.

## 13. Educational Institutions

### 13.1 Selection Behaviour

- Educational Institution is a configured dropdown list;
- an Applicant cannot enter a free-text Institution Name;
- no `Others` free-text Institution option is provided;
- only Active Educational Institutions are available for new selection;
- where an Institution is missing, an authorised administrator must create the Institution before it can be selected;
- initial Institution data uses the business-confirmed list in Section 13.5;
- the final Institution scope, records and classifications must be reviewed and confirmed by the business before production data initialisation; and
- after initialisation, Institutions are maintained manually without automatic MOE or external-source synchronisation.

### 13.2 Configuration Fields

| Field | Required | Rules |
|---|---:|---|
| Institution Code | Yes | Unique stable Code. |
| Institution Name | Yes | Official display name. |
| Short Name | No | Common abbreviation, for example `NUS` or `NTU`. |
| Institution Level | Yes | One or more fixed TOA business classifications. |
| Description | No | Administrative note. |
| Display Order | Yes | Controls dropdown order. |
| Status | Yes | `Active` or `Inactive`. |

### 13.3 Institution Levels

The fixed Institution Levels are:

1. `Secondary`;
2. `Post-Secondary (Non-University)`; and
3. `University`.

Rules:

- Institution Levels are fixed system values and are not maintained as a separate editable dictionary;
- at least one Institution Level is required;
- one Institution may be associated with more than one Institution Level where the Institution operates across education stages;
- the Applicant selects the Institution and does not separately maintain Institution Level; and
- the system may use the applicable Intern Category or Education Level to filter available Institutions.

The following definition applies:

> Institution Levels are TOA business classifications used to organise Educational Institutions. They are not intended to reproduce the complete MOE education taxonomy.

### 13.4 Confirmed Initial Institution Scope

The business has confirmed the 183 Institution Names and Institution Level mappings listed in Section 13.5 on 17 September 2026.

The initial scope covers Singapore institutions from Secondary level onwards, including applicable Secondary and Pre-University schools, Polytechnics, ITE Colleges, Universities, Arts Institutions, private institutions and international schools.

Rules:

- the confirmed list includes all 172 cleaned candidates and all 11 official-source additions from the reviewed workbook's `初始名单候选` worksheet;
- the 183 entries are the confirmed initial dataset, not an exhaustive list of every institution operating in Singapore;
- primary-only institutions are excluded; institutions also operating a Secondary section are included only with the applicable in-scope Levels;
- Institution Levels represent the education stages offered; multiple Levels do not establish an Applicant's qualification or an institution's legal university status;
- historical names, unresolved records and other entries in the workbook's `原始名单处理记录` worksheet are not approved for initialisation by this confirmation;
- confirming the initial list does not authorise automatic rewriting or merging of historical education records;
- Institution technical Codes remain to be prepared and confirmed; table row numbers are not technical Codes; and
- the list is maintained manually after initialisation, without automatic external-source synchronisation.

Reference: [Institution cleaning workbook](../../outputs/institutions-20260917/新加坡学校名单清洗与Level匹配.xlsx), worksheet `初始名单候选`; [cleaning review notes](学校名单清洗与Level匹配_评审说明.md). These files retain the original review snapshot. This section records the subsequent business approval of the 183 initial entries and their Level mappings.

### 13.5 Confirmed Initial Institution Names and Levels

Each row represents one initial Institution record. Multiple Levels in the same row are values associated with that record, not separate Institution records.

| No. | Institution Name | Institution Level(s) |
|---:|---|---|
| 1 | Admiralty Secondary School | `Secondary` |
| 2 | Ahmad Ibrahim Secondary School | `Secondary` |
| 3 | Anderson Secondary School | `Secondary` |
| 4 | Anderson Serangoon Junior College | `Post-Secondary (Non-University)` |
| 5 | Ang Mo Kio Secondary School | `Secondary` |
| 6 | Anglican High School | `Secondary` |
| 7 | Anglo-Chinese Junior College | `Post-Secondary (Non-University)` |
| 8 | Anglo-Chinese School (Barker Road) | `Secondary` |
| 9 | Anglo-Chinese School (Independent) | `Secondary`; `Post-Secondary (Non-University)` |
| 10 | Assumption English School | `Secondary` |
| 11 | Assumption Pathway School | `Secondary` |
| 12 | Bartley Secondary School | `Secondary` |
| 13 | BCA Academy | `Post-Secondary (Non-University)`; `University` |
| 14 | Beatty Secondary School | `Secondary` |
| 15 | Bedok Green Secondary School | `Secondary` |
| 16 | Bedok South Secondary School | `Secondary` |
| 17 | Bedok View Secondary School | `Secondary` |
| 18 | Bendemeer Secondary School | `Secondary` |
| 19 | Boon Lay Secondary School | `Secondary` |
| 20 | Bowen Secondary School | `Secondary` |
| 21 | Broadrick Secondary School | `Secondary` |
| 22 | Bukit Batok Secondary School | `Secondary` |
| 23 | Bukit Merah Secondary School | `Secondary` |
| 24 | Bukit Panjang Govt. High School | `Secondary` |
| 25 | Bukit View Secondary School | `Secondary` |
| 26 | Canberra Secondary School | `Secondary` |
| 27 | Catholic High School | `Secondary` |
| 28 | Catholic Junior College | `Post-Secondary (Non-University)` |
| 29 | Cedar Girls' Secondary School | `Secondary` |
| 30 | Changkat Changi Secondary School | `Secondary` |
| 31 | CHIJ Katong Convent | `Secondary` |
| 32 | CHIJ Secondary (Toa Payoh) | `Secondary` |
| 33 | CHIJ St. Joseph's Convent | `Secondary` |
| 34 | CHIJ St. Nicholas Girls' School | `Secondary` |
| 35 | CHIJ St. Theresa's Convent | `Secondary` |
| 36 | Christ Church Secondary School | `Secondary` |
| 37 | Chua Chu Kang Secondary School | `Secondary` |
| 38 | Chung Cheng High School (Main) | `Secondary` |
| 39 | Chung Cheng High School (Yishun) | `Secondary` |
| 40 | Clementi Town Secondary School | `Secondary` |
| 41 | Commonwealth Secondary School | `Secondary` |
| 42 | Compassvale Secondary School | `Secondary` |
| 43 | Crescent Girls' School | `Secondary` |
| 44 | Crest Secondary School | `Secondary` |
| 45 | Damai Secondary School | `Secondary` |
| 46 | Deyi Secondary School | `Secondary` |
| 47 | Dunearn Secondary School | `Secondary` |
| 48 | Dunman High School | `Secondary`; `Post-Secondary (Non-University)` |
| 49 | Dunman Secondary School | `Secondary` |
| 50 | East Spring Secondary School | `Secondary` |
| 51 | Edgefield Secondary School | `Secondary` |
| 52 | Eunoia Junior College | `Post-Secondary (Non-University)` |
| 53 | Evergreen Secondary School | `Secondary` |
| 54 | Fairfield Methodist School (Secondary) | `Secondary` |
| 55 | Fuhua Secondary School | `Secondary` |
| 56 | Gan Eng Seng School | `Secondary` |
| 57 | Geylang Methodist School (Secondary) | `Secondary` |
| 58 | Greendale Secondary School | `Secondary` |
| 59 | Greenridge Secondary School | `Secondary` |
| 60 | Guangyang Secondary School | `Secondary` |
| 61 | Hai Sing Catholic School | `Secondary` |
| 62 | Hillgrove Secondary School | `Secondary` |
| 63 | Holy Innocents' High School | `Secondary` |
| 64 | Hougang Secondary School | `Secondary` |
| 65 | Hua Yi Secondary School | `Secondary` |
| 66 | Hwa Chong Institution | `Secondary`; `Post-Secondary (Non-University)` |
| 67 | INSEAD (Singapore) | `University` |
| 68 | ITE College Central | `Post-Secondary (Non-University)` |
| 69 | ITE College East | `Post-Secondary (Non-University)` |
| 70 | ITE College West | `Post-Secondary (Non-University)` |
| 71 | Junyuan Secondary School | `Secondary` |
| 72 | Jurong Pioneer Junior College | `Post-Secondary (Non-University)` |
| 73 | Jurong Secondary School | `Secondary` |
| 74 | Jurong West Secondary School | `Secondary` |
| 75 | Jurongville Secondary School | `Secondary` |
| 76 | Juying Secondary School | `Secondary` |
| 77 | Kaplan Higher Education Academy | `Post-Secondary (Non-University)`; `University` |
| 78 | Kent Ridge Secondary School | `Secondary` |
| 79 | Kranji Secondary School | `Secondary` |
| 80 | Kuo Chuan Presbyterian Secondary School | `Secondary` |
| 81 | LASALLE College of the Arts | `Post-Secondary (Non-University)`; `University` |
| 82 | Loyang View Secondary School | `Secondary` |
| 83 | Management Development Institute of Singapore | `Post-Secondary (Non-University)`; `University` |
| 84 | Manjusri Secondary School | `Secondary` |
| 85 | Maris Stella High School | `Secondary` |
| 86 | Marsiling Secondary School | `Secondary` |
| 87 | Mayflower Secondary School | `Secondary` |
| 88 | Meridian Secondary School | `Secondary` |
| 89 | Methodist Girls' School (Secondary) | `Secondary` |
| 90 | Millennia Institute | `Post-Secondary (Non-University)` |
| 91 | Montfort Secondary School | `Secondary` |
| 92 | Nan Chiau High School | `Secondary` |
| 93 | Nan Hua High School | `Secondary` |
| 94 | Nanyang Academy of Fine Arts | `Post-Secondary (Non-University)`; `University` |
| 95 | Nanyang Girls' High School | `Secondary` |
| 96 | Nanyang Junior College | `Post-Secondary (Non-University)` |
| 97 | Nanyang Polytechnic | `Post-Secondary (Non-University)` |
| 98 | Nanyang Technological University | `University` |
| 99 | National Junior College | `Secondary`; `Post-Secondary (Non-University)` |
| 100 | National University of Singapore | `University` |
| 101 | Naval Base Secondary School | `Secondary` |
| 102 | New Town Secondary School | `Secondary` |
| 103 | Ngee Ann Polytechnic | `Post-Secondary (Non-University)` |
| 104 | Ngee Ann Secondary School | `Secondary` |
| 105 | North Vista Secondary School | `Secondary` |
| 106 | Northbrooks Secondary School | `Secondary` |
| 107 | Northland Secondary School | `Secondary` |
| 108 | Northlight School | `Secondary` |
| 109 | NUS High School of Mathematics and Science | `Secondary`; `Post-Secondary (Non-University)` |
| 110 | Orchid Park Secondary School | `Secondary` |
| 111 | Outram Secondary School | `Secondary` |
| 112 | Overseas Family School | `Secondary`; `Post-Secondary (Non-University)` |
| 113 | Pasir Ris Crest Secondary School | `Secondary` |
| 114 | Pasir Ris Secondary School | `Secondary` |
| 115 | Paya Lebar Methodist Girls' School (Secondary) | `Secondary` |
| 116 | Pei Hwa Secondary School | `Secondary` |
| 117 | Peicai Secondary School | `Secondary` |
| 118 | Peirce Secondary School | `Secondary` |
| 119 | Presbyterian High School | `Secondary` |
| 120 | PSB Academy | `Post-Secondary (Non-University)`; `University` |
| 121 | Punggol Secondary School | `Secondary` |
| 122 | Queenstown Secondary School | `Secondary` |
| 123 | Queensway Secondary School | `Secondary` |
| 124 | Raffles Girls' School (Secondary) | `Secondary` |
| 125 | Raffles Institution | `Secondary`; `Post-Secondary (Non-University)` |
| 126 | Regent Secondary School | `Secondary` |
| 127 | Republic Polytechnic | `Post-Secondary (Non-University)` |
| 128 | River Valley High School | `Secondary`; `Post-Secondary (Non-University)` |
| 129 | Riverside Secondary School | `Secondary` |
| 130 | School of Science and Technology, Singapore | `Secondary` |
| 131 | School of the Arts, Singapore | `Secondary`; `Post-Secondary (Non-University)` |
| 132 | Sembawang Secondary School | `Secondary` |
| 133 | Seng Kang Secondary School | `Secondary` |
| 134 | Serangoon Garden Secondary School | `Secondary` |
| 135 | Serangoon Secondary School | `Secondary` |
| 136 | Singapore Chinese Girls' School | `Secondary` |
| 137 | Singapore Institute of Management | `Post-Secondary (Non-University)`; `University` |
| 138 | Singapore Institute of Technology | `University` |
| 139 | Singapore Management University | `University` |
| 140 | Singapore Polytechnic | `Post-Secondary (Non-University)` |
| 141 | Singapore Sports School | `Secondary`; `Post-Secondary (Non-University)` |
| 142 | Singapore University of Social Sciences | `University` |
| 143 | Singapore University of Technology and Design | `University` |
| 144 | Spectra Secondary School | `Secondary` |
| 145 | Springfield Secondary School | `Secondary` |
| 146 | St Andrew's Junior College | `Post-Secondary (Non-University)` |
| 147 | St Andrew's School (Secondary) | `Secondary` |
| 148 | St. Anthony's Canossian Secondary School | `Secondary` |
| 149 | St. Gabriel's Secondary School | `Secondary` |
| 150 | St. Hilda's Secondary School | `Secondary` |
| 151 | St. Joseph's Institution | `Secondary`; `Post-Secondary (Non-University)` |
| 152 | St. Margaret's School (Secondary) | `Secondary` |
| 153 | St. Patrick's School | `Secondary` |
| 154 | Swiss Cottage Secondary School | `Secondary` |
| 155 | Tampines Meridian Junior College | `Post-Secondary (Non-University)` |
| 156 | Tampines Secondary School | `Secondary` |
| 157 | Tanjong Katong Girls' School | `Secondary` |
| 158 | Tanjong Katong Secondary School | `Secondary` |
| 159 | Temasek Junior College | `Secondary`; `Post-Secondary (Non-University)` |
| 160 | Temasek Polytechnic | `Post-Secondary (Non-University)` |
| 161 | Temasek Secondary School | `Secondary` |
| 162 | United World College of South East Asia (East Campus) | `Secondary`; `Post-Secondary (Non-University)` |
| 163 | Unity Secondary School | `Secondary` |
| 164 | University of the Arts Singapore | `University` |
| 165 | Victoria Junior College | `Post-Secondary (Non-University)` |
| 166 | Victoria School | `Secondary` |
| 167 | West Spring Secondary School | `Secondary` |
| 168 | Westwood Secondary School | `Secondary` |
| 169 | Whitley Secondary School | `Secondary` |
| 170 | Woodgrove Secondary School | `Secondary` |
| 171 | Woodlands Ring Secondary School | `Secondary` |
| 172 | Woodlands Secondary School | `Secondary` |
| 173 | Xinmin Secondary School | `Secondary` |
| 174 | Yio Chu Kang Secondary School | `Secondary` |
| 175 | Yishun Innova Junior College | `Post-Secondary (Non-University)` |
| 176 | Yishun Secondary School | `Secondary` |
| 177 | Yishun Town Secondary School | `Secondary` |
| 178 | Yuan Ching Secondary School | `Secondary` |
| 179 | Yuhua Secondary School | `Secondary` |
| 180 | Yusof Ishak Secondary School | `Secondary` |
| 181 | Yuying Secondary School | `Secondary` |
| 182 | Zhenghua Secondary School | `Secondary` |
| 183 | Zhonghua Secondary School | `Secondary` |

## 14. Areas of Interest

### 14.1 Confirmed Initial Values

1. Aerospace Engineering;
2. Simulation & Immersive Technologies;
3. Application Development;
4. Network & Connectivity;
5. Naval & Maritime Engineering;
6. Robotics & Autonomous Systems;
7. Command, Control & Communication (C3) Systems;
8. Sustainable Technologies & Energy Systems;
9. Armoured Vehicles & Armament Engineering;
10. Building & Protective Infrastructure;
11. Cybersecurity;
12. Sensors & Guided Weapons Systems;
13. Artificial Intelligence & Data Analytics;
14. Information Intelligence; and
15. Others.

### 14.2 Business Rules

- applicable Application Forms may allow multiple Area of Interest selections;
- selecting `Others` requires additional text;
- the additional text for `Others` is limited to 50 characters;
- selection-count limits are maintained by the applicable Application Form or Programme rule; and
- Area of Interest-to-Project-domain mappings, suitability weights and scoring are not maintained in Dictionary Management.

## 14A. Bank Names

### 14A.1 Purpose and Selection Behaviour

Bank Names supplies the Bank Name dropdown used when an Applicant provides or updates bank account details during Onboarding and applicable Internship bank-detail updates.

- Bank Name is a mandatory single-selection field in accordance with `IF-B5.1-002`.
- The initial dropdown uses the 47 business-supplied Display Labels below, in the supplied sequence.
- No `Others` option or Applicant-entered bank name is included in this initial list.
- Only Active items are available for new selection. Common maintenance, ordering, validation, audit and historical-record rules apply.
- Bank Account Number, Bank Account Holder Name and Bank Supporting Document are transaction fields, not Bank Names dictionary items.
- Dictionary technical Codes remain to be defined; no bank-routing, clearing or SWIFT/BIC codes are supplied or inferred by this list.

### 14A.2 Confirmed Initial Display Labels

The business supplied and confirmed this initial list on 17 September 2026. Repeated whitespace has been collapsed; spelling, punctuation, combined labels and ordering have otherwise been preserved. Entries have not been merged, renamed or replaced with current legal names.

| No. | Bank Name |
|---|---|
| 1 | ABN AMRO BANK NV |
| 2 | THE ROYAL BANK OF SCOTLAND N.V. |
| 3 | AUSTRALIA & NEW ZEALAND BANKING GROUP LTD |
| 4 | INTSEA SANPAOLO SPA |
| 5 | THE BANK OF EAST ASIA LTD |
| 6 | BANK OF CHINA |
| 7 | BANK OF INDIA |
| 8 | BANGKOK BANK PUBLIC COMPANY LIMITED |
| 9 | PT BANK NEGARA INDONESIA (PERSERO) TBK |
| 10 | BNP PARIBAS |
| 11 | BANK OF AMERICAN, NA |
| 12 | THE BANK OF TOKYO-MITSUBISHI UFJ, LTD |
| 13 | JPMORGAN CHASE BANK,N.A. |
| 14 | CIMB BANK BERHAD |
| 15 | CITIBANK NA |
| 16 | CITIBANK SINGAPORE LIMITED |
| 17 | COMMERZBANK AG |
| 18 | CREDIT AGRICOLE CORPORATE AND INVESTMENT BANK |
| 19 | CHINATRUST COMMERCIAL BANK CO. LTD |
| 20 | DBS BANK LTD / POSB BANK |
| 21 | DEUTSCHE BANK AG |
| 22 | DNB BANK ASA |
| 23 | SKANDINAVISKA ENSKILDA BANKEN AB (PUBL), SINGAPORE |
| 24 | FAR EASTERN BANK LTD |
| 25 | FIRST COMMERCIAL BANK |
| 26 | SVENSKA HANDELSBANKEN |
| 27 | HL BANK |
| 28 | HSBC BANK - PERSONAL |
| 29 | THE HONGKONG & SHANGHAI BANKING CORPORATION LTD |
| 30 | INDUSTRIAL & COMMERCIAL BANK OF CHINA |
| 31 | ICIC BANK LIMITED |
| 32 | INDIAN BANK |
| 33 | INDIAN OVERSEAS BANK |
| 34 | KOREA EXCHANGE BANK |
| 35 | MAYBANK SINGAPORE LIMITED |
| 36 | MALAYAN BANKING BERHAD |
| 37 | MIZUHO BANK LTD |
| 38 | NATIONAL AUSTRALIAN BANK LTD |
| 39 | NORDEA BANK AB |
| 40 | OVERSEA-CHINESE BANKING CORPORATION LTD |
| 41 | QATAR NATIONAL BANK SAQ |
| 42 | RHB BANK BERHAD |
| 43 | STATE BANK OF INDIA |
| 44 | STANDARD CHARTERED BANK (SINGAPORE) LIMITED |
| 45 | SUMITOMO MITSUI BANKING CORP |
| 46 | UCO BANK |
| 47 | UNITED OVERSEAS BANK LTD |

### 14A.3 Name Verification Note

This is the confirmed business-supplied initial list, not an independently verified register of currently supported payment institutions. Potential spelling issues (for example, `INTSEA SANPAOLO SPA`, `BANK OF AMERICAN, NA` and `ICIC BANK LIMITED`) and potentially historical names remain unverified. Any correction or replacement requires business confirmation; this addition does not silently correct labels or establish payment-system compatibility.

## 14B. Termination Reasons

### 14B.1 Purpose and Fields

Termination Reasons supplies the configurable Reason for Termination dropdown in Apply for Termination. This section records the business-confirmed supplement; it does not introduce or change request-initiator permissions or the existing Termination approval workflow.

| Field | Required | Input / Source | Rules |
|---|---|---|---|
| Reason for Termination | Yes | Single-select dropdown — Termination Reasons | Select exactly one Active dictionary item. |
| Supporting Remarks | Yes | Free-text input | Explain the circumstances supporting the request for every selected reason. When `Other` is selected, specify the reason in this same field; no duplicate Other-details field is required. |

### 14B.2 Confirmed Initial Values

| No. | Display Label | Meaning | Supporting Remarks |
|---|---|---|---|
| 1 | Performance concerns | Work performance does not meet expectations, for example work quality or task completion. | Required |
| 2 | Misconduct | Reported conduct or disciplinary concerns. | Required |
| 3 | Operational requirements | Termination required because of organisational or project arrangements, rather than reasons attributable to the Intern personally. | Required |
| 4 | Other | A reason not covered by the other categories. | Required; specify the reason. |

Technical Codes remain to be defined. The confirmed label is `Misconduct`, replacing the originally proposed `Misbehaviours`.

### 14B.3 Business Rules

- Authorised administrators may maintain Termination Reason values using the common dictionary maintenance rules.
- Only Active reasons are available for new selection; ordering, historical snapshots, deactivation, referenced-item protection and audit rules apply.
- Supporting Remarks are mandatory for every reason, including any subsequently added reason. Where the common Additional Input Rule is displayed for this Dictionary Type, it is fixed to `Required` and cannot be changed to `Optional` or `None`.
- A request cannot be submitted without a selected reason and non-blank Supporting Remarks.
- The reason classifies the request only; it does not change approval routing, bypass approval or automatically approve or terminate an Internship.
- Normal early completion of Internship objectives must use the Early Completion process and must not be classified as `Operational requirements`.
- `Misconduct` represents the initiator's reported reason category, not a system finding that the alleged conduct has been established. The selected category remains subject to the existing review and approval process.

## 15. Create, Read, Update and Delete Rules

All eight Dictionary Types support authorised administrator CRUD operations.

### 15.1 Create

- validate all required common and type-specific fields;
- prevent duplicate Code or Display Label within the same Dictionary Type;
- create the item as Active unless the administrator explicitly selects Inactive; and
- make an Active item available to subsequent new business records after successful Save.

### 15.2 Read

- display both Active and Inactive items;
- support Search and Status Filter;
- show type-specific fields where applicable; and
- show creation and latest-update information.

### 15.3 Update

For an unused item:

- Code, Display Label and other permitted fields may be amended.

For a referenced item:

- Code cannot be changed;
- Display Label, Description, Display Order, Additional Input Rule and Status may be amended where applicable; and
- the amendment applies prospectively and does not replace the value snapshot retained by completed historical records.

### 15.4 Delete

If the item has never been referenced:

- physical deletion is permitted;
- confirmation is required; and
- the deletion is recorded in the Audit Log.

Suggested confirmation:

> This dictionary item will be permanently deleted. This action cannot be undone.

If the item is referenced:

- physical deletion is prohibited;
- the system directs the administrator to Deactivate the item; and
- historical relationships remain available.

Suggested message:

> This dictionary item is already used by existing records and cannot be deleted. You may deactivate it to prevent future selection.

## 16. Activation and Deactivation

### 16.1 Active Items

- available to applicable new transactions;
- displayed according to Display Order; and
- subject to applicable type-specific selection and additional-input rules.

### 16.2 Inactive Items

- unavailable for new selection;
- visible to administrators through the Inactive Status Filter;
- retained on historical records;
- eligible for reactivation; and
- not physically deleted when referenced.

## 17. Draft and Historical Record Behaviour

### 17.1 New Records

New records display only Active items in Display Order.

### 17.2 Draft Records

Where a Draft already contains an item that is subsequently deactivated:

- retain the selected value in the Draft;
- display that the value is Inactive;
- do not silently replace the value; and
- require the user to select an Active value before the Draft is submitted where the field remains applicable and mandatory.

### 17.3 Submitted, Issued and Completed Records

Historical records retain:

- Dictionary Item ID;
- Code; and
- the Display Label snapshot applicable when the record was submitted, issued or completed.

A later Display Label amendment, deactivation or deletion of an unrelated unused item must not retrospectively change an existing historical record.

## 18. Validation Rules

- Dictionary Type is required and must be supported by the system.
- Code is required and unique within Dictionary Type.
- Display Label is required and unique within Dictionary Type.
- Code and Display Label are trimmed before validation.
- uniqueness comparison is case-insensitive.
- Display Order must be a positive integer.
- Additional Input Rule must be valid for the applicable Dictionary Type.
- `Others` in Source Channels requires additional source details.
- `Other` in Offer Decline Reasons requires Remarks.
- `Others` in Areas of Interest requires additional text of no more than 50 characters.
- Reason for Termination requires one Active selection and non-blank Supporting Remarks for every reason; its Additional Input Rule cannot be relaxed from `Required`.
- Educational Institution requires at least one valid Institution Level.
- an Educational Institution cannot be selected through Applicant free text.
- a referenced item cannot be physically deleted.
- an Inactive item cannot be selected for a new record.

## 19. Reordering

- administrators may change Display Order within the selected Dictionary Type;
- reordering does not change Code, Display Label or historical records;
- the system may resequence Display Order into consecutive positive integers after Save; and
- the new order applies to subsequent rendering of the applicable dropdown or multi-select control.

## 20. Audit Requirements

The audit trail shall record:

- Dictionary Item creation;
- field amendments;
- physical deletion of an unused item;
- activation and deactivation;
- reactivation;
- Display Order changes;
- previous and revised values;
- operator;
- operation date and time; and
- operation outcome, including a blocked Delete attempt where applicable.

## 21. Permission Statement

This document does not assign final permissions to IO Admin or another administrator role.

> Access to Dictionary Management shall be controlled through Role & Permission Management.

The final Create, Read, Update, Delete, Activate, Deactivate, Reorder and View History permissions will be defined in the Role & Permission Matrix.

## 22. Initial Data Preparation

The Dictionary Management function may be developed independently of final approval of every initial value.

The Singapore Educational Institution Names and Institution Level mappings are confirmed: 183 entries in Section 13.5. Institution technical Codes remain to be prepared and confirmed. Unresolved and excluded records from the cleaning review are not part of the confirmed initial dataset.

Skillset technical Codes and one-sentence definitions, and Discipline technical Codes, also remain to be prepared and confirmed; the Display Label lists below are already confirmed.

The following initial datasets are confirmed in this document:

- Skillset Display Labels (133 values in Section 9.4, including `Other Skillset`);
- Disciplines of Study Display Labels (1,060 values in Section 10.3; technical Codes remain to be defined);
- Source Channels;
- Offer Decline Reasons;
- Areas of Interest;
- Educational Institution Names and Institution Level mappings (183 entries in Section 13.5; technical Codes remain to be defined);
- Bank Name Display Labels (47 entries in Section 14A.2; technical Codes remain to be defined; name-verification limitations are recorded in Section 14A.3); and
- Termination Reason Display Labels (four values in Section 14B.2; technical Codes remain to be defined).

Initial data is loaded through implementation or deployment data scripts. An administrator-facing spreadsheet import function is not required.

## 23. Confirmed Decisions

1. Dictionary Management contains eight fixed Dictionary Types.
2. All eight Dictionary Types support administrator Create, Read, Update and Delete operations.
3. An unused item may be permanently deleted.
4. A referenced item cannot be permanently deleted and must instead be deactivated.
5. Effective From, Effective To, approval workflow and administrator spreadsheet import/export are not required.
6. Initial values are loaded once and maintained manually thereafter without automatic external synchronisation.
7. Offer Decline Reasons use the confirmed six-value initial list.
8. Offer decline is terminal and no reason initiates another automated workflow.
9. Educational Institution is a configured dropdown and does not permit Applicant free text.
10. Educational Institution uses the fixed TOA classifications `Secondary`, `Post-Secondary (Non-University)` and `University`.
11. Institution Levels are TOA business classifications and not a reproduction of the complete MOE taxonomy.
12. Areas of Interest use the 14 confirmed categories listed in Section 14.1 plus `Others`; selecting `Others` requires additional text of no more than 50 characters.
13. Nationality and Country standard lists are not maintained through this function.
14. Programme Category, Window and Duration relationships remain under Programme Settings.
15. Disciplines of Study use the 1,060 business-supplied initial Display Labels in Section 10.3, preserving the supplied wording and sequence without merging similar labels.
16. Skillsets use the 132 confirmed skill and tool Display Labels plus `Other Skillset` in Section 9.4. Document groupings and the Area of Interest coverage examples do not change the flat dictionary structure or introduce selection restrictions.
17. Educational Institutions use the 183 confirmed initial Institution Names and Level mappings in Section 13.5, including the 11 official-source additions. Pending-review and excluded records are not included. Institution technical Codes remain to be defined.
18. Bank Names uses the 47 business-supplied initial Display Labels in Section 14A.2. Only repeated whitespace is normalised; spelling, punctuation, combined labels and sequence are preserved. The initial list contains no `Others` option. Technical Codes remain to be defined, and name-verification limitations are recorded separately without changing the supplied values.
19. Termination Reasons uses `Performance concerns`, `Misconduct`, `Operational requirements` and `Other` as the four initial values. Apply for Termination requires one reason and Supporting Remarks for every reason; `Other` uses the same remarks field. Reasons do not alter approval logic, normal early completion follows the separate Early Completion process, and selecting `Misconduct` is not a system finding of established misconduct.
