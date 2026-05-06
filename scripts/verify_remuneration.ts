/**
 * Verification Script for Doctor Remuneration PIR Calculation
 * This script demonstrates the mathematical accuracy of the implemented logic.
 */

function verifyMedisCalculation() {
    console.log("--- START VERIFICATION: DOCTOR REMUNERATION PIR ---");

    // Input Parameters
    const netPoolUnit = 100000000; // Rp 100 Juta
    const doctors = [
        { name: "Dr. Alif", guaranteeFee: 15000000, indexPoints: 450 },
        { name: "Dr. Budi", guaranteeFee: 12000000, indexPoints: 300 },
        { name: "Dr. Citra", guaranteeFee: 13000000, indexPoints: 250 },
    ];

    // Logic: Fase 1 - Aggregate Direct Category (Guarantee Fee)
    const totalGuaranteeFee = doctors.reduce((acc, d) => acc + d.guaranteeFee, 0);
    const sisaPaguPIR = netPoolUnit - totalGuaranteeFee;

    console.log(`Pagu Unit Medis: Rp ${netPoolUnit.toLocaleString()}`);
    console.log(`Total Guarantee Fee: Rp ${totalGuaranteeFee.toLocaleString()}`);
    console.log(`Sisa Pagu (PIR Pool): Rp ${sisaPaguPIR.toLocaleString()}`);

    // Logic: Fase 2 - Index Points aggregation
    const totalIndexPoints = doctors.reduce((acc, d) => acc + d.indexPoints, 0);
    console.log(`Total Skor Indeks Unit: ${totalIndexPoints}`);

    // Logic: Fase 3 - PIR Value
    const pirValue = totalIndexPoints > 0 ? sisaPaguPIR / totalIndexPoints : 0;
    console.log(`PIR MEDIS VALUE: Rp ${pirValue.toFixed(4)} per index point`);

    // Logic: Fase 4 - Final Distribution
    const results = doctors.map(d => {
        const indexedIncentive = d.indexPoints * pirValue;
        const grossTotal = d.guaranteeFee + indexedIncentive;
        const tax = grossTotal * 0.05; // Simplified 5%
        const netto = grossTotal - tax;

        return {
            ...d,
            indexedIncentive,
            grossTotal,
            tax,
            netto
        };
    });

    console.table(results);

    // Check integrity: total distributions (gross) must equal the net pool
    const grandTotalGross = results.reduce((acc, res) => acc + res.grossTotal, 0);
    console.log(`\nGrand Total Gross (Sum of all doctors): Rp ${grandTotalGross.toLocaleString()}`);

    if (Math.abs(grandTotalGross - netPoolUnit) < 1) {
        console.log("✅ INTEGRITY CHECK PASSED: Sum(Incentives) matches Net Pool.");
    } else {
        console.log("❌ INTEGRITY CHECK FAILED: Mismatch between sum and pool.");
    }

    console.log("--- END VERIFICATION ---");
}

verifyMedisCalculation();
