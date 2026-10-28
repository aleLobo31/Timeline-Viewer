# US-F1.3

## Card
As a guide,
I want to add historical processes to a timeline,
so that I can specify historical facts.

## Conversation
+ Historical Process consist of the following mandatory fields:
    - Start Year
    - End Year
    - Process Name
    - Process Description (Optional < 300 words)
    - Color (elected from a list with 16 colors)
+ Two historical processes can share start and end year but then should not be overlapped in the display
+ Historical processes should be displayed above the timeline and below Historical Period

## Confirmation
|Action|Expected Result|
|-|-|
|Add one historical process with all mandatory fields to a timeline with one event and one historical period. Saved it. Should be displayed above the event and below the period|✅|
|Add two historical processes that share start and end year (e.g 1550 - 1600) with all mandatory fields. Saved them. Both should be displayed without overlapping|✅|
|Add one historical process without any of the required fields (e.g Process Name). Reject it. Warn the user and explain why|✅|