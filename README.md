# community_rent_calculator
Rent calculator for community living arrangements

## Build

```bash
npm i
```

## Deploy

Make sure you're logged in.

```bash
npx clasp login
```

Push according to .clasp.json

```bash
npx clasp push
```

## Initial setup

Create a spreadsheet and click Extensions -> Apps Script to create an
Apps Script project. Note the spreadsheet ID from the URL of the spredsheet
and note the script ID from the URL of the Apps Script editor.

Create a file called .clasp.json in this project with the contents below making
the required substitutions.

```json
{
    "rootDir":"/workspaces/community_rent_calculator",
    "scriptId":"<APPS SCRIPT PROJECT ID HERE>",
    "parentId":["<SPREADSHEET ID HERE>"]
}
```

If using the devcontainer, the `rootDir` will be correct. Otherwise, use
the path to the root of this repo on your machine.

Now you can deploy using the instructions under the "Deploy" section of this
README.

Use the `Rent Calculator` menu created by this sheet to set up a new sheet.

See the comments in `read_input.ts` for detailed usage instructions.
