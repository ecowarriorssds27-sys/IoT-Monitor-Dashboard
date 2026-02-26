# IoT Device Setup Guide

## Arduino/ESP32 Code to Send Data to Your Dashboard

Replace your existing `sendToFirebase` function with this code to send data to your new dashboard:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// Your Supabase Edge Function URL
const char* EDGE_FUNCTION_URL = "https://mefaetiismptqkvvtkhw.supabase.co/functions/v1/receive-power-data";
const char* SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lZmFldGlpc21wdHFrdnZ0a2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5NzM4MTIsImV4cCI6MjA4NzU0OTgxMn0.azQ6CHlIeqW7P1S6p9Aph4LZija4xjcFnRtrn2qR4fg";

void sendToDashboard(float v, float c, float p, float e, int switchNumber)
{
    // Replace NaN with 0
    if(isnan(v)) v = 0;
    if(isnan(c)) c = 0;
    if(isnan(p)) p = 0;
    if(isnan(e)) e = 0;

    if(WiFi.status() == WL_CONNECTED) {
        HTTPClient http;

        http.begin(EDGE_FUNCTION_URL);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Authorization", String("Bearer ") + SUPABASE_ANON_KEY);
        http.addHeader("apikey", SUPABASE_ANON_KEY);

        // Create JSON payload
        StaticJsonDocument<256> doc;
        doc["voltage"] = v;
        doc["current"] = c;
        doc["power"] = p;
        doc["energy"] = e;
        doc["switch_number"] = switchNumber; // Which switch (1-4)

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        int httpResponseCode = http.POST(jsonPayload);

        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.println("✅ Data sent to Dashboard");
            Serial.println(response);
        } else {
            Serial.print("❌ Error sending data: ");
            Serial.println(httpResponseCode);
        }

        http.end();
    } else {
        Serial.println("WiFi Disconnected");
    }
}

// Example usage:
// sendToDashboard(voltage, current, power, energy, 1); // For switch 1
// sendToDashboard(voltage, current, power, energy, 2); // For switch 2
// etc.
```

## How to Use:

1. **For Each Switch**: When you read power data from a specific switch, call the function with the appropriate switch number (1-4).

2. **Example**:
```cpp
void loop() {
    // Read sensor data for switch 1
    float voltage1 = readVoltage(SENSOR_PIN_1);
    float current1 = readCurrent(SENSOR_PIN_1);
    float power1 = voltage1 * current1;
    float energy1 = calculateEnergy(power1);

    // Send data for switch 1
    sendToDashboard(voltage1, current1, power1, energy1, 1);

    delay(3000); // Send every 3 seconds
}
```

3. **Multiple Switches**: If you have multiple current sensors, read each one and send with the correct switch_number:
```cpp
// Switch 1
sendToDashboard(v1, c1, p1, e1, 1);
delay(1000);

// Switch 2
sendToDashboard(v2, c2, p2, e2, 2);
delay(1000);

// Switch 3
sendToDashboard(v3, c3, p3, e3, 3);
delay(1000);

// Switch 4
sendToDashboard(v4, c4, p4, e4, 4);
```

## Dashboard Features:

✅ **4 Switch Control** - Turn devices on/off from the dashboard
✅ **Real-time Monitoring** - See live power consumption
✅ **EB Bill Calculation** - Automatic bill calculation based on your tariff
✅ **Daily Usage Tracking** - Track consumption patterns
✅ **Device Customization** - Name your devices (Bulb, Fan, TV, Fridge, etc.)
✅ **Flexible Billing** - Set billing period (1-6 months)
✅ **Indian Currency** - All amounts in ₹ (Rupees)

## Energy Calculation:

Energy (kWh) = (Power in Watts × Time in Hours) / 1000

Make sure your Arduino calculates cumulative energy or send power readings regularly so the dashboard can calculate daily totals.
