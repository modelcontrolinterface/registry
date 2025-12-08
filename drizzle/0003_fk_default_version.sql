-- Function: enforce_default_version_fk
-- Purpose: Ensures the services.default_version references a valid service_versions.id
--          and that the service_version belongs to the correct service_id.
CREATE OR REPLACE FUNCTION enforce_default_version_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.default_version IS NOT NULL THEN
        -- Check if the referenced version exists AND belongs to the current service
        IF NOT EXISTS (
            SELECT 1 FROM service_versions sv
            WHERE sv.id = NEW.default_version AND sv.service_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Foreign key violation: default_version % does not exist or does not belong to service %', NEW.default_version, NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the 'services' table for INSERT or UPDATE operations
CREATE OR REPLACE TRIGGER trg_services_default_version_fk
BEFORE INSERT OR UPDATE OF default_version, id ON services
FOR EACH ROW
EXECUTE FUNCTION enforce_default_version_fk();
