import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
    try {
        // Create template data
        const templateData = [
            {
                'Kode': 'TRF-001',
                'Jenis Layanan': 'Rawat Jalan',
                'Nama': 'Kunjungan Pasien Poliklinik',
                'Tipe (Aktivitas/Indeks)': 'Aktivitas',
                'Nilai/Tarif': 5000,
                'Status (Aktif/Nonaktif)': 'Aktif'
            },
            {
                'Kode': 'IDX-001',
                'Jenis Layanan': 'Patologi Klinik',
                'Nama': 'Cek Darah Lengkap',
                'Tipe (Aktivitas/Indeks)': 'Indeks',
                'Nilai/Tarif': 15.50,
                'Status (Aktif/Nonaktif)': 'Aktif'
            }
        ]

        // Create workbook
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(templateData)

        // Set column widths
        ws['!cols'] = [
            { wch: 15 },
            { wch: 40 },
            { wch: 25 },
            { wch: 15 },
            { wch: 20 }
        ]

        XLSX.utils.book_append_sheet(wb, ws, 'Template Master Tarif')

        // Generate buffer
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

        return new NextResponse(buf, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="Template_Master_Tarif.xlsx"'
            }
        })
    } catch (error: any) {
        console.error('Error generating template:', error)
        return NextResponse.json(
            { error: 'Failed to generate template' },
            { status: 500 }
        )
    }
}
