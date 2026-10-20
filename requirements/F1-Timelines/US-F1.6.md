# US-F1.6

## Card
As a tourist who is in a guided tour listening to some place history,
I want to view a timeline with the main historical events,
so that I do not get lost during guide´s explanations.


## Conversation
+ Allow tourist to specify a subset timeframe in the timeline
+ If a subset timeframe is specified the timeline should be "cut" and only displayed the events of that timeframe.
+ Warns the user when subset timeframe is wrong and explains why
+ Allow tourist to navigate along the timeline (left or right)
+ If the timeline is in the beginning can´t move left and if the timeline is in the end can´t move right.


## Confirmation
|Action|Expected Result|
|-|-|
|Test to specify a valid subset timeframe (e.g In a Timeline from 1500 to 1600, specify 1520 to 1550). Timeline should be "cut" and only displays specified timeframe (New Timeline from 1520 to 1550)||
|Test to specify an invalid subset timeframe (e.g In a Timeline from 1500 to 1600, specify 1450 to 1550). Warns the user and displays the default timeline||
|Test to navigate in both directions of the timeline when it´s possible||
|Test to navigate in edge directions of the timeline, it should not be possible||