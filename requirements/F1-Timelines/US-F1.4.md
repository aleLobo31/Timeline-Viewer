# US-F1.4

## Card
As a guide,
I want to add historical periods to a timeline,
so that I can specify historical facts.

## Conversation
+ Historical Period consist of the following mandatory fields:
    - Start Year
    - End Year
    - Period Name
    - Period Description (Optional < 300 words)
    - Color (elected from a list with 16 colors)
+ Two historical periods can share start and end year but then should not be overlapped in the display (one above the other)
+ Historical periods should be displayed above historical periods

## Confirmation
|Action|Expected Result|
|-|-|
|Add one historical period with all mandatory fields to a timeline with one event and one historical period. Saved it. Should be displayed above the event and the process|✅|
|Add two historical periods that share start and end year (e.g 1550 - 1600) with all mandatory fields. Saved them. Both should be displayed without overlapping|✅|
|Add one historical period without any of the required fields (e.g Process Period). Reject it. Warn the user and explain why|✅|