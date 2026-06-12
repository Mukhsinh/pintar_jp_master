import { NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function GET() {
  try {
    // Create template data
    const templateData = [
      {
        'Kode Pegawai': 'PEG001',
        'Nama Lengkap': 'John Doe',
        'Email (Opsional)': 'john.doe@example.com',
        'Kode Unit': 'IT',
        'Status Pegawai': 'PNS',
        'Status Pajak': 'TK/0',
        'Golongan': '3',
        'Jabatan': 'Software Engineer',
        'NIK': '3201234567890001',
        'Telepon': '081234567890',
        'Nama Bank': 'BCA',
        'Nomor Rekening': '1234567890',
        'Nama Pemilik Rekening': 'John Doe',
        'Role': 'employee',
        'Status': 'Aktif'
      },
      {
        'Kode Pegawai': 'PEG002',
        'Nama Lengkap': 'Jane Smith',
        'Email (Opsional)': 'jane.smith@example.com',
        'Kode Unit': 'SALES',
        'Status Pegawai': 'BLUD',
        'Status Pajak': 'K/1',
        'Golongan': '-',
        'Jabatan': 'Sales Manager',
        'NIK': '3201234567890002',
        'Telepon': '081234567891',
        'Nama Bank': 'Mandiri',
        'Nomor Rekening': '0987654321',
        'Nama Pemilik Rekening': 'Jane Smith',
        'Role': 'unit_manager',
        'Status': 'Aktif'
      }
    ]

    // Create workbook
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(templateData)

    // Set column widths
    ws['!cols'] = [
      { wch: 15 }, // Kode Pegawai
      { wch: 18 }, // NIK
      { wch: 25 }, // Nama Lengkap
      { wch: 12 }, // Kode Unit
      { wch: 25 }, // Jabatan
      { wch: 18 }, // Status Pegawai
      { wch: 10 }, // Golongan
      { wch: 30 }, // Email
      { wch: 15 }, // Telepon
      { wch: 12 }, // Status Pajak
      { wch: 15 }, // Nama Bank
      { wch: 18 }, // Nomor Rekening
      { wch: 25 }, // Nama Pemilik Rekening
      { wch: 15 }, // Role
      { wch: 10 }  // Status
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Template Pegawai')

    // Add instructions sheet
    const instructions = [
      { 'Kolom': 'Kode Pegawai', 'Keterangan': 'Kode unik pegawai (wajib diisi)' },
      { 'Kolom': 'Nama Lengkap', 'Keterangan': 'Nama lengkap pegawai (wajib diisi)' },
      { 'Kolom': 'Email (Opsional)', 'Keterangan': 'Email pegawai (opsional, jika diisi harus unik)' },
      { 'Kolom': 'Kode Unit', 'Keterangan': 'Kode unit kerja (wajib diisi, harus sudah ada di master unit)' },
      { 'Kolom': 'Status Pegawai', 'Keterangan': 'PNS, PPPK, PPPK PARUH WAKTU, atau BLUD (wajib diisi)' },
      { 'Kolom': 'Status Pajak', 'Keterangan': 'TK/0, TK/1, TK/2, TK/3, K/0, K/1, K/2, K/3 (default: TK/0)' },
      { 'Kolom': 'Golongan', 'Keterangan': 'Pilih 2, 3, atau 4 (hanya untuk status PNS)' },
      { 'Kolom': 'Jabatan', 'Keterangan': 'Jabatan pegawai (opsional)' },
      { 'Kolom': 'NIK', 'Keterangan': 'Nomor Induk Kependudukan 16 digit (opsional)' },
      { 'Kolom': 'Telepon', 'Keterangan': 'Nomor telepon (opsional)' },
      { 'Kolom': 'Nama Bank', 'Keterangan': 'Nama bank untuk transfer insentif (opsional)' },
      { 'Kolom': 'Nomor Rekening', 'Keterangan': 'Nomor rekening bank (opsional)' },
      { 'Kolom': 'Nama Pemilik Rekening', 'Keterangan': 'Nama sesuai rekening bank (opsional)' },
      { 'Kolom': 'Role', 'Keterangan': 'superadmin, unit_manager, atau employee (wajib diisi)' },
      { 'Kolom': 'Status', 'Keterangan': 'Aktif atau Nonaktif (default: Aktif)' }
    ]

    const wsInstructions = XLSX.utils.json_to_sheet(instructions)
    wsInstructions['!cols'] = [{ wch: 25 }, { wch: 60 }]
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Petunjuk')

    // Generate buffer
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Template_Pegawai.xlsx"'
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
