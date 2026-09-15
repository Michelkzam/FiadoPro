-- =============================================
-- 021: Create Master Admin User
-- Email: admin@fiadopro.com
-- Senha: FiadoPro@2024
-- =============================================

-- Inserir usuário admin apenas se não existir
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@fiadopro.com') THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@fiadopro.com',
      '$2a$10$co/5Wjw6mR79qv6ilhjPvOkof62b902//DTPjnBAVqJE6cdLgrqEe',
      NOW(),
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    );
  END IF;
END $$;

-- Inserir identity para o auth apenas se não existir
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@fiadopro.com';
  IF v_user_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id) THEN
    INSERT INTO auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@fiadopro.com'),
      'email',
      'admin@fiadopro.com',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
END $$;
