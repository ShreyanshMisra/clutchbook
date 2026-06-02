
```markdown
# Founder Briefing: Corporate Structuring & Core Group Responsibilities

**To:** Shreyansh Misra and Mazlowe Wood  
**From:** Thomas Veasy  
**Subject:** Transitioning to a Delaware C-Corporation Architecture  

To transition our overlay tournament platform from a concept into a live, scalable commercial application, we need to formalize our legal framework. While an LLC is viable for standard localized operations, our business model—which sits at the intersection of multiplayer gaming telemetry, transaction processing, and user escrow wallets—demands a specialized corporate structure. 

This document outlines the engineering and legal rationale for utilizing a **Delaware C-Corporation**, how it protects our collective intellectual property, and the foundational group decisions we must finalize to initiate our filing.

---

## 1. Defining the Delaware C-Corp Infrastructure

A Delaware C-Corporation is a distinct legal entity that separates our personal liabilities from the business's financial and legal obligations. It operates on a two-tier framework:

1. **The Jurisdictional Advantage (Delaware):** While our physical engineering operations remain in Massachusetts, our corporate entity will be established in Delaware. Delaware operates a dedicated business court called the **Court of Chancery**. Because this court uses specialized judges rather than traditional juries, corporate disputes are resolved with unprecedented speed, consistency, and predictability.
2. **The Tax & Asset Classification (C-Corp):** Regulated under Subchapter C of the Internal Revenue Code, a C-Corp allows us to issue corporate stock, manage multi-tier equity structures, and easily generate option pools for incoming software developers.

---

## 2. Rationale for Our Overlay Tournament Platform

### A. Venture Capital Compatibility
Our application requires capital injection to scale user acquisition, secure high-volume transaction infrastructure, and fund automated settlement pipelines. **Institutional investors and Venture Capitalists (VCs) universally reject LLCs.** 

LLCs pass their operational profits and losses directly to owners' personal tax returns via Schedule K-1 statements. Institutional investors cannot have volatile startup tax liabilities flowing into their funds. They require standard corporate stock certificates, making a C-Corp mandatory for outside fundraising.

### B. Consolidation of Intellectual Property (IP)
At launch, any code repo, database schema, or UI design we construct belongs to us as individuals. To secure the business, all three founders will execute an **Invention Assignment Agreement** alongside the incorporation papers. This legally transfers all project-specific source code and design architectures into the corporate entity's vault. Investors will require absolute verification that the *corporation* owns 100% of the software repository, not three separate individuals.

### C. The Founder Vesting Safety Net
If we split a standard multi-member LLC evenly on day one and one partner exits after 60 days to pursue a different career path, they legally retain their full share of our subsequent development work. 

A C-Corp prevents this via an automated **Equity Vesting Schedule** (the tech industry standard is a **4-year vest with a 1-year cliff**):
* **The Stock Issuance:** We are granted our shares on day one, but they remain unvested (subject to corporate buyback).
* **The 1-Year Cliff:** If a founder leaves the team before hitting the 12-month mark, they forfeit 100% of their equity, protecting the remaining founders who are actively shipping code.
* **Monthly Vesting:** After passing the 1-year cliff, the remaining stock automatically unfreezes on a linear, month-by-month basis over the next 36 months.

---

## 3. Immediate Action Items & Group Responsibilities

Before deploying our filing via an automation stack like *Stripe Atlas* or *Clerky*, the three of us must reach an explicit consensus on the following three operational pillars:

### Pillar 1: Equity Allocation & The Option Pool
We need to finalize the division of our foundational stock. We will authorize a standard baseline pool of **10,000,000 total shares**. A healthy startup allocation model generally looks like this:


```

┌──────────────────────────────────────────────────────────┐
│              10,000,000 Authorized Shares                │
└────────────────────────────┬─────────────────────────────┘
│
┌──────────────┴──────────────┐
▼                             ▼
┌────────────────────────────┐┌────────────────────────────┐
│ 80% Founder Allocation     ││ 20% Employee Option Pool   │
│ (8,000,000 Shares)         ││ (2,000,000 Shares)         │
│ Split among 3 Co-Founders  ││ Reserved for future core   │
│ based on role/contribution ││ engineers and advisors    │
└────────────────────────────┘└────────────────────────────┘

```

### Pillar 2: Corporate Governance Roles
Corporations operate under explicit statutory hierarchies. While our daily collaborative workflow will remain highly horizontal, we must legally assign the following formal roles:
* **The Board of Directors:** The governing body that votes on major structural events (e.g., selling company assets, raising capital, amending corporate bylaws). The three co-founders will make up the entire initial Board, ensuring we hold equal voting weight on top-level decisions.
* **Corporate Officers:** The specific execution leads authorized to sign corporate contracts, open corporate banking rails, and manage daily operations. We must designate a **Chief Executive Officer (CEO)** and a **Secretary** (required by corporate statute; can be held by one of the other co-founders).

### Pillar 3: Post-Incorporation Compliance Deadlines
Once the state of Delaware approves our filing, we have strict administrative deadlines that carry severe personal financial penalties if missed:
* **The Section 83(b) Election:** This is a vital, non-negotiable IRS tax form. Because our founder stock vests over time, the IRS will attempt to tax us every year on the shifting paper value of our stock as it unfreezes. By physically mailing an 83(b) election form to the IRS, we tell them to tax us on the value of the shares *today* ($0) rather than their future valuation. **This form must be physically signed and postmarked within exactly 30 days of our stock issuance.** Missing this window is irreversible and can result in massive, phantom tax bills down the road.
* **Delaware Franchise Tax & Annual Filing:** To keep our corporate registration active, we must file an annual report and pay a Franchise Tax by **March 1st** of every calendar year. Even if the platform generates $0 in revenue during our development cycle, the minimum tax ranges between $175 and $400 depending on our chosen calculation method. We will need to pool together a small, shared cash reserve to maintain these state compliance costs.

---

## Next Steps

Let's schedule a dedicated meeting this week to finalize our inputs:
1. **The Share Split Matrix:** Final percentage distribution among the three of us.
2. **Officer Designation:** Nominating individual leads for the formal CEO and Secretary roles.
3. **Platform Selection:** Choosing our automated incorporation stack (*Stripe Atlas* is $500 flat; *Clerky* is ~$819 for a comprehensive startup bundle). 

Once these variables are locked, we can submit our application and officially establish our development entity.

```