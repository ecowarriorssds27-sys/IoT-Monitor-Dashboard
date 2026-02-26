import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface PowerData {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  switch_id?: string;
  switch_number?: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const data: PowerData = await req.json();

    const voltage = isNaN(data.voltage) ? 0 : data.voltage;
    const current = isNaN(data.current) ? 0 : data.current;
    const power = isNaN(data.power) ? 0 : data.power;
    const energy = isNaN(data.energy) ? 0 : data.energy;

    let switchId = data.switch_id;

    if (!switchId && data.switch_number) {
      const { data: switchData } = await supabase
        .from('switches')
        .select('id')
        .eq('switch_number', data.switch_number)
        .maybeSingle();

      if (switchData) {
        switchId = switchData.id;
      }
    }

    if (!switchId) {
      const { data: firstSwitch } = await supabase
        .from('switches')
        .select('id')
        .eq('is_on', true)
        .limit(1)
        .maybeSingle();

      if (firstSwitch) {
        switchId = firstSwitch.id;
      }
    }

    if (switchId) {
      const { error: insertError } = await supabase.from('power_readings').insert({
        switch_id: switchId,
        voltage,
        current,
        power,
        energy,
        reading_time: new Date().toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: todayData } = await supabase
        .from('power_readings')
        .select('energy, power, created_at')
        .eq('switch_id', switchId)
        .gte('reading_time', today)
        .order('reading_time', { ascending: true });

      if (todayData && todayData.length > 0) {
        const totalEnergy = todayData.reduce((sum, r) => sum + r.energy, 0);
        const avgPower = todayData.reduce((sum, r) => sum + r.power, 0) / todayData.length;
        const firstTime = new Date(todayData[0].created_at);
        const lastTime = new Date(todayData[todayData.length - 1].created_at);
        const totalHours = (lastTime.getTime() - firstTime.getTime()) / (1000 * 60 * 60);

        await supabase
          .from('daily_usage_summary')
          .upsert({
            usage_date: today,
            switch_id: switchId,
            total_energy: totalEnergy,
            total_hours: Math.max(totalHours, 0),
            avg_power: avgPower,
            cost: 0,
          }, {
            onConflict: 'usage_date,switch_id'
          });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Data received successfully' }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing power data:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
