async function testFilter() {
    try {
        const response = await fetch('http://localhost:3002/api/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reportType: 'kpi-achievement',
                period: '2026-01',
                employeeId: '00cb3bbc-a3e9-4d14-a6bc-0a4f06f7b2e6'
            })
        });

        console.log('Response Status:', response.status);
        const data = await response.json();
        console.log('Data Length:', data.data?.length || 0);
        if (data.data?.length > 0) {
            console.log('Sample Data Indicator:', data.data[0].indicator_name);
            console.log('Sample Data Employee:', data.data[0].employee_name);
        } else if (data.error) {
            console.log('Error from API:', data.error);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testFilter();
