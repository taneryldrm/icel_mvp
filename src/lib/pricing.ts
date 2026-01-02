import { supabase } from './supabaseClient';

/**
 * Fetches the current user's role from the profiles table.
 * Returns 'b2b' or 'b2c' (default 'b2c' if null/guest).
 */
export const fetchUserRole = async (): Promise<string> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 'b2c';

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

    return profile?.role || 'b2c';
};

/**
 * Calculates the selling price for a variant based on the user's role.
 * 
 * Logic:
 * 1. If role is NOT 'b2b', return basePrice immediately (no DB call).
 * 2. If role IS 'b2b', fetch active price from variant_prices.
 *    If found, return it.
 *    If not found, return basePrice.
 */
export const calculateVariantPrice = async (
    variantId: string,
    basePrice: number,
    userRole: string
): Promise<number> => {
    // STRICT RULE: Only B2B sees variant_prices.
    if (userRole !== 'b2b') {
        return basePrice;
    }

    const { data: priceData } = await supabase
        .from('variant_prices')
        .select('price')
        .eq('variant_id', variantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

    if (priceData && priceData.length > 0) {
        return priceData[0].price;
    }

    return basePrice;
};
