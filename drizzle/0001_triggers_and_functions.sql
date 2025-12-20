CREATE OR REPLACE FUNCTION public.handle_github_user()
RETURNS TRIGGER AS $$
DECLARE
    github_username TEXT;
    github_email TEXT;
    github_display_name TEXT;
    github_avatar TEXT;
BEGIN
    IF NEW.raw_app_meta_data->>'provider' = 'github' THEN
        github_username := NEW.raw_user_meta_data->>'user_name';
        github_email := NEW.raw_user_meta_data->>'email';
        github_display_name := NEW.raw_user_meta_data->>'name';
        github_avatar := NEW.raw_user_meta_data->>'avatar_url';

        IF github_email IS NULL OR github_email = '' THEN
            RAISE EXCEPTION 'GitHub email is required';
        END IF;

        IF github_display_name IS NULL OR github_display_name = '' THEN
            RAISE EXCEPTION 'GitHub display name is required';
        END IF;

        IF github_username IS NULL OR github_username = '' THEN
            github_username := split_part(github_email, '@', 1);
        END IF;

        INSERT INTO public.users (id, email, display_name, avatar_url)
        VALUES (NEW.id, github_email, github_display_name, github_avatar)
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            display_name = EXCLUDED.display_name,
            avatar_url = EXCLUDED.avatar_url,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS github_user_trigger ON auth.users;

CREATE TRIGGER github_user_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_github_user();


-- 2. UPDATED_AT TIMESTAMP FUNCTION

CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- 3. UPDATED_AT TRIGGERS FOR ALL TABLES

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
CREATE TRIGGER trg_packages_updated_at
    BEFORE UPDATE ON public.packages
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_package_versions_updated_at ON public.package_versions;
CREATE TRIGGER trg_package_versions_updated_at
    BEFORE UPDATE ON public.package_versions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at_timestamp();


-- 4. DEFAULT VERSION INTEGRITY CHECK

CREATE OR REPLACE FUNCTION public.enforce_default_version_fk()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.default_version IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1
            FROM public.package_versions pv
            WHERE pv.id = NEW.default_version
              AND pv.package_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'Foreign key violation: default_version % does not exist or does not belong to package %',
                NEW.default_version, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_packages_default_version_fk ON public.packages;
CREATE TRIGGER trg_packages_default_version_fk
    BEFORE INSERT OR UPDATE OF default_version, id ON public.packages
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_default_version_fk();


-- 5. OWNER CLEANUP

CREATE OR REPLACE FUNCTION public.cleanup_package_owners()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.primary_owner IS DISTINCT FROM OLD.primary_owner) THEN
        DELETE FROM public.package_owners
        WHERE package_id = NEW.id
          AND user_id = NEW.primary_owner;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_packages_cleanup_owner ON public.packages;
CREATE TRIGGER trg_packages_cleanup_owner
    AFTER INSERT OR UPDATE OF primary_owner ON public.packages
    FOR EACH ROW
    EXECUTE FUNCTION public.cleanup_package_owners();


-- 6. CHECK PACKAGE OWNER NOT PRIMARY

CREATE OR REPLACE FUNCTION public.check_package_owner_not_primary()
RETURNS TRIGGER AS $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.packages p
        WHERE p.id = NEW.package_id
          AND p.primary_owner = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'User % is already the primary owner of package % and cannot be added as a secondary owner',
            NEW.user_id, NEW.package_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_package_owner_not_primary ON public.package_owners;
CREATE TRIGGER trg_check_package_owner_not_primary
    BEFORE INSERT OR UPDATE ON public.package_owners
    FOR EACH ROW
    EXECUTE FUNCTION public.check_package_owner_not_primary();


-- 7. DOWNLOAD INCREMENT & AUDIT LOG

CREATE OR REPLACE FUNCTION public.increment_downloads_and_log_audit(
    version_id UUID,
    user_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    pkg_id VARCHAR(100);
BEGIN
    UPDATE public.package_versions
    SET downloads = downloads + 1
    WHERE id = version_id
    RETURNING package_id INTO pkg_id;

    IF pkg_id IS NULL THEN
        RAISE EXCEPTION 'Package version % not found', version_id;
    END IF;

    INSERT INTO public.audits (action, user_id, package_id, package_version_id)
    VALUES (
        'version_update',
        COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        pkg_id,
        version_id
    );

END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = public;


-- VERIFICATION QUERIES

SELECT proname, prosrc
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'handle_github_user',
    'set_updated_at_timestamp',
    'enforce_default_version_fk',
    'cleanup_package_owners',
    'check_package_owner_not_primary',
    'increment_downloads_and_log_audit'
  );

SELECT tgname, tgrelid::regclass, tgtype
FROM pg_trigger
WHERE tgname IN (
    'github_user_trigger',
    'trg_users_updated_at',
    'trg_packages_updated_at',
    'trg_package_versions_updated_at',
    'trg_packages_default_version_fk',
    'trg_packages_cleanup_owner',
    'trg_check_package_owner_not_primary'
  );


-- ROLLBACK

/*
DROP TRIGGER IF EXISTS github_user_trigger ON auth.users;
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
DROP TRIGGER IF EXISTS trg_package_versions_updated_at ON public.package_versions;
DROP TRIGGER IF EXISTS trg_packages_default_version_fk ON public.packages;
DROP TRIGGER IF EXISTS trg_packages_cleanup_owner ON public.packages;
DROP TRIGGER IF EXISTS trg_check_package_owner_not_primary ON public.package_owners;

DROP FUNCTION IF EXISTS public.handle_github_user();
DROP FUNCTION IF EXISTS public.set_updated_at_timestamp();
DROP FUNCTION IF EXISTS public.enforce_default_version_fk();
DROP FUNCTION IF EXISTS public.cleanup_package_owners();
DROP FUNCTION IF EXISTS public.check_package_owner_not_primary();
DROP FUNCTION IF EXISTS public.increment_downloads_and_log_audit(UUID, UUID);
*/
