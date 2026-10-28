# US-F1.8

## Card
As a guide,
I want to log in into my profile,
so that I can access to my explanation material.

## Conversation
+ Require:
    - Email
    - Password
+ If any of them is wrong, reject it, warn the user and explain why
+ After login library page is displayed

## Confirmation
|Action|Expected Result|
|-|-|
|Log in filling required fields. Retrieve user profile and display logged page|✅|
|Log in with wrong email or pasword. Cannot log in. Warn user and explain why|✅|