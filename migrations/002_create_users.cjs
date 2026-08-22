exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      VARCHAR(50) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role          VARCHAR(20) NOT NULL DEFAULT 'analyst',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT role_check CHECK (role IN ('admin', 'analyst'))
    );

    INSERT INTO users (username, password_hash, role)
    VALUES
      ('admin', '$2b$10$sUqSfSaRzkm5hpzY9L5pJeWpoyIEVk4giaefUyerZlXcsduG393Du', 'admin'),
      ('analyst', '$2b$10$6PfKFmUXqEWUNU8p25OPEORiPp7QjcHxx7LJcLHzCD3mKhI9e6IUC', 'analyst')
    ON CONFLICT (username) DO NOTHING;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS users;
  `);
};
