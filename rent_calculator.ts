namespace RentCalculation {
    const PeriodInput = Models.PeriodInput;
    type PeriodInput = Models.PeriodInput;
    const RentInput = Models.RentInput;
    type RentInput = Models.RentInput;
    const PeriodOutput = Models.PeriodOutput;
    type PeriodOutput = Models.PeriodOutput;
    const MonthTotals = Models.MonthTotals;
    type MonthTotals = Models.MonthTotals;
    const RentOutput = Models.RentOutput;
    type RentOutput = Models.RentOutput;
    const RentConfiguration = Models.RentConfiguration;
    type RentConfiguration = Models.RentConfiguration;
    const ResidentPeriodRent = Models.ResidentPeriodRent;
    type ResidentPeriodRent = Models.ResidentPeriodRent;

    export function CalculateRent(input: RentInput): RentOutput {
        return (new RentCalculator()).Calculate(input);
    }

    /**
     * Interface for calculating rent. Single use only.
     */
    class RentCalculator {
        Calculate(input: RentInput): RentOutput {
            const outputPeriods =
                // Each period is calculated in isolation.
                input.periods.map(i => this.calculateRentPeriod(i, input.config));
            const monthTotals = this.calculateMonthTotals(outputPeriods);

            return new RentOutput(outputPeriods, monthTotals);
        }

        calculateRentPeriod(periodInput: PeriodInput, config: RentConfiguration): PeriodOutput {
            if (periodInput.firstDay.getMonth() !== periodInput.lastDay.getMonth()) {
                throw 'All days in period must be in the same month.'
            }

            Logger.log(`Calculating period ${periodInput.firstDay.toLocaleDateString()}`);

            const daysInPeriod = dateDiff(periodInput.firstDay, periodInput.lastDay);
            const daysInMonth = getDaysInMonth(periodInput.firstDay);

            const periodMonthRatio = daysInPeriod / daysInMonth;
            const periodCost = config.totalRent * periodMonthRatio;

            Logger.log(`Days in period ${daysInPeriod} / ${daysInMonth}`);
            Logger.log(`Cost of period ${periodCost}`);

            // First, calculate subtotals based on base prices.
            const residentRentSubtotals = new Array<ResidentPeriodRent>();
            let costSubtotal = 0;
            let totalResidents = 0;
            for (const room of periodInput.roomResidency) {
                const roomCost =
                    config.rooms.find(r => r.name === room.roomName).basePrice;
                for (const resident of room.residents) {
                    const residencyCost = resident.costRatio * roomCost * periodMonthRatio;

                    residentRentSubtotals.push(new ResidentPeriodRent(resident.residentName, residencyCost));

                    Logger.log(`${resident.residentName}'s subtotal ${residencyCost}`);

                    costSubtotal += residencyCost;
                    totalResidents++;
                }
            }

            // Adjust rent such that it adds up to this period's proportion of
            // the total monthly rent. This is done by adding or subtracting an
            // equal amount for each resident.
            const totalOverage = costSubtotal - periodCost;
            const overagePerPerson = totalOverage / totalResidents;
            Logger.log(`Overage: ${totalOverage} (${overagePerPerson} per person)`)
            const residentRent: ResidentPeriodRent[] = residentRentSubtotals.map(
                rent => {
                    const adjustedRent = rent.cost - overagePerPerson;
                    Logger.log(`${rent.residentName}: ${adjustedRent}`)
                    return new ResidentPeriodRent(
                        rent.residentName, adjustedRent);
                });

            return new PeriodOutput(periodInput.firstDay, periodInput.lastDay, residentRent);
        }

        calculateMonthTotals(periodOutputs: PeriodOutput[]): MonthTotals {
            const residentTotals = new Map<string, number>();

            Logger.log(`Calculating monthly totals across ${periodOutputs.length} periods.`);

            // For each resident, merely calculate a total across all periods.
            periodOutputs.map(p => p.residentPeriodOutput)
                .forEach(period => period.forEach(resident => {
                    const newTotal = 
                        (residentTotals.get(resident.residentName) ?? 0)
                        + resident.cost;
                    residentTotals.set(resident.residentName, newTotal);
                }));

            const monthTotals: ResidentPeriodRent[] = Array.from(residentTotals)
                .map(([k, v]) => {
                    Logger.log(`${k}: ${v}`);
                    return new ResidentPeriodRent(k, v);
                });

            return new MonthTotals(monthTotals);
        }
    }

    // Thanks https://stackoverflow.com/questions/542938/
    function dateDiff(first: Date, second: Date): number {
        // Take the difference between the dates and divide by milliseconds per day.
        // Round to nearest whole number to deal with DST.
        return Math.round((second.getTime() - first.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Thanks https://stackoverflow.com/questions/1184334
    function getDaysInMonth(date: Date) {
        // Passing 0 gives the last day of the prior month. Add one to month to get
        // the last day of this month.
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    }
}