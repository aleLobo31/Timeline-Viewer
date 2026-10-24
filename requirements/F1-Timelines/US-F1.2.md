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