# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8D — REVENUE MODEL SPECIFICATION

============================================================
1. REVENUE METRIC DEFINITIONS
============================================================

### 1. Monthly Recurring Revenue (MRR)
- **Definition**: The sum of normalized monthly subscription fees from all active paid accounts.
- **Formula**:
  $$\text{MRR} = \sum_{s \in \text{Active Subscriptions}} \text{Price}(\text{Plan}_s)$$
- **Rules**:
  - `Free` tier contributes **$0.00**.
  - `Creator` tier ($19.00 / month) contributes **$19.00**.
  - `Pro` tier ($49.00 / month) contributes **$49.00**.
  - `Agency` tier ($149.00 / month) contributes **$149.00**.
  - Subscriptions with status `canceled`, `incomplete`, or `incomplete_expired` contribute **$0.00**.
  - Subscriptions in `past_due` are tracked separately in the At-Risk KPI metric.

### 2. Estimated Annual Recurring Revenue (ARR)
- **Definition**: Annualized run-rate projection based on current MRR.
- **Formula**:
  $$\text{Estimated ARR} = \text{MRR} \times 12$$

### 3. Net Subscriber Growth
- **Formula**:
  $$\text{Net Growth}_{\text{30d}} = \text{New Subscriptions}_{\text{30d}} - \text{Cancellations}_{\text{30d}}$$

============================================================
2. PLAN PERFORMANCE MATRIX
============================================================

| Plan Tier | Monthly Price | Concurrent Streams | Storage | Resolution | FPS | Target Audience |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **Free / Starter** | $0.00 | 1 | 1 GB | 720p | 30 | Hobbyists / Trial |
| **Creator** | $19.00 | 2 | 20 GB | 1080p | 60 | Active Streamers |
| **Pro** | $49.00 | 4 | 100 GB | 1080p | 60 | Semi-Pro / Studios |
| **Agency** | $149.00 | 10 | 500 GB | 1080p | 60 | Production Teams |
