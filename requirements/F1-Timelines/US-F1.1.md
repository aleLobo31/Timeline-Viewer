# US-F1.1

## Card
As a guide,
I want to create history timelines,
so that listeners can follow me when talking about a sucession of historical events.

## Conversation
+ Timeline consist of the following mandatory fields:
    - Timeline Name
    - Description (< 100 characters)
    - Image (optional)
    - List of historical items can be (at least one item required) (historical event, historical process, historical period)

+ Allow guide to save the timeline

## Confirmation
|Action|Expected Result|
|-|-|
|Create a timeline with all mandatory fields and 1 item. When saved it should be stored||
|Create a timeline without any mandatory field. Warn the user and explains why||
|Create a timeline without an image. A default blanck picture is shown in the previsualization||
|Create a timeline with an image. The picture is shown in the previsualization||