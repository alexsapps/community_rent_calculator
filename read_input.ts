import { PeriodInput, RentConfiguration, RentInput, RoomInput, RoomResidency } from "./models";

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Range = GoogleAppsScript.Spreadsheet.Range;

export function ReadInput(sheet: Sheet): RentInput {
    Logger.log("Reading rent calculation from sheet");
    // Read entire sheet since it is probably small.
    const range = sheet.getRange(
        1,
        1,
        sheet.getLastRow(),
        sheet.getLastColumn());

    verifyHeaders(range);

    const periodDates: Date[] = readPeriodDatesFromRowHeaders(range);

    let [rooms, rowIndex] = readRoomMetadataFromFirstColumns(range);

    verifySumRowHeader(range, rowIndex++);
    const extraPersonBaseSurcharge = readExtraPersonBaseSurcharge(range, rowIndex++);
    const totalRent = readRentDue(range, rowIndex++);

    const periods: PeriodInput[] = readPeriods(range, rooms, periodDates);

    const config = new RentConfiguration(totalRent, rooms, extraPersonBaseSurcharge);
    return new RentInput(periods, config);
}

function verifyHeaders(range: Range) {
    const headerA = range.getCell(1, 1);
    if (headerA.getValue() !== "Rooms") {
        throw 'A1 must be "Rooms"';
    }

    const headerB = range.getCell(1, 2);
    if (headerB.getValue() !== "Base prices") {
        throw 'B1 must be "Base prices"';
    }
}

function readPeriodDatesFromRowHeaders(range: Range) {
    const periodDates = new Array<Date>();
    let columnIndex = 3;
    while(true) {
        const periodHeader = range.getCell(1, columnIndex);
        const header = periodHeader.getValue();
        if (header instanceof Date) {
            periodDates.push(header);
            Logger.log("Read period starting " + header);
        } else {
            if (header != "OUTPUT") {
                throw 'Non-date value found in column header; should be start of period: ' + header
            }
            break;
        }
        columnIndex++;
    };
    return periodDates;
}

function readRoomMetadataFromFirstColumns(range: Range): [RoomInput[], number] {
    let rowIndex = 2;
    const rooms = new Array<RoomInput>();
    while(true) {
        const room = readRoomNameAndBasePrice(range, rowIndex);
        if (room == null) break;
        rooms.push(room)
        rowIndex++;
    }
    return [rooms, rowIndex];
}

function readRoomNameAndBasePrice(range: Range, rowIndex: number): RoomInput|null {
    const rowHeaderCell = range.getCell(rowIndex, 1);
    if (rowHeaderCell.getTextStyle().isBold()) return null;

    const rowHeader = rowHeaderCell.getValue();
    if (typeof (rowHeader) !== 'string') {
        throw 'Non-string value found in row header; should be room name: ' + rowHeader;
    }
    
    const basePrice = range.getCell(rowIndex, 2).getValue();
    if (typeof (basePrice) !== 'number') {
        throw 'Non-number value found in Base Prices column: ' + basePrice;
    }

    Logger.log("Read room config; name: " + rowHeader + "; base price: " + basePrice);
    return new RoomInput(rowHeader, basePrice);
}


function verifySumRowHeader(range: Range, rowIndex: number) {
    const sumHeader = range.getCell(rowIndex, 1);
    if (sumHeader.getValue() !== 'Sum (bases)') {
        throw 'First cell of row ' + rowIndex + 'should be "Sum (bases)"';
    }
}

function readExtraPersonBaseSurcharge(range: Range, rowIndex: number): number {
    const extraPersonFeeHeader = range.getCell(rowIndex, 1);
    if (extraPersonFeeHeader.getValue() !== 'Extra person fee') {
        throw 'First cell of row ' + rowIndex + 'should be "Extra person fee"';
    }
    const extraPersonBaseSurcharge = range.getCell(rowIndex, 2).getValue();
    if (typeof extraPersonBaseSurcharge !== 'number') {
        throw 'Extra person fee must be a number; found ' + extraPersonBaseSurcharge + ' (' + typeof(extraPersonBaseSurcharge) + ')';
    }
    Logger.log('Read room surcharge: ' + extraPersonBaseSurcharge);
    return extraPersonBaseSurcharge;
}

function readRentDue(range: Range, rowIndex: number): number {
    const rentDueHeader = range.getCell(rowIndex, 1);
    if (rentDueHeader.getValue() !== 'Rent due') {
        throw 'First cell of row ' + rowIndex + 'should be "Rent due"';
    }
    const totalRent = range.getCell(rowIndex, 2).getValue();
    if (typeof totalRent !== 'number') {
        throw 'Rent due must be a number; found ' + totalRent + ' (' + typeof(totalRent) + ')';
    }
    Logger.log('Read total rent due: ' + totalRent);
    return totalRent;
}

function readPeriods(range: Range, rooms: RoomInput[], periodDates: Date[]): PeriodInput[] {
    const FIRST_PERIOD_COLUMN = 3;  // Column "C"

    const periods = PeriodInput[periodDates.length];
    for (let i = 0; i < periodDates.length; i++) {
        const firstDay = periodDates[i];
        const lastDay = i < periodDates.length ? periodDates[i+1] : lastDayOfMonth(firstDay);
        periods[i] = new PeriodInput(
            firstDay,
            lastDay,
            readPeriodResidency(range, i + FIRST_PERIOD_COLUMN, rooms));
    }
    return periods;
}

function readPeriodResidency(range: Range, columnIndex: number, rooms: RoomInput[]): RoomResidency[] {

}