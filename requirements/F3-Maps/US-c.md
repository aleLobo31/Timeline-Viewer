# US-c

## Card
As a tourist who is in a guided tour listening to some place history,
I want to view an interactive map with some geographical, demographical or economical information shown,
so that I can picture in my head the spatial distribution of different regions.


## Conversation
+ Map displays selectable and not selectable regions with different colors. By default no region is selected
+ Selectable regions when selected: show its information and changes its color, when deselected information is not displayed and color changes to the original one.
+ Only 1 region is selectable at the same time
+ Allow tourist to navigate across the map (left or right or up or down)
+ If map is in one border you can´t move towards that direction.

## Confirmation
|Action|Expected Result|
|-|-|
|No region is selected when tourist opens the map||
|After selecting one region you can see its information and its color is changed, and when deselecting returns to the original state||
|When trying to select two regions at the same time only the last one remains displayed||
|Navigate across a map in the 4 possible directions when possible||
|Can´t navigate across a map when being in one edge||