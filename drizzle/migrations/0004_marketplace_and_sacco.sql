CREATE TABLE public.marketplace_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  category text NOT NULL DEFAULT 'Crops',
  quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit text NOT NULL DEFAULT 'kg',
  price_ugx bigint NOT NULL CHECK (price_ugx > 0),
  district text NOT NULL DEFAULT '',
  contact_phone text NOT NULL CHECK (char_length(contact_phone) BETWEEN 7 AND 30),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected')),
  review_reason text NOT NULL DEFAULT '',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_listings TO anon;
GRANT SELECT, INSERT ON public.marketplace_listings TO authenticated;
GRANT ALL ON public.marketplace_listings TO service_role;
ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads approved listings" ON public.marketplace_listings FOR SELECT TO anon, authenticated USING (status = 'Approved');
CREATE POLICY "Seller reads own listings" ON public.marketplace_listings FOR SELECT TO authenticated USING (seller_id = auth.uid());
CREATE POLICY "Admin reads all listings" ON public.marketplace_listings FOR SELECT TO authenticated USING (public.can_platform('admin.platform'));
CREATE POLICY "Seller submits listing" ON public.marketplace_listings FOR INSERT TO authenticated WITH CHECK (seller_id = auth.uid());

CREATE OR REPLACE FUNCTION public.marketplace_listing_defaults() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.reviewed_by := NULL; NEW.reviewed_at := NULL; NEW.review_reason := '';
  IF public.can_platform('admin.platform') THEN
    NEW.status := 'Approved'; NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now(); NEW.review_reason := 'Added by administrator';
  ELSE
    NEW.status := 'Pending';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER marketplace_listing_defaults BEFORE INSERT ON public.marketplace_listings FOR EACH ROW EXECUTE FUNCTION public.marketplace_listing_defaults();

CREATE OR REPLACE FUNCTION public.review_marketplace_listing(_listing_id uuid, _decision text, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_platform('admin.platform') THEN RAISE EXCEPTION 'Administrator permission required'; END IF;
  IF _decision NOT IN ('Approved','Rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF _decision = 'Rejected' AND char_length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required when rejecting'; END IF;
  UPDATE public.marketplace_listings SET status = _decision, review_reason = left(coalesce(trim(_reason),''), 500), reviewed_by = auth.uid(), reviewed_at = now()
   WHERE id = _listing_id AND status = 'Pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Listing is not pending'; END IF;
  INSERT INTO public.platform_audit(actor_id, action, entity_id, detail) VALUES (auth.uid(), 'listing_' || lower(_decision), _listing_id, jsonb_build_object('reason', _reason));
END $$;
REVOKE ALL ON FUNCTION public.review_marketplace_listing(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_marketplace_listing(uuid,text,text) TO authenticated;

CREATE TABLE public.sacco_savings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'Deposit' CHECK (kind IN ('Deposit','Withdrawal')),
  amount_ugx bigint NOT NULL CHECK (amount_ugx > 0),
  note text NOT NULL DEFAULT '' CHECK (char_length(note) <= 300),
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sacco_savings TO authenticated;
GRANT ALL ON public.sacco_savings TO service_role;
ALTER TABLE public.sacco_savings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member reads own savings" ON public.sacco_savings FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Member records own savings" ON public.sacco_savings FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE TABLE public.sacco_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  principal_ugx bigint NOT NULL CHECK (principal_ugx > 0),
  purpose text NOT NULL CHECK (char_length(purpose) BETWEEN 3 AND 300),
  term_months integer NOT NULL CHECK (term_months BETWEEN 1 AND 60),
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Approved','Rejected','Repaid')),
  review_reason text NOT NULL DEFAULT '',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sacco_loans TO authenticated;
GRANT ALL ON public.sacco_loans TO service_role;
ALTER TABLE public.sacco_loans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member reads own loans" ON public.sacco_loans FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Admin reads loans" ON public.sacco_loans FOR SELECT TO authenticated USING (public.can_platform('admin.platform'));
CREATE POLICY "Member applies for loan" ON public.sacco_loans FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() AND status = 'Pending');

CREATE TABLE public.sacco_repayments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.sacco_loans(id),
  owner_id uuid NOT NULL,
  amount_ugx bigint NOT NULL CHECK (amount_ugx > 0),
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.sacco_repayments TO authenticated;
GRANT ALL ON public.sacco_repayments TO service_role;
ALTER TABLE public.sacco_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Member reads own repayments" ON public.sacco_repayments FOR SELECT TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Member records own repayment" ON public.sacco_repayments FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.validate_sacco_saving() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bal bigint;
BEGIN
  IF NEW.record_date > CURRENT_DATE THEN RAISE EXCEPTION 'Date cannot be in the future'; END IF;
  IF NEW.kind = 'Withdrawal' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.owner_id::text));
    SELECT coalesce(sum(CASE WHEN kind='Deposit' THEN amount_ugx ELSE -amount_ugx END),0) INTO bal FROM public.sacco_savings WHERE owner_id = NEW.owner_id;
    IF bal < NEW.amount_ugx THEN RAISE EXCEPTION 'Withdrawal is more than your savings balance'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_sacco_saving BEFORE INSERT ON public.sacco_savings FOR EACH ROW EXECUTE FUNCTION public.validate_sacco_saving();

CREATE OR REPLACE FUNCTION public.validate_sacco_repayment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l public.sacco_loans; paid bigint;
BEGIN
  SELECT * INTO l FROM public.sacco_loans WHERE id = NEW.loan_id FOR UPDATE;
  IF NOT FOUND OR l.owner_id <> NEW.owner_id THEN RAISE EXCEPTION 'Loan not found'; END IF;
  IF l.status <> 'Approved' THEN RAISE EXCEPTION 'Repayments can only be recorded on approved loans'; END IF;
  IF NEW.record_date > CURRENT_DATE THEN RAISE EXCEPTION 'Date cannot be in the future'; END IF;
  SELECT coalesce(sum(amount_ugx),0) INTO paid FROM public.sacco_repayments WHERE loan_id = NEW.loan_id;
  IF paid + NEW.amount_ugx > l.principal_ugx THEN RAISE EXCEPTION 'Repayment is more than the outstanding balance'; END IF;
  IF paid + NEW.amount_ugx = l.principal_ugx THEN UPDATE public.sacco_loans SET status = 'Repaid' WHERE id = l.id; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_sacco_repayment BEFORE INSERT ON public.sacco_repayments FOR EACH ROW EXECUTE FUNCTION public.validate_sacco_repayment();

CREATE OR REPLACE FUNCTION public.review_sacco_loan(_loan_id uuid, _decision text, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.can_platform('admin.platform') THEN RAISE EXCEPTION 'Administrator permission required'; END IF;
  IF _decision NOT IN ('Approved','Rejected') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF _decision = 'Rejected' AND char_length(trim(coalesce(_reason,''))) < 3 THEN RAISE EXCEPTION 'A reason is required when rejecting'; END IF;
  UPDATE public.sacco_loans SET status = _decision, review_reason = left(coalesce(trim(_reason),''),500), reviewed_at = now() WHERE id = _loan_id AND status = 'Pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Loan is not pending'; END IF;
  INSERT INTO public.platform_audit(actor_id, action, entity_id, detail) VALUES (auth.uid(), 'loan_' || lower(_decision), _loan_id, jsonb_build_object('reason', _reason));
END $$;
REVOKE ALL ON FUNCTION public.review_sacco_loan(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.review_sacco_loan(uuid,text,text) TO authenticated;