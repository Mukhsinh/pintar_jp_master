async function testFilter() {
    try {
        const response = await fetch('http://localhost:3002/api/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reportType: 'kpi-achievement',
                period: '2025-03',
                unitId: '132f4ac7-5316-4240-8832-f0078ccfe25e', // KEUANGAN
                employeeId: 'cc60bfca-7c6d-495c-9c97-6aefcc78a1c8' // Sample employee in KEUANGAN
            })
        });

        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Data Length:', data.data?.length || 0);
        if (data.data?.length > 0) {
            console.log('Sample Data:', data.data[0]);
        } else if (data.error) {
            console.log('Error from API:', data.error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFilter();
