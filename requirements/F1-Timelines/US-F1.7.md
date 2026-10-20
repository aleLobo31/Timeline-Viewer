# US-F1.7

## Card
As a guide,
I want to create a profile,
so that I can access to my explanation material

## Conversation
+ Require:
    - Email
    - Password
    - Name
+ Required for password:
    - At least 8 character
    - At least 1 special character
    - At least 1 letter
    - At least 1 capital letter
    - At least 1 number
+ If password do not meet requirements, reject it, warn the user and explain why
+ If email is currently associated to other profile, reject it, warn the user and explain why

## Confirmation
|Action|Expected Result|
|-|-|