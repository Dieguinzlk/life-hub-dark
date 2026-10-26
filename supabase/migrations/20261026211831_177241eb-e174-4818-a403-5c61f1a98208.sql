CREATE TABLE public.profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, display_name text NOT NULL DEFAULT '', avatar_url text, preferences jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_profile ON public.profiles FOR ALL TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE FUNCTION public.create_user_profile() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN INSERT INTO public.profiles(id, display_name, avatar_url) VALUES(NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), NEW.raw_user_meta_data->>'avatar_url') ON CONFLICT DO NOTHING; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.create_user_profile() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER create_profile_after_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.create_user_profile();
INSERT INTO public.profiles(id, display_name, avatar_url) SELECT id, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', ''), raw_user_meta_data->>'avatar_url' FROM auth.users ON CONFLICT DO NOTHING;
CREATE TABLE public.app_data (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, data jsonb NOT NULL, revision bigint NOT NULL DEFAULT 1, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE ON public.app_data TO authenticated;
GRANT ALL ON public.app_data TO service_role;
ALTER TABLE public.app_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_app_data ON public.app_data FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE FUNCTION public.save_app_data(payload jsonb, expected_revision bigint) RETURNS bigint LANGUAGE plpgsql SET search_path = public AS $$ DECLARE result bigint; BEGIN IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF; IF payload->>'version' IS DISTINCT FROM '1' OR jsonb_typeof(payload->'transactions') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid payload'; END IF; INSERT INTO public.profiles(id) VALUES (auth.uid()) ON CONFLICT DO NOTHING; IF expected_revision = 0 THEN INSERT INTO public.app_data(user_id,data) VALUES(auth.uid(),payload) ON CONFLICT DO NOTHING RETURNING revision INTO result; ELSE UPDATE public.app_data SET data=payload, revision=revision+1,updated_at=now() WHERE user_id=auth.uid() AND revision=expected_revision RETURNING revision INTO result; END IF; IF result IS NULL THEN RAISE EXCEPTION 'Dados alterados em outro aparelho. Recarregue antes de continuar.'; END IF; RETURN result; END $$;
REVOKE ALL ON FUNCTION public.save_app_data(jsonb,bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_app_data(jsonb,bigint) TO authenticated;

-- Roles
CREATE TYPE public.app_role AS ENUM ('owner');
CREATE TABLE public.user_roles (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, role public.app_role NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (user_id, role));
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_roles_read ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE UNIQUE INDEX one_owner ON public.user_roles (role) WHERE role = 'owner';
CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- VIP
CREATE TABLE public.vip_grants (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, expires_at timestamptz, granted_by uuid NOT NULL, revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.vip_grants TO authenticated;
GRANT ALL ON public.vip_grants TO service_role;
ALTER TABLE public.vip_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY vip_read ON public.vip_grants FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'owner'));

CREATE FUNCTION public.current_plan(_user_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN public.has_role(_user_id,'owner') THEN 'owner'
    WHEN EXISTS (SELECT 1 FROM public.vip_grants WHERE user_id=_user_id AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > now())) THEN 'vip'
    ELSE 'free' END $$;
REVOKE ALL ON FUNCTION public.current_plan(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_plan(uuid) TO service_role;

CREATE FUNCTION public.my_plan() RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT public.current_plan(auth.uid()) $$;
REVOKE ALL ON FUNCTION public.my_plan() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_plan() TO authenticated;

CREATE FUNCTION public.set_vip(_target uuid, _expires_at timestamptz, _active boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _target = auth.uid() THEN RAISE EXCEPTION 'O proprietário não precisa de VIP'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=_target) THEN RAISE EXCEPTION 'Usuário não encontrado'; END IF;
  IF _active THEN
    INSERT INTO public.vip_grants(user_id, expires_at, granted_by) VALUES (_target, _expires_at, auth.uid())
    ON CONFLICT (user_id) DO UPDATE SET expires_at=EXCLUDED.expires_at, granted_by=auth.uid(), revoked_at=NULL, updated_at=now();
  ELSE
    UPDATE public.vip_grants SET revoked_at=now(), updated_at=now() WHERE user_id=_target;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.set_vip(uuid, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_vip(uuid, timestamptz, boolean) TO authenticated;

CREATE FUNCTION public.admin_list_users() RETURNS TABLE(id uuid, email text, display_name text, created_at timestamptz, plan text, vip_expires_at timestamptz, vip_revoked_at timestamptz, used_today int)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'owner') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  RETURN QUERY SELECT p.id, u.email::text, p.display_name, p.created_at, public.current_plan(p.id), v.expires_at, v.revoked_at,
    COALESCE((SELECT c.count FROM public.chat_usage c WHERE c.user_id=p.id AND c.day=(now() AT TIME ZONE 'America/Sao_Paulo')::date),0)
  FROM public.profiles p JOIN auth.users u ON u.id=p.id LEFT JOIN public.vip_grants v ON v.user_id=p.id ORDER BY p.created_at;
END $$;

-- AI usage
CREATE TABLE public.chat_usage (user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, day date NOT NULL, count int NOT NULL DEFAULT 0, PRIMARY KEY (user_id, day));
GRANT SELECT ON public.chat_usage TO authenticated;
GRANT ALL ON public.chat_usage TO service_role;
ALTER TABLE public.chat_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_usage_read ON public.chat_usage FOR SELECT TO authenticated USING (user_id = auth.uid());

REVOKE ALL ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;

CREATE FUNCTION public.consume_chat_quota() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p text; lim int; d date := (now() AT TIME ZONE 'America/Sao_Paulo')::date; used int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  INSERT INTO public.profiles(id) VALUES (uid) ON CONFLICT DO NOTHING;
  p := public.current_plan(uid);
  lim := CASE p WHEN 'owner' THEN NULL WHEN 'vip' THEN 200 ELSE 20 END;
  INSERT INTO public.chat_usage(user_id, day, count) VALUES (uid, d, 0) ON CONFLICT DO NOTHING;
  UPDATE public.chat_usage SET count = count + 1 WHERE user_id=uid AND day=d AND (lim IS NULL OR count < lim) RETURNING count INTO used;
  IF used IS NULL THEN SELECT count INTO used FROM public.chat_usage WHERE user_id=uid AND day=d;
    RETURN jsonb_build_object('allowed', false, 'plan', p, 'used', used, 'limit', lim); END IF;
  RETURN jsonb_build_object('allowed', true, 'plan', p, 'used', used, 'limit', lim);
END $$;
REVOKE ALL ON FUNCTION public.consume_chat_quota() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_chat_quota() TO authenticated;

-- One-time owner bootstrap: only service_role (server, after verifying OWNER_EMAIL) may call.
CREATE FUNCTION public.bootstrap_owner(_user_id uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role='owner') THEN RETURN public.has_role(_user_id,'owner'); END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id,'owner');
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.bootstrap_owner(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_owner(uuid) TO service_role;