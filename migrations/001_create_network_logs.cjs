exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS network_logs (
      id          SERIAL PRIMARY KEY,
      source_ip   VARCHAR(45)  NOT NULL,
      endpoint    VARCHAR(255) NOT NULL,
      method      VARCHAR(10)  NOT NULL,
      status_code SMALLINT     NOT NULL,
      timestamp   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_source_ip   ON network_logs (source_ip);
    CREATE INDEX IF NOT EXISTS idx_status_code ON network_logs (status_code);
    CREATE INDEX IF NOT EXISTS idx_endpoint    ON network_logs (endpoint);
    CREATE INDEX IF NOT EXISTS idx_timestamp   ON network_logs (timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_ip_status   ON network_logs (source_ip, status_code);
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS network_logs;
  `);
};
