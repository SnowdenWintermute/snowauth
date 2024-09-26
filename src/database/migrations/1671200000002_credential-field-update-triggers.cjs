exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_password_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.password IS DISTINCT FROM OLD.status THEN
      NEW.password_updated_at := CURRENT_TIMESTAMP;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trigger_update_status_timestamp ON credentials;
    DROP FUNCTION IF EXISTS update_password_timestamp();
    `)
};
