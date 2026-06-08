import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const maxDuration = 60 // Allow up to 60s for large imports

export async function POST(request: NextRequest) {
  try {
    const userClient = await createClient()
    const supabaseAdmin = await createAdminClient()

    // 1. Verify user is superadmin
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('m_employees')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse file
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!worksheet) {
      return NextResponse.json({ error: 'Sheet kosong atau format tidak valid' }, { status: 400 })
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[]

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data di dalam file Excel' }, { status: 400 })
    }

    // Log headers for debugging
    const firstRow = rawData[0]
    console.log(`[IMPORT PEGAWAI] Headers found:`, Object.keys(firstRow))
    console.log(`[IMPORT PEGAWAI] Total rows: ${rawData.length}`)

    // Flexible Header Mapping Utility
    const getVal = (row: Record<string, any>, possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== '') return row[key]
        // Case-insensitive + trimmed fallback
        const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase())
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey]
      }
      return undefined
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
      total: rawData.length,
    }

    // --- PRE-FETCH: Load all units and auth users once BEFORE the loop ---
    const { data: allUnits, error: unitsFetchErr } = await supabaseAdmin
      .from('m_units')
      .select('id, code, name')

    if (unitsFetchErr) {
      console.error('[IMPORT] Failed to fetch units:', unitsFetchErr)
      return NextResponse.json({ error: 'Gagal memuat data unit: ' + unitsFetchErr.message }, { status: 500 })
    }

    const { data: { users: allAuthUsers }, error: authListError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
    if (authListError) {
      console.error('[IMPORT] Failed to list auth users:', authListError)
      return NextResponse.json({ error: 'Gagal memuat data auth: ' + authListError.message }, { status: 500 })
    }

    // Build lookup maps for O(1) access
    const unitByCode = new Map<string, { id: string; code: string; name: string }>()
    const unitByNameLower = new Map<string, { id: string; code: string; name: string }>()
    for (const u of (allUnits || [])) {
      unitByCode.set(u.code.toLowerCase(), u)
      unitByNameLower.set(u.name.toLowerCase(), u)
    }

    const authUserByEmail = new Map<string, { id: string }>()
    for (const u of (allAuthUsers || [])) {
      if (u.email) authUserByEmail.set(u.email.toLowerCase(), { id: u.id })
    }

    // 3. Process records
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNum = i + 2 // +2 because row 1 is header in Excel

      const employeeCode = getVal(row, ['Kode Pegawai', 'Kode', 'Employee Code', 'NIP'])?.toString().trim()
      const fullName = getVal(row, ['Nama Lengkap', 'Nama', 'Full Name', 'Name'])?.toString().trim()
      const unitCode = getVal(row, ['Kode Unit', 'Unit', 'Unit Code', 'KodeUnit'])?.toString().trim()
      const email = getVal(row, ['Email'])?.toString().trim().toLowerCase()

      try {
        if (!employeeCode || !fullName || !unitCode || !email) {
          // Skip truly empty rows silently
          const nonEmpty = Object.values(row).filter(v => v !== '' && v !== undefined && v !== null)
          if (nonEmpty.length <= 1) continue

          results.failed++
          results.errors.push(`Baris ${rowNum} - Data wajib tidak lengkap (Kode: ${employeeCode || '-'}, Nama: ${fullName || '-'}, Unit: ${unitCode || '-'}, Email: ${email || '-'})`)
          continue
        }

        // --- Read optional fields ---
        const nik = getVal(row, ['NIK', 'No KTP'])?.toString().trim()
        const position = getVal(row, ['Jabatan', 'Position'])?.toString().trim()
        const phone = getVal(row, ['Telepon', 'Phone', 'No HP', 'WhatsApp'])?.toString().trim()
        const taxStatus = getVal(row, ['Status Pajak', 'PTKP', 'Tax Status'])?.toString().trim() || 'TK/0'
        const bankName = getVal(row, ['Nama Bank', 'Bank'])?.toString().trim()
        const bankAccountNumber = getVal(row, ['Nomor Rekening', 'Rekening', 'No Rek'])?.toString().trim()
        const bankAccountName = getVal(row, ['Nama Pemilik Rekening', 'Account Name', 'Nama Rek'])?.toString().trim()
        const roleStr = getVal(row, ['Role', 'Peran'])?.toString().trim().toLowerCase()
        const statusStr = getVal(row, ['Status', 'Active'])?.toString().trim().toLowerCase()

        const rawEmploymentStatus = String(getVal(row, ['Status Pegawai', 'Employment Status']) || '').toUpperCase()
        let employmentStatus: 'PNS' | 'PPPK' | 'BLUD' = 'BLUD'
        if (rawEmploymentStatus.includes('PNS') || rawEmploymentStatus.includes('ASN')) employmentStatus = 'PNS'
        else if (rawEmploymentStatus.includes('PPPK')) employmentStatus = 'PPPK'
        else if (rawEmploymentStatus.includes('BLUD')) employmentStatus = 'BLUD'

        const rawGrade = String(getVal(row, ['Golongan', 'Grade']) || '').trim().replace(/[^0-9]/g, '')
        const pnsGrade = employmentStatus === 'PNS' ? (rawGrade || null) : null
        const taxTypeReq = getVal(row, ['Jenis Pajak', 'Tax Type'])?.toString().trim()

        // Validate role
        const validRoles = ['superadmin', 'unit_manager', 'employee']
        const normalizedRole = validRoles.includes(roleStr || '') ? roleStr! : 'employee'

        // Validate tax status
        const validTaxStatus = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']
        const normalizedTaxStatus = validTaxStatus.includes(taxStatus) ? taxStatus : 'TK/0'

        // --- Match unit using pre-fetched data (O(1) lookup) ---
        const unitCodeLower = unitCode.toLowerCase()
        let unit = unitByCode.get(unitCodeLower) || unitByNameLower.get(unitCodeLower) || null

        // Fuzzy fallback: check if unit name contains the search term
        if (!unit) {
          for (const [name, u] of unitByNameLower) {
            if (name.includes(unitCodeLower) || unitCodeLower.includes(name)) {
              unit = u
              break
            }
          }
        }

        if (!unit) {
          throw new Error(`Unit "${unitCode}" tidak ditemukan. Pastikan kode unit sudah ada di Master Unit.`)
        }

        // --- Check if employee already exists ---
        const { data: existing, error: checkError } = await supabaseAdmin
          .from('m_employees')
          .select('id, user_id')
          .eq('employee_code', employeeCode)
          .maybeSingle()

        if (checkError) throw checkError

        // --- Auth User Sync (using pre-fetched map) ---
        let authUserId: string | null = null
        const existingAuthUser = authUserByEmail.get(email)

        if (existingAuthUser) {
          authUserId = existingAuthUser.id
          // Update metadata silently
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            user_metadata: { role: normalizedRole, full_name: fullName }
          })
        } else {
          // Create new auth user
          const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: `JASPEL_${employeeCode}`,
            email_confirm: true,
            user_metadata: { role: normalizedRole, full_name: fullName }
          })
          if (createAuthError) {
            // If user exists error, skip auth creation but continue
            if (createAuthError.message?.includes('already') || createAuthError.message?.includes('duplicate')) {
              console.warn(`[IMPORT] Auth user ${email} already exists, skipping auth creation`)
            } else {
              throw createAuthError
            }
          } else {
            authUserId = newAuthUser?.user?.id ?? null
            // Add to cache for subsequent rows with same email
            if (authUserId) authUserByEmail.set(email, { id: authUserId })
          }
        }

        // --- Save Employee Data ---
        const employeeData = {
          employee_code: employeeCode,
          full_name: fullName,
          unit_id: unit.id,
          user_id: authUserId,
          email: email,
          nik: nik || null,
          position: position || null,
          phone: phone || null,
          tax_status: normalizedTaxStatus,
          bank_name: bankName || null,
          bank_account_number: bankAccountNumber || null,
          bank_account_name: bankAccountName || null,
          role: normalizedRole,
          employment_status: employmentStatus,
          employee_status: employmentStatus,
          tax_type: taxTypeReq || 'Final',
          pns_grade: pnsGrade,
          is_active: statusStr ? (statusStr === 'aktif' || statusStr === 'active' || statusStr === '1') : true,
          updated_at: new Date().toISOString()
        }

        if (existing) {
          const { error: updateError } = await supabaseAdmin
            .from('m_employees')
            .update(employeeData)
            .eq('id', existing.id)
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabaseAdmin
            .from('m_employees')
            .insert({ ...employeeData, created_at: new Date().toISOString() })
          if (insertError) throw insertError
        }

        results.success++
        console.log(`[IMPORT OK] Baris ${rowNum}: ${fullName} (${employeeCode})`)
      } catch (error: any) {
        console.error(`[IMPORT ERROR] Baris ${rowNum} (${employeeCode || 'N/A'}):`, error.message)
        results.failed++
        const displayName = fullName || employeeCode || `Baris ${rowNum}`
        results.errors.push(`${displayName}: ${error.message || 'Error tidak diketahui'}`)
      }
    }

    console.log(`[IMPORT SELESAI] Berhasil: ${results.success}, Gagal: ${results.failed}`)
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('CRITICAL: Error importing pegawai:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses data import' },
      { status: 500 }
    )
  }
}
