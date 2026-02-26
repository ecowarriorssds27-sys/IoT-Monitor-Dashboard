# IoT Current Monitoring Dashboard - User Guide

## Overview

Your professional IoT Power Monitoring Dashboard is ready! This system tracks electricity consumption across 4 switches in real-time, calculates your EB bill, and provides detailed usage analytics.

## Features

### 1. **Real-Time Monitoring**
- Live power consumption display for each switch
- Visual indicators showing which devices are ON/OFF
- Instant power readings in Watts

### 2. **4 Switch Control**
- Turn devices ON/OFF remotely from the dashboard
- Each switch can be customized with a name and device type
- Supports: Bulb, Fan, TV, Fridge, AC, Heater, and more

### 3. **EB Bill Calculation**
- Automatic bill calculation based on Indian tariff slabs
- Default Tamil Nadu tariff structure included:
  - 0-100 units: Free
  - 101-200 units: ₹2.50/kWh
  - 201-500 units: ₹4.60/kWh
  - 501+ units: ₹6.60/kWh
- Fully customizable tariff slabs in Settings

### 4. **Billing Periods**
- Flexible billing cycles: 1-6 months
- Set your preferred billing period in Settings
- Bill automatically calculated for the current period

### 5. **Usage Analytics**
- Daily consumption tracking
- Last 7 days usage chart
- Per-device energy monitoring
- Cost breakdown for each day

### 6. **Dashboard Cards**
- **Bill Amount**: Current estimated bill in ₹
- **Total Units**: Cumulative kWh for billing period
- **Today's Usage**: Today's consumption
- **Billing Cycle**: Current billing period setting

## How to Use

### Initial Setup

1. **Configure Device Names**
   - Go to Settings (top-right button)
   - Under "Device Names", enter names for your 4 switches
   - Examples: "Living Room Light", "Bedroom Fan", "Kitchen Fridge", "Hall TV"
   - Select device type from dropdown

2. **Set Up EB Tariff**
   - In Settings, go to "EB Tariff Slabs"
   - Default Tamil Nadu rates are pre-configured
   - Click "Add Slab" to add more tiers
   - Enter:
     - Min Units (starting unit)
     - Max Units (ending unit, leave empty for unlimited)
     - Rate per kWh in ₹
   - Click trash icon to delete a slab

3. **Configure Billing Period**
   - In Settings, select billing period (1-6 months)
   - This determines how many months to sum for bill calculation

4. **Save Settings**
   - Click "Save All Settings" button at bottom
   - Green confirmation message will appear

### Daily Usage

1. **Monitor Live Power**
   - Green cards show devices that are ON
   - White cards show devices that are OFF
   - Power reading updates every 3 seconds

2. **Control Switches**
   - Click "Turn ON" to activate a device
   - Click "Turn OFF" to deactivate
   - Status updates immediately

3. **View Usage Statistics**
   - Top cards show:
     - Current bill estimate
     - Total units consumed
     - Today's usage
     - Billing cycle period
   - Bottom section shows last 7 days breakdown

4. **Track Costs**
   - Each day's usage shows:
     - Date
     - Device name
     - Energy consumed (kWh)
     - Cost in ₹
   - Progress bars visualize relative consumption

## How Energy Tracking Works

### When You Turn ON a Switch:
1. Dashboard marks the device as active
2. IoT device starts sending power readings
3. Readings are stored with timestamp
4. Energy accumulates based on power × time

### When You Turn OFF a Switch:
1. Dashboard marks device as inactive
2. Final readings are recorded
3. Daily summary is updated
4. Cost is calculated based on tariff slabs

### Example Scenario:
```
Switch 1 (Bulb) ON for 1 hour at 60W = 0.06 kWh
Switch 2 (Fan) ON for 1 hour at 75W = 0.075 kWh
Total for that hour = 0.135 kWh

If both continue for full day:
Switch 1: 60W × 24h = 1.44 kWh
Switch 2: 75W × 24h = 1.80 kWh
Total daily = 3.24 kWh
```

## IoT Device Integration

Your IoT device should:
1. Read voltage and current from sensors
2. Calculate power (V × A)
3. Calculate cumulative energy
4. Send data every 3-5 seconds
5. Include switch number (1-4)

See `IOT_DEVICE_SETUP.md` for Arduino code.

## Bill Calculation Logic

The system uses slab-based calculation (like actual EB bills):

**Example:**
If you consumed 250 kWh:
- First 100 units: 100 × ₹0 = ₹0
- Next 100 units: 100 × ₹2.50 = ₹250
- Next 50 units: 50 × ₹4.60 = ₹230
- **Total Bill: ₹480**

## Troubleshooting

### Data Not Showing
- Check if IoT device is connected to WiFi
- Verify Supabase URL and API key in `.env`
- Check browser console for errors

### Switches Not Toggling
- Refresh the page
- Check database connection
- Ensure Supabase is running

### Incorrect Bill Amount
- Verify tariff slabs in Settings
- Check billing period setting
- Ensure energy readings are in kWh

## Technical Details

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL database)
- **Real-time**: 3-second polling for live updates
- **Currency**: Indian Rupees (₹)
- **Units**: Kilowatt-hours (kWh)
- **Timezone**: Indian Standard Time (IST)

## Support

The dashboard automatically:
- ✅ Handles NaN values from sensors
- ✅ Prevents data loss
- ✅ Calculates costs accurately
- ✅ Tracks multiple devices simultaneously
- ✅ Stores historical data indefinitely

Enjoy your professional IoT power monitoring system!
