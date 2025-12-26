# Project Ledger

## Watch History Pipeline
- **Date:** 2025-12-19
- **Diagram:** [View Diagram](/notes/visual/watch-history-pipeline-diagram.png)
- **Description:** 
  Implemented aggregation pipeline for watch history with nested lookup.

---
## Watch History Pipeline
- **Date:** 2025-12-20
- **Diagram:** [View Diagram](/notes/visual/watchHistory-subpipeline-working.png)
- **Description:** 
  How the nested sub-pipelines work to fetch complete video and owner details

---
## Like Pipeline -> small nested lookup
- **Date:** 2025-12-26

- **Diagrams:** 
- [View Diagram 1](/notes/visual/like%20pipeline%201.png)
- [View Diagram 2](/notes/visual/like%20pipeline%202.png)
- [View Diagram 3](/notes/visual/like%20pipeline%203.png)
- [View Diagram 4](/notes/visual/like%20pipeline%204.png)

- **Description:** 
  A small nested lookup into the users collection to get the username of the channel , because in videos we only have it as: `owner:Schema.Types.ObjectId -> User`, so took this and got the username from users collection

---
