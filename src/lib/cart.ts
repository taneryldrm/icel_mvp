import { supabase } from './supabaseClient';

/**
 * Gets the existing active cart or creates a new one.
 * Uses a robust "Check -> Insert -> Catch Conflict" strategy to handle race conditions
 * and lack of unique constraints on profile_id.
 */
export const getOrCreateActiveCart = async (userId: string): Promise<string | null> => {
    try {
        // 1. Wait for Profile (Retry Mechanism)
        // Helps avoid "Foreign key violation" if trigger is slow
        let profileExists = false;
        for (let i = 0; i < 5; i++) {
            const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
            if (data) {
                profileExists = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        if (!profileExists) {
            console.warn("Profile check timed out, attempting cart creation anyway.");
        }

        // 2. Check for existing active cart
        const { data: existingCart } = await supabase
            .from('carts')
            .select('id')
            .eq('profile_id', userId)
            .eq('status', 'active')
            .maybeSingle();

        if (existingCart) {
            return existingCart.id;
        }

        // 3. Upsert new cart (Handles race conditions atomically)
        // Uses upsert to prevent 409 Conflict errors in the console
        const { data: newCart, error: upsertError } = await supabase
            .from('carts')
            .upsert(
                { profile_id: userId, status: 'active' },
                { onConflict: 'profile_id', ignoreDuplicates: false }
            )
            .select()
            .single();

        if (upsertError) {
            console.error("Cart upsert error:", upsertError);
            throw upsertError;
        }

        return newCart.id;

    } catch (error) {
        console.error("Error in getOrCreateActiveCart:", error);
        return null;
    }
};
