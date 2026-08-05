import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    envKeys: Object.keys(process.env),
    supabaseUrl: {
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      length: process.env.NEXT_PUBLIC_SUPABASE_URL?.length || 0,
      value: process.env.NEXT_PUBLIC_SUPABASE_URL || null
    },
    supabaseAnonKey: {
      defined: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0,
      valueSnippet: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 15) + "..." : null
    }
  })
}
