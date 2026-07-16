import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const admin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function getUser(request: NextRequest) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false }
  })
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const uid = user.id

    const [a, t, m, r, e, c, s] = await Promise.all([
      admin.from('artists').select('*').eq('user_id', uid).order('name'),
      admin.from('tours').select('*').eq('user_id', uid).order('start_date'),
      admin.from('meetings').select('*').eq('user_id', uid).order('date'),
      admin.from('replacements').select('*').eq('user_id', uid).order('name'),
      admin.from('expenses').select('*').eq('user_id', uid).order('date', { ascending: false }),
      admin.from('contacts').select('*').eq('user_id', uid).order('name'),
      admin.from('user_settings').select('*').eq('user_id', uid).single(),
    ])

    if (!a.data?.length) {
      const blob = (s.data as any)?.data_blob
      if (blob?.artists?.length) {
        await saveAll(uid, blob)
        const [a2, t2] = await Promise.all([
          admin.from('artists').select('*').eq('user_id', uid).order('name'),
          admin.from('tours').select('*').eq('user_id', uid).order('start_date'),
        ])
        return buildResponse(a2.data||[], t2.data||[], m.data||[], r.data||[], e.data||[], c.data||[], s.data)
      }
    }

    return buildResponse(a.data||[], t.data||[], m.data||[], r.data||[], e.data||[], c.data||[], s.data)
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

function buildResponse(artists: any[], tours: any[], meetings: any[], replacements: any[], expenses: any[], contacts: any[], settings: any) {
  return NextResponse.json({
    artists: artists.map(a => ({ id: a.id, name: a.name, genre: a.genre||'', color: a.color||'#C9A84C', siret: a.siret||'', address: a.address||'', nature: a.nature||'' })),
    tours: tours.map(t => ({ id: t.id, aId: t.artist_id, title: t.title, start: t.start_date, end: t.end_date, city: t.city||'', type: t.type||'show', paid: t.paid!==false, received: t.received||false, customCachet: t.custom_cachet||null, customHours: t.custom_hours||null, notes: t.notes||'', address: t.address||'', hotel: t.hotel||'', room: t.room||'', hotelAddr: t.hotel_addr||'', doclink: t.doclink||'' })),
    meetings: meetings.map(m => ({ id: m.id, title: m.title, type: m.type||'online', date: m.date, time: m.time||'', location: m.location||'', notes: m.notes||'' })),
    subs: replacements.map(s => ({ id: s.id, name: s.name, inst: s.instrument||'', phone: s.phone||'', email: s.email||'', genre: s.genre||'', notes: s.notes||'' })),
    expenses: expenses.map(e => ({ id: e.id, aId: e.artist_id, date: e.date, amount: e.amount, cat: e.category||'other', desc: e.description||'', receipt: e.receipt_url||'' })),
    contacts: contacts.map(c => ({ id: c.id, name: c.name, role: c.role||'', company: c.company||'', phone: c.phone||'', email: c.email||'', aId: c.artist_id||null, contact: c.contact_info||'', last: c.last_contact_date||'', followup: c.followup_date||'', notes: c.notes||'' })),
    hoursGoal: settings?.hours_goal || 507,
    hoursPerEventType: settings?.hour_types || {},
    calY: settings?.cal_year,
    calM: settings?.cal_month,
    trips: [], guests: [], mgrTours: [], cachets: {}, artistHours: {},
    _cloudLoaded: true
  })
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const uid = user.id
    const { action, data } = await request.json()

    if (action === 'saveAll') {
      if (data?._test) return NextResponse.json({ success: true })
      await saveAll(uid, data)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const uid = user.id
    const { table, id } = await request.json()
    if (!table || !id) return NextResponse.json({ error: 'table and id required' }, { status: 400 })
    const { error } = await admin.from(table).delete().eq('id', id).eq('user_id', uid)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function saveAll(uid: string, data: any): Promise<void> {
  // Build all records first, then batch upsert per table in parallel
  const artists = (data.artists || []).map((a: any) => ({
    id: String(a.id), user_id: uid, name: a.name, genre: a.genre||'',
    color: a.color||'#C9A84C', siret: a.siret||'', address: a.address||'', nature: a.nature||''
  }))

  const tours = (data.tours || []).map((t: any) => ({
    id: String(t.id), user_id: uid,
    artist_id: t.aId ? String(t.aId) : null,
    title: t.title||'Untitled', start_date: t.start,
    end_date: t.end||t.start, city: t.city||'',
    type: t.type||'show', paid: t.paid!==false,
    received: t.received||false,
    custom_cachet: t.customCachet||null,
    custom_hours: t.customHours||null,
    notes: t.notes||'', address: t.address||'',
    hotel: t.hotel||'', room: t.room||'',
    hotel_addr: t.hotelAddr||'', doclink: t.doclink||''
  }))

  const meetings = (data.meetings || []).map((m: any) => ({
    id: String(m.id), user_id: uid,
    title: m.title||'Meeting', type: m.type||'online',
    date: m.date, time: m.time||'', location: m.location||'', notes: m.notes||''
  }))

  const replacements = (data.subs || []).map((s: any) => ({
    id: String(s.id), user_id: uid, name: s.name,
    instrument: s.inst||'', phone: s.phone||'', genre: s.genre||'', notes: s.notes||''
  }))

  const expenses = (data.expenses || []).map((e: any) => ({
    id: String(e.id), user_id: uid, date: e.date,
    amount: e.amount, category: e.cat||'other',
    description: e.desc||'', receipt_url: e.receipt||''
  }))

  const contacts = (data.contacts || []).map((ct: any) => ({
    id: String(ct.id), user_id: uid, name: ct.name,
    role: ct.role||'', company: ct.company||'',
    contact_info: ct.contact||'',
    last_contact_date: ct.last||null,
    followup_date: ct.followup||null, notes: ct.notes||''
  }))

  const settings = {
    user_id: uid,
    hours_goal: data.hoursGoal||507,
    hour_types: data.hoursPerEventType||{},
    cal_year: data.calY,
    cal_month: data.calM,
    updated_at: new Date().toISOString()
  }

  // Batch upsert all tables in parallel
  const ops: Promise<any>[] = [
    admin.from('user_settings').upsert(settings) as unknown as Promise<any>
  ]

  // Batch insert per table (one request per table, not one per record)
  if (artists.length) ops.push(admin.from('artists').upsert(artists))
  if (tours.length) ops.push(admin.from('tours').upsert(tours))
  if (meetings.length) ops.push(admin.from('meetings').upsert(meetings))
  if (replacements.length) ops.push(admin.from('replacements').upsert(replacements))
  if (expenses.length) ops.push(admin.from('expenses').upsert(expenses))
  if (contacts.length) ops.push(admin.from('contacts').upsert(contacts))

  await Promise.allSettled(ops)
}
