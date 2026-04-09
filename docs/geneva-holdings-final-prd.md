# Geneva Holdings — M&A Marketplace Platform
## Product Design Requirements Document
**Version 2.0 | Confidential**

> *Middle Market M&A. Reimagined. A trusted, vetted, confidential marketplace connecting brokers and buyers across the middle market.*

> **Note:** "Geneva Holdings" is a placeholder name. The final product name is TBD..

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [User Roles & Permissions](#2-user-roles--permissions)
3. [Authentication](#3-authentication)
4. [Onboarding & Approval](#4-onboarding--approval)
5. [Marketing Homepage (Logged-Out Experience)](#5-marketing-homepage-logged-out-experience)
6. [Broker Experience](#6-broker-experience)
7. [Buyer Experience](#7-buyer-experience)
8. [Messaging & Notifications](#8-messaging--notifications)
9. [Admin Dashboard & Analytics](#9-admin-dashboard--analytics)
10. [Settings](#10-settings)
11. [UI & UX Standards](#11-ui--ux-standards)
12. [Edge Cases & Business Rules](#12-edge-cases--business-rules)
13. [Quick Reference: Key Platform Rules](#13-quick-reference-key-platform-rules)
14. [Screen Inventory](#14-screen-inventory)
15. [Email & Notification Inventory](#15-email--notification-inventory)

---

## 1. Product Overview

### 1.1 What It Is

Geneva Holdings is a professional, confidential M&A marketplace for the middle market. It connects vetted business brokers and investment bankers — who represent companies for sale — with vetted buyers including private equity firms, independent sponsors, family offices, search funds, and private investors. The platform competes directly with Axial.net.

> **Note on Terminology:** Throughout this document, the terms "broker" and "banker" are used interchangeably. Both refer to the sell-side intermediaries — business brokers and investment bankers — who post and represent companies for sale on the platform.

The platform is built around three core principles: trust, confidentiality, and professionalism. Every participant — broker or buyer — is vetted and approved by platform administrators before gaining access. Deals are structured to protect sensitive information through a staged disclosure process: a teaser is available before the NDA, full deal materials are available only after the NDA is signed.

### 1.2 Core Value Proposition

**For Brokers:** A free, professional platform to reach vetted, qualified buyers for their middle market listings. Unlike competing platforms such as BizBuySell — where brokers pay to post deals — and Axial — where brokers receive no financial upside — this platform is free to use and brokers earn a 0.25% success fee on every closed deal. This is a meaningful incentive designed to reward brokers for bringing quality deal flow to the platform.

**For Buyers:** A curated deal flow matched to their specific acquisition criteria, with a streamlined process from expression of interest through NDA, CIM review, IOI, and LOI. Buyers pay a 1.25% success fee on total enterprise value (including earnouts and future payments) only upon closing a deal. This represents a significantly reduced cost compared to traditional platforms like Axial, which charge a Lehman formula fee structure that can result in success fees nearly double the 1.25% flat rate offered here.

**For the Market:** A secure, structured environment that brings discipline and transparency to the lower middle market deal process.

### 1.3 Fee Structure

- Platform use is free for both brokers and buyers on a monthly basis. There is no subscription fee.
- Upon deal close, the buyer pays a 1.25% success fee on total enterprise value, including all earnouts and future payments.
- Of the 1.25%, brokers receive 0.25% as an incentive paid by the platform.
- Payment is handled offline. The platform records the transaction and notifies admins.
- Deal close is self-reported by the buyer and confirmed by the broker. If there is a dispute over the reported enterprise value, the buyer must submit the deal funds flow and terms documentation to resolve it.

### 1.4 Design Direction

The visual design is clean, simple, and elegant — drawing from the traditional finance color palette (navy, slate blue, white, light gray accents) rather than dark or black tones. The overall experience should feel like a premium financial services platform. The platform is responsive and works on both desktop and mobile browsers.

---

## 2. User Roles & Permissions

### 2.1 Platform Administrators

Platform admins are the operators of the marketplace. They have full visibility and control over all platform activity.

**Admin Capabilities:**

- Approve or reject broker and buyer signup applications
- Send firm invitation links to additional users within a broker or buyer firm
- Create and manage firm profiles (all users from the same company fall under one firm profile)
- View all deal listings, including drafts
- Edit or remove any deal from the platform
- Suspend or ban any user
- View all message threads between brokers and buyers
- Manage the standard platform NDA (edit and update)
- Manage rejection email templates
- Feature or promote specific deals on the platform
- Send platform-wide announcements and emails to all users
- Configure activity alert thresholds (e.g. number of deals a buyer pursues in a set number of days)
- Receive notifications when configured activity thresholds are exceeded
- Receive notifications when a deal closes (buyer self-report + broker confirmation submitted)
- Record closed deal enterprise values and track fee revenue
- Manage deal promotion billing: brokers and bankers may pay a fee (TBD) to have their deals featured or promoted in the Browse All Deals section; admins manage and process these promotion requests and associated billing
- Access the full Admin Analytics Dashboard (see Section 9)

### 2.2 Brokers

Brokers and investment bankers represent companies for sale. They list deals, manage buyer relationships, and control the disclosure process for their deals.

**Broker Firm Structure:**
The first person from a firm to sign up lists all other firm members who need access. The platform admin sends those individuals invitation links and creates a unified firm profile. All users from that firm fall under the same profile.

**Broker Firm Permissions:**
All users within a broker firm have identical access. There are no role-based permission distinctions between firm members. All users can:

- Create deal listings
- Edit deal listings
- Terminate deals
- Accept or deny prospective buyers
- Release NDAs manually
- Release CIMs manually
- Upload documents
- Message buyers (available to all users by default)

### 2.3 Buyers

Buyers are the acquisition-side participants: private equity firms, independent sponsors, family offices, search funds, private investors, and other buyer types.

**Buyer Firm Structure:**
Similar to brokers, buyers may belong to a firm. The first person from a firm to sign up lists all other firm members who need access. The platform admin sends those individuals invitation links and creates a unified firm profile. All users from that firm fall under the same profile.

**Buyer Firm Permissions:**
All users within a buyer firm have identical access. There are no role-based permission distinctions between firm members.

---

## 3. Authentication

All users log in and sign up via **Google OAuth**. There is no email/password authentication. As a result, there is no password management or password reset flow in the platform.

The OAuth login initiates the signup and onboarding flow for new users. Returning users are taken directly to their dashboard after authentication.

---

## 4. Onboarding & Approval

### 4.1 Broker Onboarding

**Signup Information Required:**

- Full name
- Firm name
- Firm website
- Location
- License and credentials
- Company description
- Types of deals typically represented
- Industry focus

The first person signing up from a firm also provides a list of other firm members who need platform access. The platform admin then sends invitation links to those individuals and creates the firm profile.

**Approval Process:**

1. Broker authenticates via Google OAuth
2. Broker fills out the signup form with all required information
3. Broker signs a formal platform membership agreement electronically during signup
4. Profile is submitted for admin review
5. Admin reviews and approves or rejects within 24 hours
6. If approved: broker receives access confirmation via email and can begin posting deals
7. If rejected: broker is notified via email and may reapply

**Pending Approval State:** After submitting their application, the broker sees a pending approval screen confirming their application was received and informing them that review typically takes within 24 hours.

### 4.2 Buyer Onboarding

**Signup Information Required:**

- Full name
- Company name
- Company website
- Location
- Buyer type: Private Equity, Independent Sponsor, Family Office, Search Fund, Private Investor, Other
- Company description
- Industry focus
- Assets under management (AUM)
- **Document uploads (Search Fund and Private Investor only):** Buyers who select Search Fund or Private Investor as their buyer type are given the option to upload supporting financial documents, such as SBA pre-approval letters or funding commitments. These documents are viewable by brokers and bankers when reviewing the buyer's profile.

The first person signing up from a firm also provides a list of other firm members who need platform access. The platform admin then sends invitation links to those individuals and creates the firm profile. All users fall under the same firm profile.

**Approval Process:**

1. Buyer authenticates via Google OAuth
2. Buyer fills out the signup form with all required information
3. Buyer signs a formal platform membership agreement electronically during signup
4. Profile is submitted for admin review
5. Admin reviews and approves or rejects within 24 hours
6. If approved: buyer receives access confirmation via email and can begin creating projects and browsing deals
7. If rejected: buyer is notified via email and may reapply

**Pending Approval State:** After submitting their application, the buyer sees a pending approval screen confirming their application was received and informing them that review typically takes within 24 hours.

---

## 5. Marketing Homepage (Logged-Out Experience)

### 5.1 Purpose & Tone

The marketing homepage is the public-facing entry point for the platform. It is a full marketing site designed to convey confidence, trust, confidentiality, professionalism, and the platform's focus on the middle market. The visual design follows the platform's design direction: clean, simple, elegant, traditional finance palette (navy, slate blue, white, light gray accents). The overall experience should feel like a premium financial services platform.

### 5.2 Navigation Tabs

- **For Buyers** — explains the platform's value proposition, how it works, and what buyers gain; highlights the 1.25% flat success fee and how it compares favorably to the Lehman formula fee structures charged by competing platforms
- **For Brokers** — explains the platform's value proposition, how it works, and what brokers gain; highlights that posting is free (unlike BizBuySell) and that brokers earn a 0.25% success fee on closed deals (unlike Axial, where brokers earn nothing)
- **About** — describes the platform's mission, values, and story
- **How It Works** — step-by-step explanation of the platform process
- **Sign Up / Log In** — prominent calls to action (initiates Google OAuth flow)

### 5.3 How It Works Section

The How It Works page presents the onboarding and deal flow in simple steps:

1. Create your profile (broker or buyer)
2. Sign the platform membership agreement electronically
3. Profile is reviewed and approved by platform admins (within 24 hours)
4. Once approved: buyers create projects; brokers post deals
5. Buyers are matched to deals based on project criteria and can browse and pursue deals
6. NDAs are signed, CIMs are reviewed, and offers are submitted — all within the platform

### 5.4 Shared Deal Link Landing Page

When a buyer uses the Share feature to send a deal link to someone who does not have a platform account, that person lands on a special page that includes:

- A message indicating that someone has shared a deal with them
- An **About the Platform** section explaining what the platform is and its value proposition
- A **How It Works** section (same steps as above)
- A contact form to request more information or initiate signup
- A prompt to sign up or log in to view the deal

If the link recipient already has a platform account and is logged in, they are taken directly to the deal page.

---

## 6. Broker Experience

### 6.1 Broker Deal Workspace Dashboard

Upon logging in, brokers land on their Deal Workspace Dashboard. This is the central hub for all of their deal activity. It displays all companies they have listed for sale, including those in draft form.

**Dashboard Summary Analytics:**

The top of the dashboard displays the following firm-level summary metrics:

- Total active deals
- Total deals in draft
- Total deals posted (all time)
- Total closed deals
- Total passed deals
- Total views across all deals
- Total CIMs downloaded across all deals
- Total buyers engaged across all deals
- Total buyers by type (PE, independent sponsor, family office, search fund, private investor, other)
- Average days on market across active deals
- Average days from posting to first pursue
- Average days from NDA to IOI
- Average number of buyers per deal
- Average NDAs per deal
- Deal conversion funnel: views → pursues → NDAs → IOIs → LOIs → closed
- Total NDAs signed for this firm
- Total IOIs received across all deals
- Total LOIs received across all deals
- Total enterprise value of closed deals
- Total deal fees received by the firm (0.25% share of closed deals)
- Pass reason breakdown across all deals
- Deals by industry
- Deals by geography (state)
- Pipeline summary by deal stage
- All financial metrics also broken down by industry and by state

**Deal Tiles:**

Each deal is displayed as a tile on the dashboard. Each tile shows:

- Company name (internal)
- Current deal status
- Days on market
- If status is **Accepting IOIs**: number of IOIs received so far
- If status is **Accepting LOIs**: number of LOIs received so far
- Three-dot menu (top right) for quick edit access

Clicking on a deal tile navigates to that deal's individual Deal Management Page.

**Empty State:** When a broker has no deals yet, the dashboard displays an illustrated empty state with guidance: "Post your first deal" with a prominent CTA to create a deal listing.

### 6.2 Creating a Deal Listing

Brokers create a deal listing by filling out the following fields.

**Teaser Upload (Prominently Displayed at Top of Page):**
At the very top of the deal creation page, the teaser upload is featured prominently with clear messaging to the broker: uploading a teaser enables the platform to automatically extract and populate all deal information fields. If the teaser contains the required information, all fields will be auto-populated, saving the broker significant time. If certain fields are not found in the teaser, those fields will remain blank and the broker must populate them manually before publishing. This auto-population feature is a key highlight of the deal creation experience.

**Deal Information Fields:**

- Project name (internal — not visible to buyers)
- External headline (visible to buyers on deal cards and within the deal)
- Company description / About the Business section
- Geography: broker selects whether to display the company's specific state or only the region (e.g., Midwest, Southeast, Northeast)
- Industry
- Financials: Revenue and EBITDA for each of the last 3 completed fiscal years, and a projection for the current year
- Teaser document upload (visible to buyers before NDA is signed)
- NDA selection: upload a custom broker NDA, or use the standard platform NDA
- CIM upload
- CIM sharing preference: auto-share CIM upon NDA signature, or manually release CIM to each buyer
- NDA vetting preference: auto-send NDA when a buyer pursues the deal, or manually review buyer profile first before releasing the NDA
- Point of contact: select a user from within the firm who will be the primary contact for this deal

**File Constraints:** All document uploads (teasers, NDAs, CIMs, additional documents) must be PDF format with a maximum file size of 50MB per file.

**Draft & Publishing:**

Brokers may save a deal as a draft at any time before publishing. Draft deals are visible in the broker's Deal Workspace Dashboard but are not published or visible to buyers.

From the draft view, the broker can preview the deal exactly as a buyer would see it. The broker can make edits directly within this preview. When ready to publish, a single **Publish** button makes the deal live and visible to matched buyers and the general browsing feed.

### 6.3 Deal Statuses

A deal can be in one of the following statuses:

| Status | Description |
|---|---|
| **Draft** | Saved but not published; not visible to buyers |
| **Accepting IOIs** | Live and soliciting indications of interest; broker may enter an IOI due date visible to buyers |
| **Accepting LOIs** | Live and soliciting letters of intent; broker may enter an LOI due date visible to buyers |
| **Under LOI** | Deal is under an active letter of intent |
| **Paused** | Temporarily hidden from new prospective buyers and not visible in the Browse All Deals feed. Buyers who have already signed an NDA can still see the deal in their feed, but cannot click into it or access any deal details until the deal is reactivated. |
| **Closed** | Deal is completed; buyers can no longer click in or access any details |

**Document Access Upon Status Change:**
When a deal is paused, terminated, or closed, all buyer access to deal documents (CIM and any uploaded files) is immediately revoked. Buyers are notified when a deal is terminated or closed with a message: *"[Broker Firm Name] has terminated the project."*

### 6.4 Individual Deal Management Page

Clicking into a deal tile takes the broker to the Deal Management Page. This page contains:

**Deal Overview & Edit:**

- Full deal details with the ability to edit all fields
- Current status with the ability to change status
- IOI or LOI due date (editable, visible to buyers)
- Point of contact management

**Buyer Pipeline:**

- Full list of all buyers and the stage each is at within this deal
- For each buyer: name, firm, buyer type, current stage
- NDA status tracker per buyer: sent, signed, declined
- CIM access log: who viewed or downloaded the CIM and when

**Offer Management:**

- All submitted IOIs listed individually with all populated fields
- All submitted LOIs listed individually with all populated fields
- Broker can select which IOIs to compare side by side in a comparison table
- Broker can select which LOIs to compare side by side in a comparison table
- Comparison table displays all offer fields in columns for easy review

**Documents:**

- Teaser, NDA, and CIM on file
- Ability to upload additional documents
- Document access log

**Messaging:**

- One-on-one asynchronous message thread per buyer
- All threads for this deal accessible from this page

**Deal Analytics:**

- Total views
- Number of pursues and passes
- NDAs sent, signed, declined
- CIM views and downloads
- IOIs received, LOIs received
- Days on market
- Buyer pass reason breakdown
- Buyers by type

**Deal Activity Timeline:**
A chronological log of every action taken on this deal: deal posted, buyer viewed, buyer pursued, NDA sent, NDA signed, CIM accessed, IOI submitted, LOI submitted, status changes, messages sent.

---

## 7. Buyer Experience

### 7.1 Buyer Deal Workspace Dashboard

Upon logging in, buyers land on their Deal Workspace Dashboard — the central hub showing all active projects and a summary of deal pursuit activity.

**Dashboard Summary Analytics:**

- Total deals currently pursuing
- Total deals passed on
- Total NDAs signed
- Total IOIs submitted
- Total LOIs submitted
- Number of deals by stage (across all projects)
- Average deal revenue across all deals being pursued
- Average deal EBITDA across all deals being pursued
- Average revenue and EBITDA for all matched deals (based on project criteria)
- Deals by industry
- Recent activity feed (e.g., NDA signed on Deal X, LOI submitted on Deal Y)

**Project Tiles:**

Each project is displayed as a tile showing:

- Internal project name
- Key project criteria summary (industry, size range, etc.)
- Number of matched deals
- Number of deals actively pursuing within this project
- Three-dot menu (top right) to edit project criteria and information

Clicking on a project tile navigates to that project's Deal Feed page.

**Empty State:** When a buyer has no projects yet, the dashboard displays an illustrated empty state with guidance: "Create your first acquisition project" with a prominent CTA to define their criteria.

### 7.2 Projects

Buyers create projects that define their acquisition criteria. Projects are used for deal matching only — brokers cannot view buyer projects.

**Project Fields:**

- Internal project name (not visible to brokers or other buyers)
- Industry
- Revenue range (min and max)
- EBITDA range (min and max)
- EBITDA margin
- Location (state)
- Keywords

When a broker posts a deal that matches a buyer's project criteria, that deal surfaces in the buyer's project deal feed. If a buyer has no matched deals, they may browse all deals using the general browsing feed.

### 7.3 Project Deal Feed Page

When a buyer clicks on a project tile, they are taken to the Project Deal Feed page, which shows all deals matching that project's criteria. Deals are displayed in a **table format** (not tiles) to keep the view clean and manageable when many deals are present. The table also includes deals the buyer has already pursued or declined within this project. Results load via **infinite scroll** as the buyer scrolls down.

**Deal Card Information:**

- Deal headline
- About the Business summary
- Industry
- Geography (region or specific state, per broker preference)
- Revenue and EBITDA for the last 3 completed fiscal years and current year projection

> Asking price is never displayed and is not a field brokers enter.

### 7.4 Deal Actions

For each deal row in the table, the buyer has three actions:

- **Decline** — the deal is removed from the buyer's active queue. The broker cannot see who declined. No reason is required. The buyer simply declines the deal.
- **Pursue** — the buyer expresses formal interest in the deal, triggering the NDA flow (automatic or manual, per broker settings).
- **Share** — generates a shareable link that can be copied or sent via email. Recipients with an existing account land directly on the deal page. Recipients without an account land on the shared deal landing page (see Section 5.4).

> If a buyer previously declined a deal, they may reverse their decision and pursue the deal as long as it remains active.

**Post-NDA Pass (After Reviewing the Deal):**
Once a buyer has pursued a deal, signed the NDA, received the CIM, and reviewed the deal materials, they may decide the deal is no longer a fit. At this stage, the buyer can change their deal status to **Pass**. This is distinct from the initial Decline action. When a buyer changes their status to Pass, they are required to select a reason from the following options:

- Not an industry fit
- Not a business fit
- Financial profile
- Valuation expectations
- Failed bid
- Other (write-in)

The Pass reason is recorded and visible to both the buyer and the broker.

### 7.5 Browsing All Deals

If a buyer has no matched deals or wants to explore beyond project criteria, they can browse all active deals. Results load via **infinite scroll**. The browsing feed supports:

- Industry filter
- Revenue range filter
- EBITDA range filter
- EBITDA margin filter
- Location filter (state or region)
- Keywords filter

The same three actions (Decline, Pursue, Share) are available on all deal rows.

### 7.6 NDA Flow

**If the broker opted for automatic NDA release:**

1. Buyer clicks Pursue
2. NDA (platform standard or broker custom) is immediately sent to the buyer
3. Buyer fills in required fields and signs electronically within the platform
4. Upon signature, if broker set CIM to auto-share, buyer immediately gains access to the CIM
5. If broker set CIM to manual release, broker is notified and must manually release the CIM

**If the broker opted to manually vet buyers first:**

1. Buyer clicks Pursue
2. Broker is notified that a buyer has expressed interest
3. Broker reviews the buyer's profile: name, location, company, buyer type, company description, industry focus, company website
4. Broker selects one of three actions:
   - **Approve** — NDA is released to the buyer and the flow continues as above
   - **Reject** — buyer is notified with a templated rejection reason: *Not an industry fit, Not a financial fit, Not the right partner, Other (broker write-in)*
   - **Request more information** — broker sends the buyer a message requesting additional details before deciding

### 7.7 Deal Workspace (Within a Pursued Deal)

Once a buyer is actively engaged with a deal, clicking on it opens the full Deal Workspace containing:

- **Deal stage indicator** showing current position:
  `Requested Deal Information → NDA Signed → Reviewing Information → IOI Submitted → LOI Submitted → Diligence`
  At any point after NDA is signed, the buyer may change their status to **Pass** (with required reason) if they determine the deal is no longer a fit.
- Deal documents: teaser (always visible), CIM (visible after NDA signed and released)
- Uploaded documents from the broker
- Message thread with the broker point of contact (asynchronous, one-on-one)
- IOI submission form (available at the appropriate stage)
- LOI submission form (available at the appropriate stage)
- History of submitted offers

### 7.8 Submitting an IOI

**Required IOI Fields:**

- Offer price
- Multiple
- Earnout (if any)
- Rollover (if any)
- Cash at close
- Time to close
- Platform or Add-On: buyer checks whether this is a platform acquisition or an add-on. If add-on, buyer enters the website of the platform company.

**Optional IOI Fields:**

- Escrow
- Working capital peg
- Special considerations

Upon submission, the broker is notified. The broker can view all IOIs individually or select specific IOIs to compare side by side in a structured comparison table.

### 7.9 Submitting an LOI

**All fields are required except Special Considerations:**

- Offer price
- Multiple
- Escrow
- Timing
- Earnout
- Rollover
- Working capital peg
- Cash at close
- Platform or Add-On: same as IOI (if add-on, provide platform company website)

**Optional LOI Fields:**

- Special considerations

Upon submission, the broker is notified. The broker can view all LOIs individually or select specific LOIs to compare side by side in a structured comparison table.

### 7.10 Deal Closure & Success Fee

1. The buyer self-reports the final enterprise value (including all earnouts and future payments) within the platform
2. The broker confirms the reported enterprise value
3. If the broker disputes the value, the buyer must submit the deal funds flow and all relevant terms documentation
4. The platform admin is notified of the close and the recorded enterprise value
5. Payment of the 1.25% success fee is handled offline between the buyer and the platform
6. The 0.25% broker incentive payment is also handled offline
7. The transaction is recorded on the platform for admin visibility and analytics

---

## 8. Messaging & Notifications

### 8.1 Messaging

- All messaging is asynchronous and one-on-one, similar to an email thread
- Each deal has a separate message thread per buyer
- The broker point of contact for a deal is the broker participant in that thread
- If the point of contact changes or a deal is reassigned, the message history does not transfer — the new thread starts fresh
- Platform admins can view all message threads
- Only the assigned point of contact participates — multiple users from the same firm do not share a single thread
- File sharing within messages is limited to PDF format, 50MB max per file

### 8.2 Notification System

Notifications are delivered both **in-platform** and **via email** for all key events. Users can control their notification preferences, toggling specific event types on or off for each channel independently.

**Broker Notification Events:**

- New buyer has pursued a deal (if vetting enabled: new buyer pending review)
- Buyer has signed an NDA
- Buyer has declined an NDA
- New IOI submitted on a deal
- New LOI submitted on a deal
- Buyer has passed on a deal (post-NDA, with reason) or declined a deal (pre-NDA, no reason)
- Buyer confirmed deal close / enterprise value reported
- New message received from a buyer
- Deal status changed (by admin)
- Pending action or unread message not responded to in 5 days — repeating every 5 days until resolved

**Buyer Notification Events:**

- New matched deal available based on project criteria
- NDA has been sent for a pursued deal
- NDA approved / access granted by broker
- NDA rejected by broker (with reason)
- CIM has been released and is available to view
- Deal status has changed (e.g., Accepting LOIs, Under LOI, Closed, Terminated)
- Deal terminated — message: *"[Broker Firm Name] has terminated the project"*
- New message received from a broker
- Pending action or unread message not responded to in 5 days — repeating every 5 days until resolved

**Admin Notification Events:**

- New broker signup application submitted
- New buyer signup application submitted
- Deal closed — enterprise value reported for fee tracking
- Unusual activity detected (configurable threshold exceeded)

---

## 9. Admin Dashboard & Analytics

### 9.1 Admin Dashboard Overview

Platform admins have access to a comprehensive dashboard providing full visibility into platform activity, user management, deal pipeline health, and financial performance.

### 9.2 User Management

- List of all broker and buyer applications pending approval
- Full list of all registered users (brokers and buyers, separately)
- Ability to approve, reject, suspend, or ban any user
- Firm profile management: create, edit, and manage firm profiles and associated users
- Send invitation links to additional firm members
- View any user's full profile

### 9.3 Deal Management

- View all active, draft, paused, closed, and terminated deals
- Edit or remove any deal
- Feature or promote specific deals
- View all message threads

### 9.4 Platform Settings

- Edit the standard platform NDA
- Manage rejection email templates
- Configure activity alert thresholds (e.g., buyer pursues more than X deals in Y days; broker posts more than X deals in Y days)
- Manage deal promotion billing (TBD fee for brokers/bankers to feature deals in Browse All Deals)
- Send platform-wide announcements and emails

### 9.5 Admin Analytics Dashboard

All metrics can be filtered and broken down by **industry** and **state** unless otherwise noted.

**User & Growth Metrics:**

- Total registered brokers
- Total registered buyers
- New user signups over time (brokers and buyers separately)
- Users by country
- Buyer type breakdown (PE, independent sponsor, family office, search fund, private investor, other)
- Average time for admin to approve a new user
- Buyer retention rate (buyers who pursue more than one deal)
- Most active buyers (by deals pursued)
- Most active broker firms (by deals posted)

**Deal Pipeline Metrics:**

- Total deals posted (all time)
- Total active deals
- Total deals by status
- Total closed deals
- Total terminated / paused deals
- Deals by industry
- Deals by geography (state)
- Average number of buyers per deal
- Average NDAs per deal before an IOI is received
- Average IOIs per deal
- Average LOIs per deal
- Deal conversion funnel: views → pursues → NDAs → IOIs → LOIs → closed
- Pass reason breakdown platform-wide

**Time-Based Metrics:**

- Average days from deal posted to first pursue
- Average days from pursue to NDA signed
- Average days from NDA signed to IOI submitted
- Average days from IOI to LOI
- Average days from deal posted to close
- Average days on market

**Financial Metrics:**

- Total enterprise value of all closed deals
- Average enterprise value per closed deal
- Average revenue per deal (active and closed)
- Average EBITDA per deal
- Average EBITDA margin per deal
- Minimum revenue across deals
- Minimum EBITDA across deals
- Maximum revenue across deals
- Maximum EBITDA across deals
- Minimum enterprise value (closed deals)
- Maximum enterprise value (closed deals)
- Total success fees earned (1.25% of closed deal enterprise values)
- Total broker incentive payouts (0.25% of closed deal enterprise values)
- Projected fees in pipeline (deals currently under LOI)
- Deals closed by buyer type (PE vs. independent sponsors vs. family offices, etc.)
- All financial metrics broken down by industry
- All financial metrics broken down by state

**Engagement Metrics:**

- Total NDAs signed platform-wide
- Total CIMs downloaded platform-wide
- Total IOIs submitted platform-wide
- Total LOIs submitted platform-wide
- Total messages sent platform-wide
- Average buyer engagement per deal (views, pursues, NDAs)
- Flagged activity alerts history (all threshold breaches)

---

## 10. Settings

### 10.1 Broker Settings

- **Edit profile information** — update firm name, description, location, industry focus, credentials, and firm website
- **Notification preferences** — toggle individual notification event types on/off for in-platform and email channels independently
- **Delete account** — permanently delete the user's account and all associated data. When an account is deleted: all active deal connections are terminated, other parties on each connection are notified with the standard termination message, and all user data is permanently removed. If the user is the only member of a firm, the firm profile is also deleted. If other firm members remain, the firm profile and deals persist.

### 10.2 Buyer Settings

- **Edit profile information** — update company name, description, location, buyer type, industry focus, AUM, company website, and supporting documents (Search Fund / Private Investor)
- **Notification preferences** — toggle individual notification event types on/off for in-platform and email channels independently
- **Delete account** — permanently delete the user's account and all associated data. When an account is deleted: all active deal pursuits are terminated (treated as a Pass with no reason recorded), and all user data is permanently removed. If the user is the only member of a firm, the firm profile is also deleted. If other firm members remain, the firm profile persists.

---

## 11. UI & UX Standards

### 11.1 Responsive Design

The platform is fully responsive and works on both desktop and mobile browsers. All screens, dashboards, tables, and forms adapt to different viewport sizes.

### 11.2 Empty States

Every screen that can be empty displays a purposeful empty state with an illustration, a short guidance message, and a clear CTA directing the user to the next action. Examples include: broker dashboard with no deals, buyer dashboard with no projects, project feed with no matched deals, messaging inbox with no threads.

### 11.3 Loading States

All data-fetching actions display appropriate loading indicators (spinners, skeleton screens, or progress bars) so the user is never left looking at a blank or frozen screen.

### 11.4 Error States

When an action fails (network error, validation error, server error), the user sees a clear, human-readable error message with guidance on what to do next (retry, correct input, contact support). Form validation errors are shown inline next to the relevant field.

### 11.5 Pagination

Deal feeds (Project Deal Feed, Browse All Deals) use **infinite scroll** — additional results load automatically as the user scrolls down.

### 11.6 File Constraints

All document uploads across the platform (teasers, NDAs, CIMs, additional deal documents, message attachments, buyer supporting documents) are limited to **PDF format** with a maximum file size of **50MB per file**.

---

## 12. Edge Cases & Business Rules

### 12.1 Document Access Revocation
When a deal is paused, terminated, or closed, all buyer access to deal documents (CIM and any uploaded files) is immediately and automatically revoked. Buyers who previously downloaded documents retain those local copies, but cannot access documents through the platform.

### 12.2 Closed Deal Visibility
When a deal is marked as Closed, buyers who were engaged with that deal can see the deal tile in their project feed but cannot click into it or access any deal details or documents.

### 12.3 Buyer Re-Engagement After Decline
If a buyer has declined a deal before pursuing it, they may reverse their decision and pursue the deal as long as it remains active (not closed, terminated, or paused). If a buyer has passed on a deal after NDA (post-CIM review), the Pass reason is preserved in the record. Re-engagement after a post-NDA Pass is not supported — the Pass at that stage is considered final.

### 12.4 Changing Point of Contact
If the point of contact for a deal is changed within the broker firm, the message history from the previous point of contact does not transfer to the new one. The new message thread starts fresh. Existing buyer relationships and deal status are unaffected.

### 12.5 Activity Alerts
Platform admins configure activity alert thresholds (e.g., a buyer pursuing more than X deals in Y days, or a broker posting more than X deals in Y days). When a threshold is exceeded, the admin is notified immediately. Thresholds can be adjusted at any time. The full history of flagged activity is recorded in the admin dashboard.

### 12.6 NDA Disputes
If there is a dispute over NDA terms, resolution occurs outside the platform. The platform's role is to facilitate the electronic signature and record the signed document.

### 12.7 Enterprise Value Disputes
If a broker disputes the enterprise value self-reported by the buyer upon close, the buyer must submit full deal funds flow and relevant terms documentation through the platform. The admin is notified and records the outcome. Payment handling is always offline.

### 12.8 Pending Action Reminders
Both buyers and brokers receive a notification (in-platform and email) if they have a pending action or unread message they have not responded to within 5 days. This reminder repeats every 5 days until the action is resolved.

### 12.9 Broker Rejection of Buyer
When a broker rejects a buyer during manual vetting, the buyer is notified with a templated message. Rejection reasons: *Not an industry fit, Not a financial fit, Not the right partner, Other (broker write-in)*. These templates are managed by platform admins.

### 12.10 Draft Deal Preview
When a broker previews a draft deal from the buyer's perspective, they see an exact representation of what buyers will see upon publishing. The broker can make edits directly within this preview mode. The deal is not visible to any buyer while in draft status.

### 12.11 Account Deletion
Any user (broker or buyer) can delete their own account from Settings. Upon deletion, all active engagements are terminated, affected counterparties are notified, and all user data is permanently removed. See Section 10 for full details on the deletion flow per role.

### 12.12 Firm Member Departure
If a firm member deletes their account or is banned, and they were the point of contact on active deals, the broker firm admin must reassign the point of contact. Until reassigned, the deal's messaging for that buyer thread is unavailable. All other deal data and buyer relationships remain intact.

---

## 13. Quick Reference: Key Platform Rules

| Rule | Detail |
|---|---|
| Asking Price | Never displayed, never required |
| Success Fee | 1.25% of total enterprise value paid by buyer on close |
| Broker Incentive | 0.25% of closed deal value paid by platform to broker |
| Subscription Fee | None — platform is free to use |
| Approval SLA | Admin reviews all applications within 24 hours |
| Authentication | Google OAuth only |
| NDA Signing | Electronic, within the platform |
| CIM Access | Only after NDA is signed (auto or manual release) |
| Deal Visibility | Buyers see region or state per broker preference |
| Decline (Pre-NDA) | Buyer declines without providing a reason; broker cannot see who declined |
| Pass (Post-NDA) | After CIM review, buyer passes with required reason; visible to broker |
| Post-NDA Pass | Final — buyer cannot re-engage after passing post-NDA |
| Message Threads | One-on-one, asynchronous; admin can view all |
| Pending Action Nudge | 5-day reminder, repeating until resolved |
| Doc Access Revocation | Immediate upon pause, termination, or close |
| Closed Deal Access | Buyers see deal in feed but cannot click in or access docs |
| Draft Visibility | Draft deals are not visible to any buyer |
| Buyer Projects | Brokers cannot view buyer projects |
| IOI Required Fields | Offer price, multiple, earnout, rollover, cash at close, time to close |
| LOI Required Fields | All fields required except special considerations |
| Platform/Add-On Flag | Required on both IOI and LOI; add-on requires platform URL |
| File Format | PDF only, 50MB max per file |
| Account Deletion | Available to all users; terminates active engagements, deletes all data |

---

## 14. Screen Inventory

| Screen | Role | Description |
|---|---|---|
| Marketing Homepage | Public | Landing page with For Buyers, For Brokers, About, How It Works, Sign Up/Log In |
| Shared Deal Landing Page | Public | Special page for non-users who receive a shared deal link |
| Sign Up / Log In | Public | Google OAuth initiation |
| Broker Signup Form | Broker | Application form with all required broker fields + membership agreement |
| Buyer Signup Form | Buyer | Application form with all required buyer fields + membership agreement |
| Pending Approval | Both | Confirmation screen shown after application submission |
| Broker Deal Workspace Dashboard | Broker | Central hub with firm analytics, deal tiles, and deal management |
| Create / Edit Deal Listing | Broker | Deal creation form with teaser upload, all fields, draft/publish |
| Draft Preview | Broker | Buyer-perspective preview of an unpublished deal with inline editing |
| Deal Management Page | Broker | Individual deal view with overview, buyer pipeline, offers, docs, messaging, analytics, timeline |
| IOI Comparison Table | Broker | Side-by-side structured comparison of selected IOIs |
| LOI Comparison Table | Broker | Side-by-side structured comparison of selected LOIs |
| Buyer Deal Workspace Dashboard | Buyer | Central hub with project tiles, pursuit analytics, activity feed |
| Create / Edit Project | Buyer | Project criteria form (industry, revenue, EBITDA, margin, location, keywords) |
| Project Deal Feed | Buyer | Table of matched deals within a project with Decline, Pursue, Share actions |
| Browse All Deals | Buyer | Filterable feed of all active deals with Decline, Pursue, Share actions |
| NDA Signing | Buyer | Electronic NDA review and signature flow |
| Deal Workspace (Pursued Deal) | Buyer | Full deal view with stage indicator, documents, messaging, IOI/LOI forms, offer history |
| IOI Submission Form | Buyer | Structured form with required and optional IOI fields |
| LOI Submission Form | Buyer | Structured form with required and optional LOI fields |
| Deal Closure Form | Buyer | Enterprise value self-reporting form |
| Messaging Inbox | Both | List of all active message threads |
| Message Thread | Both | Individual asynchronous conversation within a deal |
| Settings | Both | Profile editing, notification preferences, account deletion |
| Admin Dashboard | Admin | Full platform overview with user management, deal management, settings, analytics |
| Admin User Management | Admin | Application queue, user list, firm management, invitations |
| Admin Deal Management | Admin | All deals view, edit/remove, feature/promote, message threads |
| Admin Platform Settings | Admin | NDA management, rejection templates, activity thresholds, promotions, announcements |
| Admin Analytics Dashboard | Admin | Full analytics with user, pipeline, time, financial, and engagement metrics |
| Empty States | All | Illustrated guidance states for dashboards, feeds, inboxes when no content exists |
| Error States | All | Human-readable error messages with recovery guidance for failed actions |

---

## 15. Email & Notification Inventory

All events below are delivered both in-platform and via email by default. Users can toggle each event type independently per channel.

### 15.1 Broker Notifications

| Event | Trigger |
|---|---|
| Buyer pursued deal | A buyer clicks Pursue on the broker's deal |
| Buyer pending review | A buyer pursues a deal with manual vetting enabled |
| NDA signed | A buyer signs the NDA for the broker's deal |
| NDA declined | A buyer declines to sign the NDA |
| IOI submitted | A buyer submits an IOI on the broker's deal |
| LOI submitted | A buyer submits an LOI on the broker's deal |
| Buyer passed (post-NDA) | A buyer changes status to Pass with a reason |
| Buyer declined (pre-NDA) | A buyer declines the deal (broker does not see who) |
| Deal close reported | A buyer self-reports enterprise value for a closed deal |
| New message | A buyer sends a message in a deal thread |
| Deal status changed by admin | An admin changes the deal's status |
| Pending action reminder | Unresponded action or unread message after 5 days (repeats every 5 days) |

### 15.2 Buyer Notifications

| Event | Trigger |
|---|---|
| New matched deal | A new deal matches the buyer's project criteria |
| NDA sent | An NDA is released for a pursued deal (auto or manual) |
| NDA approved | Broker approves buyer after manual vetting; NDA released |
| NDA rejected | Broker rejects buyer with templated reason |
| CIM released | CIM is available to view (auto or manual release) |
| Deal status changed | Deal moves to a new status (Accepting LOIs, Under LOI, Closed, etc.) |
| Deal terminated | Broker terminates the project — message: "[Broker Firm Name] has terminated the project" |
| New message | A broker sends a message in a deal thread |
| Pending action reminder | Unresponded action or unread message after 5 days (repeats every 5 days) |

### 15.3 Admin Notifications

| Event | Trigger |
|---|---|
| New broker application | A broker submits a signup application |
| New buyer application | A buyer submits a signup application |
| Deal closed | Enterprise value reported — fee tracking required |
| Activity threshold exceeded | A configurable activity alert is triggered |

---

*— End of Document —*

*Geneva Holdings (Placeholder) | M&A Marketplace Platform | Product Design Requirements Document | Version 2.0 | Confidential*
