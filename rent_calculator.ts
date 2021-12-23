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
            const outputPeriods = input.periods.map(i => this.calculateRentPeriod(i, input.config));
            const monthTotals = this.calculateMonthTotals(outputPeriods);

            return new RentOutput(outputPeriods, monthTotals);
        }

        calculateRentPeriod(periodInput: PeriodInput, config: RentConfiguration): PeriodOutput {
            if (periodInput.firstDay.getMonth() !== periodInput.lastDay.getMonth()) {
                throw 'All days in period must be in the same month.'
            }

            const daysInPeriod = dateDiff(periodInput.firstDay, periodInput.lastDay);
            const daysInMonth = getDaysInMonth(periodInput.firstDay);

            const periodMonthRatio = daysInPeriod * daysInMonth;
            const periodCost = config.totalRent * periodMonthRatio;

            const residentRentSubtotals = new Array<ResidentPeriodRent>();
            let costSubtotal = 0;
            let totalResidents = 0;
            for (const room of periodInput.roomResidency) {
                const roomCost =
                    config.rooms.find(r => r.name === room.roomName).basePrice;
                for (const resident of room.residents) {
                    const residencyCost = resident.costRatio * roomCost * periodMonthRatio;

                    residentRentSubtotals.push(new ResidentPeriodRent(resident.residentName, residencyCost));

                    costSubtotal += residencyCost;
                    totalResidents++;
                }
            }

            // Calculate and apply discounts / surcharges.
            const totalOverage = costSubtotal - periodCost;
            const overagePerPerson = totalOverage / totalResidents;
            const residentRent: ResidentPeriodRent[] = residentRentSubtotals.map(
                rent => new ResidentPeriodRent(
                    rent.residentName, rent.cost - overagePerPerson))

            return new PeriodOutput(periodInput.firstDay, periodInput.lastDay, residentRent);
        }

        calculateMonthTotals(periodOutputs: PeriodOutput[]): MonthTotals {
            const totals = new Map<string, number>();

            periodOutputs.map(p => p.residentPeriodOutput)
                .forEach(pr => pr.forEach(rr => {
                    const cost = totals.get(rr.residentName);
                    totals.set(rr.residentName, cost + rr.cost);
                }
                ));

            const monthTotals = new Array<ResidentPeriodRent>();
            totals.forEach((v, k) => {
                monthTotals.push(new ResidentPeriodRent(k, v));
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