require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
// Enable CORS for frontend integration
app.use(cors());
// Parse JSON request bodies
app.use(express.json());

// Database connection via connection pool
// For Render.com, you would supply the internal or external DATABASE_URL env var
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Auto-initialize Database Schema
const initDB = async () => {
    if (!process.env.DATABASE_URL) return;
    try {
        const schema = `
      CREATE TABLE IF NOT EXISTS health_metrics (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          timestamp TIMESTAMPTZ NOT NULL,
          vitals_steps INTEGER,
          vitals_heart_rate_avg INTEGER,
          vitals_hrv_sdnn_ms DECIMAL,
          vitals_blood_oxygen_avg DECIMAL,
          movement_gait_speed_ms DECIMAL,
          movement_step_cadence INTEGER,
          movement_walking_asymmetry DECIMAL,
          sleep_total_hours DECIMAL,
          sleep_deep DECIMAL,
          sleep_rem DECIMAL,
          sleep_latency INTEGER,
          sleep_awakenings INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_timestamp ON health_metrics (user_id, timestamp DESC);
    `;
        await pool.query(schema);
        console.log('Database schema initialized.');
    } catch (err) {
        console.error('Failed to initialize database schema:', err);
    }
};
initDB();

// Helper: Calculate Cognitive Index (Simulated AI Logic)
// Combines gait speed (surrogate for functional mobility) and HRV (surrogate for autonomic stress)
const calculateCognitiveIndex = (gaitSpeedMs, hrvSdnnMs) => {
    let score = 50; // Base score out of 100

    // Gait speed scoring (typical healthy adult is ~1.2 m/s)
    if (gaitSpeedMs >= 1.2) score += 25;
    else if (gaitSpeedMs >= 0.8) score += 10;
    else score -= 15;

    // HRV scoring (higher baseline variability often correlates with better cognitive flexibility)
    if (hrvSdnnMs >= 50) score += 25;
    else if (hrvSdnnMs >= 30) score += 10;
    else score -= 15;

    // Ensure output is strictly clamped between 0 and 100
    return Math.max(0, Math.min(100, Math.round(score)));
};

// Helper: Generate structured AI Insights
const generateInsights = (vitals, movement, sleep, cognitiveIndex) => {
    const insights = [];

    // Movement & Mobility insights
    if (movement.gaitSpeedMs < 0.8) {
        insights.push("Gait speed is slightly below population baselines. Consider integrating short, brisk walks to improve functional mobility.");
    } else {
        insights.push("Mobility metrics look fantastic! Your walking speed indicates strong neuromotor health.");
    }

    // Vitals & Autonomic Nervous System insights
    if (vitals.hrvSdnnMs < 30) {
        insights.push("Resting HRV is on the lower end today. Focus on autonomic recovery through breathwork or stress reduction techniques.");
    }

    // Sleep & Recovery insights
    if ((sleep.deep + sleep.rem) < 3.0) {
        insights.push("Your restorative sleep stages (Deep + REM) are below the optimal threshold. Prioritize sleep hygiene tonight.");
    } else {
        insights.push("Excellent restorative sleep profile. This strongly supports memory consolidation and daily cognitive function.");
    }

    return insights;
};

// Health Sync Endpoint
app.post('/api/v1/health/sync', async (req, res) => {
    try {
        const { userId, timestamp, vitals, movement, sleep } = req.body;

        // Payload Validation
        if (!userId || !timestamp || !vitals || !movement || !sleep) {
            return res.status(400).json({ error: 'Missing required payload fields. Ensure userId, timestamp, vitals, movement, and sleep are provided.' });
        }

        // Insert Health Metrics into PostgreSQL
        const insertQuery = `
      INSERT INTO health_metrics (
        user_id, timestamp, 
        vitals_steps, vitals_heart_rate_avg, vitals_hrv_sdnn_ms, vitals_blood_oxygen_avg,
        movement_gait_speed_ms, movement_step_cadence, movement_walking_asymmetry,
        sleep_total_hours, sleep_deep, sleep_rem, sleep_latency, sleep_awakenings
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      ) RETURNING id;
    `;

        const values = [
            userId, timestamp,
            vitals.steps, vitals.heartRateAvg, vitals.hrvSdnnMs, vitals.bloodOxygenAvg,
            movement.gaitSpeedMs, movement.stepCadence, movement.walkingAsymmetry,
            sleep.totalHours, sleep.deep, sleep.rem, sleep.latency, sleep.awakenings
        ];

        // Note: If you don't have the database running right now, you can comment this query out for local testing without DB.
        // However, it's enabled here to fulfill the production-grade requirements.
        if (process.env.DATABASE_URL) {
            await pool.query(insertQuery, values);
        } else {
            console.warn("No DATABASE_URL provided. Skipping PostgreSQL insertion simulating a successful write.");
        }

        // AI Simulation Processing
        const cognitiveIndex = calculateCognitiveIndex(movement.gaitSpeedMs, vitals.hrvSdnnMs);
        const healthStatus = cognitiveIndex >= 70 ? 'Optimal' : (cognitiveIndex >= 40 ? 'Stable' : 'Needs Attention');
        const aiInsights = generateInsights(vitals, movement, sleep, cognitiveIndex);

        // Build the processed response
        const responsePayload = {
            cognitiveIndex,
            healthStatus,
            aiInsights
        };

        // Return 200 OK with the AI processed data
        return res.status(200).json(responsePayload);

    } catch (err) {
        console.error('Error processing health sync payload:', err);
        return res.status(500).json({ error: 'Internal server error while processing health data' });
    }
});

// Render Deployment Health Check
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'Cognify Backend API is fully operational.' });
});

// Start Server
app.listen(port, () => {
    console.log(`Cognify Healthcare Backend listening on port ${port}`);
});
