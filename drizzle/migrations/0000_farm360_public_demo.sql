CREATE TABLE public.demo_farm_records (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module text NOT NULL CHECK (module IN ('crops','livestock','poultry','inventory','finance','market','tasks')), name text NOT NULL, detail text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'Active', quantity numeric NOT NULL DEFAULT 0 CHECK (quantity >= 0), unit text NOT NULL DEFAULT '', amount numeric(18,0) NOT NULL DEFAULT 0, record_date date NOT NULL DEFAULT '2026-10-14', created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.demo_farm_records TO anon, authenticated;
GRANT ALL ON public.demo_farm_records TO service_role;
ALTER TABLE public.demo_farm_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public fictional demonstration records" ON public.demo_farm_records FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX demo_records_module_date ON public.demo_farm_records (module, record_date);
INSERT INTO public.demo_farm_records (module,name,detail,status,quantity,unit,amount,record_date) VALUES
('crops','Maize','Longe 10H · North field · 3.5 acres','Growing',3.5,'acres',0,'2026-08-12'),
('crops','Beans','NABE 17 · East field · 2 acres','Growing',2,'acres',0,'2026-09-01'),
('crops','Coffee','Robusta · West field · 2 acres','Harvesting',2,'acres',0,'2025-03-20'),
('crops','Tomatoes','Rio Grande · Kitchen plot · 0.5 acres','Growing',0.5,'acres',0,'2026-09-18'),
('crops','Bananas','Matooke · South field · 2 acres','Harvesting',2,'acres',0,'2025-04-11'),
('crops','Sweet potatoes','NASPOT 8 · Lower field · 1 acre','Planned',1,'acres',0,'2026-10-24'),
('livestock','Dairy cattle','Friesian cross · Main pasture','Healthy',8,'animals',0,'2026-10-14'),
('livestock','Goats','Mubende breed · East paddock','Healthy',16,'animals',0,'2026-10-14'),
('poultry','Layer batch A','ISA Brown · House 1','Laying',240,'birds',0,'2026-04-02'),
('poultry','Broiler batch B','Cobb 500 · House 2','Growing',180,'birds',0,'2026-09-17'),
('inventory','Layer feed','Feed store · Minimum 100 kg','Low stock',75,'kg',150000,'2026-10-14'),
('inventory','NPK fertilizer','Input store · Minimum 25 kg','In stock',125,'kg',450000,'2026-10-14'),
('inventory','Maize seed','Input store · Minimum 10 kg','In stock',25,'kg',200000,'2026-10-14'),
('inventory','Vaccines','Cold storage · Minimum 10 doses','Low stock',6,'doses',48000,'2026-10-14'),
('finance','Coffee sale','Sale · Kampala buyer','Income',120,'kg',840000,'2026-10-02'),
('finance','Milk sales','Sale · Local collection point','Income',200,'litres',600000,'2026-10-06'),
('finance','Egg sales','Sale · Wakiso market','Income',50,'trays',600000,'2026-10-10'),
('finance','Banana sales','Sale · Kampala market','Income',48,'bunches',1200000,'2026-10-12'),
('finance','Animal feed','Feed supplier','Expense',1,'purchase',620000,'2026-10-03'),
('finance','Farm labour','October wages','Expense',1,'payment',480000,'2026-10-07'),
('finance','Fertilizer','Input supplier','Expense',1,'purchase',450000,'2026-10-09'),
('finance','Transport','Produce delivery','Expense',1,'payment',170000,'2026-10-12'),
('market','Maize','Kisenyi market · Kampala','Rising',1,'kg',1500,'2026-10-14'),
('market','Beans','Nakasero market · Kampala','Rising',1,'kg',3800,'2026-10-14'),
('market','Coffee','Kampala collection centre','Rising',1,'kg',7000,'2026-10-14'),
('market','Tomatoes','Nakasero market · Kampala','Falling',1,'kg',2400,'2026-10-14'),
('tasks','Apply fertilizer to maize','North field · Crop care','Today',0,'',0,'2026-10-14'),
('tasks','Vaccinate layer batch A','Poultry house 1 · Health','Today',0,'',0,'2026-10-14'),
('tasks','Harvest ripe coffee','West field · Harvest','Tomorrow',0,'',0,'2026-10-15'),
('tasks','Restock layer feed','Feed store · Inventory','Tomorrow',0,'',0,'2026-10-15');