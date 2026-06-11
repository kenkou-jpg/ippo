import { createClient }            from 'https://esm.sh/@supabase/supabase-js@2';
import { handleCors }              from '../_shared/cors.ts';
import { verifyJWT }               from '../_shared/auth.ts';
import { jsonError, jsonResponse }  from '../_shared/response.ts';
import { log }                     from '../_shared/logger.ts';

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let userId: string;
  try {
    ({ userId } = await verifyJWT(req));
  } catch (res) {
    return res as Response;
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')              ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('is_premium, premium_expires_at')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    log('warn', 'report_profile_not_found', { userId });
    return jsonError('Profile not found', 404, 'PROFILE_NOT_FOUND');
  }

  const premiumExpired = profile.premium_expires_at && new Date(profile.premium_expires_at) < new Date();
  if (!profile.is_premium || premiumExpired) {
    log('warn', 'report_premium_required', { userId });
    return jsonError('Premium subscription required', 403, 'PREMIUM_REQUIRED');
  }

  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const fromDate = threeMonthsAgo.toISOString().split('T')[0];
  const toDate   = now.toISOString().split('T')[0];

  const { data: records, error: recordsError } = await supabase
    .from('user_records')
    .select('*')
    .eq('user_id', userId)
    .gte('record_date', fromDate)
    .lte('record_date', toDate)
    .order('record_date', { ascending: true });

  if (recordsError) {
    log('error', 'report_records_fetch_failed', { userId, error: recordsError.message });
    return jsonError('Failed to fetch records', 500, 'RECORDS_FETCH_FAILED');
  }

  const r = records ?? [];
  log('info', 'report_generate', { userId, recordCount: r.length, fromDate, toDate });

  const avgWellness = r.length
    ? r.reduce((sum: number, rec: { wellness_score?: number }) => sum + (rec.wellness_score ?? 0), 0) / r.length
    : 0;
  const avgEnergy = r.length
    ? r.reduce((sum: number, rec: { energy_score?: number }) => sum + (rec.energy_score ?? 0), 0) / r.length
    : 0;
  const fastingRecs = r.filter((rec: { fasting_hours?: number }) => rec.fasting_hours != null);
  const avgFasting  = fastingRecs.length
    ? fastingRecs.reduce((sum: number, rec: { fasting_hours?: number }) => sum + (rec.fasting_hours ?? 0), 0) / fastingRecs.length
    : 0;

  const symptoms: string[] = r.flatMap((rec: { symptoms?: string[] }) => rec.symptoms ?? []);
  const symptomFrequency: Record<string, number> = {};
  for (const s of symptoms) symptomFrequency[s] = (symptomFrequency[s] ?? 0) + 1;

  const medications: string[] = r.flatMap((rec: { food_ingredients?: string[] }) => rec.food_ingredients ?? []);
  const medicationFrequency: Record<string, number> = {};
  for (const m of medications) medicationFrequency[m] = (medicationFrequency[m] ?? 0) + 1;

  const report = {
    period:  { from: fromDate, to: toDate },
    summary: {
      totalDays:        r.length,
      avgWellnessScore: Math.round(avgWellness * 10) / 10,
      avgEnergyScore:   Math.round(avgEnergy   * 10) / 10,
      avgFastingHours:  Math.round(avgFasting  * 10) / 10,
      topSymptoms:      Object.entries(symptomFrequency)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 10)
                          .map(([name, count]) => ({ name, count })),
    },
    cycles: r.map((rec: Record<string, unknown>) => ({
      date:          rec.record_date,
      wellnessScore: rec.wellness_score,
      energyScore:   rec.energy_score,
      chakra:        rec.chakra,
      fastingHours:  rec.fasting_hours,
      emotion:       rec.emotion,
    })),
    medications: Object.entries(medicationFrequency)
                   .sort((a, b) => b[1] - a[1])
                   .map(([name, count]) => ({ name, count })),
  };

  return jsonResponse(report);
});
