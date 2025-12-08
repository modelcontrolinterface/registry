-- Function: cleanup_service_owners
-- Purpose: Removes the new primary_owner from the service_owners table
--          if they were previously a secondary owner.
CREATE OR REPLACE FUNCTION cleanup_service_owners()
RETURNS TRIGGER AS $$
BEGIN
    -- Only run if the primary_owner has changed
    IF NEW.primary_owner IS DISTINCT FROM OLD.primary_owner THEN
        -- Delete the new primary owner's entry from the secondary owners table
        DELETE FROM service_owners
        WHERE service_id = NEW.id AND user_id = NEW.primary_owner;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to the 'services' table on primary_owner update
CREATE OR REPLACE TRIGGER trg_services_cleanup_owner
AFTER UPDATE OF primary_owner ON services
FOR EACH ROW
EXECUTE FUNCTION cleanup_service_owners();
