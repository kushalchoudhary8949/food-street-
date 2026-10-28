ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users, public.sessions, public.otp_requests, public.addresses
  FROM anon, authenticated;
GRANT ALL ON TABLE public.users, public.sessions, public.otp_requests, public.addresses
  TO service_role;
