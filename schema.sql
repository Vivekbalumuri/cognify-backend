CREATE TABLE IF NOT EXISTS health_metrics (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Vitals
    vitals_steps INTEGER,
    vitals_heart_rate_avg INTEGER,
    vitals_hrv_sdnn_ms DECIMAL,
    vitals_blood_oxygen_avg DECIMAL,
    
    -- Movement
    movement_gait_speed_ms DECIMAL,
    movement_step_cadence INTEGER,
    movement_walking_asymmetry DECIMAL,
    
    -- Sleep
    sleep_total_hours DECIMAL,
    sleep_deep DECIMAL,
    sleep_rem DECIMAL,
    sleep_latency INTEGER,
    sleep_awakenings INTEGER,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying a user's chronological data
CREATE INDEX idx_user_timestamp ON health_metrics (user_id, timestamp DESC);
