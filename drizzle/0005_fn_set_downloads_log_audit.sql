-- Function: increment_downloads_and_log_audit
-- Purpose: Increments the downloads counter and logs an audit record, bypassing RLS.
-- NOTE: The SECURITY DEFINER clause and SET search_path ensures RLS is bypassed.

CREATE OR REPLACE FUNCTION increment_downloads_and_log_audit(
    version_id UUID,
    user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Increment the download counter on the service_versions table
    UPDATE service_versions
    SET downloads = downloads + 1
    WHERE id = version_id;

    -- Insert the audit record (this insertion requires bypassing RLS)
    INSERT INTO audits (action, user_id, service_id, service_version_id)
    SELECT
        'version_update'::audit_action,
        COALESCE(user_id, '00000000-0000-0000-0000-000000000000'), -- Use system ID if user is null
        sv.service_id,
        sv.id
    FROM service_versions sv
    WHERE sv.id = version_id;

END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, "$user";
