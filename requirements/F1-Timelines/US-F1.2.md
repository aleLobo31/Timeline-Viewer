# US-F1.2

## Card
As a guide,
I want to add historical events to a timeline,
so that I can specify historical facts.

## Conversation
+ Historical Event consist of the following mandatory fields:
    - Year
    - Event Icon: (Crown, Swords, Skull, Scroll, White pigeon)
    - Day and Month (Optional)
    - Event Name
    - Event Description (< 300 words)
    - Image (Optional)
+ Two historical events can´t have the same year. If so ask the user the explicit day and month
+ Two historical events in a same timeline will never share same Day, Month and Year. If so warn the user and explain the reason.
+ A Historical Event is displayed as a point in the timeline with Year + Event Icon + Event Name. If selected, drops down the rest of the information.

## Confirmation
|Action|Expected Result|
|-|-|
|Add historical event with all mandatory fields required. Event is saved and displayed as expected in the timeline|✅|
|Add historical event (e.g 1550 May 1) with 1 event (e.g 1550 June 1). Event is saved and appear in the correct order (e.g new event appears before the old one)|✅|
|Add historical event (e.g 1550 May 1) with 1 event (e.g 1550). Event is reject it. Need to specify Month and Day in the previous one|✅|
|Add historical event (e.g 1550) with 1 event (e.g 1550). Reject it, warn the user and explain why|✅|
|Add historical event (e.g 1550) May 1 with 1 event (e.g 1550 May 1). Reject it, warn the user and explain why|✅|