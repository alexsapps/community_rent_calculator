namespace NewSheetSetup {
    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;

    const repoUrl = 'https://github.com/alexsapps/community_rent_calculator/blob/main/read_input.ts#L23';

    export function SetUpSheet() {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const date = firstDayOfNextMonth();
        setUpSheet(sheet, date);
    }

    function firstDayOfNextMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        return new Date(year, month + 1, 1);
    }

    function sheetNameDateFormat(date: Date) {
        // Format the date as "YYYY-MM-DD"
        const yearString = date.getFullYear().toString();
        const monthString = (date.getMonth() + 1).toString().padStart(2, '0');
        const dayString = date.getDate().toString().padStart(2, '0');

        return `${yearString}-${monthString}-${dayString}`;
    }

    function setUpSheet(sheet: Sheet, date: Date) {
        try {
            sheet.setName(sheetNameDateFormat(date));
        } catch {
            // May already have a sheet by this name.
        }

        let currentRow = 1;
        sheet.getRange(currentRow++, 1, 1, 4)
            .setValues([['Rooms', 'Base prices', date, 'OUTPUT >']])
            .setFontWeight('bold');

        const numRooms = 3;
        sheet.getRange(currentRow, 1, numRooms, 3).setValues([
            ['Big room', 2000, 'Dani'],
            ['Upstairs room', 1500, 'Jill'],
            ['Small room', 1000, 'Beatrice'],
        ]);
        currentRow += numRooms;

        const helpLink = '=hyperlink("' + repoUrl + '", "Help")';
        sheet.getRange(currentRow, 1, 4, 2).setFormulas([
            ['="Sum (bases)"',	'SUM(B2:B4)'],
            ['="Extra person fee"', '250'],
            ['="Rent due"', '5095'],
            [helpLink, ''],
        ]).setFontWeight('bold');
    }
}
