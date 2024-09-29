
exports.shorthands = undefined;

const resourceType="TABLE"
const resourceName="credentials"

exports.up = (pgm) => {
  pgm.sql(`
    CREATE ${resourceType} ${resourceName} (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES user_ids(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      email_address varchar(254) NOT NULL UNIQUE,
      email_address_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      password varchar(97),
      password_updated_at TIMESTAMP WITH TIME ZONE
    );
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DROP ${resourceType} ${resourceName};
    `);
};
