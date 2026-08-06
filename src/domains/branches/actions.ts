"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ACTIVE_BRANCH_COOKIE_NAME } from "./constants"

/**
 * Server Action to set the active branch cookie.
 */
export async function setActiveBranchCookie(branchId: string): Promise<{ success: boolean }> {
  try {
    const cookieStore = await cookies()
    cookieStore.set({
      name: ACTIVE_BRANCH_COOKIE_NAME,
      value: branchId,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      // No short expiration date: set to 10 years or similar
      maxAge: 60 * 60 * 24 * 365 * 10,
    })

    // Revalidate the entire root layout/dashboard tree
    revalidatePath("/", "layout")
    return { success: true }
  } catch (error) {
    console.error("Error writing active branch cookie:", error)
    return { success: false }
  }
}
