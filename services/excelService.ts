import * as XLSX from 'xlsx';
import { FinancialRecord, RecordType, DimensionMapping } from '../types';

interface ImportRow {
    Period: string;
    Account: string;
    CostCenter: string;
    Product: string;
    Amount: number;
}

export const parseHyperionActuals = async (file: File): Promise<FinancialRecord[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                // Assume first sheet
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                // Convert to JSON
                const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

                // Map to FinancialRecord
                const records: FinancialRecord[] = [];

                rawRows.forEach((row: any) => {
                    // Start basic validation - flexible keys
                    // valid keys: Period, Account, Cost Center, Product, Amount
                    // We try to find keys case-insensitive if needed, but strict for now based on prompt

                    const period = row['Period'] || row['period'];
                    // Ensure period format YYYY-MM
                    // If Hyperion exports nicely formatted strings, great. If dates, we need conversion.
                    // Assuming string input '2023-01' for MVP.

                    const amount = typeof row['Amount'] === 'number' ? row['Amount'] : parseFloat(row['Amount']);

                    if (period && !isNaN(amount)) {
                        records.push({
                            id: crypto.randomUUID(),
                            planId: undefined, // Actuals have no planId
                            type: RecordType.ACTUAL,
                            period: String(period).trim(),
                            accountCode: String(row['Account'] || row['account'] || row['Account Code']).trim(),
                            costCenterCode: String(row['CostCenter'] || row['Cost Center'] || row['CC']).trim(),
                            productLineCode: String(row['Product'] || row['Product Line'] || row['PL']).trim(),
                            amount: amount
                        });
                    }
                });

                resolve(records);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

export const exportPlanToHyperion = (
    records: FinancialRecord[],
    accounts: DimensionMapping[],
    costCenters: DimensionMapping[],
    productLines: DimensionMapping[]
) => {
    // 1. Map internal codes to Hyperion Maps
    const exportData = records.map(r => {
        const accMap = accounts.find(a => a.code === r.accountCode)?.hyperionMap || r.accountCode;
        const ccMap = costCenters.find(c => c.code === r.costCenterCode)?.hyperionMap || r.costCenterCode;
        const plMap = productLines.find(p => p.code === r.productLineCode)?.hyperionMap || r.productLineCode;

        return {
            Period: r.period,
            Account: accMap,
            CostCenter: ccMap,
            Product: plMap,
            Amount: r.amount,
            Scenario: 'Forecast', // Could be dynamic
            Currency: 'USD'
        };
    });

    // 2. Create Sheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HyperionLoad");

    // 3. Write File
    XLSX.writeFile(wb, "Forecast_Export_Hyperion.xlsx");
};
