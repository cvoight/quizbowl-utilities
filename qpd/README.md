1. Install clasp from https://github.com/google/clasp, following their instructions.
2. Open your answer spreadsheet and click Extensions > Apps Script.
3. Go to the Project Settings for qams or qams² and click "Copy" under Script ID.
4. Set up a folder for the project on your local hard drive, clasp login, and clasp clone `<script id>`.
5. Copy the qpd script files to the directory you set up.
6. Edit the onOpen function in Code.js to include the following 3 lines before `.addToUi();`
    ```
    .addSeparator()
    .addItem("Place PGs", "place")
    .addItem("PG Settings", "settings")
    ```
7. Move the shared copy of the pronunciation guide database shared with you to the set's Drive folder so it is editable by everyone. It is named "-- do not edit. temporary copy of qpdb. to be deleted xx.".
8. Copy the spreadsheet ID and replace the value at line 91 in qpd.js.
9. clasp push
10. Create a named range called "links" with links to your subject documents, or preliminary packets, or final packets, etc. Refer to [screenshot](./_Instructions.png).
11. Close and reopen the answer spreadsheet.
12. Reauthorize the script.