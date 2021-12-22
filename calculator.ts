
import { ReadInput } from './read_input';
import { WriteOutput } from './write_output';
import { CalculateRent } from './rent_calculator';

export function CalculateRentForActiveSheet() {
    WriteOutput(
        CalculateRent(
            ReadInput(
                SpreadsheetApp.getActiveSheet())));
}
