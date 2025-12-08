-- Function: set_updated_at_timestamp
-- Purpose: Automatically sets the 'updated_at' column to the current time before UPDATE.
CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the 'users' table
CREATE OR REPLACE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Apply the trigger to the 'services' table
CREATE OR REPLACE TRIGGER trg_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

-- Apply the trigger to the 'service_versions' table
CREATE OR REPLACE TRIGGER trg_service_versions_updated_at
BEFORE UPDATE ON service_versions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
